# NIMIPIKO — Full Build Log (Phase 2 → Phase 10)

> Complete record of every feature, system, and infrastructure layer built across all development phases.
> Phases are in chronological order. TypeScript was kept at zero errors throughout.

---

## Phase 1 — App Shell Foundation

- Persistent `AppShell` wrapping all authenticated pages (sidebar nav, top stats bar with ⭐stars/💎gems, language picker, notifications)
- `LogoutModal` added globally
- `components/layout/Sidebar.tsx` — 9 nav items, streak widget, profile footer

---

## Phase 2A — Today's Adventure Dashboard (Homepage Rebuild)

**Goal:** Replace the old 6-step `StoryJourney` section with a live dashboard.

- `components/home/DashboardHero.tsx` — time-of-day greeting in en/fr/rw, bobbing NIMI/PIKO avatars, "Today's Theme" banner
- `components/home/ActivityGrid.tsx` — 8-card activity grid with progress rings, star pills, mascot avatars
- `components/home/StatsSidebar.tsx` — streak calendar, badges preview, Today's Stars card, certificate teaser
- `app/_activityData.ts` — static `ACTIVITIES` config (8 entries) driving the grid across the app
- `lib/queries.ts` extended: `getMissionsForDayByCategory`, `getTodayStars`, `getWeekStreak`
- ~32 new i18n keys per language (en/fr/rw) in `LanguageContext.tsx`

---

## Phase E — Daily Adventure Missions Hub

**Goal:** Replace the legacy 4924-line `MissionsComponent.tsx` with a modern dashboard.

- `components/missions/DailyAdventureBanner.tsx` — ribbon banner with campus eyebrow, NIMI/PIKO avatars
- `components/missions/DailyAdventureGrid.tsx` — 2×4 grid, ALL 8 cards unlocked, real page links
- `components/missions/DailyAdventureSidebar.tsx` — progress ring, activity stars, Daily Champion reward card
- Global "Your Streak" widget added to `Sidebar.tsx` + `AppShell.tsx`
- All 8 activity `href`s point to real `/missions/*` pages (no placeholder anchors)
- ~18 new i18n keys

---

## Phase F + F2 — My Progress Page (`/user-profile`)

**Phase F:** Built the 4-tab progress dashboard replacing the legacy page.
- `ProgressHeader`, `GreetingCard`, `StatsRow` (4 KPI cards), `TodaysProgressCard`, `WeekStreakCard`, `WeeklyActivityChart`, `RecentBadgesCard`
- `lib/queries.ts` additions: `getTotalStars`, `getWeekActivityCounts`

**Phase F2:** Built out the 3 remaining tabs (Activity Progress / Skills / Streaks).
- `ActivityProgressTab.tsx` — 8 activity cards with gradient progress bars
- `SkillsTab.tsx` — 5 skill groups (Music, Movement, Creativity, Reading, Exploration) with level badges
- `StreaksTab.tsx` — current + longest streak (with 1-day grace period), 5-week Monday-first heatmap calendar
- Client-side streak computation: `computeCurrentStreak`, `computeLongestStreak`

---

## Phase G — My Certificates Page (`/certificates`)

- 8 certificates: 6 activity badges + Daily Champion (8/8 activities) + Weekly Champion (7/7 streak)
- `components/certificates/`: `CertificateCard`, `CertificatesHeader`, `CertificateGrid` (6-per-page, paginated)
- `_certificateData.ts` — `CERTIFICATES` config + `isCertificateEarned()` logic
- Share (Web Share API + WhatsApp fallback) + Print buttons on earned cards
- Sidebar + StatsSidebar links updated from `#certificate-panel` → `/certificates`

---

## Phase H — Community Gallery (`/community`)

**Goal:** Full redesign of the old 1248-line community page.

- `components/community/`: `GalleryHeader`, `GalleryCard` (image + avatar + like button)
- Filter tabs (All / Artwork / Coloring / Stories), search (client-side substring), "My Gallery" toggle
- `UploadModal` extended with creation type picker (Art / Coloring / Story)
- Removed: PikoPal leaderboard, Nimi Chat, Featured section, per-card comments/share
- ~14 new i18n keys

