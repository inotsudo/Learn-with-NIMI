'use client'
import './admin.css'
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabaseClient'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { ToastProvider } from './Toast'
import ErrorBoundary from './ErrorBoundary'
import { HelpCircle, Mail } from 'lucide-react'
import { type Lang } from './missionMeta'
import { SkeletonHeaderBanner, SkeletonStatCards, SkeletonCardGrid } from './Skeleton'

// Each admin view is its own code-split chunk, loaded only when selected —
// keeps the initial /admin bundle small instead of shipping all ~14 managers upfront.
const ViewLoading = () => (
  <div className="flex-1 flex flex-col overflow-hidden">
    <SkeletonHeaderBanner />
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto">
      <SkeletonStatCards count={4} />
      <SkeletonCardGrid count={4} />
    </div>
  </div>
)
const dynamicView = <P extends object>(loader: () => Promise<{ default: React.ComponentType<P> }>) =>
  dynamic(loader, { loading: ViewLoading, ssr: false })

const TableView = dynamicView(() => import('./TableView'))
const BucketsView = dynamicView(() => import('./BucketsView'))
const DashboardHome = dynamicView(() => import('./DashboardHome'))
const AdminProfile = dynamicView(() => import('./AdminProfile'))
const MissionManager = dynamicView(() => import('./MissionManager'))
const StoryManager = dynamicView(() => import('./StoryManager'))
const ColoringManager = dynamicView(() => import('./ColoringManager'))
const LanguagesManager = dynamicView(() => import('./LanguagesManager'))
const ChildrenManager = dynamicView(() => import('./ChildrenManager'))
const ParentsManager = dynamicView(() => import('./ParentsManager'))
const CertificatesManager = dynamicView(() => import('./CertificatesManager'))
const RewardsManager = dynamicView(() => import('./RewardsManager'))
const BadgesManager  = dynamicView(() => import('./BadgesManager'))
const AnalyticsManager = dynamicView(() => import('./AnalyticsManager'))
const SettingsManager = dynamicView(() => import('./SettingsManager'))
const AdministratorsManager = dynamicView(() => import('./AdministratorsManager'))
const NotificationsManager = dynamicView(() => import('./NotificationsManager'))
const CurriculumManager = dynamicView(() => import('./CurriculumManager'))
const CommunityManager = dynamicView(() => import('./CommunityManager'))
const ProductsManager = dynamicView(() => import('./ProductsManager'))
const MasterpieceManager = dynamicView(() => import('./MasterpieceManager'))
const StorySlotsManager = dynamicView(() => import('./StorySlotsManager'))
const StoryOrderingManager = dynamicView(() => import('./StoryOrderingManager'))
const StoryPublishingManager = dynamicView(() => import('./StoryPublishingManager'))
const FlipFlopBooksManager = dynamicView(() => import('./FlipFlopBooksManager'))
const ContentMediaManager = dynamicView(() => import('./ContentMediaManager'))
const WeeklyChallengesManager = dynamicView(() => import('./WeeklyChallengesManager'))
const FamiliesManager = dynamicView(() => import('./FamiliesManager'))
const SchoolsManager             = dynamicView(() => import('./SchoolsManager'))
const RosterProvisioningManager  = dynamicView(() => import('./RosterProvisioningManager'))
const NewsletterManager    = dynamicView(() => import('./NewsletterManager'))
const ReferralManager      = dynamicView(() => import('./ReferralManager'))
const DiscountCodesManager = dynamicView(() => import('./DiscountCodesManager'))
const GiftManager          = dynamicView(() => import('./GiftManager'))
const TestimonialsManager         = dynamicView(() => import('./TestimonialsManager'))
const PartnersManager             = dynamicView(() => import('./PartnersManager'))
const CertificateTemplatesManager     = dynamicView(() => import('./CertificateTemplatesManager'))
const ConversationHistoryManager      = dynamicView(() => import('./ConversationHistoryManager'))

const tables = [
  'categories', 'mission_versions',
  'stories', 'coloring_pages',
  'children', 'child_progress', 'child_achievements', 'child_badges',
  'coloring_saves', 'parents', 'parental_settings', 'admins'
]

