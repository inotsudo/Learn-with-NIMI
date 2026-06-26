"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { getChildren, getWeekStreak, getTotalStars, getActivityDates, getChildAchievements, getCurrentLevel, updateChildLanguage } from "@/lib/queries";
import { computeStreaks } from "@/lib/parentInsights";
import type { Child } from "@/lib/queries";
import Sidebar from "./Sidebar";
import LogoutModal from "./LogoutModal";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useKidTheme } from "@/contexts/ThemeProvider";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import BottomNavBar from "@/components/home/BottomNavBar";
import NotificationPanel from "@/components/layout/NotificationPanel";
import Flag from "@/components/ui/Flag";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

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
  const { theme } = useKidTheme();
  const { language, setLanguage, t } = useLanguage();
  const isOnline = useOnlineStatus();
  useOfflineSync();
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

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // best-effort — offline caching just won't be available this session
      });
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0] ?? null;
      activeChildRef.current = child;
      setActiveChild(child);
      if (child) {
        setLanguage(child.language);
        setWeekStreak(await getWeekStreak(child.id, child.language));
        setStreakCount(computeStreaks(await getActivityDates(child.id, child.language)).current);
        setTotalStars(await getTotalStars(child.id, child.language));
        setLevel(await getCurrentLevel(child.id, child.language));
        const achievements = await getChildAchievements(child.id);
        setGems(achievements.filter(a => a.type === "badge" && a.language === child.language).length);
      }
    })();
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
    <div className="min-h-screen" style={{ background: theme.bg }}>
      <Sidebar
        activeChild={activeChild}
        level={level}
        weekStreak={weekStreak}
        streakCount={streakCount}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogoutClick={() => setShowLogout(true)}
      />

      <div className="lg:pl-[200px] flex flex-col min-h-screen" style={{ background: theme.bg }}>
        {!isOnline && (
          <div className="bg-orange-400/20 text-orange-100 text-xs font-semibold text-center py-1.5 px-3">
            📡 {t("offlineBanner")}
          </div>
        )}

        {/* Top bar — language, notifications, profile — all pages */}
        {activeChild && (
          <div className="sticky top-0 z-20 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none" style={{ background: `${theme.bg}e6` }}>
            <div className="flex items-center gap-2 px-4 py-2 max-w-[1800px] mx-auto">
              {/* Logo — mobile only, desktop has sidebar */}
              <Link href="/" className="flex items-center gap-2 shrink-0 mr-auto lg:hidden">
                <img src="/nimi-logo.png" alt="NIMIPIKO" className="w-8 h-8 rounded-full border border-yellow-400/30" />
                <img src="/nimipiko-logo-text.png" alt="NIMIPIKO" className="h-5 w-auto" />
              </Link>
              <div className="hidden lg:flex lg:flex-1" />
              <button onClick={() => setShowLangPicker(p => !p)}
                className="relative flex items-center gap-1.5 theme-card hover:theme-card-hover border theme-border rounded-full px-3 py-1.5 text-[12px] font-bold text-white transition">
                <Flag lang={language} className="w-5 h-3.5" />
                <span className="hidden sm:inline font-nunito">{language === "en" ? "English" : language === "fr" ? "Français" : "Kinyarwanda"}</span>
              </button>
              <div className="relative">
                <button onClick={() => { setShowNotifications(p => !p); setShowLangPicker(false); }}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 theme-card hover:theme-card-hover border theme-border rounded-full flex items-center justify-center transition group">
                  <span className="text-[18px] sm:text-[20px] group-hover:animate-[wiggle_0.5s_ease-in-out]">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 theme-border px-1">{unreadCount}</span>
                  )}
                </button>
                <NotificationPanel
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  onCountChange={setUnreadCount}
                />
              </div>
              <div className="relative">
                <button onClick={() => { setShowProfileMenu(p => !p); setShowLangPicker(false); setShowNotifications(false); }}
                  className="flex items-center gap-1.5 theme-card hover:theme-card-hover border theme-border rounded-full pl-1 pr-2.5 py-1 transition">
                  {activeChild.avatar_url && !activeChild.avatar_url.startsWith("http") ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-[1.5px] theme-border-strong/40 theme-accent/30 flex items-center justify-center text-sm select-none">{activeChild.avatar_url}</div>
                  ) : (
                    <img src={activeChild.avatar_url ?? "/nimi-logo-circle.png"} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-[1.5px] theme-border-strong/40"
                      onError={e => { (e.target as HTMLImageElement).src = "/nimi-logo-circle.png"; }} />
                  )}
                  <span className="hidden sm:inline text-white text-[12px] font-nunito font-bold">{activeChild.name}</span>
                  <span className="theme-text-muted/60 text-[9px]">▾</span>
                </button>

                {/* Profile dropdown */}
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-[200px] theme-card border theme-border rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden py-1">
                      {/* Child info */}
                      <div className="px-4 py-3 border-b theme-border">
                        <p className="font-baloo font-black text-white text-[15px]">{activeChild.name}</p>
                        <p className="font-nunito theme-text-muted text-[11px]">{activeChild.language === "en" ? "English" : activeChild.language === "fr" ? "Français" : "Kinyarwanda"}</p>
                      </div>
                      {[
                        { emoji: "👤", label: "My Profile", href: "/user-profile" },
                        { emoji: "⚙️", label: "Settings", href: "/user-profile/settings" },
                        { emoji: "🏆", label: "My Treasure", href: "/treasure" },
                      ].map(item => (
                        <a key={item.href} href={item.href} onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:theme-accent/10 transition">
                          <span className="text-[16px]">{item.emoji}</span>
                          <span className="font-nunito text-white text-[13px] font-bold">{item.label}</span>
                        </a>
                      ))}
                      <div className="border-t theme-border mt-1">
                        <button onClick={() => { setShowProfileMenu(false); setShowLogout(true); }}
                          className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-red-500/10 transition">
                          <span className="text-[16px]">🚪</span>
                          <span className="font-nunito text-red-400 text-[13px] font-bold">Log out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {showLangPicker && (
              <div className="absolute right-4 top-full mt-1 theme-card border theme-border rounded-xl shadow-xl overflow-hidden z-50 w-40">
                {[
                  { code: "en" as Language, label: "English" },
                  { code: "fr" as Language, label: "Français" },
                  { code: "rw" as Language, label: "Kinyarwanda" },
                ].map(l => (
                  <button key={l.code} onClick={() => { setShowLangPicker(false); setPendingLanguage(l.code); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 w-full hover:theme-accent/15 transition font-nunito text-[13px]">
                    <Flag lang={l.code} className="w-6 h-4" />
                    <span className="font-bold text-white">{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col w-full max-w-[1800px] mx-auto">
          {children}
        </div>
      </div>

      <BottomNavBar />
      <InstallPrompt />

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
  );
}