---

## Phase I — My Profile Page (`/user-profile/settings`)

- `ProfileCard.tsx` — avatar, name, Super Star badge, Level pill, XP bar (framer-motion)
- `ProfileStatsGrid.tsx` — 2×2 stat cards
- `ProfileBadgesRow.tsx` — 5-badge row linking to `/user-profile`
- `AccountSettingsCard.tsx` — 4 static rows (Change Avatar, Edit Name, Notifications, Privacy)
- `AppPreferencesCard.tsx` — real Language select wired to `useLanguage()`, Sound/Music toggles
- `navProfile` repointed from `/user-profile` → `/user-profile/settings`

---

## Phase J — Activity Details Page (`/user-profile/activity-details`)

- Per-activity weekly breakdown: all 8 activities with `X/7` weekly fraction + stars
- Linked from "View All" in `ActivityProgressTab`
- Auto-highlights "My Progress" in sidebar (no Sidebar changes needed)

---

## Phase K — Help & Support Page (`/help`)

- `HelpActionCards` — 4-card grid (How to Use / FAQs / Report an Issue / Contact Us)
- `PopularQuestionsCard` — 4 FAQ rows
- `SupportBanner` — purple→indigo gradient with NIMI avatar + Email Support CTA
- New `LifeBuoy` sidebar nav item
- ~19 new i18n keys

---

## Phase L — Reward Shop Page (`/shop`)

- `components/shop/`: `ShopHeader` (⭐/💎 pills), `ShopFilterTabs`, `ShopItemCard` (locked badge via `Lock` icon), `ShopGrid`, `ShopBanner`
- 8 items: 4 Accessories (unlocked) + 4 Backgrounds (locked)
- Empty state for Toys category
- New Gift `navRewardShop` sidebar entry between Certificates and Community

---

## Phase M — Parents Zone Page (`/parents`)

- `ParentsZoneHeader`, `ChildProgressCard` (SVG ring, 2×2 stats), `RecentActivitiesCard`, `WeeklyOverviewCard` (gradient bar chart)
- Active child name resolved via `getChildren()` + `ACTIVE_CHILD_KEY`
- "Download Report" button (presentational)
- Replaced legacy 1692-line `/parents/page.tsx`

---

## Phase N — Settings Page (`/settings`)

- `GeneralSettingsCard` — 4 audio/vibration toggles (local state)
- `ContentSettingsCard` — real Language select wired to `useLanguage()`; Reading Level + Content Filter presentational
- `SettingsAccountCard` — Change Password, Linked Accounts, Delete Account (danger styling)
- `navSettings` repointed to `/settings` (independent of `navProfile` → `/user-profile/settings`)

---

## Phase O — FlipFlop Book + Coloring Studio Restored

- `components/missions/ColoringStudio.tsx` — extracted from dead `MissionsComponent.tsx`: flood fill, 50-color palette, brush/fill/eraser, undo/redo (25-deep), save-PNG, responsive desktop/mobile toolbar
- `components/missions/StoryFlipBook.tsx` — extracted FlipBookViewer: page processing, audio auto-play per page, `HTMLFlipBook` with all original props
- Wired into `magic-stories` (StoryFlipBook) and `little-creators` (ColoringStudio)

---

## Phase P — Unified Dynamic Mission Container (`/missions/[category]`)

**Goal:** Replace 6 hand-built static mission pages with one admin-driven dynamic route.

- `supabase/migrations/010_missions_v2.sql` — adds `stars`, `subtitle`, `tip_text`, `content` JSONB columns; seeds 8 mission rows
- `MissionShell.tsx` — AppShell-wrapped shell with back link, progress sidebar, "Nimi Says" banner
- `MissionCompleteBanner.tsx` — shared 🎉 completion card
- 6 content components: `SingAlongContent` (karaoke mode, TTS), `MoveGrooveContent` (video + prompts), `WatchContent`, `ReadContent` (PDF), `ColoringContent`, `StoryContent`
- `app/missions/[category]/page.tsx` — validates category, loads via `getMissionsByCategories`, switches on `mission.type`
- **Deleted:** 6 old static mission pages + `MissionsComponent.tsx` + `_stepData.ts` + `_StepPageLayout.tsx`
- `lib/queries.ts` updated: `getMissionsByCategories` replaces the old per-day loop

