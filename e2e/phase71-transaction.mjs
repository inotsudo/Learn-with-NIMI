/**
 * Phase 71 — Real Learner Transaction + State Transition Verification
 *
 * Tests the full USER ACTION → FRONTEND → API/RPC → DATABASE → UI REFRESH chain.
 * Uses the controlled test account only.
 *
 * Child: AirwaysTestChild (ba25b517-2091-4a46-97f2-40c861134c2a)
 * Account: test+phase69@nimipiko.com
 */

import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const envContent = readFileSync('/home/martin/Documents/Learn-with-NIMI/.env.test', 'utf8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const BASE      = 'http://localhost:3000'
const EMAIL     = env.PLAYWRIGHT_LEARNER_EMAIL
const PASSWORD  = env.PLAYWRIGHT_LEARNER_PASSWORD
const CHILD_ID  = 'ba25b517-2091-4a46-97f2-40c861134c2a'
const STORY_ID  = '6bae51f1-00c3-46ee-b3e5-93e392897d5a'
const STORY_SLUG = 'nimiatschool'
const LANG      = 'en'

const SUPABASE_URL  = 'https://bedajxejzdxtrsmqortg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGFqeGVqemR4dHJzbXFvcnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTgyMTcsImV4cCI6MjA5NjU5NDIxN30.ZTxuBU4DRggTVrICMVx3w91D6saRQG84VeKO22OMa8I'

const report = {
  baseline: {},
  storySlots: [],
  rawStorySlots: [],
  transactions: [],
  nimiAI: {},
  parentDashboard: {},
  bugs: [],
  fixes: [],
}

// ── Authenticated Supabase client (set after login) ──────────────────────────
let supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

async function loginSupabase() {
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (error) throw new Error(`Supabase login failed: ${error.message}`)
  console.log(`✓ Supabase auth: ${data.user?.id}`)
  return data.user
}

async function captureBaseline() {
  console.log('\n══════════════════════════════════════')
  console.log('A. BASELINE STATE CAPTURE')
  console.log('══════════════════════════════════════')

  // 1. Raw story_slots (unfiltered) — verifies actual DB rows
  const { data: rawSlots, error: rawErr } = await supabase
    .from('story_slots')
    .select('slot_key, sort_order, mission_id, story_id')
    .eq('story_id', STORY_ID)
    .order('sort_order')
  report.rawStorySlots = rawSlots ?? []
  console.log(`\n[story_slots table for ${STORY_SLUG}]`)
  console.log(`  Error: ${rawErr?.message ?? 'none'}`)
  if (rawSlots) {
    rawSlots.forEach(s => console.log(`  sort_order=${s.sort_order} slot_key=${s.slot_key} mission_id=${s.mission_id}`))
  }

  // 2. child_progress for test child (all existing completions)
  const { data: progress } = await supabase
    .from('child_progress')
    .select('mission_id, language, stars_earned, completed_at')
    .eq('child_id', CHILD_ID)
    .eq('language', LANG)
    .order('completed_at', { ascending: false })
  report.baseline.progress = progress ?? []
  console.log(`\n[child_progress for ${CHILD_ID} / ${LANG}]`)
  console.log(`  Completions: ${report.baseline.progress.length}`)
  report.baseline.progress.forEach(p =>
    console.log(`  mission=${p.mission_id} stars=${p.stars_earned} at=${p.completed_at}`)
  )

  // 3. child_achievements
  const { data: achievements } = await supabase
    .from('child_achievements')
    .select('type, slug, created_at')
    .eq('child_id', CHILD_ID)
    .eq('language', LANG)
    .order('created_at', { ascending: false })
  report.baseline.achievements = achievements ?? []
  console.log(`\n[child_achievements]`)
  console.log(`  Count: ${report.baseline.achievements.length}`)
  report.baseline.achievements.forEach(a =>
    console.log(`  ${a.type}: ${a.slug}`)
  )

  // 4. get_story_slots RPC (filtered — what the UI sees)
  const { data: slots, error: slotsErr } = await supabase.rpc('get_story_slots', {
    p_child_id: CHILD_ID,
    p_story_id: STORY_ID,
    p_language: LANG,
  })
  report.storySlots = slots ?? []
  console.log(`\n[get_story_slots RPC (what UI shows)]`)
  console.log(`  Error: ${slotsErr?.message ?? 'none'}`)
  if (slots) {
    slots.forEach(s =>
      console.log(`  order=${s.slot_order} key=${s.slot_key} mission=${s.mission_id} completed=${s.completed}`)
    )
  }

  // 5. Total stars
  const { data: starRows } = await supabase
    .from('child_progress')
    .select('missions(stars)')
    .eq('child_id', CHILD_ID)
    .eq('language', LANG)
  const totalStars = (starRows ?? []).reduce((sum, r) => sum + ((r.missions?.stars ?? 0)), 0)
  report.baseline.totalStars = totalStars
  console.log(`\n[Baseline stars: ${totalStars}]`)

  return { rawSlots, slots, progress }
}

async function loginBrowser(browser) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(`${BASE}/loginpage`, { waitUntil: 'networkidle' })
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('button').filter({ hasText: /Board Now/i }).first().click()
  await page.waitForURL(url => url.pathname === '/home' || url.pathname === '/parents', { timeout: 15000 })

  // Set active child in localStorage for all future pages in this context
  await page.evaluate((childId) => localStorage.setItem('nimipiko_active_child', childId), CHILD_ID)

  console.log(`\n✓ Browser logged in → ${page.url()}`)
  await page.close()
  return ctx
}

