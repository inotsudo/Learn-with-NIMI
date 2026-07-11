# NIMIPIKO — Project Structure

> Last updated: 2026-07-04

---

## Quick stats

| Metric | Count |
|---|---|
| App routes | 29 |
| API routes | 24 |
| DB migrations | 59 (000 → 059) |
| Component directories | 24 |
| Custom hooks | 24 |
| Context providers | 7 |
| npm dependencies | 465 |

---

## App Routes (`app/`)

### Special files
- `app/layout.tsx` — root layout (wraps entire app)
- `app/error.tsx` — root error boundary
- `app/global-error.tsx` — global error boundary
- `app/globals.css` — global CSS
- `app/manifest.ts` — PWA web manifest
- `app/_achievementData.ts` / `app/_activityData.ts` — private data modules (not routes)

### Pages

| Route | File | Type |
|---|---|---|
| `/` | `app/page.tsx` | marketing |
| `/home` | `app/home/page.tsx` | learner (authenticated dashboard) |
| `/loginpage` | `app/loginpage/page.tsx` | auth |
| `/signuppage` | `app/signuppage/page.tsx` | auth |
| `/forgot-password` | `app/forgot-password/page.tsx` | auth |
| `/reset-password` | `app/reset-password/page.tsx` | auth |
| `/stories` | `app/stories/page.tsx` | learner |
| `/stories/[slug]` | `app/stories/[slug]/page.tsx` | learner, dynamic |
| `/stories/[slug]/mission/[slot]` | `app/stories/[slug]/mission/[slot]/page.tsx` | learner, 2× dynamic |
| `/missions` | `app/missions/page.tsx` | learner |
| `/missions/[category]` | `app/missions/[category]/page.tsx` | learner, dynamic |
| `/community` | `app/community/page.tsx` | learner |
| `/certificates` | `app/certificates/page.tsx` | learner |
| `/masterpiece` | `app/masterpiece/page.tsx` | learner |
| `/themes` | `app/themes/page.tsx` | learner |
| `/treasure` | `app/treasure/page.tsx` | learner |
| `/shop` | `app/shop/page.tsx` | learner |
| `/pricing` | `app/pricing/page.tsx` | marketing |
| `/parents` | `app/parents/page.tsx` | parent |
| `/schools` | `app/schools/page.tsx` | marketing |
| `/settings` | `app/settings/page.tsx` | learner |
| `/help` | `app/help/page.tsx` | support |
| `/talk-to-nimi` | `app/talk-to-nimi/page.tsx` | learner |
| `/user-profile` | `app/user-profile/page.tsx` | learner |
| `/user-profile/settings` | `app/user-profile/settings/page.tsx` | learner |
| `/user-profile/activity-details` | `app/user-profile/activity-details/page.tsx` | learner |
| `/admin` | `app/admin/page.tsx` | admin |
| `/admin/login` | `app/admin/login/page.tsx` | admin |
| `/admin/reset-password` | `app/admin/reset-password/page.tsx` | admin |

> **Note:** `app/admin/` co-locates ~50 non-route component files alongside the 3 page files. See Observations.

---

## API Routes (`app/api/`)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/geo` | Country/region detection |
| GET | `/api/featured-stories` | Featured stories list |
| GET | `/api/popular-stories` | Popular stories list |
| GET | `/api/certificate` | Certificate fetch / generation |
| POST | `/api/nimi` | NIMI AI chat backend (Claude) |
| POST | `/api/checkout` | Subscription checkout |
| POST | `/api/confirm-payment` | Payment confirmation |
| POST | `/api/payments/cybersource` | CyberSource card payment |
| POST | `/api/payments/cybersource-context` | CyberSource context token |
| POST | `/api/payments/mtn-momo` | MTN Mobile Money payment |
| POST | `/api/webhooks/cybersource` | CyberSource webhook handler |
| POST | `/api/masterpiece/generate` | AI image generation |
| GET | `/api/masterpiece/download` | Download generated image |
| POST | `/api/creations/upload` | Upload community creation |
| POST | `/api/creations/[id]/like` | Like / unlike a creation |
| POST | `/api/creations/[id]/share` | Share a creation |
| GET | `/api/creations/[id]/comments` | Fetch creation comments |
| POST | `/api/push/notify` | Send push notification |
| POST | `/api/admin/push/broadcast` | Admin push broadcast |
| POST | `/api/account/delete` | Account deletion (GDPR) |
| GET | `/api/cron/daily-reminder` | ⏰ Cron 17:00 UTC — daily push |
| GET | `/api/cron/renew-subscriptions` | ⏰ Cron 06:00 UTC — subscription renewal |
| GET | `/api/cron/check-momo-renewals` | ⏰ Cron 12:00 UTC — MTN MoMo renewals |

---

## Components (`components/`)

### By directory

