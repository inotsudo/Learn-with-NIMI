/**
 * Phase 69 — direct Supabase account creation (no browser needed).
 * Creates test+phase69@nimipiko.com parent + AirwaysTestChild in production.
 *
 * Run: node e2e/phase69-create-account.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const SUPABASE_URL  = 'https://bedajxejzdxtrsmqortg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZGFqeGVqemR4dHJzbXFvcnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTgyMTcsImV4cCI6MjA5NjU5NDIxN30.ZTxuBU4DRggTVrICMVx3w91D6saRQG84VeKO22OMa8I'

const TEST_EMAIL    = 'test+phase69@nimipiko.com'
const TEST_PASSWORD = 'Phase69Airways!Test'
const CHILD_NAME    = 'AirwaysTestChild'
const CREDS         = resolve(__dirname, '../.env.test')

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

async function main() {
  // ── 1. Try to sign in first (account may already exist) ──────────────────
  console.log('→ Trying to sign in with existing account…')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  let session = signInData?.session
  let userId  = signInData?.user?.id

  if (signInError || !session) {
    console.log('  Sign-in failed:', signInError?.message ?? 'no session')
    console.log('→ Signing up fresh…')

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email:    TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (signUpError) {
      console.error('✗ Sign-up failed:', signUpError.message)
      process.exit(1)
    }

    session = signUpData.session
    userId  = signUpData.user?.id

    if (!session) {
      console.error('✗ No session after sign-up — email confirmation may be required.')
      console.error('  Please confirm the email for', TEST_EMAIL, 'in Supabase Studio,')
      console.error('  then re-run this script.')
      process.exit(1)
    }

    console.log('✓ Account created, userId:', userId)

    // Insert parent record
    const { error: parentErr } = await supabase
      .from('parents')
      .upsert({ id: userId, email: TEST_EMAIL, name: 'Test Parent Phase69' }, { onConflict: 'id' })
    if (parentErr) console.log('  Note (parent upsert):', parentErr.message)
  } else {
    console.log('✓ Signed in successfully, userId:', userId)
  }

  // ── 2. Check if child already exists ─────────────────────────────────────
  const { data: existingKids } = await supabase
    .from('children')
    .select('id, name')
    .eq('parent_id', userId)
    .limit(5)

  if (existingKids && existingKids.length > 0) {
    console.log(`✓ Child profile(s) already exist:`, existingKids.map(k => k.name).join(', '))
    const testChild = existingKids.find(k => k.name === CHILD_NAME) ?? existingKids[0]
    console.log(`  Using: "${testChild.name}" (id: ${testChild.id})`)
    writeEnvTest(testChild.name)
    return
  }

  // ── 3. Create child profile ───────────────────────────────────────────────
  console.log(`→ Creating child profile "${CHILD_NAME}"…`)

  const { data: child, error: childErr } = await supabase
    .from('children')
    .insert({
      parent_id: userId,
      name:      CHILD_NAME,
      language:  'en',
      age:       6,
      avatar_url: JSON.stringify({ skin: 'light', hair: 'brown', eyes: 'brown', outfit: 'default' }),
    })
    .select('id, name')
    .single()

  if (childErr || !child) {
    console.error('✗ Failed to create child:', childErr?.message)
    process.exit(1)
  }

  console.log(`✓ Child "${child.name}" created (id: ${child.id})`)
  writeEnvTest(child.name)
}

function writeEnvTest(childName) {
  const content = [
    `PLAYWRIGHT_LEARNER_EMAIL=${TEST_EMAIL}`,
    `PLAYWRIGHT_LEARNER_PASSWORD=${TEST_PASSWORD}`,
    `PLAYWRIGHT_LEARNER_CHILD_NAME=${childName}`,
    `PLAYWRIGHT_BASE_URL=http://localhost:3000`,
  ].join('\n') + '\n'

  writeFileSync(CREDS, content, 'utf8')
  console.log(`\n✓ .env.test written`)
  console.log(`  Email:    ${TEST_EMAIL}`)
  console.log(`  Password: ${TEST_PASSWORD}`)
  console.log(`  Child:    ${childName}`)
  console.log('\nRun the journey spec:')
  console.log('  npx playwright test e2e/phase69-journey.spec.ts')
}

main().catch(err => { console.error(err); process.exit(1) })