---

## Phase Q — Talk to Nimi: Real Streaming AI

- `app/api/nimi/route.ts` — now injects `childName` into system prompt; persona enriched for "funny in every situation"
- `components/home/TalkToNimi.tsx` — real SSE streaming via `/api/nimi`; typing indicator (3-dot framer-motion); token-by-token streaming effect
- Handles multi-turn history (maps `nimi`→`assistant`)

---

## Phase R — Full Chat Page (`/talk-to-nimi`)

- `hooks/useNimiChat.ts` — extracted SSE streaming into a reusable hook with `onExchangeComplete` callback
- Auto-handoff after 2 exchanges: conversation history written to `sessionStorage`, `router.push("/talk-to-nimi")`
- `app/talk-to-nimi/page.tsx` — full AppShell-wrapped chat page; restores history + auto-sends the pending 3rd message on mount
- Layout bug fixed: `scrollIntoView` → direct `scrollTop = scrollHeight` on the message container (avoids scrolling the outer page)

---

## Phase S — Voice + Quick-Reply Chips

- `lib/speech.ts` — `speakText()` / `stopSpeaking()` (Web Speech Synthesis); disabled for Kinyarwanda (`language === "rw"` early return)
- `hooks/useSpeechToText.ts` — wraps `SpeechRecognition`/`webkitSpeechRecognition`; feature-detected via `supported`
- `components/home/QuickReplyChips.tsx` — 6 horizontally-scrollable suggestion chips
- Speaker toggle relocated to input row (widget) and below chat card (full page)
- Both surfaces: Mic button (pulses red while listening), mute toggle, quick-reply row

---

## Phase T — Nimi Chat Quest Layout

- `/talk-to-nimi` redesigned to a 3-column "NIMI CHAT QUEST" layout: quest tracker sidebar, main chat, topic panel
- Quest system: topic unlocking, progress tracking, animated completion states
- Story context injection: current story title/progress visible in system prompt

---

## Admin Portal Track

### Auth & Roles Foundation
- `supabase/migrations/013_admin_foundation.sql` — `admins` table + `is_admin()` security-definer + admin-bypass RLS policies
- `/admin/login` + `/admin/reset-password` pages
- `app/admin/adminAuth.ts` — 5-min TTL module-level cache for admin identity

### Shell Redesign (later rebranded green)
- `Sidebar.tsx` — expandable category submenus, 25+ nav items, profile footer
- `Navbar.tsx` — time-of-day greeting, live notification bell, language pill
- `page.tsx` — dynamic view loader (code-split, `ssr: false` per manager)
- `TableView.tsx`, `BucketsView.tsx`, `AdminProfile.tsx`

### Dashboard (DashboardHome)
- 5 stat cards with trend deltas: Total Children, Active Today, Missions Completed, Certificates Issued, Stories Published
- 8 category cards with EN/FR/RW coverage pills + Manage button
- Translation Coverage table + Content Pipeline table
- Recent Activity (merges 4 real DB sources)
- Revenue strip: Active Subs, MRR, Total Revenue, New This Month

### Mission Manager
- Per-category view: breadcrumb, ⭐ star count, searchable/paginated mission list
- `MissionEditor.tsx` — EN/FR/RW tabs, Copy from English, General/Content/Cover Image sections, live audio preview, Save Draft / Publish

### Story Manager + Story Publishing
- Story CRUD with slot management, ordering, publishing workflow
- `StorySlotsManager`, `StoryOrderingManager`, `StoryPublishingManager`
- `StoryEditor.tsx` — full story + page editor with cover image, audio per page

### Curriculum CMS (Migrations 038–040)
- `CurriculumManager.tsx` — Levels / Units / Lessons / Publishing / Coverage / Categories / Import tabs
- `LevelEditor`, `UnitManager`, `LessonManager`, `PublishingCenter`, `CoverageDashboard`
- `supabase/migrations/038_curriculum_units.sql`, `039_curriculum_units_metadata.sql`, `040_bulk_import_v2.sql`

