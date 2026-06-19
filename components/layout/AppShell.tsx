"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { getChildren, getWeekStreak, getTotalStars, getActivityDates, getChildAchievements, getCurrentLevel, updateChildLanguage } from "@/lib/queries";
import { computeStreaks } from "@/lib/parentInsights";
import type { Child } from "@/lib/queries";
import Sidebar from "./Sidebar";
import LogoutModal from "./LogoutModal";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English",     flag: "🇬🇧" },
  { code: "fr", label: "Français",    flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
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
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switchingLanguage, setSwitchingLanguage] = useState(false);

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
    <div className="min-h-screen">
      <Sidebar
        activeChild={activeChild}
        level={level}
        weekStreak={weekStreak}
        streakCount={streakCount}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogoutClick={() => setShowLogout(true)}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d]">
        {/* Top stats bar */}
        <header className="sticky top-0 z-20 bg-white/10 backdrop-blur border-b border-white/15">
          <div className="flex items-center justify-between px-4 py-2.5">
            <button onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 -ml-2 text-purple-200 hover:text-white" aria-label="Open menu">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:block" />

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 bg-yellow-400/20 text-yellow-200 font-black text-sm px-3 py-1.5 rounded-full">
                <span>⭐</span><span>{totalStars}</span>
              </div>
              <div className="flex items-center gap-1 bg-blue-400/20 text-blue-200 font-black text-sm px-3 py-1.5 rounded-full">
                <span>💎</span><span>{gems}</span>
              </div>
              <button className="w-9 h-9 bg-purple-400/20 hover:bg-purple-400/30 rounded-full flex items-center justify-center text-purple-200 transition"
                aria-label="Notifications">
                <Bell className="w-5 h-5" />
              </button>
              <div className="relative">
                <button onClick={() => setShowLangPicker(p => !p)}
                  className="w-9 h-9 bg-purple-400/20 hover:bg-purple-400/30 rounded-full flex items-center justify-center text-lg transition"
                  aria-label="Change language">
                  {LANGS.find(l => l.code === language)?.flag ?? "🌐"}
                </button>
                {showLangPicker && (
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border-2 border-purple-200 overflow-hidden z-50 w-36">
                    {LANGS.map(lang => (
                      <button key={lang.code} onClick={() => { setShowLangPicker(false); setPendingLanguage(lang.code); }}
                        className="flex items-center px-3 py-2.5 w-full hover:bg-purple-50 transition text-sm">
                        <span className="text-lg mr-2">{lang.flag}</span>
                        <span className="font-medium">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col w-full max-w-[1800px] mx-auto">
          {children}
        </div>
      </div>

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
