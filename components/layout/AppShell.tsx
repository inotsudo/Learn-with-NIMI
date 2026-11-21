"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bell, Search, X } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import { getChildren, getWeekStreak, getTotalStars, getActivityDates, getChildBadges, getCurrentLevel, updateChildLanguage, getChildCosmetics, getCurriculumMissions, getActiveStories, getStreakShieldsPurchased, getUsedShieldDates } from "@/lib/queries";
import { getStoryLibrary } from "@/lib/storyRepository";
import { computeStreaks } from "@/lib/parentInsights";
import { resolveShields } from "@/lib/streakShields";
import type { Child, ChildCosmetics } from "@/lib/queries";
import { SHOP_ITEM_MAP } from "@/components/shop/_shopData";
import Sidebar from "./Sidebar";
import LogoutModal from "./LogoutModal";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import UpdateToast from "@/components/pwa/UpdateToast";
import { useSwUpdate } from "@/hooks/useSwUpdate";
import BottomNavBar from "@/components/home/BottomNavBar";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import NotificationPanel from "@/components/layout/NotificationPanel";
import Flag from "@/components/ui/Flag";
import { MotionConfig } from "framer-motion";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import "@/components/world-ui/world-ui.css";
import supabase from "@/lib/supabaseClient";
import { getActiveSubscription } from "@/lib/payments/products";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LEVEL_LABELS: Record<number, string> = {
  1: "Sprout", 2: "Explorer", 3: "Creator", 4: "Champion", 5: "Legend",
};
const getLevelLabel = (n: number) => LEVEL_LABELS[Math.min(Math.max(n, 1), 5)] ?? "Explorer";

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English",     flag: "🇬🇧" },
  { code: "fr", label: "Français",    flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, setLanguageSilent, t } = useLanguage();
  const isOnline = useOnlineStatus();
  useOfflineSync();
  const { updateReady } = useSwUpdate();
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const activeChildRef = useRef<Child | null>(null);
  // H26/H27: guard async state setters in childSwitch and languageChange handlers
  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [level, setLevel]             = useState(1);
  const [totalStars, setTotalStars]   = useState(0);
  const [gems, setGems]               = useState(0);
  const [weekStreak, setWeekStreak]   = useState<boolean[]>(Array(7).fill(false));
  const [streakCount, setStreakCount] = useState(0);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [showLogout, setShowLogout]   = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cosmetics, setCosmetics] = useState<ChildCosmetics>({ nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null });
  const [trialBannerDays, setTrialBannerDays] = useState<number | null>(null);
  const [trialExpiredBanner, setTrialExpiredBanner] = useState(false);
  const [trialGraceBanner, setTrialGraceBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/loginpage${next}`);
    }
  }, [authLoading, user, router, pathname]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // best-effort — offline caching just won't be available this session
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!user) return; // Don't fetch until auth is confirmed
    let active = true;
    void (async () => {
      const list = await getChildren();
      if (!active) return;
      if (list.length === 0) {
        router.replace("/onboarding");
        return;
      }
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0] ?? null;
      activeChildRef.current = child;
      if (active) setActiveChild(child);
      if (child) {
        if (active) setLanguageSilent(child.language);
        // Shields (getStreakShieldsPurchased + getUsedShieldDates) now run in
        // parallel with everything else. resolveShields below hits the warm
        // qcached results — zero extra network round-trips.
        const [ws, dates, , , badges, cos] = await Promise.all([
          getWeekStreak(child.id, child.language),
          getActivityDates(child.id, child.language),
          getTotalStars(child.id, child.language).then(v => { if (active) setTotalStars(v); }),
          getCurrentLevel(child.id, child.language).then(v => { if (active) setLevel(v); }),
          getChildBadges(child.id, child.language),
          getChildCosmetics(child.id),
          getStreakShieldsPurchased(child.id),
          getUsedShieldDates(child.id, child.language),
        ]);
        if (!active) return;
        setWeekStreak(ws);
        const { usedDates } = await resolveShields(child.id, child.language, dates);
        if (!active) return;
        setStreakCount(computeStreaks(dates, new Date(), usedDates).current);
        setGems(badges.length);
        setCosmetics(cos);

        // Warm the cache for the most common navigation destinations so that
        // /missions, /stories, and /treasure feel instant when the user taps them.
        void getCurriculumMissions(child.id);
        void getStoryLibrary(child.id, child.language);
        void getActiveStories();
      }

      // Trial banner logic — non-blocking, runs after children load
      // `user` is already in scope from the outer effect guard (line 105)
      void (async () => {
        const sub = await getActiveSubscription(user.id);
        if (!active) return;
        if (sub?.payment_provider === "trial" && sub.current_period_end) {
          // Grace period: status is 'expired' but within 24h — show specific copy
          if ((sub as { status?: string }).status === "expired") {
            setTrialGraceBanner(true);
          } else {
            const daysLeft = Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86_400_000));
            if (daysLeft <= 3) setTrialBannerDays(daysLeft);
          }
        } else if (!sub) {
          // Check for a recently expired trial (within 7 days) to show the "trial ended" banner
          const { data: expired } = await supabase
            .from("nimipiko_subscriptions")
            .select("id")
            .eq("parent_id", user.id)
            .eq("payment_provider", "trial")
            .eq("status", "expired")
            .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
            .limit(1)
            .maybeSingle();
          if (active && expired) setTrialExpiredBanner(true);
        }
      })();
    })();
    return () => { active = false; };
  }, [user, router]);

  // Listen for cosmetics changes from the shop (equip/unequip)
  useEffect(() => {
    const handler = (e: Event) => {
      const cos = (e as CustomEvent<{ cosmetics: ChildCosmetics }>).detail?.cosmetics;
      if (cos) setCosmetics(cos);
    };
    window.addEventListener("app:cosmeticsChange", handler);
    return () => window.removeEventListener("app:cosmeticsChange", handler);
  }, []);

  // Listen for active-child switches fired from the parents page
  useEffect(() => {
    const handler = async (e: Event) => {
      const childId = (e as CustomEvent<{ childId: string }>).detail?.childId;
      if (!childId) return;
      const list = await getChildren();
      const child = list.find(c => c.id === childId) ?? null;
      if (!child) return;
      activeChildRef.current = child;
      setActiveChild(child);
      setLanguageSilent(child.language as Language);
      const [ws, dates, , , badges, cos] = await Promise.all([
        getWeekStreak(child.id, child.language),
        getActivityDates(child.id, child.language),
        getTotalStars(child.id, child.language).then(v => { if (isMounted.current) setTotalStars(v); }),
        getCurrentLevel(child.id, child.language).then(v => { if (isMounted.current) setLevel(v); }),
        getChildBadges(child.id, child.language),
        getChildCosmetics(child.id),
      ]);
      if (!isMounted.current) return;
      setWeekStreak(ws);
      const { usedDates } = await resolveShields(child.id, child.language, dates);
      if (!isMounted.current) return;
      setStreakCount(computeStreaks(dates, new Date(), usedDates).current);
      setGems(badges.length);
      setCosmetics(cos);
    };
    window.addEventListener("app:childSwitch", handler as EventListener);
    return () => window.removeEventListener("app:childSwitch", handler as EventListener);
  }, []);

  // Reflects profile edits (name / avatar) saved from any page
  useEffect(() => {
    const handler = (e: Event) => {
      const { childId, name, avatarUrl } = (e as CustomEvent<{ childId: string; name: string; avatarUrl: string }>).detail ?? {};
      const current = activeChildRef.current;
      if (!current || current.id !== childId) return;
      const updated = { ...current, name, avatar_url: avatarUrl };
      activeChildRef.current = updated;
      setActiveChild(updated);
    };
    window.addEventListener("app:profileUpdate", handler as EventListener);
    return () => window.removeEventListener("app:profileUpdate", handler as EventListener);
  }, []);

  // Reflects journey-language switches fired from anywhere in the app
  // (this header picker, /settings, the homepage language badges) into the
  // sidebar's own per-language streak.
  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      const current = activeChildRef.current;
      if (!lang || !current) return;
      const updated = { ...current, language: lang };
      activeChildRef.current = updated;
      setActiveChild(updated);
      void (async () => {
        const [ws, dates] = await Promise.all([
          getWeekStreak(updated.id, lang),
          getActivityDates(updated.id, lang),
          getTotalStars(updated.id, lang).then(v => { if (isMounted.current) setTotalStars(v); }),
          getCurrentLevel(updated.id, lang).then(v => { if (isMounted.current) setLevel(v); }),
          getChildBadges(updated.id, lang).then(b => { if (isMounted.current) setGems(b.length); }),
        ]);
        if (!isMounted.current) return;
        setWeekStreak(ws);
        const { usedDates } = await resolveShields(updated.id, lang, dates);
        if (!isMounted.current) return;
        setStreakCount(computeStreaks(dates, new Date(), usedDates).current);
      })();
    };
    window.addEventListener("app:languageChange", handler);
    return () => window.removeEventListener("app:languageChange", handler);
  }, []);

  const confirmLanguageSwitch = async () => {
    if (!pendingLanguage || !activeChild || !user) return;
    setSwitchingLanguage(true);
    await updateChildLanguage(activeChild.id, pendingLanguage, user.id);
    setLanguage(pendingLanguage);
    setSwitchingLanguage(false);
    setPendingLanguage(null);
  };

  if (authLoading || !user) return (
    <div className="flex min-h-dvh items-center justify-center" style={{ background: "radial-gradient(120% 80% at 50% -10%, #1A3558 0%, #0B1A33 45%, #06101F 100%)" }}>
      <div className="text-center" role="status">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E8BC56] border-t-transparent" aria-hidden="true" />
        <p className="mt-3 font-baloo text-sm font-bold text-[#FFF7E0]/60">✈️ Boarding…</p>
      </div>
    </div>
  );

  const urgentTrial = trialExpiredBanner || trialGraceBanner || trialBannerDays === 0;
  const showTrialBanner = !bannerDismissed && (trialBannerDays !== null || trialExpiredBanner || trialGraceBanner);
  const sidePad = { paddingLeft: "max(12px, env(safe-area-inset-left))", paddingRight: "max(12px, env(safe-area-inset-right))" };

  return (
    <MotionConfig reducedMotion="user">
    <div className="wui-world relative min-h-dvh" style={{ background: "#06101F" }}>
      {/* Default night sky — each screen paints its own official scene over it. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(120% 80% at 50% -10%, #1A3558 0%, #0B1A33 45%, #06101F 100%)" }} />

      {/* The Kit des Champions — main menu (was the sidebar) */}
      <Sidebar
        activeChild={activeChild}
        level={level}
        weekStreak={weekStreak}
        streakCount={streakCount}
        totalStars={totalStars}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogoutClick={() => setShowLogout(true)}
      />

      <div className="relative flex min-h-dvh min-w-0 flex-col">

        {/* ── status strips (offline, trial) ─────────────────────────────── */}
        {(!isOnline || showTrialBanner) && (
          <div className="relative z-40 grid gap-2" style={{ ...sidePad, paddingTop: "max(10px, env(safe-area-inset-top))" }}>
            {!isOnline && (
              <div role="status" className="wui-notice mx-auto w-full max-w-3xl !items-center" style={{ background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.45)", color: "#FDE68A" }}>
                📡 {t("offlineBanner")}
              </div>
            )}
            {showTrialBanner && (
              <div role="status" className={`wui-notice mx-auto w-full max-w-3xl !items-center ${urgentTrial ? "wui-notice--error" : ""}`}
                style={urgentTrial ? undefined : { background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.45)", color: "#FDE68A" }}>
                <span className="shrink-0" aria-hidden="true">{urgentTrial ? "🔴" : "⏳"}</span>
                <span className="min-w-0 flex-1">
                  {trialExpiredBanner
                    ? "Your free trial has ended — subscribe to restore full access."
                    : trialGraceBanner
                    ? "Your trial ended — you have 24 hours of grace access. Subscribe to keep Club."
                    : trialBannerDays === 0
                    ? "Your trial ends today! Subscribe now to keep all premium stories."
                    : trialBannerDays === 1
                    ? "1 day left on your trial — subscribe before tomorrow to keep Club access."
                    : `${trialBannerDays} days left on your free trial.`}
                </span>
                <a href="/pricing" className="wui-btn wui-btn--gold shrink-0 !min-h-[40px] !px-4 !text-[14px]">
                  {trialExpiredBanner || trialGraceBanner ? "Subscribe" : "Subscribe →"}
                </a>
                <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss banner" className="grid h-10 w-10 shrink-0 place-items-center rounded-full opacity-60 transition hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── World bar: airport medallion, passport chip (opens the Kit), stats ── */}
        {activeChild && (
          <header className="relative z-40" style={{ ...sidePad, paddingTop: !isOnline || showTrialBanner ? 10 : "max(10px, env(safe-area-inset-top))" }}>
            <div className="mx-auto flex max-w-[1800px] items-center gap-2">
              <Link href="/home" aria-label="Back to the airport" className="wui-orb overflow-hidden !p-0">
                <img src="/nimi-logo.png" alt="" className="h-full w-full rounded-full object-cover" />
              </Link>

              <button type="button" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog" aria-label={`Open the Kit menu — ${activeChild.name}`}
                className="wui-pill min-w-0 transition hover:-translate-y-0.5 active:translate-y-0.5">
                <span className="shrink-0 rounded-full" style={{ boxShadow: "0 0 0 2px #E8BC56" }}>
                  <ChildAvatar avatarUrl={activeChild.avatar_url} size={38} />
                </span>
                <span className="min-w-0 text-left leading-tight">
                  <span className="block max-w-[110px] truncate font-baloo text-[15px] font-extrabold sm:max-w-[180px]">{activeChild.name}</span>
                  <span className="block font-nunito text-[11px] font-bold text-[#FDE68A]/80">Level {level} · 🧳 Kit</span>
                </span>
              </button>

              <div className="flex-1" />

              <div className="flex shrink-0 items-center gap-2">
                <span className="wui-pill wui-pill--stat" title={`${totalStars} stars earned`}>
                  <span aria-hidden="true">⭐</span>{totalStars}<span className="sr-only"> stars</span>
                </span>
                {streakCount > 0 && (
                  <span className="wui-pill wui-pill--stat hidden sm:inline-flex" title={`${streakCount}-day streak!`}>
                    <span aria-hidden="true">🔥</span>{streakCount}<span className="sr-only">-day streak</span>
                  </span>
                )}

                <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" className="wui-orb md:hidden">
                  <Search className="h-5 w-5" />
                </button>

                <div className="relative">
                  <button type="button" aria-label="Notifications" className="wui-orb"
                    onClick={() => { setShowNotifications(p => !p); setShowLangPicker(false); setShowProfileMenu(false); }}>
                    <Bell className="h-5 w-5" strokeWidth={2} />
                    {unreadCount > 0 && <span className="wui-orb__badge">{unreadCount}</span>}
                  </button>
                  <NotificationPanel
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    onCountChange={setUnreadCount}
                  />
                </div>

                <div className="relative hidden sm:block">
                  <button type="button" aria-label={`Language: ${language}`} aria-expanded={showLangPicker} className="wui-orb"
                    onClick={() => { setShowLangPicker(p => !p); setShowProfileMenu(false); setShowNotifications(false); }}>
                    <Flag lang={language} className="h-4 w-6 rounded-sm" />
                  </button>
                  {showLangPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                      <div className="wui-glass absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl p-1.5">
                        {([
                          { code: "en" as Language, label: "English" },
                          { code: "fr" as Language, label: "Français" },
                          { code: "rw" as Language, label: "Kinyarwanda" },
                        ]).map(l => (
                          <button key={l.code} type="button"
                            onClick={() => { setShowLangPicker(false); setPendingLanguage(l.code); }}
                            className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 font-baloo text-[15px] font-bold transition ${
                              l.code === language ? "bg-[#FDE68A]/15 text-[#FDE68A]" : "text-[#FFF7E0]/85 hover:bg-white/5"}`}>
                            <Flag lang={l.code} className="h-4 w-6 shrink-0 rounded-sm" />
                            <span className="flex-1 text-left">{l.label}</span>
                            {l.code === language && <span aria-hidden="true">✓</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Search overlay (phones) */}
            {searchOpen && (
              <div className="absolute inset-x-0 top-0 z-50 flex items-center gap-2 md:hidden" style={{ ...sidePad, paddingTop: "max(10px, env(safe-area-inset-top))" }}>
                <div className="wui-glass flex w-full items-center gap-2 rounded-full p-1.5">
                  <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="wui-orb !h-11 !w-11 shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
                      setSearchOpen(false);
                      if (q) void (window.location.href = `/stories?q=${encodeURIComponent(q)}`);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <label htmlFor="shell-search" className="sr-only">Search stories</label>
                    <input id="shell-search" name="q" type="search" autoFocus placeholder="Search stories, activities…"
                      className="h-11 min-w-0 flex-1 bg-transparent px-2 font-nunito text-[16px] font-bold text-[#FFF7E0] outline-none placeholder:text-[#FFF7E0]/40" />
                    <button type="submit" aria-label="Search" className="wui-orb wui-orb--gold !h-11 !w-11 shrink-0">
                      <Search className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </header>
        )}

        <div
          id="main-content"
          className="relative flex w-full max-w-[1800px] flex-1 flex-col self-center px-3 pb-[120px] pt-4 sm:px-5 lg:px-6 [@media(max-height:500px)]:pb-6"
        >
          {children}
        </div>
      </div>

      {/* The dock (bottom navigation) */}
      <BottomNavBar />

      <InstallPrompt />
      <UpdateToast visible={updateReady && !updateDismissed} onDismiss={() => setUpdateDismissed(true)} />

      <LogoutModal isOpen={showLogout} onClose={() => setShowLogout(false)} />

      <LanguageSwitchDialog
        pendingLanguage={pendingLanguage}
        currentLanguage={language}
        childName={activeChild?.name}
        switching={switchingLanguage}
        onConfirm={confirmLanguageSwitch}
        onCancel={() => setPendingLanguage(null)}
      />
    </div>
    </MotionConfig>
  );
}
