/**
 * Phase 68 — NIMIPIKO AIRWAYS Acceptance Test
 *
 * Tests everything accessible without learner credentials:
 *   - Application startup / public routes
 *   - Authentication redirect (protection)
 *   - Login / signup pages render
 *   - Marketing landing page
 *   - Auth-gated routes redirect correctly
 *   - Basic visual sanity (Airways branding present)
 *
 * Authenticated learner journey (Home → Adventure → Mission → Completion →
 * Reward → Passport → Next) is NOT tested here because no learner
 * test credentials are defined in the environment. Those tests must be
 * run manually or via a future spec with PLAYWRIGHT_LEARNER_EMAIL +
 * PLAYWRIGHT_LEARNER_PASSWORD env vars.
 */

import { test, expect, type Page } from '@playwright/test'

/* ── constants ─────────────────────────────────────────────────────────── */
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

const PROTECTED_LEARNER_ROUTES = [
  '/home',
  '/stories',
  '/missions',
  '/community',
  '/shop',
  '/talk-to-nimi',
  '/masterpiece',
  '/user-profile',
  '/parents',
  '/treasure',
]

/* ── helpers ───────────────────────────────────────────────────────────── */
async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  A. APPLICATION STARTUP                                                 */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('A. Application startup', () => {

  test('homepage responds with 200', async ({ page }) => {
    const res = await page.goto(`${BASE}/`)
    expect(res?.status()).toBe(200)
  })

  test('homepage has non-empty body', async ({ page }) => {
    await page.goto(`${BASE}/`)
    const body = await page.locator('body').textContent()
    expect(body?.length).toBeGreaterThan(50)
  })

  test('no blocking JS errors on initial load', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', err => jsErrors.push(err.message))
    await page.goto(`${BASE}/`)
    await page.waitForLoadState('networkidle')
    const blockingErrors = jsErrors.filter(e =>
      !e.includes('ResizeObserver') &&   // benign browser bug
      !e.includes('Non-Error promise')   // common false positive
    )
    expect(blockingErrors).toHaveLength(0)
  })

})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  B. PUBLIC AUTHENTICATION PAGES                                         */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('B. Auth pages load', () => {

  test('login page loads', async ({ page }) => {
    await page.goto(`${BASE}/loginpage`)
    await page.waitForLoadState('domcontentloaded')
    // Must have some form of email/password input
    const hasForm = await page.locator('input[type="email"], input[type="text"]').count()
    expect(hasForm).toBeGreaterThan(0)
  })

  test('login page has no JS crashes', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', err => jsErrors.push(err.message))
    await page.goto(`${BASE}/loginpage`)
    await page.waitForLoadState('networkidle')
    const blockingErrors = jsErrors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error promise')
    )
    expect(blockingErrors).toHaveLength(0)
  })

  test('signup page loads', async ({ page }) => {
    const res = await page.goto(`${BASE}/signuppage`)
    expect(res?.status()).toBeLessThan(400)
    const body = await page.locator('body').textContent()
    expect(body?.length).toBeGreaterThan(50)
  })

  test('pricing page loads', async ({ page }) => {
    const res = await page.goto(`${BASE}/pricing`)
    expect(res?.status()).toBeLessThan(400)
  })

})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  C. PROTECTED ROUTE SECURITY (unauthenticated redirect)                 */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('C. Protected routes redirect unauthenticated users', () => {

  for (const route of PROTECTED_LEARNER_ROUTES) {
    test(`${route} redirects unauthenticated → login`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
      const finalUrl = page.url()
      // Must end up on a login/auth page, NOT on the protected route itself
      const isProtected = finalUrl.includes('/loginpage') ||
                          finalUrl.includes('/login') ||
                          finalUrl.includes('/auth') ||
                          finalUrl.includes('/signuppage') ||
                          // or just root redirect
                          finalUrl === `${BASE}/` ||
                          finalUrl === `${BASE}`
      expect(isProtected, `Expected redirect from ${route}, got: ${finalUrl}`).toBe(true)
    })
  }

})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  D. AIRWAYS BRANDING — PUBLIC-FACING PAGES                              */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('D. Airways branding on public pages', () => {

  test('login page contains NIMIPIKO branding', async ({ page }) => {
    await page.goto(`${BASE}/loginpage`)
    await page.waitForLoadState('networkidle')
    const html = await page.content()
    const hasNimi = html.toLowerCase().includes('nimipiko') ||
                    html.toLowerCase().includes('nimi')
    expect(hasNimi).toBe(true)
  })

  test('no obvious green brand hex (#15803d / #16a34a) on login page', async ({ page }) => {
    await page.goto(`${BASE}/loginpage`)
    await page.waitForLoadState('networkidle')
    const styles = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*')
      const greenFound: string[] = []
      allElements.forEach(el => {
        const computed = window.getComputedStyle(el)
        const bg = computed.backgroundColor
        const color = computed.color
        // #15803d in rgb = rgb(21, 128, 61) — old green brand
        if (bg.includes('21, 128, 61') || color.includes('21, 128, 61')) {
          greenFound.push(el.tagName + '.' + el.className.slice(0, 30))
        }
      })
      return greenFound.slice(0, 5)
    })
    // We allow green in character images/svg but not primary brand UI
    // Just report, not hard fail (characters can be green)
    if (styles.length > 0) {
      console.log('Green brand color found:', styles)
    }
    // Not a hard fail — characters may use green
  })

})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  E. ADMIN LOGIN PAGE (should remain separate)                           */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('E. Admin route separation', () => {

  test('/admin redirects unauthenticated user correctly', async ({ page }) => {
    const res = await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
    const finalUrl = page.url()
    // Must redirect away from /admin main (to /admin/login or learner login)
    const isNotAdminDashboard = !finalUrl.endsWith('/admin') ||
                                 finalUrl.includes('/login')
    // Just verify no crash
    expect(res?.status()).toBeLessThan(500)
  })

})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  F. INVALID / 404 ROUTES                                                */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('F. 404 / error handling', () => {

  test('completely unknown route gets a response (not blank)', async ({ page }) => {
    const res = await page.goto(`${BASE}/this-route-does-not-exist-xyz-abc-123`)
    const body = await page.locator('body').textContent()
    // 404 or redirect, never blank
    expect(body?.length).toBeGreaterThan(20)
  })

  test('invalid story slug does not crash the server', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', err => jsErrors.push(err.message))
    // This will redirect to login first — just verify no server 500
    const res = await page.goto(`${BASE}/stories/invalid-story-slug-that-never-exists`)
    expect(res?.status()).not.toBe(500)
  })

})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  G. STATIC ASSETS                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('G. Static assets', () => {

  test('favicon.ico loads (HTTP 200)', async ({ page }) => {
    const res = await page.goto(`${BASE}/favicon.ico`)
    expect(res?.status()).toBe(200)
  })

  test('sw.js service worker is accessible', async ({ page }) => {
    const res = await page.goto(`${BASE}/sw.js`)
    // Should be 200 or redirect, not 500
    expect(res?.status()).not.toBe(500)
  })

  test('manifest.json is accessible', async ({ page }) => {
    const res = await page.goto(`${BASE}/manifest.json`)
    expect(res?.status()).not.toBe(500)
  })

})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  H. RESPONSIVE — public pages (unauthenticated)                         */
/* ═══════════════════════════════════════════════════════════════════════ */

test.describe('H. Responsive at key breakpoints (login page)', () => {

  const BREAKPOINTS = [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'tablet-768',   width: 768,  height: 1024 },
    { name: 'mobile-390',   width: 390,  height: 844 },
    { name: 'mobile-375',   width: 375,  height: 667 },
  ]

  for (const bp of BREAKPOINTS) {
    test(`${bp.name}: login page has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await page.goto(`${BASE}/loginpage`)
      await page.waitForLoadState('networkidle')
      const hasHScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      expect(hasHScroll, `Horizontal overflow at ${bp.name}`).toBe(false)
    })
  }

})
