/**
 * Phase 69 — one-time test account setup.
 *
 * Usage: npx tsx e2e/phase69-setup.ts
 *
 * Strategy:
 *   1. Try to log in with the test credentials.
 *   2. If login succeeds → check if a child profile exists.
 *      a. If child exists → write .env.test and done.
 *      b. If no child yet → go through onboarding to create one.
 *   3. If login fails → sign up first, then create child via onboarding.
 */

import { chromium } from '@playwright/test'
import { writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const BASE     = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const CREDS    = resolve(__dirname, '../.env.test')

const TEST_EMAIL    = 'test+phase69@nimipiko.com'
const TEST_PASSWORD = 'Phase69Airways!Test'
const CHILD_NAME    = 'AirwaysTestChild'

function writeCreds() {
  writeFileSync(CREDS, [
    `PLAYWRIGHT_LEARNER_EMAIL=${TEST_EMAIL}`,
    `PLAYWRIGHT_LEARNER_PASSWORD=${TEST_PASSWORD}`,
    `PLAYWRIGHT_LEARNER_CHILD_NAME=${CHILD_NAME}`,
    `PLAYWRIGHT_BASE_URL=${BASE}`,
  ].join('\n') + '\n', 'utf8')
  console.log(`✓ .env.test written`)
  console.log(`  Email:    ${TEST_EMAIL}`)
  console.log(`  Password: ${TEST_PASSWORD}`)
  console.log(`  Child:    ${CHILD_NAME}`)
  console.log('\nRun the journey spec with:')
  console.log('  npx playwright test e2e/phase69-journey.spec.ts --headed')
}

async function tryLogin(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
  await page.goto(`${BASE}/loginpage`, { waitUntil: 'networkidle' })

  await page.locator('input[type="email"]').fill(TEST_EMAIL)

  const pwInput = page.locator('input[type="password"]')
  await pwInput.fill(TEST_PASSWORD)

  // Login button — "Board Now"
  const loginBtn = page.locator('button').filter({ hasText: /Board Now/i }).first()
  await loginBtn.click()

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  return page.url()
}

async function doOnboarding(page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>) {
  console.log('→ Running onboarding to create child profile…')
  if (!page.url().includes('/onboarding')) {
    await page.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle' })
  }
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  const currentUrl = page.url()
  console.log('  Onboarding URL:', currentUrl)

  if (currentUrl.includes('/home') || currentUrl.includes('/parents')) {
    console.log('  → Already past onboarding, child exists')
    return true
  }

  // Step 0: Avatar builder — "Next: Name your Explorer"
  const step0Btn = page.locator('button').filter({ hasText: /Name your Explorer/i }).first()
  if (await step0Btn.count() > 0) {
    await step0Btn.click()
    await page.waitForTimeout(800)
  }

  // Step 1: fill child details
  const nameInput = page.locator('input[type="text"]').first()
  if (await nameInput.count() > 0) {
    await nameInput.fill(CHILD_NAME)
  }

  // Age group "5–6"
  const ageBtn = page.locator('button').filter({ hasText: '5–6' }).first()
  if (await ageBtn.count() > 0) await ageBtn.click()

  // Language: English
  const langBtn = page.locator('button').filter({ hasText: /English/i }).first()
  if (await langBtn.count() > 0) await langBtn.click()

  // Submit — "Begin … Adventure!"
  await page.locator('button').filter({ hasText: /Adventure/i }).last().click()

  // Wait for /home
  try {
    await page.waitForURL(u => u.pathname === '/home', { timeout: 20000 })
    console.log('✓ Child created — at /home')
    return true
  } catch {
    console.log('  Note: did not reach /home — URL is:', page.url())
    return false
  }
}

async function main() {
  const browser = await chromium.launch({ headless: false })
  const page    = await browser.newPage()

  // ── Step 1: Try login ─────────────────────────────────────────────────────
  console.log('→ Attempting login with test credentials…')
  const afterLogin = await tryLogin(page)
  console.log('  Post-login URL:', afterLogin)

  if (afterLogin.includes('/home') || afterLogin.includes('/parents')) {
    // Logged in successfully, child already exists
    console.log('✓ Login succeeded — account and child profile already exist')
    await browser.close()
    writeCreds()
    return
  }

  if (afterLogin.includes('/onboarding')) {
    // Logged in but no child yet
    console.log('✓ Login succeeded — creating child profile via onboarding…')
    await doOnboarding(page)
    await browser.close()
    writeCreds()
    return
  }

  // ── Step 2: Login failed — sign up fresh ─────────────────────────────────
  console.log('→ Login failed — signing up…')
  await page.goto(`${BASE}/signuppage`, { waitUntil: 'networkidle' })

  await page.locator('input[type="text"]').first().fill('Test Parent Phase69')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').nth(0).fill(TEST_PASSWORD)
  await page.locator('input[type="password"]').nth(1).fill(TEST_PASSWORD)

  const checkbox = page.locator('input[type="checkbox"]').first()
  if (await checkbox.count() > 0 && !(await checkbox.isChecked())) await checkbox.check()

  await page.locator('button').filter({ hasText: /boarding pass/i }).first().click()

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  console.log('  Post-signup URL:', page.url())

  if (page.url().includes('/onboarding') || page.url().includes('/home')) {
    await doOnboarding(page)
  }

  await browser.close()
  writeCreds()
}

main().catch(err => { console.error(err); process.exit(1) })
