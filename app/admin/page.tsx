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
const ContentLibraryManager = dynamicView(() => import('./ContentLibraryManager'))
const SchoolsManager = dynamicView(() => import('./SchoolsManager'))
const NewsletterManager    = dynamicView(() => import('./NewsletterManager'))
const ReferralManager      = dynamicView(() => import('./ReferralManager'))
const DiscountCodesManager = dynamicView(() => import('./DiscountCodesManager'))
const GiftManager          = dynamicView(() => import('./GiftManager'))
const TestimonialsManager         = dynamicView(() => import('./TestimonialsManager'))
const PartnersManager             = dynamicView(() => import('./PartnersManager'))
const CertificateTemplatesManager = dynamicView(() => import('./CertificateTemplatesManager'))

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

  useEffect(() => {
    const stored = localStorage.getItem('nimipiko-admin-sidebar-collapsed')
    if (stored === 'true') setSidebarCollapsed(true)
  }, [])

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
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (cancelled) return
        if (userError || !user) {
          router.replace('/admin/login')
          return
        }
        const { data: admin, error: adminError } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (adminError) console.error('[admin] admins lookup failed:', adminError.message)
        if (!admin) {
          await supabase.auth.signOut()
          router.replace('/admin/login')
          return
        }
        setChecking(false)
        setCheckTimedOut(false)
      } catch (err) {
        if (cancelled) return
        console.error('[admin] auth check failed:', err)
        router.replace('/admin/login')
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
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 text-gray-500 text-sm font-semibold text-center px-6">
        <p>{checkTimedOut ? "This is taking longer than expected..." : "Checking admin access..."}</p>
        {checkTimedOut && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCheckTimedOut(false); setRetryKey(k => k + 1) }}
              className="px-4 py-2 rounded-full bg-white hover:bg-gray-100 border border-ds-border text-ds-text text-xs font-bold transition"
            >
              Try again
            </button>
            <button
              onClick={() => router.replace('/admin/login')}
              className="px-4 py-2 rounded-full bg-white hover:bg-gray-100 border border-ds-border text-ds-text text-xs font-bold transition"
            >
              Go to login
            </button>
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
  const isSchoolsView      = currentTable === 'school_inquiries'
  const isNewsletterView   = currentTable === 'newsletter_signups'
  const isReferralView      = currentTable === 'referral_redemptions'
  const isDiscountCodesView = currentTable === 'discount_codes'
  const isGiftView          = currentTable === 'gift_subscriptions'
  const isTestimonialsView  = currentTable === 'testimonials'
  const isPartnersView      = currentTable === 'partners'
  const isContentLibraryView = currentTable === 'content_library'

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
  const initialRewardChildId = isRewardsView ? currentTable.split(':')[1] : undefined

  const isAnalyticsView = currentTable === 'child_progress'

  const isSettingsView = currentTable === 'parental_settings' || currentTable.startsWith('parental_settings:')
  const initialSettingsChildId = isSettingsView ? currentTable.split(':')[1] : undefined

  const isBucketsView = currentTable === 'Buckets'

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
        />
        <main className={isMissionView || isStoryView || isStorySlotsView || isStoryOrderingView || isStoryPublishingView || isColoringView || isChildrenView || isParentsView || isRewardsView || isSettingsView ? 'flex-1 overflow-hidden bg-gray-50 flex flex-col' : 'flex-1 overflow-auto bg-gray-50'}>
          <ErrorBoundary name={currentTable}>
          {isMissionView && missionCategorySlug && (
            <MissionManager categorySlug={missionCategorySlug} initialMissionId={missionInitialId} onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
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
          {isSchoolsView     && <SchoolsManager     onOpenSidebar={() => setSidebarOpen(true)} />}
          {isNewsletterView  && <NewsletterManager  onOpenSidebar={() => setSidebarOpen(true)} />}
          {isReferralView       && <ReferralManager       onOpenSidebar={() => setSidebarOpen(true)} />}
          {isDiscountCodesView  && <DiscountCodesManager  onOpenSidebar={() => setSidebarOpen(true)} />}
          {isGiftView           && <GiftManager           onOpenSidebar={() => setSidebarOpen(true)} />}
          {isTestimonialsView   && <TestimonialsManager   onOpenSidebar={() => setSidebarOpen(true)} />}
          {isPartnersView       && <PartnersManager       onOpenSidebar={() => setSidebarOpen(true)} />}
          {isContentLibraryView && <ContentLibraryManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {isStoryView && (
            <StoryManager initialStoryId={initialStoryId} onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
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
          {isAnalyticsView && (
            <AnalyticsManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isSettingsView && (
            <SettingsManager onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />
          )}
          {isBucketsView && <BucketsView onNavigate={setCurrentTable} onOpenSidebar={() => setSidebarOpen(true)} />}
          {currentTable === 'Profile' && <AdminProfile />}
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
          {!isMissionView && !isStoryView && !isStorySlotsView && !isStoryOrderingView && !isStoryPublishingView && !isFlipFlopView && !isStoryPdfsView && !isVideosView && !isAudioView && !isWeeklyChallengesView && !isFamiliesView && !isContentLibraryView && !isColoringView && !isLanguagesView && !isChildrenView && !isParentsView && !isCertificatesView && !isCertTemplatesView && !isRewardsView && !isAnalyticsView && !isSettingsView && !isCurriculumView && !isCommunityView && !isProductsView && !isMasterpieceView && !isSchoolsView && !isNewsletterView && !isReferralView && !isDiscountCodesView && !isGiftView && !['Buckets', 'Profile', 'admins', 'Dashboard', 'Help', 'notifications'].includes(currentTable) && (
            <TableView table={currentTable} />
          )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
    </ToastProvider>
  )
}
