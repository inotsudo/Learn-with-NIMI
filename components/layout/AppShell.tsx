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
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import { MotionConfig } from "framer-motion";
import ChildAvatar from "@/components/avatar/ChildAvatar";
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
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const variants = getComponentVariant(themeId);
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
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--airways-navy, #06101F)" }}>
      <div className="text-center">
        <div className="animate-spin w-10 h-10 rounded-full border-4 border-t-transparent mx-auto" style={{ borderColor: "var(--airways-gold, #C9A84C)", borderTopColor: "transparent" }} />
        <p className="mt-3 font-baloo font-bold text-sm" style={{ color: "var(--airways-text-muted, rgba(240,232,212,0.55))" }}>✈️ Boarding…</p>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── AIRWAYS: Deep navy gradient background ── */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(160deg, #030C17 0%, #06101F 40%, #0A1828 75%, #0D1E3A 100%)",
        }}
      />
      {/* Airways: Subtle gold bloom top-right */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-96 -z-10"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 85% -10%, rgba(201,168,76,0.10) 0%, transparent 60%)",
        }}
      />
      {/* Airways: Sky blue horizon glow */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-64 -z-10"
        style={{
          background: "radial-gradient(ellipse 100% 60% at 50% 100%, rgba(30,80,160,0.18) 0%, transparent 70%)",
        }}
      />
      {/* Airways: Floating cloud texture — very subtle */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage: `url('${assets.backgrounds.app}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "invert(1)",
        }}
      />
      <Sidebar
        activeChild={activeChild}
        level={level}
        weekStreak={weekStreak}
        streakCount={streakCount}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogoutClick={() => setShowLogout(true)}
      />

      <div className="relative flex min-h-screen min-w-0 flex-col" style={{ paddingLeft: "0" }} data-airways-main>
      <style>{`@media (min-width:1024px){[data-airways-main]{margin-left:var(--airways-sidebar-w,220px);width:calc(100% - var(--airways-sidebar-w,220px));}}`}</style>

        {!isOnline && (
          <div className="bg-ds-warn-surface text-ds-warn text-xs font-semibold text-center py-1.5 px-3 border-b border-ds-warn">
            📡 {t("offlineBanner")}
          </div>
        )}

        {/* ── Trial countdown / expired banner ─────────────────────────── */}
        {!bannerDismissed && (trialBannerDays !== null || trialExpiredBanner || trialGraceBanner) && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold border-b ${
              trialExpiredBanner || trialGraceBanner || trialBannerDays === 0
                ? "bg-ds-danger-surface text-ds-danger border-ds-danger"
                : "bg-ds-warn-surface text-ds-warn border-ds-warn"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">{trialExpiredBanner || trialGraceBanner || trialBannerDays === 0 ? "🔴" : "⏳"}</span>
              <span className="truncate">
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
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/pricing"
                className={`font-black px-3 py-1 rounded-xl text-2xs transition ${
                  trialExpiredBanner || trialGraceBanner || trialBannerDays === 0
                    ? "bg-[var(--ds-state-error)] text-white hover:opacity-90"
                    : "bg-[var(--ds-warn-icon)] text-white hover:opacity-90"
                }`}
              >
                {trialExpiredBanner || trialGraceBanner ? "Subscribe" : "Subscribe →"}
              </a>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-current opacity-50 hover:opacity-100 transition"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── AIRWAYS Top bar ──────────────────────────────────────────────── */}
        {activeChild && (
          <div
            className={pathname === "/home"
              ? "relative z-20 lg:absolute lg:top-3 lg:right-6 lg:w-fit"
              : "relative z-20"}
          >
            {/* No header bar — the reference has no distinct top strip at all; the streak/
                stars/bell/language row sits directly on the page background, same as the
                hero below it, with no separating background/border/shadow. */}

            {/* Content layer — overflow-visible so dropdowns escape */}
            <div className="relative flex items-center h-12 px-3 lg:px-0 max-w-[1800px] mx-auto gap-2.5">

              {/* Mobile: hamburger */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 shrink-0"
                style={{ background: "rgba(20,35,59,0.05)", border: "1px solid rgba(177,120,34,0.20)", color: "#14233B" }}
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>

              {/* Search — mobile only. The reference's desktop top bar has no search icon at
                  all (search lives on /stories), so desktop stays exactly as clean as the
                  reference; mobile keeps a compact entry point since there's no room for a
                  persistent search affordance elsewhere at that width. */}
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 shrink-0"
                style={{ background: "rgba(20,35,59,0.05)", border: "1px solid rgba(177,120,34,0.20)", color: "rgba(20,35,59,0.55)" }}
                aria-label="Search"
              >
                <Search className="w-4.5 h-4.5" />
              </button>

              <div className="flex-1" />

              {/* Right cluster — frosted pill so chips are legible over hero */}
              <div
                className="ml-auto flex items-center gap-2 shrink-0 rounded-[28px] px-2 py-1.5 lg:backdrop-blur-sm"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)" }}
              >

                {/* ── Streak chip ── */}
                <div
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl transition-all"
                  title={streakCount > 0 ? `${streakCount}-day streak!` : "No streak yet"}
                  style={{
                    background: streakCount > 0
                      ? "linear-gradient(135deg,#FF8C00,#F55F00)"
                      : "rgba(20,35,59,0.06)",
                    boxShadow: streakCount > 0
                      ? "0 3px 0 rgba(180,60,0,0.30), 0 6px 16px rgba(245,95,0,0.22)"
                      : "none",
                    border: streakCount > 0 ? "none" : "1.5px solid rgba(20,35,59,0.10)",
                  }}
                >
                  <span className={`text-[20px] leading-none ${streakCount === 0 ? "grayscale opacity-35" : ""}`}>🔥</span>
                  <div className="leading-none">
                    <p className="font-baloo font-black text-[15px] leading-none"
                       style={{ color: streakCount > 0 ? "#fff" : "rgba(20,35,59,0.30)" }}>
                      {streakCount}
                    </p>
                    <p className="font-baloo text-[9px] mt-0.5 uppercase tracking-wide"
                       style={{ color: streakCount > 0 ? "rgba(255,255,255,0.75)" : "rgba(20,35,59,0.28)" }}>
                      streak
                    </p>
                  </div>
                </div>

                {/* ── Stars chip ── */}
                <div
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl"
                  title={`${totalStars} stars earned`}
                  style={{
                    background: "linear-gradient(135deg,#F9C932,#E8A820)",
                    boxShadow: "0 3px 0 rgba(180,120,0,0.28), 0 6px 16px rgba(232,168,32,0.28)",
                  }}
                >
                  <span className="text-[20px] leading-none">⭐</span>
                  <div className="leading-none">
                    <p className="font-baloo font-black text-[15px] leading-none" style={{ color: "#06101F" }}>{totalStars}</p>
                    <p className="font-baloo text-[9px] mt-0.5 uppercase tracking-wide" style={{ color: "rgba(6,16,31,0.55)" }}>stars</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-6 rounded-full" style={{ background: "rgba(177,120,34,0.22)" }} />

                {/* ── Bell / Notifications ── */}
                <div className="relative">
                  <button
                    onClick={() => { setShowNotifications(p => !p); setShowLangPicker(false); setShowProfileMenu(false); }}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
                    style={{ background: "rgba(20,35,59,0.05)", border: "1px solid rgba(177,120,34,0.20)" }}
                    aria-label="Notifications"
                  >
                    <Bell className="w-[17px] h-[17px]" strokeWidth={1.8} style={{ color: "rgba(20,35,59,0.55)" }} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-5xs font-black text-white border-2 border-white px-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationPanel
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    onCountChange={setUnreadCount}
                  />
                </div>

                {/* ── Language pill — desktop only ── */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => { setShowLangPicker(p => !p); setShowProfileMenu(false); setShowNotifications(false); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border border-[var(--ds-border-primary)]/70 bg-white/80 shadow-sm transition-all hover:shadow-md hover:border-[var(--ds-brand-primary)]/40 hover:bg-[var(--ds-brand-soft)] hover:-translate-y-0.5 active:scale-95"
                    aria-label="Language"
                  >
                    <Flag lang={language} className="w-5 h-3.5 rounded-sm flex-shrink-0" />
                    <span className="text-2xs font-black text-[var(--ds-text-secondary)] uppercase tracking-wide">{language}</span>
                    <svg className="w-3 h-3 text-[var(--ds-text-tertiary)]" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {showLangPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[var(--ds-border-primary)]/80 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5">
                        {([
                          { code: "en" as Language, label: "English",     flag: "🇬🇧" },
                          { code: "fr" as Language, label: "Français",    flag: "🇫🇷" },
                          { code: "rw" as Language, label: "Kinyarwanda", flag: "🇷🇼" },
                        ] as { code: Language; label: string; flag: string }[]).map(l => (
                          <button
                            key={l.code}
                            onClick={() => { setShowLangPicker(false); setPendingLanguage(l.code); }}
                            className={`flex items-center gap-2.5 px-4 py-2.5 w-full transition font-nunito text-sml font-bold ${
                              l.code === language
                                ? "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]"
                                : "hover:bg-[var(--ds-surface-card-hover)] text-[var(--ds-text-primary)]"
                            }`}
                          >
                            <Flag lang={l.code} className="w-6 h-4 rounded-sm flex-shrink-0" />
                            <span className="flex-1 text-left">{l.label}</span>
                            {l.code === language && <span className="text-3xs font-black text-[var(--ds-brand-primary)]">✓</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Learner identity lives in the sidebar only, matching the reference exactly —
                    no avatar/profile chip in the top bar. Masterpiece and Settings, which used
                    to live in this dropdown, are now sidebar nav items instead (see Sidebar.tsx)
                    so they stay reachable. */}

              </div>{/* end right cluster */}
            </div>

            {/* Mobile search overlay */}
            {searchOpen && (
              <div className={`md:hidden absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center h-16 px-4 gap-3 border-b border-[var(--ds-border-primary)] shadow-sm`}>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-xl text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-card-hover)] transition shrink-0"
                  aria-label="Close search"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
                    setSearchOpen(false);
                    if (q) void (window.location.href = `/stories?q=${encodeURIComponent(q)}`);
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-text-tertiary)]" />
                    <input
                      name="q"
                      type="text"
                      autoFocus
                      placeholder="Search stories, activities…"
                      className="w-full h-10 bg-[var(--ds-surface-input)] border border-[var(--ds-border-primary)] rounded-2xl pl-9 pr-4 text-sml font-nunito text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-brand-primary)]/30 focus:border-[var(--ds-brand-primary)]/60 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-10 h-10 flex items-center justify-center rounded-xl transition shrink-0 active:scale-95"
                    style={{ backgroundColor: "var(--ds-brand-primary)" }}
                  >
                    <Search className="w-4 h-4 text-white" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div
          id="main-content"
          className={pathname === "/home"
            ? "flex-1 flex flex-col w-full max-w-[1800px] mx-auto px-0 py-0 pb-[88px] sm:px-0 sm:py-0 lg:px-0 lg:py-0 lg:pb-0"
            : "flex-1 flex flex-col w-full max-w-[1800px] mx-auto px-4 py-4 pb-[88px] sm:px-5 sm:py-5 lg:px-6 lg:py-6 lg:pb-8"}
        >
          {children}
        </div>
      </div>

      {/* Persistent bottom navigation — mobile only (lg:hidden inside the component) */}
      <BottomNavBar />

      <InstallPrompt />
      <UpdateToast visible={updateReady && !updateDismissed} onDismiss={() => setUpdateDismissed(true)} />

      <LogoutModal isOpen={showLogout} onClose={() => setShowLogout(false)} />

      {/* Copyright footer — desktop only, stays below content */}
      {pathname !== "/home" && (
        <div className="hidden lg:block text-center py-2 border-t border-ds-border bg-ds-card/50">
          <p className="font-nunito text-3xs text-[var(--ds-text-tertiary)]">© 2026 Nimipiko Studio LTD. All rights reserved.</p>
        </div>
      )}

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