| Directory | Files | Purpose |
|---|---|---|
| `home/` | 40+ | Authenticated dashboard — hero, story journey, AI chat, achievements, stats |
| `ui/` | 50+ | shadcn/ui radix-based primitive library |
| `profile/` | 20 | User profile — stats, badges, activity timeline, streaks, modals |
| `themes/` | 12 | Theme gallery browser, detail panel, switcher, unlock modal |
| `missions/` | 13 | Mission content shells — read, watch, sing, color, move |
| `layout/` | 6 | AppShell, Sidebar, AppFooterBar, NotificationPanel, LogoutModal |
| `community/` | 8 | Gallery cards, upload modal, parent gate, share flow |
| `certificates/` | 6 | CertificateRenderer, AchievementDashboard, BadgeRenderer |
| `delight/` | 11 | Micro-animations — FloatingCoins, FloatingStars, CelebrationOverlay, RewardBurst |
| `settings/` | 6 | ThemePicker, GeneralSettingsCard, ContentSettingsCard, SettingsAccountCard |
| `parents/` | 7 | Parent dashboard cards — insights, progress timeline, language journey |
| `storybook/` | 8 | Interactive storybook reader — controls, toolbar, pages, context |
| `magic/` | 6 | Themed primitives — MagicCard, MagicButton, MagicLoader, MagicDialog |
| `shop/` | 6 | ShopHeader, ShopGrid, ShopItemCard, ShopFilterTabs |
| `homepage/` | 8 | Public marketing page sections + scoped UI primitives |
| `admin/` | 6 | Publishing workflow UI, story readiness scoring |
| `effects/` | 4 | FloatingParticles, DecorativeOverlay, HeroDecoration, ThemeBackground |
| `media/` | 3 | StoryAudioPlayer, StoryIllustrationViewer, StoryVideoPlayer |
| `challenges/` | 4 | ChampionChallengeCard, CommunityShareEntry, TreasurePreview |
| `parent/` | 6 | Utility helpers — sticker download, safe navigation, child types |
| `auth/` | 2 | AuthBackground, GoogleIcon |
| `pwa/` | 1 | InstallPrompt |
| `stories/` | 1 | PersonalizeModal |
| `marketing/` | 3 | ActivityIconRow, MarketingFooter, MarketingHeader |
| root-level | ~30 | AuthGate, LoginModal, MascotBubble, NimiAssistant, ProgressCard, SkeletonCard, etc. |

---

## Lib & Utilities (`lib/`)

### `lib/design-system/`

| File | Purpose |
|---|---|
| `theme.ts` | `AppThemeId` type, `applyThemeVars()`, semantic token system |
| `themeMetadata.ts` | `THEME_REGISTRY` — 7 themes with metadata, getters, status helpers |
| `assetRegistry.ts` | Per-theme asset map (nimiCircle, pikoCircle, hero images) |
| `componentVariants.ts` | CVA-style card/button variants per theme |
| `motion.ts` | `SPRING`, `DURATION` constants; shared Framer Motion configs |
| `tokens.ts` | Design tokens |
| `delight.ts` | Delight/celebration animation helpers |
| `themeEffects.ts` | CSS effect generators per theme |
| `designConstants.ts` | Spacing, radius, color constants |

### `lib/payments/` & `lib/cybersource/`

| File | Purpose |
|---|---|
| `payments/products.ts` | Subscription product SKUs and pricing |
| `payments/types.ts` | Payment provider TypeScript types |
| `cybersource/signer.ts` | CyberSource HTTP signature signing |
| `cybersource/verify.ts` | CyberSource webhook verification |

### Data & queries

| File | Purpose |
|---|---|
| `queries.ts` | Primary Supabase query helpers (`getChildren`, `getTodayStars`, etc.) |
| `storyRepository.ts` | Story CRUD and listing |
| `storyProgressRepository.ts` | Per-child story progress read/write |
| `storyCertificateRepository.ts` | Certificate generation and retrieval |
| `weeklyChallengeRepository.ts` | Weekly challenge tracking |
| `adminAnalytics.ts` | Admin dashboard analytics aggregations |
| `parentInsights.ts` | Parent-facing streak/progress computations |
| `database.ts` | Generated Supabase TypeScript schema types |

### Audio & speech

| File | Purpose |
|---|---|
| `speak.ts` | TTS high-level wrapper |
| `speech.ts` | Web Speech API integration |
| `soundEffects.ts` | Sound trigger helpers |
| `sounds.ts` | Audio asset registry |

### Misc utilities

| File | Purpose |
|---|---|
| `translations.ts` | i18n string tables (en / fr / rw) |
| `missions.ts` | Mission data-fetching and completion logic |
| `nimiPersonality.ts` | NIMI AI character config and prompt templates |
| `guestProgress.ts` | localStorage progress for unauthenticated users |
| `offlineQueue.ts` | Queue actions offline, flush on reconnect |
| `storyReadiness.ts` | Story publish readiness scoring algorithm |
| `push.ts` | Push notification helpers |
| `uploadWithProgress.ts` | File upload with progress tracking |
| `signposts.ts` | Progress milestone logic |
| `personalize.ts` | Story personalization logic |
| `utils.ts` | General utilities (`cn`, etc.) |
| `supabase.ts` / `supabase.js` / `supabaseClient.ts` | ⚠ Three Supabase client files — see Observations |

---

## Contexts (`contexts/`)

