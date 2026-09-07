/**
 * Phase 70 — Live Product Discovery
 * Logs in as test+phase69@nimipiko.com, visits every key page,
 * captures page state, console errors, network failures, and interaction results.
 */

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

// Load credentials
const envPath = resolve('/home/martin/Documents/Learn-with-NIMI/.env.test')
const envContent = readFileSync(envPath, 'utf8')
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())))

const BASE     = env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const EMAIL    = env.PLAYWRIGHT_LEARNER_EMAIL
const PASSWORD = env.PLAYWRIGHT_LEARNER_PASSWORD

const SCRATCHPAD = '/tmp/claude-1000/-home-martin-Documents-Learn-with-NIMI/96017c0d-eb81-489b-9604-7e8b56982cfa/scratchpad'

const report = { pages: {}, storySlug: null, issues: [] }

async function discoverPage(page, name, url, { interact = null, waitMs = 2000 } = {}) {
  const consoleErrors = []
  const networkFails  = []
  const jsErrors      = []

  page.on('console',  m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', e => jsErrors.push(e.message))
  page.on('requestfailed', r => networkFails.push({ url: r.url(), reason: r.failure()?.errorText }))

  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => ({ status: () => 'timeout', error: e.message }))
  await page.waitForTimeout(waitMs)

  const finalUrl   = page.url()
  const bodyText   = await page.locator('body').textContent().catch(() => '')
  const html       = await page.content().catch(() => '')
  const status     = typeof res.status === 'function' ? res.status() : res.status

  // Screenshot
  await page.screenshot({ path: `${SCRATCHPAD}/${name}.png`, fullPage: false }).catch(() => {})

  let interactResult = null
  if (interact) {
    try { interactResult = await interact(page) } catch(e) { interactResult = `ERROR: ${e.message}` }
  }

  const info = {
    url,
    finalUrl,
    status,
    redirected: finalUrl !== url,
    bodyLength: bodyText?.length,
    jsErrors:   jsErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('Non-Error')),
    consoleErrors: consoleErrors.filter(e => !e.includes('favicon')).slice(0, 5),
    networkFails:  networkFails.filter(f => !f.url.includes('favicon')).slice(0, 5),
    interactResult,
    // Key data detected in page
    hasContent:    (bodyText?.length ?? 0) > 200,
    childNameFound: html.includes('AirwaysTestChild'),
    hasSubscriptionGate: html.toLowerCase().includes('subscri') || html.includes('pricing') || html.includes('upgrade'),
    hasErrorState: html.includes('something went wrong') || html.includes('Error') && html.includes('Try again'),
    hasLoadingSpinner: html.includes('animate-spin') || html.includes('loading'),
    hasCTAs: (html.match(/button|<a href/g) || []).length,
  }

  // Extract key text content
  const h1s = []
  const elements = await page.locator('h1, h2, [role="heading"]').allTextContents().catch(() => [])
  h1s.push(...elements.slice(0, 5))
  info.headings = h1s

  report.pages[name] = info

  const issues = []
  if (info.jsErrors.length > 0) issues.push({ sev: 'P2', msg: `JS errors on ${name}: ${info.jsErrors[0]}` })
  if (info.networkFails.length > 0) issues.push({ sev: 'P2', msg: `Network failures on ${name}: ${info.networkFails[0]?.url}` })
  if (!info.hasContent) issues.push({ sev: 'P1', msg: `${name}: page has no meaningful content` })
  report.issues.push(...issues)

  console.log(`\n[${name}] ${status} → ${finalUrl}`)
  console.log(`  Headings: ${h1s.join(' | ')}`)
  if (info.hasSubscriptionGate) console.log(`  ⚠️  Subscription gate detected`)
  if (info.jsErrors.length) console.log(`  ❌ JS errors: ${info.jsErrors.slice(0,2).join('; ')}`)
  if (info.networkFails.length) console.log(`  ❌ Network fails: ${info.networkFails[0]?.url}`)
  if (info.childNameFound) console.log(`  ✓  Child name found`)
  if (interactResult) console.log(`  Interact: ${JSON.stringify(interactResult).slice(0,200)}`)

  return info
}

