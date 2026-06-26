# SA-1.0 — Existing System Impact Report

## 1. Database Tables (25 tables)

| Table | Migration | Classification | Action |
|-------|-----------|---------------|--------|
| `parents` | 001 | **KEEP** | Unchanged. Auth trigger + user identity. |
| `children` | 001 | **KEEP** | Unchanged. `language`, `age`, `avatar_url`, `name` all used by Story Adventure. |
| `parental_settings` | 001 | **KEEP** | Unchanged. Independent of content model. |
| `stories` | 001 | **EXTEND** | Add: `status`, `age_min`, `age_max`, `scheduled_publish_at`, `published_at`, `retired_at`. Derive `is_active` from `status`. |
| `story_pages` | 001 | **KEEP** | Unchanged. Serves FlipFlop Audio slot. FK → stories ON DELETE CASCADE. |
| `coloring_pages` | 001 | **KEEP** | Unchanged. Serves Coloring Activity slot. FK → stories ON DELETE CASCADE. |
| `missions` | 001 | **KEEP** | Unchanged. `story_id` FK already exists (nullable). `type` CHECK already covers all 6 slot types. |
| `child_progress` | 001 | **KEEP** | Unchanged. `(child_id, mission_id, language)` — content-model agnostic. |
| `coloring_saves` | 001 | **KEEP** | Unchanged. Fabric.js canvas persistence. |
| `child_badges` | 001 | **DORMANT** | Legacy. Superseded by `child_achievements`. No new writes. |
| `categories` | 012 | **DORMANT** | BK-specific 8-category taxonomy. Retained for FK integrity (`missions.category_slug`). No new rows. |
| `mission_versions` | 012 | **KEEP** | Unchanged. Per-language content for all mission types. Status workflow (028) reused. |
| `story_page_versions` | 012 | **KEEP** | Unchanged. Per-language narration for FlipFlop pages. |
| `child_achievements` | 012 | **KEEP** | Unchanged. New `story-{slug}-*` slugs coexist with existing `level-*` slugs. |
| `admins` | 013 | **KEEP** | Unchanged. Admin auth. |
| `push_subscriptions` | 016 | **KEEP** | Unchanged. Web push. |
| `push_broadcasts` | 017 | **KEEP** | Unchanged. Admin push broadcasts. |
| `level_missions` | 026 | **DORMANT** | BK-specific. Maps (level, unit, category) → mission. Retained for FK integrity. No new rows. |
| `language_switch_log` | 031 | **KEEP** | Unchanged. Analytics. |
| `curriculum_levels` | 032 | **DORMANT** | BK-specific. Retained for FK integrity. No new rows. |
| `creations` | 034 | **KEEP** | Unchanged. Community gallery. |
| `likes` | 034 | **KEEP** | Unchanged. Community likes. |
| `shop_purchases` | 036 | **KEEP** | Unchanged. Reward shop. |
| `curriculum_units` | 038 | **DORMANT** | BK-specific. CMS-only metadata. No new rows. |

**NEW tables (6):** `story_versions`, `story_slots`, `story_intro_progress`, `weekly_challenges`, `weekly_challenge_versions`, `weekly_challenge_progress`

### Summary

| Classification | Count | Tables |
|---------------|-------|--------|
| KEEP | 16 | parents, children, parental_settings, story_pages, coloring_pages, missions, child_progress, coloring_saves, mission_versions, story_page_versions, child_achievements, admins, push_subscriptions, push_broadcasts, language_switch_log, creations, likes, shop_purchases |
| EXTEND | 1 | stories |
| DORMANT | 5 | child_badges, categories, level_missions, curriculum_levels, curriculum_units |
| NEW | 6 | story_versions, story_slots, story_intro_progress, weekly_challenges, weekly_challenge_versions, weekly_challenge_progress |

---

## 2. RPC Functions