async function testMissionTransaction(ctx) {
  console.log('\n══════════════════════════════════════')
  console.log('B. MISSION TRANSACTION TEST')
  console.log('══════════════════════════════════════')

  // Identify the first accessible slot from the RPC
  const firstSlot = report.storySlots[0]
  if (!firstSlot) {
    console.log('⚠️  No slots returned by get_story_slots — cannot test transaction')
    return null
  }
  console.log(`\nTarget slot: ${firstSlot.slot_key} (mission_id: ${firstSlot.mission_id})`)
  console.log(`Pre-test completed: ${firstSlot.completed}`)

  // If already completed, note it and still test
  if (firstSlot.completed) {
    console.log('  ℹ️  Slot already completed — will verify idempotency behavior')
  }

  const txRecord = {
    slotKey: firstSlot.slot_key,
    missionId: firstSlot.mission_id,
    preCompleted: firstSlot.completed,
    networkRequests: [],
    networkErrors: [],
    jsErrors: [],
    rpcResponse: null,
    postCompletionDbState: null,
    uiShowedSuccess: false,
    uiShowedError: false,
    timeMs: 0,
  }

  const page = await ctx.newPage()
  page.on('pageerror', e => txRecord.jsErrors.push(e.message))

  // Intercept the complete_story_slot RPC call
  page.on('request', req => {
    const url = req.url()
    if (url.includes('complete_story_slot') || url.includes('rpc/complete')) {
      txRecord.networkRequests.push({ url, method: req.method(), timestamp: Date.now() })
    }
  })
  page.on('response', async res => {
    const url = res.url()
    if (url.includes('complete_story_slot') || url.includes('rpc/complete')) {
      try {
        const body = await res.text()
        txRecord.rpcResponse = { url, status: res.status(), body: body.slice(0, 500) }
      } catch {}
    }
  })
  page.on('requestfailed', req => {
    if (req.url().includes('complete_story_slot') || req.url().includes('supabase')) {
      txRecord.networkErrors.push({ url: req.url(), reason: req.failure()?.errorText })
    }
  })

  // Step 1: Navigate home
  console.log('\n[Step 1] Navigate to /home')
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
  await page.evaluate((childId) => localStorage.setItem('nimipiko_active_child', childId), CHILD_ID)
  const homeHeadings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])
  console.log(`  Headings: ${homeHeadings.slice(0, 4).join(' | ')}`)

  // Step 2: Navigate to stories
  console.log('\n[Step 2] Navigate to /stories')
  await page.goto(`${BASE}/stories`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const storyLinks = await page.locator(`a[href*="/stories/${STORY_SLUG}"]`).count()
  console.log(`  Story links found: ${storyLinks}`)

  // Step 3: Navigate to story detail
  console.log('\n[Step 3] Navigate to story detail')
  await page.goto(`${BASE}/stories/${STORY_SLUG}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const detailHeadings = await page.locator('h1, h2').allTextContents().catch(() => [])
  console.log(`  Headings: ${detailHeadings.slice(0, 3).join(' | ')}`)

  // Step 4: Navigate to mission slot directly (since story might not show link if locked)
  const missionUrl = `${BASE}/stories/${STORY_SLUG}/mission/${firstSlot.slot_key}`
  console.log(`\n[Step 4] Navigate to mission: ${missionUrl}`)
  await page.goto(missionUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const missionFinalUrl = page.url()
  const missionHeadings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])
  const missionBody = await page.locator('body').textContent().catch(() => '')
  console.log(`  Final URL: ${missionFinalUrl}`)
  console.log(`  Headings: ${missionHeadings.slice(0, 3).join(' | ')}`)
  console.log(`  Body length: ${missionBody?.length}`)

  if (!missionFinalUrl.includes(`/mission/${firstSlot.slot_key}`)) {
    console.log('  ⚠️  Mission redirected away — sequential lock or auth issue')
    txRecord.redirected = true
    await page.close()
    return txRecord
  }

  // Step 5: Find and click completion button
  console.log('\n[Step 5] Find completion button')
  const completionSelectors = [
    'button:has-text("Mark as Done")',
    'button:has-text("Done")',
    'button:has-text("Complete")',
    'button:has-text("Finish")',
    'button:has-text("I Read It")',
    'button:has-text("I Listened")',
    'button:has-text("I Colored")',
    'button:has-text("I Moved")',
    'button:has-text("I Sang")',
    'button:has-text("I Watched")',
  ]

  let completionBtn = null
  for (const sel of completionSelectors) {
    const count = await page.locator(sel).count()
    if (count > 0) {
      completionBtn = page.locator(sel).first()
      console.log(`  Found: "${sel}"`)
      break
    }
  }

  if (!completionBtn) {
    // Try a broader search
    const allBtns = await page.locator('button').allTextContents()
    console.log(`  All buttons: ${allBtns.map(b => b.trim()).filter(b => b).join(' | ')}`)

    // Look for any button that might be a completion CTA
    const readBtn = page.locator('button').filter({ hasText: /read|done|finish|complete|listened|sang|watched|moved|colored/i }).first()
    if (await readBtn.count() > 0) {
      completionBtn = readBtn
      const btnText = await readBtn.textContent()
      console.log(`  Found (fallback): "${btnText?.trim()}"`)
    }
  }

  if (!completionBtn) {
    console.log('  ❌ No completion button found — cannot test transaction')
    txRecord.noCompletionBtn = true
    report.bugs.push({
      id: 'BUG-P71-001',
      severity: 'P2',
      description: `No completion button found on /mission/${firstSlot.slot_key}`,
      type: 'UI',
    })
    await page.close()
    return txRecord
  }

  // Step 6: Click completion
  console.log('\n[Step 6] Click completion button')
  const t0 = Date.now()
  await completionBtn.click()
  await page.waitForTimeout(4000) // Allow RPC + UI update
  txRecord.timeMs = Date.now() - t0

  // Check UI state after completion
  const postBody = await page.locator('body').textContent().catch(() => '')
  const postHeadings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])
  const postUrl = page.url()
  txRecord.uiShowedSuccess = postBody?.includes('⭐') || postBody?.includes('stars') ||
    postBody?.includes('Done') || postBody?.includes('completed') || postUrl !== missionFinalUrl
  txRecord.uiShowedError = postBody?.includes('error') || postBody?.includes('Error') ||
    postBody?.includes('failed')

  console.log(`  Post-click URL: ${postUrl}`)
  console.log(`  Post-click headings: ${postHeadings.slice(0, 4).join(' | ')}`)
  console.log(`  RPC intercepted: ${txRecord.rpcResponse ? '✓' : '—'}`)
  if (txRecord.rpcResponse) {
    console.log(`  RPC status: ${txRecord.rpcResponse.status}`)
    console.log(`  RPC body: ${txRecord.rpcResponse.body}`)
  }
  console.log(`  UI success shown: ${txRecord.uiShowedSuccess}`)
  console.log(`  UI error shown: ${txRecord.uiShowedError}`)

  await page.close()
  return txRecord
}

async function verifyDbStateAfterCompletion(firstSlot) {
  console.log('\n══════════════════════════════════════')
  console.log('C. DATABASE STATE VERIFICATION')
  console.log('══════════════════════════════════════')

  const { data: progress } = await supabase
    .from('child_progress')
    .select('mission_id, language, stars_earned, completed_at')
    .eq('child_id', CHILD_ID)
    .eq('language', LANG)
    .order('completed_at', { ascending: false })

  const completions = progress ?? []
  console.log(`\n[child_progress after action]`)
  console.log(`  Total completions: ${completions.length} (was: ${report.baseline.progress.length})`)

  const newRow = completions.find(p => p.mission_id === firstSlot?.mission_id)
  if (newRow) {
    console.log(`\n  ✓ Completion row FOUND for ${firstSlot.slot_key}:`)
    console.log(`    mission_id: ${newRow.mission_id}`)
    console.log(`    stars_earned: ${newRow.stars_earned}`)
    console.log(`    completed_at: ${newRow.completed_at}`)
  } else {
    console.log(`\n  ❌ No completion row for ${firstSlot?.slot_key}`)
  }

  return { completions, newRow }
}

async function verifySequentialUnlock(ctx, firstSlot) {
  console.log('\n══════════════════════════════════════')
  console.log('D. SEQUENTIAL UNLOCK VERIFICATION')
  console.log('══════════════════════════════════════')

  // Query get_story_slots again to see updated state
  const { data: updatedSlots } = await supabase.rpc('get_story_slots', {
    p_child_id: CHILD_ID,
    p_story_id: STORY_ID,
    p_language: LANG,
  })

  console.log('\n[get_story_slots after completion]')
  if (updatedSlots) {
    updatedSlots.forEach(s =>
      console.log(`  order=${s.slot_order} key=${s.slot_key} completed=${s.completed}`)
    )
  }

  // Find second slot (should now be accessible)
  const completedSlot = updatedSlots?.find(s => s.slot_key === firstSlot?.slot_key)
  const nextSlot = updatedSlots?.find(s =>
    s.slot_order > (firstSlot?.slot_order ?? 0) && !s.completed
  )

  console.log(`\n  First slot completed in DB: ${completedSlot?.completed}`)
  console.log(`  Next unlocked slot: ${nextSlot?.slot_key ?? 'none'}`)

  if (nextSlot) {
    // Try accessing the next slot via browser
    const page = await ctx.newPage()
    const jsErrors = []
    page.on('pageerror', e => jsErrors.push(e.message))

    const nextUrl = `${BASE}/stories/${STORY_SLUG}/mission/${nextSlot.slot_key}`
    console.log(`\n  Testing next slot access: ${nextUrl}`)
    await page.goto(nextUrl, { waitUntil: 'networkidle' })
    await page.evaluate((childId) => localStorage.setItem('nimipiko_active_child', childId), CHILD_ID)
    await page.waitForTimeout(2000)

    const finalUrl = page.url()
    const headings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])
    const stayed = finalUrl.includes(`/mission/${nextSlot.slot_key}`)

    console.log(`  Final URL: ${finalUrl}`)
    console.log(`  Stayed on page: ${stayed}`)
    console.log(`  Headings: ${headings.slice(0, 3).join(' | ')}`)
    await page.close()

    return { nextSlot, nextSlotAccessible: stayed }
  }

  return { nextSlot: null, nextSlotAccessible: false }
}

async function testIdempotency(firstSlot) {
  console.log('\n══════════════════════════════════════')
  console.log('E. IDEMPOTENCY TEST')
  console.log('══════════════════════════════════════')

  if (!firstSlot) return

  // Direct RPC call — second completion attempt
  console.log(`\nCalling complete_story_slot again for ${firstSlot.slot_key}...`)
  const { data, error } = await supabase.rpc('complete_story_slot', {
    p_child_id: CHILD_ID,
    p_mission_id: firstSlot.mission_id,
  })

  console.log(`  Error: ${error?.message ?? 'none'}`)
  console.log(`  Data: ${JSON.stringify(data)}`)

  if (data) {
    const stars = data.stars_earned
    console.log(`  stars_earned on repeat: ${stars} (expected: 0)`)
    if (stars > 0) {
      console.log('  ❌ DUPLICATE STARS AWARDED!')
      report.bugs.push({
        id: 'BUG-P71-002',
        severity: 'P1',
        description: 'Duplicate stars awarded on repeat completion call',
        type: 'BACKEND/RPC',
        file: 'supabase/migrations/113_complete_story_slot_sequential_guard.sql',
      })
    } else {
      console.log('  ✓ No duplicate stars (idempotent)')
    }
  }

  // Count achievements before/after
  const { data: afterAch } = await supabase
    .from('child_achievements')
    .select('type, slug')
    .eq('child_id', CHILD_ID)
    .eq('language', LANG)

  console.log(`  Achievements after repeat: ${afterAch?.length} (was: ${report.baseline.achievements.length})`)

  return { repeatData: data, repeatError: error }
}

async function testRefreshPersistence(ctx, firstSlot) {
  console.log('\n══════════════════════════════════════')
  console.log('F. REFRESH / PERSISTENCE TEST')
  console.log('══════════════════════════════════════')

  if (!firstSlot) return

  const page = await ctx.newPage()
  await page.evaluate((childId) => localStorage.setItem('nimipiko_active_child', childId), CHILD_ID)

  // Navigate to story detail (shows slot completion UI)
  await page.goto(`${BASE}/stories/${STORY_SLUG}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const html = await page.content()
  // Look for visual indicators of completion on the story detail
  const slotKey = firstSlot.slot_key
  const hasCompletedIndicator = html.includes('completed') || html.includes('✅') ||
    html.includes('done') || html.includes('check')

  console.log(`\n[Story detail after completion]`)
  console.log(`  Has completed indicator: ${hasCompletedIndicator}`)

  // Hard refresh
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  const htmlAfterRefresh = await page.content()
  const stillShowsCompleted = htmlAfterRefresh.includes('completed') || htmlAfterRefresh.includes('✅') ||
    htmlAfterRefresh.includes('check')

  console.log(`  After page reload — has completed indicator: ${stillShowsCompleted}`)

  // Check home page
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const homeHtml = await page.content()
  const homeHeadings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])
  console.log(`\n[Home after completion]`)
  console.log(`  Headings: ${homeHeadings.slice(0, 5).join(' | ')}`)

  await page.close()

  return { hasCompletedIndicator, stillShowsCompleted }
}