| File | Purpose |
|---|---|
| `AppThemeProvider.tsx` | Active visual theme — applies CSS vars, persists choice |
| `AuthContext.tsx` | Supabase session, sign in / sign out |
| `UserContext.tsx` | Authenticated user profile + child profiles array |
| `LanguageContext.tsx` | Active learning language (en / fr / rw) + `t()` helper |
| `ThemeContext.tsx` | Theme metadata and switching state |
| `NimiAssistantContext.tsx` | AI assistant floating panel open/close + message queue |
| `NimiReaderContext.tsx` | Text-to-speech reader state (playing, current text) |

Provider order in `app/layout.tsx`:
```
LanguageProvider
  NimiReaderProvider
    SupabaseProviderWrapper
      UserProvider
        ThemeProvider
          AppThemeProvider
```

---

## Hooks (`hooks/`)

| Hook | Purpose |
|---|---|
| `useCelebration` | Celebration animation trigger |
| `useChildActivities` | Fetches child activity history |
| `useChildren` | Fetches and manages child profiles |
| `useCreationUpload` | Community creation upload flow |
| `useDebounce` | Input debounce |
| `useHeroReaction` | Hero/mascot reaction animation |
| `useInfiniteScroll` | Intersection observer infinite scroll |
| `useKidSafe` | Kid-safe content/navigation guard |
| `useMission` | Mission state, completion, progress |
| `useMobile` | Mobile breakpoint detection |
| `useMotion` | Motion preference and animation helpers |
| `useNimiChat` | NIMI AI chat state and messaging |
| `useOfflineSync` | Offline queue flush on reconnect |
| `useOnlineStatus` | Network online/offline detection |
| `useProgressAnimation` | Progress bar animation |
| `usePushNotifications` | Push subscription registration |
| `useReducedMotionPreferences` | Respects `prefers-reduced-motion` |
| `useRewardAnimation` | Reward/coin burst animation |
| `useSpeechToText` | Speech-to-text recording |
| `useStoryAdventure` | Story adventure session state |
| `useSupabaseQuery` | Generic typed Supabase query hook |
| `useThemeMotion` | Theme-aware motion settings |
| `useToast` | Toast notification helper |
| `useWindowSize` | Window dimensions |

---

## Public Assets (`public/`)

```
public/
├── assets/          General static assets
├── flags/           Country/language flag images
├── flipbooks/       Flip book PDF/image assets
├── icons/           App icons
│   └── story/       Story-specific icons
├── magic/           "Magic" theme visual assets
├── mascot/          NIMI mascot images
├── mission-previews/ Mission thumbnail images
├── nimi/            NIMI character assets
├── sounds/          Audio/sound effect files
├── stickers/        Downloadable reward stickers
├── story/           Story illustration assets
├── themes/
│   ├── default/     Nimipiko World theme assets
│   ├── hp/          Happy Place theme assets
│   └── ocean/       Ocean Dream theme assets
└── uploads/         User-uploaded community content
```

---

## Supabase (`supabase/`)

```
supabase/
├── migrations/      59 SQL migrations (000 → 059) + rollback scripts
├── functions/       archive-missions/ (Edge Function)
├── tests/           9 pgTAP SQL test files
└── .temp/           CLI local state (linked project ref)
```

---

## Config files (root)

| File | Purpose |
|---|---|
| `next.config.js` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS configuration |
| `tsconfig.json` | TypeScript compiler config |
| `components.json` | shadcn/ui component registry |
| `postcss.config.mjs` | PostCSS config |
| `vercel.json` | Vercel config — 3 cron job schedules |
| `playwright.config.ts` | Playwright e2e test runner |
| `package.json` | Project manifest (name: NIMIPIKO, version: 1.0.0) |

Other root-level items: `docs/` (~80 architecture docs), `e2e/` (Playwright tests), `scripts/` (2 debug scripts), `make-circle.js` (asset utility).

---

## Observations

### ⚠ Three Supabase client files
`lib/supabase.js`, `lib/supabase.ts`, and `lib/supabaseClient.ts` all export Supabase clients with no clear ownership boundary. Risk of inconsistent auth state or duplicate connections. Should be consolidated to a single canonical export.

### ⚠ Admin components co-located with routes
`app/admin/` contains ~50 non-route `.tsx` component files alongside 3 `page.tsx` route files. These should move to `components/admin/` to keep the `app/` directory strictly for routing.

### ⚠ Parallel parent directories
`components/parent/` (kebab-case, utility helpers) and `components/parents/` (PascalCase, dashboard cards) coexist. The naming is confusing — new files are likely to land in the wrong one.

### 🔒 TLS certificates in source tree
CyberSource `.pem` and `.p12` files are committed to `app/certs/`. These should be stored in environment variables or a secret manager, not in the repository.

### ⚠ 465 npm dependencies
Unusually high dependency count for a Next.js app. Worth an audit pass to identify duplicates, unused packages, or lighter alternatives.

### ℹ Ad-hoc SQL bundle at root
`morning_pool_migrations_bundle.sql` sits at the project root outside `supabase/migrations/`. It's unclear whether this is applied or pending — should be integrated into the versioned migration sequence or deleted.