| Function | Final Migration | Classification | Rationale |
|----------|----------------|---------------|-----------|
| `handle_new_user()` | 001 | **REUSE** | Trigger. Creates parent row on signup. Content-agnostic. |
| `is_my_child(p_child_id)` | 001 | **REUSE** | Auth helper. Used by all completion RPCs. |
| `is_admin()` | 013 | **REUSE** | Auth helper. Used by all admin RPCs. |
| `is_superadmin()` | 015 | **REUSE** | Auth helper. |
| `admin_lookup_user_by_email(p_email)` | 015 | **REUSE** | Admin tool. |
| `admin_role()` | 018 | **REUSE** | Auth helper. |
| `admins_protect_last_superadmin()` | 018 | **REUSE** | Trigger. |
| `get_push_reminder_targets()` | 016 | **REUSE** | Push notifications. Content-agnostic. |
| `category_effective_language(p_cat, p_lang)` | 020 | **LEGACY** | BK-specific language fallback per category. Not called by Story Adventure code. Retained in DB. |
| `get_daily_missions(p_child_id)` | 021 | **LEGACY** | BK-specific. Pre-curriculum daily mission fetch. Retained in DB. |
| `complete_mission(p_child_id, p_mission_id)` | 021 | **LEGACY** | BK-specific. Pre-curriculum completion. Retained in DB. |
| `get_current_level(p_child_id, p_lang)` | 037 | **LEGACY** | BK curriculum. Determines level from level_missions. Retained in DB. |
| `get_current_position(p_child_id, p_lang)` | 038 | **LEGACY** | BK curriculum. Determines (level, unit) position. Retained in DB. |
| `get_curriculum_missions(p_child_id)` | 038 | **LEGACY** | BK curriculum. Returns 8-category grid. Retained in DB. |
| `complete_curriculum_mission(p_child_id, p_mission_id)` | 038 | **LEGACY** | BK curriculum. Awards level/unit badges. Retained in DB. |
| `sync_mission_version_published(p_id, p_lang, p_pub)` | 028 | **REUSE** | Content workflow. Syncs `missions.active` from version status. |
| `admin_bulk_import_missions(p_csv_text)` | 040 | **ADAPT** | BK-specific CSV format. Needs story-aware variant for Story Adventure. Keep existing for legacy. |
| `level_slot_available(p_mission, p_cat, p_lang)` | 037 | **LEGACY** | BK-specific. Checks if level slot has published content. |
| `publish_mission_version_revision(p_mission, p_lang)` | 037 | **REUSE** | Content workflow. Publishes a revision. Content-agnostic. |
| `create_mission_version_revision(p_mission, p_lang)` | 037 | **REUSE** | Content workflow. Creates a new revision. Content-agnostic. |
| `admin_archive_lesson(p_mission_id)` | 042 | **REUSE** | Content management. Mission-scoped, not BK-specific. |
| `admin_restore_lesson(p_mission_id)` | 042 | **REUSE** | Content management. |
| `get_curriculum_integrity_report()` | 042 | **LEGACY** | BK-specific integrity check. |
| `export_unit_content(p_level, p_unit)` | 042 | **LEGACY** | BK-specific export. |

### Summary

| Classification | Count |
|---------------|-------|
| REUSE (unchanged) | 13 |
| ADAPT | 1 (admin_bulk_import_missions) |
| LEGACY (keep in DB, remove from active flow) | 11 |

---

## 3. App Routes (20 routes)

