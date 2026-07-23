/* eslint-disable */
const { chromium } = require('./node_modules/playwright')
const { writeFileSync, mkdirSync } = require('fs')
const { execSync } = require('child_process')

const SS_DIR = '/tmp/admin-walkthrough-screenshots'
mkdirSync(SS_DIR, { recursive: true })

;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  const errors = []
  const netErrors = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', err => errors.push('PAGE ERR: ' + err.message))
  page.on('response', resp => { if (resp.status() >= 400) netErrors.push(`${resp.status()} ${resp.url()}`) })

  const shot = async (name) => {
    const p = `${SS_DIR}/${name}.png`
    await page.screenshot({ path: p, fullPage: false })
    console.log(`📸 ${name}`)
    return p
  }

  // ── Login page ─────────────────────────────────────────────────────────
  console.log('\n→ Login page')
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle', timeout: 20000 })
  await shot('01_login')

  // ── Unauthenticated redirect ───────────────────────────────────────────
  console.log('\n→ /admin without auth')
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(1500)
  await shot('02_admin_unauthed')

  const EMAIL = process.env.ADMIN_EMAIL || ''
  const PASS  = process.env.ADMIN_PASS  || ''

  if (!EMAIL || !PASS) {
    console.log('\n⚠  Set ADMIN_EMAIL and ADMIN_PASS to run authenticated walkthrough')
    await browser.close()
    return
  }

  // ── Login ──────────────────────────────────────────────────────────────
  console.log('\n→ Logging in…')
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle' })
  // Dismiss cookie banner if present
  try {
    await page.click('text=Got it', { timeout: 3000 })
  } catch {}
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  // Button is type="button" not type="submit"
  await page.click('button:has-text("Sign In")')
  // SPA stays on /admin — wait for the sidebar nav to appear instead
  try {
    await page.waitForSelector('aside nav button', { timeout: 20000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
  } catch (e) { console.log('  ⚠ Login wait:', e.message) }
  await shot('03_dashboard')

  // Helper: click a sidebar button by label text in its <span>
  const clickSidebar = async (labelText) => {
    const btn = page.locator('aside nav button').filter({ hasText: new RegExp(`^${labelText}$`, 'i') }).first()
    const count = await btn.count()
    if (count === 0) {
      // Fallback: partial match
      const fallback = page.locator('aside nav button').filter({ hasText: new RegExp(labelText, 'i') }).first()
      if (await fallback.count() === 0) return false
      await fallback.click()
    } else {
      await btn.click()
    }
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1800)
    return true
  }

  // Exact labels from Sidebar.tsx NAV_SECTIONS
  const sections = [
    { nav: 'Story Studio',      label: '04_story_studio' },
    { nav: 'Weekly Challenges', label: '05_weekly_challenges' },
    { nav: 'Rewards',           label: '06_rewards' },
    { nav: 'Badge Images',      label: '07_badge_images' },
    { nav: 'Certificates',      label: '08_certificates' },
    { nav: 'Cert Templates',    label: '09_cert_templates' },
    { nav: 'Media Library',     label: '10_media_library' },
    { nav: 'Masterpieces',      label: '11_masterpieces' },
    { nav: 'Families',          label: '12_families' },
    { nav: 'Community',         label: '13_community' },
    { nav: 'AI Chat History',   label: '14_ai_chat' },
    { nav: 'Curriculum',        label: '15_curriculum' },
    { nav: 'Schools',           label: '16_schools' },
    { nav: 'Roster Sync',       label: '17_roster' },
    { nav: 'Products & Pricing',label: '18_products' },
    { nav: 'Newsletter',        label: '19_newsletter' },
    { nav: 'Referrals',         label: '20_referrals' },
    { nav: 'Discount Codes',    label: '21_discounts' },
    { nav: 'Gift Subscriptions',label: '22_gifts' },
    { nav: 'Analytics',         label: '23_analytics' },
    { nav: 'Testimonials',      label: '24_testimonials' },
    { nav: 'Partners',          label: '25_partners' },
    { nav: 'Notifications',     label: '26_notifications' },
    { nav: 'Administrators',    label: '27_administrators' },
    { nav: 'Settings',          label: '28_settings' },
  ]

  for (const { nav, label } of sections) {
    console.log(`\n→ ${label} (${nav})`)
    const found = await clickSidebar(nav)
    if (!found) console.log(`  ⚠ Sidebar button not found: "${nav}"`)
    await shot(label)
  }

  // ── Console errors ─────────────────────────────────────────────────────
  await browser.close()

  console.log('\n\n══ CONSOLE ERRORS ══════════════════════════════════════')
  if (errors.length === 0) {
    console.log('✓ Zero console errors')
  } else {
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.slice(0, 200)}`))
  }
  console.log('\n\n══ NETWORK ERRORS (4xx/5xx) ════════════════════════════')
  if (netErrors.length === 0) {
    console.log('✓ None')
  } else {
    netErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  }
  console.log(`\nScreenshots saved to: ${SS_DIR}`)
})()