### All Other Admin Managers (16 sidebar sections total)
| Manager | What it manages |
|---|---|
| `ColoringManager` | Coloring book CRUD + importer |
| `LanguagesManager` | Mission version translations |
| `FamiliesManager` | Parents + children + subscription badges |
| `ChildrenManager` | Per-child detail + history |
| `ParentsManager` | Parent detail + linked children |
| `CommunityManager` | Creation moderation |
| `CertificatesManager` | Certificate issuance |
| `CertificateTemplatesManager` | Template CRUD |
| `RewardsManager` | Child badges |
| `BadgesManager` | Badge image assets |
| `AnalyticsManager` | 5-tab analytics (Learner / Content / Language / Curriculum / Achievement) |
| `ProductsManager` | Pricing + products |
| `MasterpieceManager` | Masterpiece personalization |
| `NotificationsManager` | Push notifications |
| `SchoolsManager` | School inquiry pipeline |
| `AdministratorsManager` | Admin user CRUD |
| `NewsletterManager` | Subscriber list + CSV export |
| `ReferralManager` | Referral redemptions |
| `DiscountCodesManager` | Full discount code CRUD |
| `GiftManager` | Gift subscription tracking |
| `TestimonialsManager` | Testimonial moderation |
| `PartnersManager` | Partner listings |

---

## Design System Sprints

### Phase 3 — Token Foundation
- `app/globals.css` — full `--ds-*` CSS custom property system (brand, action, text, border, progress, state, surface)
- `lib/design-system/designConstants.ts` — canonical `DS` object with radius/spacing/text/shadow/color/border tokens
- All 60+ learner-facing files swept: `text-green-7xx` → `text-ds-brand`, `bg-green-1xx` → `bg-ds-subtle`, etc.
- Motion tokens: all `whileTap={{ scale }}` → `whileTap={m.buttonPress}` via `useThemeMotion`

### Phase 4 — Theme System
- `AppThemeProvider` — `AppThemeId = "hp" | "ocean"` source of truth; preview mode (`startPreview`, `applyPreview`, `cancelPreview`)
- `lib/design-system/componentVariants.ts` — `ComponentVariant` with 10 sub-interfaces mapped per theme
- `lib/design-system/themeEffects.ts` — `ThemeEffects` with 8 sub-interfaces
- Effect components: `FloatingParticles`, `ThemeBackground`, `HeroDecoration`, `DecorativeOverlay`
- `lib/design-system/themeMetadata.ts` — 6 theme entries (HP, Ocean Dream, Galactic Explorer, Forest Magic, Sunshine Valley, Night Sky)
- `/app/themes` — Theme Gallery + Marketplace with preview, filtering, unlock modal

### Phase 4 Sprints 1–9 (Complete)
All learner-facing pages cleaned of token violations. Auth/marketing pages documented as intentional exceptions.

---

## Track A — World Bible + Campus Polish

**World Bible:** `docs/brand/NIMIPIKO_WORLD_BIBLE.md` — full character lore, campus zones, mascot assignment rules (Nimi = guide, Piko = reward/celebration only).

**7 screens polished:**
| Screen | Zone | Eyebrow | Change |
|---|---|---|---|
| Homepage | Campus emerald | — | Ambient decorations 43→13, Zilo empty state |
| Story Experience | — | "The Library" | MagicLoader, campus emerald CTA |
| Missions | Campus amber/orange | "The Activity Grounds" | Piko → theme emoji in banner |
| Community | Campus sky/cyan | "Community Square" | bg-white → bg-gray-50 |
| Profile | Campus emerald/teal | "My Profile" | Piko removed from header |
| Shop | Campus amber/yellow | "The Treasure Room" | Piko kept (rewards = Piko territory) |
| Parents | Campus sky/blue | "Family Hub" | Piko → Nimi in hero |