| Route | Classification | Story Adventure Action |
|-------|---------------|----------------------|
| `/` | **ADAPT** | Homepage transforms from 8-category grid to Story Library + current story |
| `/loginpage` | **KEEP** | Auth. Unchanged. |
| `/signuppage` | **KEEP** | Auth. Unchanged. |
| `/forgot-password` | **KEEP** | Auth. Unchanged. |
| `/reset-password` | **KEEP** | Auth. Unchanged. |
| `/missions` | **REDIRECT** | Redirect to `/stories`. BK daily adventure grid replaced by story library. |
| `/missions/[category]` | **LEGACY** | Keep for deep links/bookmarks. Not linked from new UI. |
| `/user-profile` | **ADAPT** | Progress tabs change from 8-category to story-based metrics. |
| `/user-profile/activity-details` | **ADAPT** | Activity list changes from categories to story slots. |
| `/user-profile/settings` | **KEEP** | Profile settings. Unchanged. |
| `/certificates` | **ADAPT** | Achievement dashboard adds story certificates tier. |
| `/shop` | **KEEP** | Reward shop. Unchanged. |
| `/community` | **KEEP** | Community gallery. Unchanged. |
| `/talk-to-nimi` | **KEEP** | AI chat. Unchanged. |
| `/parents` | **ADAPT** | Parent dashboard changes from level-based to story-based insights. |
| `/settings` | **KEEP** | App settings. Unchanged. |
| `/help` | **KEEP** | Help & support. Unchanged. |
| `/admin` | **ADAPT** | CMS sidebar reorganization. Story-first navigation. |
| `/admin/login` | **KEEP** | Admin auth. Unchanged. |
| `/admin/reset-password` | **KEEP** | Admin auth. Unchanged. |

**NEW routes:** `/stories`, `/stories/[slug]`, `/stories/[slug]/intro/[step]`, `/stories/[slug]/mission/[slot]`, `/stories/[slug]/certificate`, `/stories/[slug]/challenge`

### Summary

| Classification | Count |
|---------------|-------|
| KEEP | 11 |
| ADAPT | 6 |
| REDIRECT | 1 (`/missions` → `/stories`) |
| LEGACY | 1 (`/missions/[category]`) |
| NEW | 6 |

---

## 4. Admin Components (42 components)

| Component | Classification | Rationale |
|-----------|---------------|-----------|
| DashboardHome.tsx | **ADAPT** | Update metrics from level-based to story-based |
| Sidebar.tsx | **ADAPT** | Reorganize: Stories section primary, Legacy Curriculum collapsed |
| Navbar.tsx | **KEEP** | Navigation bar. Unchanged. |
| Skeleton.tsx | **KEEP** | Loading skeleton. Unchanged. |
| StatCard.tsx | **KEEP** | Reusable stat card. Unchanged. |
| TableView.tsx | **KEEP** | Reusable table view. Unchanged. |
| ConfirmDialog.tsx | **KEEP** | Reusable dialog. Unchanged. |
| StoryManager.tsx | **ADAPT** | Add status lifecycle, age range, scheduled_publish_at, validation, slot overview |
| StoryEditor.tsx | **ADAPT** | Add intro URLs, story_versions CRUD, 6-slot grid, weekly challenge section |
| MissionEditor.tsx | **KEEP** | Works for any mission. Content-agnostic. |
| MissionManager.tsx | **ADAPT** | Filter by story instead of category. Add story usage column. |
| ColoringManager.tsx | **KEEP** | Already story-scoped. |
| ColoringEditor.tsx | **KEEP** | Already story-scoped. |
| PublishingCenter.tsx | **LEGACY** | BK level/unit publishing. Move to Legacy section. |
| CoverageDashboard.tsx | **ADAPT** | Pivot from per-category to per-story, per-slot coverage. |
| LanguagesManager.tsx | **KEEP** | Operates on mission_versions. Content-agnostic. |
| BulkImportManager.tsx | **ADAPT** | Template needs story_id + content_slot instead of category + level. |
| CategoriesOverview.tsx | **LEGACY** | BK 8-category stats. Move to Legacy section. |
| CurriculumManager.tsx | **LEGACY** | BK curriculum overview. Move to Legacy section. |
| CurriculumAnalyticsTab.tsx | **LEGACY** | BK curriculum analytics. Move to Legacy section. |
| LevelEditor.tsx | **LEGACY** | BK level/category/mission grid. Move to Legacy section. |
| UnitManager.tsx | **LEGACY** | BK unit metadata. Move to Legacy section. |
| LessonManager.tsx | **LEGACY** | BK lesson planning. Move to Legacy section. |
| AnalyticsManager.tsx | **ADAPT** | Update sub-tabs for story context. |
| ContentAnalyticsTab.tsx | **ADAPT** | Update grouping from categories to stories. |
| LearnerAnalyticsTab.tsx | **ADAPT** | Update level display to story display. |
| LanguageAnalyticsTab.tsx | **KEEP** | Language analytics. Story-agnostic. |
| AchievementAnalyticsTab.tsx | **ADAPT** | Update badge slugs to include story-scoped ones. |
| CertificatesManager.tsx | **KEEP** | Certificate model unchanged. |
| ChildrenManager.tsx | **KEEP** | Story-agnostic. |
| ParentsManager.tsx | **KEEP** | Story-agnostic. |
| CommunityManager.tsx | **KEEP** | Story-agnostic. |
| NotificationsManager.tsx | **KEEP** | Story-agnostic. |
| AdministratorsManager.tsx | **KEEP** | Story-agnostic. |
| RewardsManager.tsx | **KEEP** | Story-agnostic. |
| SettingsManager.tsx | **KEEP** | Story-agnostic. |
| BucketsView.tsx | **KEEP** | Storage browser. Story-agnostic. |
| AdminProfile.tsx | **KEEP** | Story-agnostic. |