export default function AdminPanel() {
  const router = useRouter()
  const [currentTable, setCurrentTable] = useState<string>('Dashboard')
  const [checking, setChecking] = useState(true)
  const [checkTimedOut, setCheckTimedOut] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [adminLang, setAdminLang] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem('nimipiko-admin-sidebar-collapsed')
    if (stored === 'true') setSidebarCollapsed(true)
    const storedLang = localStorage.getItem('nimipiko-admin-lang') as Lang | null
    if (storedLang && ['en', 'fr', 'rw'].includes(storedLang)) setAdminLang(storedLang)
  }, [])

  const handleAdminLangChange = (lang: Lang) => {
    setAdminLang(lang)
    localStorage.setItem('nimipiko-admin-lang', lang)
  }

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('nimipiko-admin-sidebar-collapsed', String(next))
      return next
    })
  }

  const handleSelectTable = (table: string) => {
    setCurrentTable(table)
    setSidebarOpen(false)
  }

  useEffect(() => {
    let cancelled = false

    const checkAdmin = async () => {
      try {
        // getUser() validates the JWT server-side and refreshes it if expired.
        // The admins query must come AFTER so it uses a fresh, valid token.
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (cancelled) return
        if (userError || !user) {
          // No valid session — send to login (no sign-out needed, nothing to clear)
          router.replace('/admin/login')
          return
        }
        const { data: admin, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (adminError) {
          // DB error (network blip, RLS issue) — don't sign out, let user retry
          console.error('[admin] admins lookup failed:', adminError.message)
          setCheckTimedOut(true)
          return
        }
        if (!admin) {
          // Positive confirmation: authenticated user is not an admin — sign out
          await supabase.auth.signOut()
          router.replace('/admin/login')
          return
        }
        setChecking(false)
        setCheckTimedOut(false)
      } catch (err) {
        if (cancelled) return
        // Network/timeout error — show retry UI, don't kick user out
        console.error('[admin] auth check error:', err)
        setCheckTimedOut(true)
      }
    }
    void checkAdmin()

    const timeout = setTimeout(() => {
      if (!cancelled) setCheckTimedOut(true)
    }, 10000)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [router, retryKey])

  if (checking) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 animate-pulse">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex flex-col w-56 border-r border-gray-100 bg-white shrink-0 p-4 gap-3">
          <div className="h-8 w-32 bg-gray-100 rounded-lg mb-2" />
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-7 bg-gray-100 rounded-lg" />)}
        </div>
        {/* Main area skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-14 border-b border-gray-100 bg-white shrink-0 flex items-center px-6 gap-3">
            <div className="h-7 w-40 bg-gray-100 rounded-lg" />
            <div className="flex-1" />
            <div className="h-7 w-24 bg-gray-100 rounded-full" />
          </div>
          <div className="flex-1 p-6 lg:p-8 space-y-6">
            <div className="h-8 w-48 bg-gray-100 rounded-lg" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-100" />)}
            </div>
            <div className="h-64 bg-white rounded-xl border border-gray-100" />
          </div>
        </div>
        {checkTimedOut && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
            <p className="text-sm font-semibold text-gray-500">Taking longer than expected…</p>
            <div className="flex gap-3">
              <button onClick={() => { setCheckTimedOut(false); setRetryKey(k => k + 1) }}
                className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-bold shadow-sm hover:bg-gray-50 transition">
                Try again
              </button>
              <button onClick={() => router.replace('/admin/login')}
                className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-bold shadow-sm hover:bg-gray-50 transition">
                Go to login
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const isMissionView = currentTable.startsWith('mission:')
  const missionParts = isMissionView ? currentTable.split(':') : []
  const missionCategorySlug = missionParts[1] ?? null
  const missionInitialId = missionParts[2]

  const isStoryView = currentTable === 'stories' || currentTable.startsWith('stories:')
  const initialStoryId = isStoryView ? currentTable.split(':')[1] : undefined
  const isStorySlotsView = currentTable === 'story_slots'
  const isStoryOrderingView = currentTable === 'story_ordering'
  const isStoryPublishingView = currentTable === 'story_publishing'
  const isFlipFlopView = currentTable === 'flipflop_books'
  const isStoryPdfsView = currentTable === 'story_pdfs'
  const isVideosView = currentTable === 'videos'
  const isAudioView = currentTable === 'audio'
  const isWeeklyChallengesView = currentTable === 'weekly_challenges'
  const isFamiliesView = currentTable === 'families'
  const isSchoolsView           = currentTable === 'school_inquiries'
  const isRosterProvisioningView = currentTable === 'roster_provisioning'
  const isNewsletterView   = currentTable === 'newsletter_signups'
  const isReferralView      = currentTable === 'referral_redemptions'
  const isDiscountCodesView = currentTable === 'discount_codes'
  const isGiftView          = currentTable === 'gift_subscriptions'
  const isTestimonialsView  = currentTable === 'testimonials'
  const isPartnersView      = currentTable === 'partners'

  const isColoringView = currentTable === 'coloring_pages' || currentTable.startsWith('coloring_pages:')
  const initialColoringBookId = isColoringView ? currentTable.split(':')[1] : undefined

  const isLanguagesView = currentTable === 'mission_versions'

  const isChildrenView = currentTable === 'children' || currentTable.startsWith('children:')
  const initialChildId = isChildrenView ? currentTable.split(':')[1] : undefined

  const isParentsView = currentTable === 'parents' || currentTable.startsWith('parents:')
  const initialParentId = isParentsView ? currentTable.split(':')[1] : undefined

  const isCertificatesView         = currentTable === 'child_achievements'
  const isCertTemplatesView        = currentTable === 'certificate_templates'

  const isRewardsView = currentTable === 'child_badges' || currentTable.startsWith('child_badges:')
  const isBadgeImagesView = currentTable === 'badge_images'
  const initialRewardChildId = isRewardsView ? currentTable.split(':')[1] : undefined

  const isAnalyticsView = currentTable === 'child_progress'

  const isSettingsView = currentTable === 'parental_settings' || currentTable.startsWith('parental_settings:')
  const initialSettingsChildId = isSettingsView ? currentTable.split(':')[1] : undefined

  const isBucketsView = currentTable === 'Buckets'

  const isConversationHistoryView = currentTable === 'conversation_history'
  const isAdministratorsView = currentTable === 'admins'

  const isNotificationsView = currentTable === 'notifications'

  const isCurriculumView = currentTable === 'curriculum'

  const isCommunityView = currentTable === 'creations'
  const isProductsView = currentTable === 'products'
  const isMasterpieceView = currentTable === 'masterpieces'

  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        tables={tables}
        currentTable={currentTable}
        onSelectTable={handleSelectTable}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar
          tables={tables}
          currentTable={currentTable}
          setCurrentTable={setCurrentTable}
          onOpenSidebar={() => setSidebarOpen(true)}
          adminLang={adminLang}
          onAdminLangChange={handleAdminLangChange}
        />
        <main className={isMissionView || isStoryView || isStorySlotsView || isStoryOrderingView || isStoryPublishingView || isColoringView || isChildrenView || isParentsView || isRewardsView || isSettingsView ? 'flex-1 overflow-hidden bg-gray-50 flex flex-col' : 'flex-1 overflow-auto bg-gray-50'}>
          <ErrorBoundary name={currentTable}>
          {isMissionView && missionCategorySlug && (
            <MissionManager categorySlug={missionCategorySlug} initialMissionId={missionInitialId} onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} defaultLang={adminLang} />
          )}
          {isStorySlotsView && <StorySlotsManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isStoryOrderingView && <StoryOrderingManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isStoryPublishingView && <StoryPublishingManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isFlipFlopView && <FlipFlopBooksManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isStoryPdfsView && <ContentMediaManager title="Story PDFs" description="Manage PDF documents for story reading missions." missionType="read" mediaField="media_url" onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isVideosView && <ContentMediaManager title="Videos" description="Manage video content for bonus video missions." missionType="watch" mediaField="media_url" onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isAudioView && <ContentMediaManager title="Audio" description="Manage audio content for sing along missions." missionType="sing" mediaField="media_url" onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isWeeklyChallengesView && <WeeklyChallengesManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isFamiliesView && <FamiliesManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isSchoolsView            && <SchoolsManager            onOpenSidebar={() => setSidebarOpen(true)} />}
          {isRosterProvisioningView && <RosterProvisioningManager onOpenSidebar={() => setSidebarOpen(true)} />}
          {isNewsletterView  && <NewsletterManager  onOpenSidebar={() => setSidebarOpen(true)} />}
          {isReferralView       && <ReferralManager       onOpenSidebar={() => setSidebarOpen(true)} />}
          {isDiscountCodesView  && <DiscountCodesManager  onOpenSidebar={() => setSidebarOpen(true)} />}
          {isGiftView           && <GiftManager           onOpenSidebar={() => setSidebarOpen(true)} />}
          {isTestimonialsView   && <TestimonialsManager   onOpenSidebar={() => setSidebarOpen(true)} />}
          {isPartnersView       && <PartnersManager       onOpenSidebar={() => setSidebarOpen(true)} />}
          {isStoryView && (
            <StoryManager initialStoryId={initialStoryId} onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} defaultLang={adminLang} />
          )}
          {isColoringView && (
            <ColoringManager initialBookId={initialColoringBookId} onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isLanguagesView && (
            <LanguagesManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isChildrenView && (
            <ChildrenManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isParentsView && (
            <ParentsManager initialParentId={initialParentId} onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isCertificatesView && (
            <CertificatesManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isCertTemplatesView && (
            <CertificateTemplatesManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isRewardsView && (
            <RewardsManager initialChildId={initialRewardChildId} onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isBadgeImagesView && (
            <BadgesManager onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isAnalyticsView && (
            <AnalyticsManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isSettingsView && (
            <SettingsManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isBucketsView && <BucketsView onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {currentTable === 'Profile' && <AdminProfile />}
          {isConversationHistoryView && <ConversationHistoryManager onOpenSidebar={() => setSidebarOpen(true)} />}
          {isAdministratorsView && <AdministratorsManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isNotificationsView && <NotificationsManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isCurriculumView && <CurriculumManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isCommunityView && <CommunityManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isProductsView && <ProductsManager />}
          {isMasterpieceView && <MasterpieceManager />}
          {currentTable === 'Dashboard' && <DashboardHome onNavigate={setCurrentTable} />}
          {currentTable === 'Help' && (
            <div className="flex items-center justify-center h-full p-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-ds-text mb-2">Help &amp; Support</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Need help managing NIMIPIKO content, accounts, or settings?
                  Our team is here to support you.
                </p>
                <a
                  href="mailto:support@nimipiko.com"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700"
                >
                  <Mail className="w-4 h-4" /> support@nimipiko.com
                </a>
              </div>
            </div>
          )}
          {!isMissionView && !isStoryView && !isStorySlotsView && !isStoryOrderingView && !isStoryPublishingView && !isFlipFlopView && !isStoryPdfsView && !isVideosView && !isAudioView && !isWeeklyChallengesView && !isFamiliesView && !isColoringView && !isLanguagesView && !isChildrenView && !isParentsView && !isCertificatesView && !isCertTemplatesView && !isRewardsView && !isBadgeImagesView && !isAnalyticsView && !isSettingsView && !isCurriculumView && !isCommunityView && !isProductsView && !isMasterpieceView && !isSchoolsView && !isRosterProvisioningView && !isNewsletterView && !isReferralView && !isDiscountCodesView && !isGiftView && !isTestimonialsView && !isPartnersView && !isConversationHistoryView && !['Buckets', 'Profile', 'admins', 'Dashboard', 'Help', 'notifications'].includes(currentTable) && (
            <TableView table={currentTable} />
          )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
    </ToastProvider>
  )
}
