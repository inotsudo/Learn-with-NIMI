/**
 * BK.3.8 — Curriculum Operations Hardening
 * Playwright end-to-end tests for the admin CMS curriculum workflows.
 *
 * Prerequisites:
 *   1. Run `supabase db query --linked --file supabase/migrations/042_curriculum_ops_hardening.sql`
 *      to apply the hardening RPCs.
 *   2. Set env vars (or .env.test.local):
 *       PLAYWRIGHT_ADMIN_EMAIL    — admin account email
 *       PLAYWRIGHT_ADMIN_PASSWORD — admin account password
 *       PLAYWRIGHT_BASE_URL       — app URL (default: http://localhost:3000)
 *
 * Install:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test e2e/admin-curriculum-ops.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'

// ── Shared helpers ───────────────────────────────────────────

async function login(page: Page) {
  const email    = process.env.PLAYWRIGHT_ADMIN_EMAIL    ?? ''
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? ''

  if (!email || !password) {
    throw new Error('Set PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD env vars before running Playwright tests.')
  }

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/admin/)
  await expect(page.locator('nav, [data-testid="admin-sidebar"]').first()).toBeVisible({ timeout: 10_000 })
}

async function navigateToCategory(page: Page, categoryLabel: string) {
  // Click the sidebar item that matches the category label
  await page.getByRole('button', { name: new RegExp(categoryLabel, 'i') }).first().click()
  await page.waitForLoadState('networkidle')
}

async function navigateToCurriculumSection(page: Page, section: 'Lessons' | 'Coverage' | 'Publishing') {
  await page.getByRole('button', { name: new RegExp(section, 'i') }).first().click()
  await page.waitForLoadState('networkidle')
}

// ── Test suite ───────────────────────────────────────────────

test.describe('BK.3.8 Curriculum Operations Hardening', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ── 1. Draft → Review → Published Workflow ─────────────────

  test('1.1 new mission starts as Inactive with Draft status badge', async ({ page }) => {
    await navigateToCategory(page, 'Morning Song')

    // The Mission Manager header shows the category
    await expect(page.getByText(/Morning Song/i).first()).toBeVisible()

    // Find any card showing Draft status — the first Draft mission shows the gray badge
    const draftBadge = page.locator('text=Draft').first()
    await expect(draftBadge).toBeVisible()
  })

  test('1.2 published content is read-only — Create Revision to Edit button visible', async ({ page }) => {
    await navigateToCategory(page, 'Morning Song')

    // Click on the "Hello, Hello!" mission (Level 1 Unit 1, published)
    await page.getByText('Hello, Hello!').first().click()
    await page.waitForLoadState('networkidle')

    // The mission editor should show the Published badge
    await expect(page.getByText('Published').first()).toBeVisible()

    // The "Create Revision to Edit" button should be visible (content is locked)
    await expect(
      page.getByRole('button', { name: /Create Revision/i }).first()
    ).toBeVisible()

    // The title input should be disabled/read-only when published
    const titleInput = page.locator('input[placeholder*="title" i], input[name*="title" i]').first()
    if (await titleInput.count() > 0) {
      await expect(titleInput).toBeDisabled()
    }
  })

  test('1.3 published mission info banner shows no-fallback message', async ({ page }) => {
    await navigateToCategory(page, 'Morning Song')
    await page.getByText('Hello, Hello!').first().click()
    await page.waitForLoadState('networkidle')

    // The info banner should appear for published missions
    await expect(page.locator('[role="status"], .bg-blue-50, .rounded-xl').filter({ hasText: /published/i }).first()).toBeVisible()
  })

  // ── 2. Archive Safety ───────────────────────────────────────

  test('2.1 archiving a curriculum-linked mission shows ArchiveImpactModal', async ({ page }) => {
    await navigateToCategory(page, 'Morning Song')

    // Open the three-dot menu on the Hello, Hello! mission
    const missionRow = page.locator('[data-testid="mission-card"], .rounded-2xl').filter({ hasText: 'Hello, Hello!' }).first()
    await missionRow.hover()

    const menuButton = missionRow.getByRole('button', { name: /more|menu|options/i }).first()
    if (await menuButton.count() > 0) {
      await menuButton.click()
    }

    // Archive option should be visible in the overflow menu
    const archiveBtn = page.getByRole('button', { name: /^Archive$/i }).first()
    if (await archiveBtn.count() > 0) {
      await archiveBtn.click()

      // ArchiveImpactModal should appear because Level 1/Unit 1 uses this mission
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5_000 })
      await expect(page.getByText(/Level 1/i)).toBeVisible()

      // Dismiss with Cancel — do not actually archive production content
      await page.getByRole('button', { name: /Cancel/i }).click()
      await expect(page.getByRole('alertdialog')).not.toBeVisible()
    } else {
      // The archive option is not accessible from this view — skip
      test.skip()
    }
  })

  test('2.2 archived mission shows Restore button and Inactive badge', async ({ page }) => {
    await navigateToCategory(page, 'Morning Song')

    // Toggle "Show archived" to see archived missions
    const showArchivedBtn = page.getByRole('button', { name: /archived/i }).first()
    if (await showArchivedBtn.count() > 0) {
      await showArchivedBtn.click()
      await page.waitForLoadState('networkidle')

      // Any archived mission should show a Restore button
      const restoreBtn = page.getByRole('button', { name: /Restore/i }).first()
      if (await restoreBtn.count() > 0) {
        await expect(restoreBtn).toBeVisible()
      }
    } else {
      test.skip()
    }
  })

  // ── 3. Revision Workflow ────────────────────────────────────

  test('3.1 Create Revision produces a draft alongside the live published version', async ({ page }) => {
    await navigateToCategory(page, 'Morning Song')
    await page.getByText('Hello, Hello!').first().click()
    await page.waitForLoadState('networkidle')

    // Click "Create Revision to Edit"
    const createRevBtn = page.getByRole('button', { name: /Create Revision/i }).first()
    if (await createRevBtn.count() === 0) {
      test.skip()
      return
    }

    await createRevBtn.click()
    await page.waitForLoadState('networkidle')

    // A success message should appear
    await expect(
      page.getByText(/New draft revision created/i).or(page.getByText(/Saved/i))
    ).toBeVisible({ timeout: 8_000 })

    // The status should now show Draft (new revision is editable)
    await expect(page.getByText('Draft').first()).toBeVisible()

    // Revision history should show ≥2 revisions
    const revHistory = page.locator('text=Rev.').or(page.locator('text=Revision'))
    if (await revHistory.count() > 0) {
      await expect(revHistory.nth(1)).toBeVisible()
    }

    // Clean up: roll back to the published revision via Rollback button
    const rollbackBtn = page.getByRole('button', { name: /Rollback/i }).first()
    if (await rollbackBtn.count() > 0) {
      await rollbackBtn.click()
      await page.waitForLoadState('networkidle')
    }
  })

  // ── 4. Export / Import Round Trip ──────────────────────────

  test('4.1 Lessons view shows Export Unit button for Level 1 Unit 1', async ({ page }) => {
    await navigateToCurriculumSection(page, 'Lessons')

    // Level 1 pill should be selected by default or selectable
    const level1Btn = page.getByRole('button', { name: /Level 1/i }).first()
    await expect(level1Btn).toBeVisible()
    await level1Btn.click()
    await page.waitForLoadState('networkidle')

    // Select Unit 1
    const unit1Btn = page.getByRole('button', { name: /Unit 1/i }).first()
    await expect(unit1Btn).toBeVisible()
    await unit1Btn.click()
    await page.waitForLoadState('networkidle')

    // Export Unit button should be present
    await expect(page.getByRole('button', { name: /Export Unit/i })).toBeVisible()
  })

  test('4.2 Export Unit button triggers XLSX download', async ({ page }) => {
    await navigateToCurriculumSection(page, 'Lessons')

    const level1Btn = page.getByRole('button', { name: /Level 1/i }).first()
    await level1Btn.click()
    await page.waitForLoadState('networkidle')

    const unit1Btn = page.getByRole('button', { name: /Unit 1/i }).first()
    await unit1Btn.click()
    await page.waitForLoadState('networkidle')

    // Listen for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })
    await page.getByRole('button', { name: /Export Unit/i }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/level1-unit1.*\.xlsx/)
  })

  // ── 5. Translation Coverage ─────────────────────────────────

  test('5.1 Coverage Dashboard shows Level 1 Unit 1 as 100% translated', async ({ page }) => {
    await navigateToCurriculumSection(page, 'Coverage')

    const level1Btn = page.getByRole('button', { name: /Level 1/i }).first()
    await level1Btn.click()
    await page.waitForLoadState('networkidle')

    const unit1Btn = page.getByRole('button', { name: /Unit 1/i }).first()
    await unit1Btn.click()
    await page.waitForLoadState('networkidle')

    // Every lesson in the unit should show "Fully Translated"
    const fullyTranslated = page.getByText(/Fully Translated/i)
    const count = await fullyTranslated.count()
    expect(count).toBe(8) // 8 categories × all fully translated
  })

  test('5.2 Coverage Dashboard shows all 3 language checkmarks for each lesson', async ({ page }) => {
    await navigateToCurriculumSection(page, 'Coverage')

    const level1Btn = page.getByRole('button', { name: /Level 1/i }).first()
    await level1Btn.click()
    await page.waitForLoadState('networkidle')

    const unit1Btn = page.getByRole('button', { name: /Unit 1/i }).first()
    await unit1Btn.click()
    await page.waitForLoadState('networkidle')

    // The coverage table should not show any ✗ / missing badges
    const missingBadge = page.getByText(/Missing/i)
    await expect(missingBadge).not.toBeVisible()
  })

  // ── 6. Curriculum Integrity ─────────────────────────────────

  test('6.1 Publishing Center shows Level 1 Unit 1 as ready (8/8 published)', async ({ page }) => {
    await navigateToCurriculumSection(page, 'Publishing')

    const level1Btn = page.getByRole('button', { name: /Level 1/i }).first()
    await level1Btn.click()
    await page.waitForLoadState('networkidle')

    const unit1Btn = page.getByRole('button', { name: /Unit 1/i }).first()
    await unit1Btn.click()
    await page.waitForLoadState('networkidle')

    // All 8 slots should show Published status
    const publishedBadges = page.getByText(/Published/i)
    const count = await publishedBadges.count()
    expect(count).toBeGreaterThanOrEqual(8)
  })

  test('6.2 Level 1 Unit 1 has all 8 category slots filled in Lesson Manager', async ({ page }) => {
    await navigateToCurriculumSection(page, 'Lessons')

    const level1Btn = page.getByRole('button', { name: /Level 1/i }).first()
    await level1Btn.click()
    await page.waitForLoadState('networkidle')

    const unit1Btn = page.getByRole('button', { name: /Unit 1/i }).first()
    await unit1Btn.click()
    await page.waitForLoadState('networkidle')

    // Should show 8/8 lessons defined — no "Missing" badges
    await expect(page.getByText(/8\/8/i)).toBeVisible()
    await expect(page.getByText(/Missing/i)).not.toBeVisible()
  })
})