async function testNimiAI(ctx) {
  console.log('\n══════════════════════════════════════')
  console.log('G. NIMI AI TEST')
  console.log('══════════════════════════════════════')

  const page = await ctx.newPage()
  const jsErrors = []
  page.on('pageerror', e => jsErrors.push(e.message))

  const nimiRequests = []
  page.on('request', req => {
    if (req.url().includes('/api/nimi') || req.url().includes('/api/chat') || req.url().includes('/api/ai')) {
      nimiRequests.push({ url: req.url(), method: req.method() })
    }
  })
  let nimiResponse = null
  page.on('response', async res => {
    const url = res.url()
    if (url.includes('/api/nimi') || url.includes('/api/chat') || url.includes('/api/ai')) {
      try {
        const text = await res.text()
        nimiResponse = { url, status: res.status(), body: text.slice(0, 400) }
      } catch {}
    }
  })

  await page.goto(`${BASE}/talk-to-nimi`, { waitUntil: 'networkidle' })
  await page.evaluate((childId) => localStorage.setItem('nimipiko_active_child', childId), CHILD_ID)
  await page.waitForTimeout(2000)

  const textarea = page.locator('textarea, input[type="text"]').first()
  const hasInput = await textarea.count() > 0
  console.log(`\n  Has input field: ${hasInput}`)

  if (hasInput) {
    await textarea.fill('Hello Nimi, what is your name?')
    const sendBtn = page.locator('button').filter({ hasText: /send|ask|go|submit/i }).first()
    const hasSendBtn = await sendBtn.count() > 0
    console.log(`  Has send button: ${hasSendBtn}`)

    if (hasSendBtn) {
      await sendBtn.click()
      await page.waitForTimeout(5000) // Allow AI response
    }

    const responseBody = await page.locator('body').textContent().catch(() => '')
    const hasNimiResponse = responseBody?.toLowerCase().includes('nimi') ||
      responseBody?.length > 5000

    console.log(`  Nimi request intercepted: ${nimiRequests.length > 0}`)
    if (nimiResponse) {
      console.log(`  API response status: ${nimiResponse.status}`)
      console.log(`  API response body: ${nimiResponse.body.slice(0, 200)}`)
    }
    console.log(`  Response in page: ${hasNimiResponse}`)

    report.nimiAI = {
      hasInput, hasSendBtn, nimiRequests, nimiResponse,
      responsePresent: hasNimiResponse,
      jsErrors: jsErrors.filter(e => !e.includes('ResizeObserver')),
    }
  }

  await page.close()
}