### Summary

| Classification | Count |
|---------------|-------|
| KEEP | 22 |
| ADAPT | 12 |
| LEGACY | 7 |
| REPLACE | 0 |

---

## 5. Learner Components (133 non-UI-library components)

### components/home/ (20 components)

| Component | Classification | Rationale |
|-----------|---------------|-----------|
| ActivityGrid.tsx | **REPLACE** | 8-category grid → StorySlotGrid (9 items: 4 intro + 6 missions, or story library cards) |
| CertificatePanel.tsx | **ADAPT** | Change from 8-step to story-scoped (6 missions + certificate) |
| ChatQuestBanner.tsx | **REUSE** | Content-agnostic banner |
| ChatSidebar.tsx | **ADAPT** | Change `/8` hardcodes to dynamic story slot count |
| ChildSelector.tsx | **REUSE** | Child switcher. Unchanged. |
| CreateChildModal.tsx | **REUSE** | Child creation. Unchanged. |
| CreateExplorerProfile.tsx | **REUSE** | Onboarding. Unchanged. |
| DashboardHero.tsx | **ADAPT** | Change from "Level N Adventure" to current story title |
| HomeFooter.tsx | **REUSE** | Footer. Unchanged. |
| HomeHeader.tsx | **REUSE** | Header with mascots. Unchanged. |
| LanguageBadges.tsx | **REUSE** | Language badges. Works regardless of content model. |
| MyBadges.tsx | **ADAPT** | Change from 8 category badges to story-based badges |
| MyProfile.tsx | **ADAPT** | Change `/8` to story slot count |
| NimiCommunity.tsx | **REUSE** | Community preview. Unchanged. |
| QuickReplyChips.tsx | **REUSE** | Chat chips. Unchanged. |
| StatsSidebar.tsx | **ADAPT** | Change `/8` to story slot count |
| StoryJourney.tsx | **ADAPT** | Replace hardcoded STORY_STEPS with dynamic story_slots data |
| TalkToNimi.tsx | **ADAPT** | Pass current story context to AI |
| WhatsNext.tsx | **ADAPT** | Change from next category to next story slot |
| WhoIsPlaying.tsx | **REUSE** | Child display. Unchanged. |

### components/missions/ (13 components)

