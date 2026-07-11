"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Crown, Flame, Heart, LogOut, Search, Settings, Trophy, User } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { getChildren, getWeekStreak, getTotalStars, getActivityDates, getChildAchievements, getCurrentLevel, updateChildLanguage, getChildCosmetics } from "@/lib/queries";
import { computeStreaks } from "@/lib/parentInsights";
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

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LEVEL_LABELS: Record<number, string> = {
  1: "Sprout", 2: "Explorer", 3: "Creator", 4: "Champion", 5: "Legend",
};
const getLevelLabel = (n: number) => LEVEL_LABELS[Math.min(Math.max(n, 1), 5)] ?? "Explorer";

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English",     flag: "en" },
  { code: "fr", label: "Français",    flag: "fr" },
  { code: "rw", label: "Kinyarwanda", flag: "rw" },
];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const variants = getComponentVariant(themeId);
  const isOnline = useOnlineStatus();
  useOfflineSync();
  const { updateReady } = useSwUpdate();
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const activeChildRef = useRef<Child | null>(null);
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
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0] ?? null;
      activeChildRef.current = child;
      setActiveChild(child);
      if (child) {
        setLanguage(child.language);
        const [, , , , achievements, cos] = await Promise.all([
          getWeekStreak(child.id, child.language).then(setWeekStreak),
          getActivityDates(child.id, child.language).then(dates => setStreakCount(computeStreaks(dates).current)),
          getTotalStars(child.id, child.language).then(setTotalStars),
          getCurrentLevel(child.id, child.language).then(setLevel),
          getChildAchievements(child.id),
          getChildCosmetics(child.id),
        ]);
        setGems(achievements.filter((a: { type: string; language: string }) => a.type === "badge" && a.language === child.language).length);
        setCosmetics(cos);
      }
    })();
  }, []);

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
      setLanguage(child.language as Language);
      const [, , , , achievements, cos] = await Promise.all([
        getWeekStreak(child.id, child.language).then(setWeekStreak),
        getActivityDates(child.id, child.language).then(dates => setStreakCount(computeStreaks(dates).current)),
        getTotalStars(child.id, child.language).then(setTotalStars),
        getCurrentLevel(child.id, child.language).then(setLevel),
        getChildAchievements(child.id),
        getChildCosmetics(child.id),
      ]);
      setGems(achievements.filter((a: { type: string; language: string }) => a.type === "badge" && a.language === child.language).length);
      setCosmetics(cos);
    };
    window.addEventListener("app:childSwitch", handler as EventListener);
    return () => window.removeEventListener("app:childSwitch", handler as EventListener);
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
      void getWeekStreak(updated.id, lang).then(setWeekStreak);
      void getActivityDates(updated.id, lang).then(dates => setStreakCount(computeStreaks(dates).current));
      void getTotalStars(updated.id, lang).then(setTotalStars);
      void getCurrentLevel(updated.id, lang).then(setLevel);
      void getChildAchievements(updated.id).then(achievements =>
        setGems(achievements.filter(a => a.type === "badge" && a.language === lang).length)
      );
    };
    window.addEventListener("app:languageChange", handler);
    return () => window.removeEventListener("app:languageChange", handler);
  }, []);

  const confirmLanguageSwitch = async () => {
    if (!pendingLanguage || !activeChild) return;
    setSwitchingLanguage(true);
    await updateChildLanguage(activeChild.id, pendingLanguage);
    setLanguage(pendingLanguage);
    setSwitchingLanguage(false);
    setPendingLanguage(null);
    router.refresh();
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.82), rgba(246,250,242,0.92)), url('${assets.backgrounds.app}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 -z-10 opacity-50"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.76)), url('${assets.navigation.topbar}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(1.08)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 -z-10 opacity-35"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.88)), url('${assets.backgrounds.page}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(1.05)",
        }}
      />
      <div
        className="pointer-events-none absolute right-4 top-24 hidden md:block w-28 h-28 -z-10 opacity-70"
        style={{
          backgroundImage: `url('${assets.decorations.floating2}')`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          transform: "translateY(0)",
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

      <div className="relative lg:pl-[200px] flex flex-col min-h-screen">

        {!isOnline && (
          <div className="bg-amber-50 text-amber-800 text-xs font-semibold text-center py-1.5 px-3 border-b border-amber-200">
            📡 {t("offlineBanner")}
          </div>
        )}

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        {activeChild && (
          <div
            className={`sticky top-0 z-20 relative overflow-hidden ${variants.navigationStyle.background} border-b border-gray-100/80 shadow-[0_10px_32px_rgba(15,23,42,0.06)]`}
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88)), url('${assets.navigation.topbar}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backdropFilter: "blur(6px)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_42%)]" />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white/35 to-transparent" />
            <div
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-20 h-20 opacity-60"
              style={{
                backgroundImage: `url('${assets.navigation.ornaments}')`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
              }}
            />
            <div className="relative flex items-center h-16 px-4 lg:px-6 max-w-[1800px] mx-auto">

              {/* Mobile only: hamburger + logo */}
              <div className="flex items-center gap-2 mr-3 shrink-0 lg:hidden">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="group w-9 h-9 flex items-center justify-center leaf border border-gray-100/80 bg-white/80 text-gray-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--ds-brand-soft)] hover:text-[var(--ds-brand-primary)]"
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Mobile: search icon only — opens overlay on click */}
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden group w-9 h-9 flex items-center justify-center leaf border border-gray-100/80 bg-white/80 text-gray-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--ds-brand-soft)] hover:text-[var(--ds-brand-primary)]"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Desktop: full search bar */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
                  if (q) void (window.location.href = `/stories?q=${encodeURIComponent(q)}`);
                }}
                className="hidden md:block flex-1 max-w-[420px]"
              >
                <div className="relative">
                  <input
                    name="q"
                    type="text"
                    placeholder="Search stories, activities..."
                    className="w-full h-10 bg-white/85 border border-[var(--ds-border-primary)]/60 leaf pl-4 pr-12 text-[13px] font-nunito text-gray-700 placeholder-gray-400 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-brand-soft)] focus:border-[var(--ds-border-brand)] transition"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-xl bg-[var(--ds-brand-soft)] text-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-primary)] hover:text-white transition"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              </form>

              {/* Right cluster — ml-auto pushes to the right edge */}
              <div className="ml-auto flex items-center gap-5 pl-4">

                {/* Stats: desktop only */}
                <div className="hidden md:flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Flame className="w-7 h-7 shrink-0" fill="#f97316" strokeWidth={0} />
                    <div className="leading-none">
                      <p className="font-baloo font-black text-gray-900 text-[18px] leading-none">{streakCount}</p>
                      <p className="font-nunito text-gray-500 text-[11px] mt-0.5">Day Streak</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
                      <path d="M16 3L28 13L16 29L4 13Z" fill="#F59E0B" />
                      <path d="M16 3L28 13H4L16 3Z" fill="#FCD34D" />
                      <path d="M4 13L16 29L8 13H4Z" fill="#D97706" />
                      <path d="M28 13L16 29L24 13H28Z" fill="#D97706" />
                    </svg>
                    <div className="leading-none">
                      <p className="font-baloo font-black text-gray-900 text-[18px] leading-none">{totalStars * 10}</p>
                      <p className="font-nunito text-gray-500 text-[11px] mt-0.5">XP Points</p>
                    </div>
                  </div>
                </div>

                {/* Bell — always visible */}
                <div className="relative">
                  <button
                    onClick={() => { setShowNotifications(p => !p); setShowLangPicker(false); setShowProfileMenu(false); }}
                    className="group relative p-1.5 leaf border border-gray-100/80 bg-white/80 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--ds-brand-soft)] hover:text-[var(--ds-brand-primary)]"
                    aria-label="Notifications"
                  >
                    <Bell className="w-[22px] h-[22px] text-gray-500" strokeWidth={1.8} />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-[1.5px] border-white px-0.5">
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

                {/* Heart — desktop only */}
                <Link
                  href="/user-profile"
                  className="hidden md:flex p-1.5 leaf border border-gray-100/80 bg-white/80 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-50 hover:text-rose-500"
                  aria-label="Favourites"
                >
                  <Heart className="w-[22px] h-[22px] text-rose-400" strokeWidth={1.8} />
                </Link>

                {/* Language — desktop only */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setShowLangPicker(p => !p)}
                    className="p-1.5 leaf border border-gray-100/80 bg-white/80 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--ds-brand-soft)]"
                    aria-label="Language"
                  >
                    <Flag lang={language} className="w-7 h-[18px]" />
                  </button>
                  {showLangPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
                      <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                        {([
                          { code: "en" as Language, label: "English" },
                          { code: "fr" as Language, label: "Français" },
                          { code: "rw" as Language, label: "Kinyarwanda" },
                        ] as { code: Language; label: string }[]).map(l => (
                          <button
                            key={l.code}
                            onClick={() => { setShowLangPicker(false); setPendingLanguage(l.code); }}
                            className="flex items-center gap-2.5 px-3 py-2.5 w-full hover:bg-gray-50 transition font-nunito text-[13px]"
                          >
                            <Flag lang={l.code} className="w-6 h-4" />
                            <span className="font-bold text-gray-700">{l.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Profile */}
                <div className="relative">
                  <button
                    onClick={() => { setShowProfileMenu(p => !p); setShowLangPicker(false); setShowNotifications(false); }}
                    className="flex items-center gap-2 leaf border border-gray-100/80 bg-white/85 px-1.5 py-1 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--ds-brand-soft)]"
                  >
                    <div className="w-9 h-9 rounded-full border-2 border-gray-200 overflow-hidden shrink-0">
                      <ChildAvatar avatarUrl={activeChild.avatar_url} name={activeChild.name} size={36} />
                    </div>
                    <div className="hidden md:block text-left leading-none">
                      <p className="font-baloo font-black text-gray-800 text-[14px]">Hi, {activeChild.name}!</p>
                      {cosmetics.title_badge && SHOP_ITEM_MAP[cosmetics.title_badge] ? (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full mt-0.5 ${SHOP_ITEM_MAP[cosmetics.title_badge].titleColor ?? "bg-gray-100 text-gray-600"}`}>
                          {SHOP_ITEM_MAP[cosmetics.title_badge].emoji} {t(SHOP_ITEM_MAP[cosmetics.title_badge].nameKey)}
                        </span>
                      ) : (
                        <p className="font-nunito text-gray-500 text-[11px] mt-0.5">{getLevelLabel(level)} Level {level}</p>
                      )}
                    </div>
                    <svg className="hidden md:block w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-baloo font-black text-gray-800 text-[15px]">{activeChild.name}</p>
                          {cosmetics.title_badge && SHOP_ITEM_MAP[cosmetics.title_badge] ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full mt-1 ${SHOP_ITEM_MAP[cosmetics.title_badge].titleColor ?? "bg-gray-100 text-gray-600"}`}>
                              {SHOP_ITEM_MAP[cosmetics.title_badge].emoji} {t(SHOP_ITEM_MAP[cosmetics.title_badge].nameKey)}
                            </span>
                          ) : (
                            <p className="font-nunito text-gray-500 text-[11px] mt-0.5">{getLevelLabel(level)} · Level {level}</p>
                          )}
                        </div>
                        {([
                          { Icon: User,     label: "My Profile",    href: "/user-profile",         color: "text-blue-500"   },
                          { Icon: Settings, label: "Settings",      href: "/user-profile/settings", color: "text-gray-500"   },
                          { Icon: Trophy,   label: "My Treasure",   href: "/treasure",              color: "text-amber-500"  },
                          { Icon: Crown,    label: "Masterpiece",   href: "/masterpiece",           color: "text-yellow-600" },
                        ] as { Icon: React.ElementType; label: string; href: string; color: string }[]).map(item => (
                          <a
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
                          >
                            <item.Icon className={`w-4 h-4 shrink-0 ${item.color}`} strokeWidth={1.8} />
                            <span className="font-nunito text-gray-700 text-[13px] font-bold">{item.label}</span>
                          </a>
                        ))}
                        <div className="border-t border-gray-100 mt-1">
                          <button
                            onClick={() => { setShowProfileMenu(false); setShowLogout(true); }}
                            className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-red-50 transition"
                          >
                            <LogOut className="w-4 h-4 shrink-0 text-red-400" strokeWidth={1.8} />
                            <span className="font-nunito text-red-500 text-[13px] font-bold">Log out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>{/* end right cluster */}
            </div>

            {/* Mobile search overlay — slides in when searchOpen */}
            {searchOpen && (
              <div className={`md:hidden absolute inset-0 z-50 ${variants.navigationStyle.background} flex items-center h-16 px-4 gap-3 border-b border-gray-100 shadow-sm`}>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition shrink-0"
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
                  <input
                    name="q"
                    type="text"
                    autoFocus
                    placeholder="Search stories, activities..."
                    className="flex-1 h-10 bg-gray-50 border border-gray-200 leaf pl-4 pr-4 text-[13px] font-nunito text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] focus:border-[var(--ds-border-brand)] transition"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 flex items-center justify-center transition shrink-0"
                    style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}
                  >
                    <Search className="w-4 h-4 text-white" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div id="main-content" className="flex-1 flex flex-col w-full max-w-[1800px] mx-auto px-4 py-4 pb-[88px] sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </div>
      </div>

      {/* Persistent bottom navigation — mobile only (lg:hidden inside the component) */}
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