async function testProfileConsistency(ctx) {
  console.log('\n══════════════════════════════════════')
  console.log('H. PROFILE/PASSPORT CONSISTENCY')
  console.log('══════════════════════════════════════')

  const page = await ctx.newPage()
  await page.evaluate((childId) => localStorage.setItem('nimipiko_active_child', childId), CHILD_ID)

  // Get DB stars directly
  const { data: starRows } = await supabase
    .from('child_progress')
    .select('missions(stars)')
    .eq('child_id', CHILD_ID)
    .eq('language', LANG)
  const dbStars = (starRows ?? []).reduce((sum, r) => sum + ((r.missions?.stars ?? 0)), 0)
  console.log(`\n  DB total stars: ${dbStars}`)

  // User profile page
  await page.goto(`${BASE}/user-profile`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const profileHtml = await page.content()
  const profileHeadings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])

  // Look for star count in UI
  const starMatch = profileHtml.match(/(\d+)\s*⭐|⭐\s*(\d+)|(\d+)\s*stars/i)
  const uiStars = starMatch ? (starMatch[1] ?? starMatch[2] ?? starMatch[3]) : 'not found'
  console.log(`  Profile page stars: ${uiStars}`)
  console.log(`  Profile headings: ${profileHeadings.slice(0, 5).join(' | ')}`)

  // Treasure page
  await page.goto(`${BASE}/treasure`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const treasureHtml = await page.content()
  const treasureHeadings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])
  console.log(`\n  Treasure headings: ${treasureHeadings.slice(0, 4).join(' | ')}`)

  // Parents page
  await page.goto(`${BASE}/parents`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const parentsHtml = await page.content()
  const parentsHeadings = await page.locator('h1, h2, h3').allTextContents().catch(() => [])
  console.log(`\n[Parent dashboard]`)
  console.log(`  Headings: ${parentsHeadings.slice(0, 5).join(' | ')}`)
  // Check if parent sees the completed activity
  const parentsShowsCompletion = parentsHtml.includes('FlipFlop') || parentsHtml.includes('story_pdf') ||
    parentsHtml.includes('Read')
  console.log(`  Shows today's activity: ${parentsShowsCompletion}`)

  await page.close()

  return { dbStars, uiStars, parentsShowsCompletion }
}