| Component | Classification | Rationale |
|-----------|---------------|-----------|
| StoryContent.tsx | **REUSE** | FlipFlop Audio renderer. Content-agnostic. |
| StoryFlipBook.tsx | **REUSE** | FlipFlop page flipper. Content-agnostic. |
| SingAlongContent.tsx | **REUSE** | Sing Along renderer. Content-agnostic. |
| MoveGrooveContent.tsx | **REUSE** | Move & Explore renderer. Content-agnostic. |
| WatchContent.tsx | **REUSE** | Video renderer (Intro Video, Story Intro, Bonus Video). Content-agnostic. |
| ReadContent.tsx | **REUSE** | PDF renderer. Content-agnostic. |
| ColoringContent.tsx | **REUSE** | Coloring launcher. Content-agnostic. |
| ColoringStudio.tsx | **REUSE** | Canvas editor. Content-agnostic. |
| MissionCompleteBanner.tsx | **REUSE** | Celebration banner. Content-agnostic. |
| MissionShell.tsx | **ADAPT** | Progress bar `/8` → dynamic. Next-activity routing → story-scoped. |
| DailyAdventureBanner.tsx | **REPLACE** | BK "Daily Adventure" banner → Story intro banner |
| DailyAdventureGrid.tsx | **REPLACE** | BK 8-category grid → Story slot grid |
| DailyAdventureSidebar.tsx | **REPLACE** | BK sidebar → Story progress sidebar |

### components/profile/ (19 components)

| Component | Classification | Rationale |
|-----------|---------------|-----------|
| ProfileCard.tsx | **ADAPT** | Level → story count. Categories mastered → stories completed. |
| GreetingCard.tsx | **REUSE** | Greeting. Content-agnostic. |
| ProgressHeader.tsx | **ADAPT** | Tab labels may change (activity/skills tabs reference categories) |
| StatsRow.tsx | **ADAPT** | Activities count changes from /8 to dynamic |
| ProfileStatsGrid.tsx | **REUSE** | Stats grid. Data-driven, no hardcoded counts. |
| ProfileBadgesRow.tsx | **ADAPT** | Change from category badges to story badges |
| RecentBadgesCard.tsx | **ADAPT** | Badge list from story achievements |
| WeekStreakCard.tsx | **REUSE** | Streak. Content-agnostic. |
| WeeklyActivityChart.tsx | **REUSE** | Chart. Content-agnostic. |
| TodaysProgressCard.tsx | **ADAPT** | Change from 8 ACTIVITIES to story slots |
| ActivityProgressTab.tsx | **ADAPT** | Change from category progress to story/slot progress |
| ActivityDetailsList.tsx | **ADAPT** | Category-based details → story-based details |
| SkillsTab.tsx | **ADAPT** | Category groups → story-based skills |
| StreaksTab.tsx | **REUSE** | Streak calendar. Content-agnostic. |
| AccountSettingsCard.tsx | **REUSE** | Settings. Content-agnostic. |
| AppPreferencesCard.tsx | **REUSE** | Settings. Content-agnostic. |
| EditChildModal.tsx | **REUSE** | Profile editing. Content-agnostic. |
| NotificationSettingsModal.tsx | **REUSE** | Settings. Content-agnostic. |
| PrivacySettingsModal.tsx | **REUSE** | Settings. Content-agnostic. |

### components/parents/ (7 components)

| Component | Classification | Rationale |
|-----------|---------------|-----------|
| ParentOverviewCard.tsx | **ADAPT** | Level display → story display |
| LanguageJourneyCard.tsx | **ADAPT** | Level progress → story progress |
| AttentionAlertsCard.tsx | **ADAPT** | Level-incomplete alert → story-incomplete |
| AchievementCenterCard.tsx | **REUSE** | Achievement display. Slug-based, content-agnostic. |
| LearningInsightsCard.tsx | **ADAPT** | Category-centric insights → story-centric |
| ProgressTimelineCard.tsx | **ADAPT** | Category-master events → story-complete events |
| ParentsZoneHeader.tsx | **REUSE** | Header. Content-agnostic. |