**Technical debt closed:**
- `pikoCircle` typo fixed in `assetRegistry.ts`
- `defaultVariant` created in `componentVariants.ts`
- `AppShell` hardcoded `bg-white` removed
- `KidThemeProvider` → `AppThemeProvider`; default theme garden-light (white, #15803D)

**Post-Track-A additions:**
- Masterpiece nav: `Sidebar.tsx`, AppShell dropdown, home aside campus card
- Marketing landing page: `app/page.tsx` rewritten as public page; learner home → `app/home/page.tsx`
- Admin portal: rebranded dark-indigo → light-green across 40+ files
- `styles/homepage.css` — world-background CSS system, `--parchment`, `--nimi-green`, `bg-cta-gradient`
- Routing audit: 11 stale `href="/"` → `href="/home"` across authenticated pages

---

## Monetisation Phases (BR–BX)

### Phase BR — Story-First Monetisation
- Homepage right sidebar replaced: curriculum panel → "Story Journey" widget + "Week Streak" widget
- `app/onboarding/page.tsx` — 3-step post-signup flow (Welcome → Child setup → Launch)
- Landing page: trust stats bar, real prices ($14.99/mo USD, 9,900 RWF), "Parent Promise" section
- Pricing page: testimonials (3 quotes), FAQ accordion (5 Qs), trust badge row

### Phase BS — Legal & Viral Loop
- `app/privacy/page.tsx` — full COPPA-compliant Privacy Policy (11 sections)
- `app/terms/page.tsx` — full Terms of Use (13 sections, Rwanda governing law)
- `app/sitemap.ts` + `robots.ts` — SEO + crawl rules
- Certificate Share (Web Share API + WhatsApp) + Print buttons
- Admin Dashboard: Revenue strip (Active Subs, MRR, Total Revenue, New This Month)

### Phase BT — Subscription Self-Serve + Email
- `app/api/account/cancel-subscription/route.ts` — soft-cancel with `cancel_at_period_end`
- `lib/email.ts` — Resend-based transactional email: `sendWelcomeEmail`, `sendPaymentReceipt`, `sendRenewalConfirmation`, `sendCancellationConfirmation`, `sendGiftNotification`, `sendGiftConfirmation`
- Settings "Your Plan" row: shows subscription status + renewal date + Manage link
- `app/not-found.tsx` — kid-friendly 404 ("Nimi got lost in the jungle!")

### Phase BV — Security & Compliance
- `next.config.js` — security headers (X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy)
- `middleware.ts` — in-memory rate limiting on sensitive API routes (5/min: newsletter/schools; 10/min: payments; 30/min: account)
- `components/CookieConsentBanner.tsx` — GDPR/COPPA consent banner
- Club membership check in Sidebar: amber upgrade card (free) / green "Club Member" badge (subscribed)
- Newsletter section on landing page → `app/api/newsletter/route.ts` → `newsletter_signups` table

### Phase BW — Discount Code System
- `supabase/migrations/067_discount_codes.sql` — `discount_codes` + `discount_redemptions` tables
- `app/api/discount/validate/route.ts` — validates code, checks max_uses, applies_to slug
- Pricing page: promo code input, strikethrough price, "X% OFF" badge
- `increment_discount_uses` RPC — atomic concurrent-safe counter
- `DiscountCodesManager` admin panel — full CRUD, random code generator, copy-to-clipboard

### Phase BX — PWA Update Toast + Gift Subscriptions
- `hooks/useSwUpdate.ts` — detects new service worker via `controllerchange`
- `components/pwa/UpdateToast.tsx` — spring-animated "Nimi got an upgrade! Reload" banner
- `supabase/migrations/068_gift_subscriptions.sql` — `gift_subscriptions` table with 12-char redemption codes
- `app/api/gift/route.ts` — creates order + gift record
- `app/api/gift/redeem/route.ts` — preview (GET) + redeem (POST); creates subscription, marks gift redeemed
- `app/gift/redeem/page.tsx` — full standalone gift claim page with animated UI
- `GiftModal` on pricing page + `SentGiftsCard` in settings
- Annual plan toggle on pricing page (monthly/annual billing)

---

## Phase 9 — Unified AI Intelligence Layer

**Goal:** Migrate all 14 AI-powered routes off duplicated fetch boilerplate onto a single `callAI()` service.

### Core infrastructure
- `lib/ai/aiService.ts` — `callAI({ type, prompt, system, messages, temperature, signal })` — unified OpenRouter wrapper; all route types registered; returns `{ content: string }`
- `lib/ai/memory.ts` — `inferFromEvent()` — updates `learner_memories` from event type (lesson_completed, mission_completed, hint_requested, etc.)
- `OPENROUTER_KEY`, `OPENROUTER_URL`, `DEFAULT_MODEL` — single source of truth
- `stripJson()` — strips markdown fences from JSON-returning responses

### All 14 routes migrated

| Route | AI Type | Temperature | Events emitted |
|---|---|---|---|
| `/api/nimi` | `nimi_chat` | 0.8 | `hint_requested` |
| `/api/story-creator` | `story_generate` | 0.8 | `story_created` |
| `/api/quiz-generator` | `quiz_generate` | 0.7 | — |
| `/api/lesson-generator` | `lesson_generate` | 0.65 | — |
| `/api/coloring-coach` | `coloring_coach` | 0.7 | `mission_completed` (coloring) |
| `/api/drawing-coach` | `coloring_coach` | 0.65 | `mission_completed` (drawing) |
| `/api/voice-conversation` | `voice_chat` | 0.8 | — |
| `/api/pronunciation-coach` | `pronunciation_coach` | 0.7 | `hint_requested` (score < 50) |
| `/api/homework-generator` | `homework_generate` | 0.65 | — |
| `/api/creativity-challenges` | `creativity_challenge` | 0.85 | `mission_completed` per challenge |
| `/api/parent-ai` | `parent_insight` + `parent_recommendation` | 0.4 / 0.5 | — |
| `/api/parent-insights` | `parent_insight` | 0.4 | — |
| `/api/parent-recommendations` | `parent_recommendation` | 0.5 | — |
| `/api/teacher-insights` | `teacher_insight` | 0.4 | — |

### Intelligence gaps closed
- **Gap 1** — All routes now use `callAI()` (zero duplicated fetch boilerplate)
- **Gap 2** — Learner memories fetched and injected into system prompts (nimi, parent-ai)
- **Gap 3** — Every relevant interaction emits a `learner_event` → `inferFromEvent()` updates long-term memory
- **Gap 4** — `parent-ai` fetches memories in parallel with `buildInsightContext` via async IIFE
- **PromiseLike fix** — All fire-and-forget event chains wrapped in `Promise.resolve().catch()` (Supabase RPC `.then()` returns `PromiseLike`, not native `Promise`)

### DB layer (migrations 130)
- `learner_events` — append-only event log
- `learner_memories` — key-value memory store per child per type
- `get_learner_memories`, `log_learner_event`, `upsert_learner_memory` RPCs

---

## Phase 10 — Nimi Platform

### Public API (`supabase/migrations/131_public_api.sql`)
- `api_keys` table — SHA-256 hash stored; raw key (`nk_live_<64-hex>`) shown once at creation, never persisted
- `api_rate_limits` — sliding-window rate limiting via DB upsert (no in-memory state, survives cold starts)
- RPCs: `create_api_key`, `validate_api_key`, `check_and_increment_rate_limit`, `revoke_api_key`, `list_api_keys`

**`lib/api/apiKeyAuth.ts`**
- `hashApiKey()` — Web Crypto API (SHA-256), edge-safe
- `generateApiKey()` — `nk_live_<64-hex>` format
- `validateApiKeyRequest(authHeader, scope?)` — validates + rate-checks every request

**v1 API Routes** (all Edge runtime, Bearer auth, scoped)

| Route | Method | Scope | What it does |
|---|---|---|---|
| `/api/v1/keys` | GET/POST/DELETE | session | API key management |
| `/api/v1/learner/[childId]` | GET | `read:learner` | Learner profile + memories + recent activity |
| `/api/v1/ai/chat` | POST | `ai:chat` | Nimi chat via `callAI()` |
| `/api/v1/content/stories` | GET | `read:content` | Story catalog |
| `/api/v1/events` | POST | `write:events` | Log learner events |

---

### TypeScript SDK (`lib/sdk/`)

**`NimiClient`** — full platform SDK
```typescript
const client = new NimiClient({ apiKey: 'nk_live_...', baseUrl: 'https://nimipiko.com' })
await client.getLearner(childId)
await client.chat({ childId, message, language })
await client.listStories({ language, limit })
await client.logEvent({ childId, type, payload })
await client.listKeys(sessionToken)
await client.createKey({ name, scopes }, sessionToken)
await client.revokeKey(keyId, sessionToken)
```

- `NimiApiError extends Error` — structured error with `status` + `code`
- Full TypeScript types: `LearnerProfile`, `ChatRequest/Response`, `StoryListOptions/Response`, `EventRequest/Response`, `ApiKeyInfo`, `CreateKeyRequest/Response`

---

### Plugin System (`supabase/migrations/132_plugin_system.sql`)

**Tables:** `plugins`, `school_plugins`, `plugin_events`

**`lib/plugins/types.ts`**
- 5 hook names: `before_ai_response`, `after_ai_response`, `on_mission_complete`, `on_story_load`, `on_event`
- 5 permissions: `read:learner`, `write:memory`, `emit:events`, `inject:prompt`, `read:content`
- `PluginManifest`, `PluginContext`, `PluginResult`, `InstalledPlugin`

**`lib/plugins/registry.ts`** — module-level 5-min TTL cache per school; `getSchoolPlugins()`, `getPluginsForHook()`, `invalidateSchoolCache()`

**`lib/plugins/executor.ts`**
- `executeHook()` — `new Function()` strict-mode IIFE, blocked globals (`fetch`, `process`, `require`, `eval`), 50ms CPU watchdog
- `runHookPipeline()` — sequential execution, merges mutations, applies memory upserts + events

**Plugin API Routes**
- `GET/POST /api/plugins` — marketplace list + publish (with manifest validation)
- `GET /api/plugins/[slug]` — details
- `POST /api/plugins/[slug]` — install for a school (school admin only)
- `DELETE /api/plugins/[slug]` — uninstall

---

### Offline AI Support

**`lib/offline/offlineAI.ts`**
- `getOfflineResponse({ type, language, childName })` — rule-based fallback for 6 AI types
- Response banks in en/fr/rw for: `nimi_chat`, `voice_chat`, `lesson_hint`, `coloring_coach`, `drawing_coach`, `pronunciation_coach`
- `isOfflineError(e)` — detects network errors for automatic fallback

**`lib/offline/aiQueue.ts`**
- `enqueueAIRequest(endpoint, body, type)` — queues failed AI requests in localStorage
- `flushAIQueue(getToken)` — replays on reconnect; 4xx discarded, 5xx requeued up to 3 retries, 24h TTL
- `registerOnlineSync(getToken)` — attaches `window.addEventListener("online", ...)` listener

**`public/sw.js` extensions**
- `AI_CACHE = "nimi-ai-v1"` — 30-min TTL cache for GET-safe AI routes
- Cacheable routes: `/api/v1/content/stories`, `/api/creativity-challenges`, `/api/coloring-coach`, `/api/drawing-coach`
- Network-first with `X-Cached-At` timestamp check; `CLEAR_AI_CACHE` message handler

---

### Enterprise Integrations (`supabase/migrations/133_enterprise.sql` + `134_enterprise_rpcs.sql`)

**Tables:** `enterprise_accounts`, `enterprise_school_links`, `xapi_statements`, `lti_nonces`, `roster_staged_users`

All enterprise tables use RLS `using(false)` — service-role only via security-definer RPCs.

**`lib/enterprise/lti.ts`** — LTI 1.3 JWT validation
- JWKS-based signature verification via `crypto.subtle` (edge-safe, no Node.js crypto)
- Role detection: instructor/admin/learner from IMS role IRIs
- `verifyLtiToken(token, jwksUrl, clientId)` — temporal, audience, version, signature checks
- `extractLaunchResult(claims)` — normalises claims into `LtiLaunchResult`

**`lib/enterprise/xapi.ts`** — xAPI 1.0.3 statement builder
- Standard ADL verb IRIs: `experienced`, `attempted`, `completed`, `passed`, `failed`, `answered`, `mastered`
- Convenience builders: `lessonCompleted`, `quizAnswered`, `missionCompleted`, `storyRead`
- `formatIsoDuration(seconds)` — seconds → ISO 8601 `PT#M#S`

**`lib/enterprise/exporter.ts`** — CSV/JSON export
- RFC 4180-compliant CSV with proper quoting
- Timestamped filenames: `nimipiko_progress_{schoolId}_{timestamp}.csv`
- `exportSchema('learner_progress')` — self-documenting column map

**`lib/enterprise/roster.ts`** — Clever + ClassLink webhook handler
- `parseRosterWebhook(provider, body)` — normalises both provider formats to `RosterEvent`
- `verifyCleverSignature(rawBody, sig, secret)` — HMAC-SHA256 (edge-safe)
- `buildSyncResult(event, action, ok)` — structured response for callers

**Enterprise API Routes**

| Route | Method | Auth | What it does |
|---|---|---|---|
| `/api/enterprise/lti/launch` | POST | Platform JWT | LTI 1.3 launch: validate JWT → consume nonce → redirect |
| `/api/enterprise/lti/jwks` | GET | Public | Platform JWKS endpoint (1h cache) |
| `/api/enterprise/sso/[provider]` | GET | OAuth code | SSO callback (Google/Microsoft/Clever/ClassLink) → Supabase session |
| `/api/enterprise/export` | GET | Bearer (school admin) | CSV/JSON learner progress export |
| `/api/enterprise/roster` | POST | Webhook signature | Clever/ClassLink roster sync → `roster_staged_users` |
| `/api/enterprise/xapi` | POST | Bearer | Queue xAPI statements |
| `/api/enterprise/xapi?flush=1` | POST | `CRON_SECRET` | Batch-forward to external LRS |

**xAPI cron** — `vercel.json` entry: `/api/enterprise/xapi?flush=1` every 15 minutes.

---

### Roster Provisioning (Admin Portal)

**`app/api/admin/roster/route.ts`** — service-role backed admin endpoint
- `GET ?type=student|teacher|school&status=pending|linked|archived` — paginated list + status counts
- `PATCH { id, linkedChildId?, status?, schoolId? }` — link or re-status; auto-sets `status=linked`
- `DELETE ?id=` — soft-archive (never hard-delete)

**`app/admin/RosterProvisioningManager.tsx`** — admin portal view at sidebar → "Roster Sync"
- Record-type tabs (Students / Teachers / Schools) + Status filter tabs (Pending / Linked / Archived)
- `LinkChildModal` — search existing children by name, pick one, confirm; optimistic row update
- Raw provider JSON expandable per row
- Empty states with Clever webhook docs link
- **Security boundary:** roster webhooks never auto-create `auth.users` — a super admin reviews and manually links here

---

## Security Summary

| Threat | Mitigation |
|---|---|
| API key theft | SHA-256 hash stored; raw key shown once, never persisted |
| Key abuse | Sliding-window rate limiting per key in Supabase (survives cold starts) |
| Scope creep | Scoped API keys enforced at every v1 route handler |
| Plugin malice | `new Function()` IIFE, blocked globals, 50ms CPU watchdog |
| LTI replay | INSERT-based nonce consumption — conflict = rejected |
| Roster forgery | HMAC-SHA256 (Clever) + pre-shared Bearer secret (ClassLink) |
| DB privilege escalation | `security definer` RPCs; RLS blocks direct table access on all enterprise tables |
| Untrusted roster data | Staged in `roster_staged_users` — no auto-provisioning of auth accounts |
| Admin portal auth | Client-side `admins` table check; no middleware (middleware auth was causing infinite redirect loop — see [[project_admin_auth_fix]]) |

---

## Stats

| Category | Count |
|---|---|
| Supabase migrations | 134 |
| API routes built | 40+ |
| Admin managers | 22 |
| Learner-facing pages | 15 |
| i18n keys (en/fr/rw) | 300+ |
| TypeScript errors at completion | 0 |