async function testChildIsolation() {
  console.log('\n══════════════════════════════════════')
  console.log('I. CHILD ISOLATION SECURITY CHECK')
  console.log('══════════════════════════════════════')

  // Attempt to call complete_story_slot with a RANDOM child_id
  // This should fail with "not authorized" due to is_my_child() check
  const fakeChildId = '00000000-0000-0000-0000-000000000001'
  const firstSlot = report.storySlots[0]
  if (!firstSlot) {
    console.log('  No slot to test isolation with')
    return
  }

  const { data, error } = await supabase.rpc('complete_story_slot', {
    p_child_id: fakeChildId,
    p_mission_id: firstSlot.mission_id,
  })

  console.log(`\n  Attempt with fake child_id: ${fakeChildId}`)
  console.log(`  Result: ${error ? `❌ Rejected (${error.message})` : `⚠️ SUCCEEDED! data=${JSON.stringify(data)}`}`)

  if (!error) {
    report.bugs.push({
      id: 'BUG-P71-SECURITY',
      severity: 'P0',
      description: 'complete_story_slot accepted arbitrary child_id — ownership bypass!',
      type: 'SECURITY',
    })
  }

  return { rejected: !!error, errorMsg: error?.message }
}

async function main() {
  const t0 = Date.now()
  console.log('PHASE 71 — REAL LEARNER TRANSACTION VERIFICATION')
  console.log(`Account: ${EMAIL}  |  Child: ${CHILD_ID}`)
  console.log(`Server: ${BASE}`)

  // Authenticate Supabase client
  await loginSupabase()

  // A. Baseline
  const { slots } = await captureBaseline()
  const firstSlot = report.storySlots[0] ?? null

  // Browser session
  const browser = await chromium.launch({ headless: true })
  const ctx = await loginBrowser(browser)

  // B. Mission transaction
  const txRecord = await testMissionTransaction(ctx)
  if (txRecord) report.transactions.push(txRecord)

  // C. DB verification
  const dbCheck = await verifyDbStateAfterCompletion(firstSlot)

  // D. Sequential unlock
  const seqCheck = await verifySequentialUnlock(ctx, firstSlot)

  // E. Idempotency
  const idempotencyCheck = await testIdempotency(firstSlot)

  // F. Refresh/persistence
  const persistCheck = await testRefreshPersistence(ctx, firstSlot)

  // G. Nimi AI
  await testNimiAI(ctx)

  // H. Profile consistency
  const profileCheck = await testProfileConsistency(ctx)

  // I. Child isolation
  const isolationCheck = await testChildIsolation()

  await browser.close()

  // ── FINAL REPORT ──────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('\n══════════════════════════════════════')
  console.log('PHASE 71 SUMMARY')
  console.log('══════════════════════════════════════')

  const firstSlotUsed = firstSlot?.slot_key ?? 'none'
  const completionSucceeded = dbCheck?.newRow != null
  const rpcStatus = txRecord?.rpcResponse?.status ?? 'not intercepted'
  const starsEarned = txRecord?.rpcResponse?.body
    ? (() => { try { return JSON.parse(txRecord.rpcResponse.body)?.stars_earned } catch { return 'parse_fail' } })()
    : 'n/a'

  console.log(`\nBaseline slots visible to UI: ${report.storySlots.length}`)
  console.log(`Raw story_slots in DB: ${report.rawStorySlots.length}`)
  console.log(`First slot tested: ${firstSlotUsed}`)
  console.log(`Completion RPC status: ${rpcStatus}`)
  console.log(`Stars earned (first call): ${starsEarned}`)
  console.log(`DB row created: ${completionSucceeded}`)
  console.log(`Sequential unlock: ${seqCheck?.nextSlotAccessible ? 'VERIFIED' : 'N/A or incomplete'}`)
  console.log(`Idempotency: ${idempotencyCheck?.repeatData?.stars_earned === 0 ? 'VERIFIED (0 stars on repeat)' : idempotencyCheck?.repeatError ? 'N/A (error on repeat)' : 'UNKNOWN'}`)
  console.log(`Refresh persistence: ${persistCheck?.stillShowsCompleted ? 'VERIFIED' : 'NOT VERIFIED'}`)
  console.log(`Child isolation: ${isolationCheck?.rejected ? 'SECURE (rejected)' : 'FAILED!'}`)
  console.log(`Nimi AI: ${report.nimiAI?.responsePresent ? 'RESPONDS' : 'NO RESPONSE'}`)
  console.log(`Bugs found: ${report.bugs.length}`)
  if (report.bugs.length) report.bugs.forEach(b => console.log(`  [${b.severity}] ${b.id}: ${b.description}`))
  console.log(`\nTotal time: ${elapsed}s`)

  // Write full JSON report
  const outPath = '/tmp/claude-1000/-home-martin-Documents-Learn-with-NIMI/96017c0d-eb81-489b-9604-7e8b56982cfa/scratchpad/phase71-report.json'
  writeFileSync(outPath, JSON.stringify({
    summary: { elapsed, completionSucceeded, rpcStatus, starsEarned, firstSlotUsed },
    baseline: report.baseline,
    storySlots: report.storySlots,
    rawStorySlots: report.rawStorySlots,
    transactions: report.transactions,
    dbCheck,
    seqCheck,
    idempotencyCheck,
    persistCheck,
    nimiAI: report.nimiAI,
    profileCheck,
    isolationCheck,
    bugs: report.bugs,
  }, null, 2))
  console.log(`\nFull report: ${outPath}`)
}

main().catch(err => { console.error('\n❌ FATAL:', err.message); process.exit(1) })
