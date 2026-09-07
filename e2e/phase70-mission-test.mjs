/**
 * Phase 70 — Mission slot deep verification.
 * Tests actual slot_key URLs (not /mission/1) against the running dev server.
 */

import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

const envContent = readFileSync('/home/martin/Documents/Learn-with-NIMI/.env.test', 'utf8')
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())))

const BASE     = 'http://localhost:3000'
const EMAIL    = env.PLAYWRIGHT_LEARNER_EMAIL
const PASSWORD = env.PLAYWRIGHT_LEARNER_PASSWORD
const CHILD_ID = 'ba25b517-2091-4a46-97f2-40c861134c2a'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  // Login
  await page.goto(`${BASE}/loginpage`, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('button').filter({ hasText: /Board Now/i }).first().click()
  await page.waitForURL(url => url.pathname === '/home' || url.pathname === '/parents', { timeout: 15000 })
  console.log('✓ Logged in')

  // Set active child in localStorage
  await page.evaluate((childId) => {
    localStorage.setItem('nimipiko_active_child', childId)
  }, CHILD_ID)

  // Visit story detail page — collect actual slot links
  const consoleErrors = []
  page.on('pageerror', e => consoleErrors.push(e.message))

  await page.goto(`${BASE}/stories/nimiatschool`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  // Collect slot links from the story page
  const slotLinks = await page.locator('a[href*="/mission/"]').evaluateAll(els =>
    els.map(e => ({ text: e.textContent?.trim().slice(0, 50), href: e.getAttribute('href') }))
  )
  console.log('\n── Story Detail Slot Links ──')
  slotLinks.forEach(l => console.log(`  ${l.href}: ${l.text}`))

  if (slotLinks.length === 0) {
    console.log('⚠️  No slot links found on story detail — checking page content')
    const html = await page.content()
    const hasSlots = html.includes('story_pdf') || html.includes('coloring') || html.includes('mission')
    console.log(`  Has slot refs in HTML: ${hasSlots}`)
    const body = await page.locator('body').textContent()
    console.log(`  Body length: ${body?.length}`)
    console.log(`  First 500 chars: ${body?.slice(0, 500)}`)
  }

  // Visit each slot
  const slotKeys = ['story_pdf', 'coloring', 'move_explore', 'sing_along', 'bonus_video']
  for (const slotKey of slotKeys) {
    const slotUrl = `${BASE}/stories/nimiatschool/mission/${slotKey}`
    const netFails = []
    page.on('requestfailed', r => netFails.push(r.url()))

    await page.goto(slotUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const finalUrl = page.url()
    const headings = await page.locator('h1, h2').allTextContents().catch(() => [])
    const body = await page.locator('body').textContent().catch(() => '')
    const hasContent = (body?.length ?? 0) > 200
    const wasRedirected = finalUrl !== slotUrl

    console.log(`\n── /mission/${slotKey} ──`)
    console.log(`  Final URL: ${finalUrl}`)
    console.log(`  Headings: ${headings.slice(0, 3).join(' | ')}`)
    console.log(`  Has content: ${hasContent} (${body?.length} chars)`)
    if (wasRedirected) console.log(`  ⚠️  Redirected!`)
    if (netFails.length > 0) console.log(`  ❌ Net fails: ${netFails[0]}`)

    // Check for completion button
    const hasComplete = body?.includes('Done') || body?.includes('Complete') || body?.includes('Mark')
    console.log(`  Has completion CTA: ${hasComplete}`)
  }

  // JS errors summary
  const blocking = consoleErrors.filter(e =>
    !e.includes('ResizeObserver') &&
    !e.includes('Non-Error promise') &&
    !e.includes('cannot have a negative time stamp')
  )
  if (blocking.length > 0) {
    console.log('\n❌ JS CRASHES:')
    blocking.forEach(e => console.log(`  ${e}`))
  } else {
    console.log('\n✓ No blocking JS errors across all slot pages')
  }

  await browser.close()
}

main().catch(err => { console.error(err); process.exit(1) })