async function loginAndGetContext(browser) {
  const ctx  = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(`${BASE}/loginpage`, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('button').filter({ hasText: /Board Now/i }).first().click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  const url = page.url()
  console.log(`\n✓ Login → ${url}`)
  if (!url.includes('/home') && !url.includes('/parents')) {
    console.log('⚠️  Login may have failed — URL unexpected')
  }

  await page.close()
  return ctx
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx     = await loginAndGetContext(browser)

  // ── HOME ─────────────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'home', `${BASE}/home`, {
      waitMs: 3000,
      interact: async (p) => {
        // Find all buttons and links
        const btns = await p.locator('button, a[href]').allTextContents()
        const links = await p.locator('a[href]').evaluateAll(els =>
          els.map(e => ({ text: e.textContent?.trim(), href: e.getAttribute('href') })).filter(l => l.href && !l.href.startsWith('http')).slice(0, 20)
        )
        return { buttonCount: btns.length, internalLinks: links }
      }
    })
    await page.close()
  }

  // ── STORIES ──────────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    const info = await discoverPage(page, 'stories', `${BASE}/stories`, {
      waitMs: 3000,
      interact: async (p) => {
        const storyLinks = await p.locator('a[href*="/stories/"]').evaluateAll(els =>
          els.map(e => ({ text: e.textContent?.trim().slice(0,50), href: e.getAttribute('href') })).slice(0, 10)
        )
        return { storyLinks }
      }
    })
    // Extract first story slug
    if (info.interactResult?.storyLinks?.length > 0) {
      const first = info.interactResult.storyLinks[0].href
      report.storySlug = first?.replace('/stories/', '').split('?')[0]
      console.log(`  First story slug: ${report.storySlug}`)
    }
    await page.close()
  }

  // ── STORY DETAIL ─────────────────────────────────────────────────────────
  if (report.storySlug) {
    const page = await ctx.newPage()
    await discoverPage(page, 'story_detail', `${BASE}/stories/${report.storySlug}`, {
      waitMs: 4000,
      interact: async (p) => {
        const html = await p.content()
        // Detect activity types
        const activities = {
          listen: html.includes('🎧') || html.includes('Listen'),
          read:   html.includes('📖') || html.includes('Read'),
          create: html.includes('🎨') || html.includes('Create'),
          move:   html.includes('🤸') || html.includes('Move'),
          sing:   html.includes('🎵') || html.includes('Sing'),
          watch:  html.includes('🎬') || html.includes('Watch'),
        }
        // Find all clickable elements
        const slots = await p.locator('[data-slot], [class*="slot"], button').allTextContents()
        const audioElements = await p.locator('audio, video').count()
        return { activities, slotCount: slots.length, audioElements }
      }
    })
    await page.close()
  }

  // ── MISSION SLOT ─────────────────────────────────────────────────────────
  if (report.storySlug) {
    const page = await ctx.newPage()
    await discoverPage(page, 'mission_slot', `${BASE}/stories/${report.storySlug}/mission/1`, {
      waitMs: 3000,
      interact: async (p) => {
        const html = await p.content()
        return {
          hasAudio: html.includes('<audio') || html.includes('audio'),
          hasVideo: html.includes('<video') || html.includes('video'),
          hasCompletion: html.includes('complete') || html.includes('Complete') || html.includes('Done'),
          status: p.url(),
        }
      }
    })
    await page.close()
  }

  // ── TALK TO NIMI ─────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'talk_to_nimi', `${BASE}/talk-to-nimi`, {
      waitMs: 3000,
      interact: async (p) => {
        const textarea = p.locator('textarea, input[type="text"]').first()
        const hasInput = await textarea.count() > 0
        if (hasInput) {
          await textarea.fill('Hello Nimi!')
          const sendBtn = p.locator('button').filter({ hasText: /send|ask|go/i }).first()
          if (await sendBtn.count() > 0) {
            await sendBtn.click()
            await p.waitForTimeout(3000)
          }
        }
        const response = await p.locator('body').textContent()
        return { hasInput, responseLength: response?.length }
      }
    })
    await page.close()
  }

  // ── SHOP ─────────────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'shop', `${BASE}/shop`, {
      waitMs: 3000,
      interact: async (p) => {
        const items = await p.locator('[class*="card"], [class*="item"]').count()
        const buyBtns = await p.locator('button').allTextContents()
        return { cardCount: items, buttons: buyBtns.slice(0, 10) }
      }
    })
    await page.close()
  }

  // ── COMMUNITY ────────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'community', `${BASE}/community`, { waitMs: 3000 })
    await page.close()
  }

  // ── MASTERPIECE ──────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'masterpiece', `${BASE}/masterpiece`, { waitMs: 3000 })
    await page.close()
  }

  // ── TREASURE ─────────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'treasure', `${BASE}/treasure`, { waitMs: 3000 })
    await page.close()
  }

  // ── USER PROFILE ─────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'user_profile', `${BASE}/user-profile`, { waitMs: 3000 })
    await page.close()
  }

  // ── PARENTS ──────────────────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'parents', `${BASE}/parents`, { waitMs: 3000 })
    await page.close()
  }

  // ── PASSPORT (airways) ───────────────────────────────────────────────────
  {
    const page = await ctx.newPage()
    await discoverPage(page, 'passport', `${BASE}/user-profile`, {
      waitMs: 3000,
      interact: async (p) => {
        // Look for passport tab
        const passportTab = p.locator('button, a').filter({ hasText: /passport/i }).first()
        if (await passportTab.count() > 0) {
          await passportTab.click()
          await p.waitForTimeout(1500)
        }
        const html = await p.content()
        return {
          hasPassport: html.toLowerCase().includes('passport'),
          hasStamps:   html.includes('stamp') || html.includes('Stamp'),
          hasDest:     html.includes('destination') || html.includes('Destination'),
        }
      }
    })
    await page.close()
  }

  await browser.close()

  // Write report
  const reportPath = `${SCRATCHPAD}/phase70-report.json`
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n\n==== PHASE 70 DISCOVERY COMPLETE ====`)
  console.log(`Issues found: ${report.issues.length}`)
  report.issues.forEach(i => console.log(`  [${i.sev}] ${i.msg}`))
  console.log(`\nReport: ${reportPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