### components/certificates/ (4 components)

| Component | Classification | Rationale |
|-----------|---------------|-----------|
| AchievementCard.tsx | **REUSE** | Slug-based. Content-agnostic. |
| AchievementDashboard.tsx | **ADAPT** | Add story achievement tier |
| CertificatesHeader.tsx | **REUSE** | Header. Content-agnostic. |
| TrilingualChampionBanner.tsx | **ADAPT** | Change from curriculum to story trilingual |

### All other component groups

| Group | Count | Classification |
|-------|-------|---------------|
| components/layout/ (5) | 5 | **ALL REUSE** — AppShell, Sidebar, SidebarNavItem, LogoutModal, AppFooterBar |
| components/settings/ (5) | 5 | **ALL REUSE** — all settings cards/modals |
| components/help/ (3) | 3 | **ALL REUSE** — help cards/FAQ/banner |
| components/community/ (5) | 5 | **ALL REUSE** — gallery/upload/celebration |
| components/shop/ (5) | 5 | **ALL REUSE** — shop grid/cards/tabs |
| components/pwa/ (1) | 1 | **REUSE** — InstallPrompt |
| components/auth/ (2) | 2 | **REUSE** — AuthBackground, GoogleIcon |
| components/parent/ (6) | 6 | **REUSE** — legacy parent components |
| Root components (31) | 31 | **ALL REUSE** — various standalone components |

### Component Summary

| Classification | Count |
|---------------|-------|
| REUSE (unchanged) | 93 |
| ADAPT | 37 |
| REPLACE | 3 (DailyAdventureBanner, DailyAdventureGrid, DailyAdventureSidebar) |

---

## 6. Hooks & Lib Files

### Hooks (16 files)

| Hook | Classification | Rationale |
|------|---------------|-----------|
| useNimiChat.ts | **REUSE** | Chat. Content-agnostic. |
| usePushNotifications.ts | **REUSE** | Push. Content-agnostic. |
| useOfflineSync.ts | **ADAPT** | Calls `completeCurriculumMission` → needs `completeStoryMission` path |
| useOnlineStatus.ts | **REUSE** | Online detection. Content-agnostic. |
| useCreationUpload.ts | **REUSE** | Community upload. Content-agnostic. |
| useChildren.ts | **REUSE** | Child management. Content-agnostic. |
| useChildActivities.ts | **ADAPT** | References curriculum activities |
| useMission.ts | **REUSE** | Mission data fetching. Content-agnostic. |
| useSpeechToText.ts | **REUSE** | Speech recognition. Content-agnostic. |
| All others (7) | **REUSE** | Utility hooks. Content-agnostic. |

### Lib Files (19 files)

| File | Classification | Rationale |
|------|---------------|-----------|
| queries.ts | **ADAPT** | Add `getStoryMissions()`, `completeStoryMission()`, `getCurrentStory()`. Keep legacy functions. |
| parentInsights.ts | **ADAPT** | Add story-based computations alongside category-based. |
| offlineQueue.ts | **ADAPT** | Add `completeStoryMission` queue path |
| adminAnalytics.ts | **ADAPT** | Story-based analytics queries |
| supabaseClient.ts | **REUSE** | Client singleton. Content-agnostic. |
| push.ts | **REUSE** | Push helper. Content-agnostic. |
| soundEffects.ts | **REUSE** | Audio toggle. Content-agnostic. |
| nimiPersonality.ts | **REUSE** | AI personality. Content-agnostic. |
| All others (11) | **REUSE** | Utility files. Content-agnostic. |

### Config Files

| File | Classification | Rationale |
|------|---------------|-----------|
| `app/_activityData.ts` | **REPLACE** | 8-category ACTIVITIES config → new `_storySlotData.ts` with 6 slot types + 4 intro types |
| `app/_achievementData.ts` | **ADAPT** | Add story achievement tier to catalog builder |
