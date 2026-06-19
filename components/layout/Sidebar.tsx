"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, BookOpen, TrendingUp, Award, Gift, Users, UserCircle, UserCheck, Settings, LifeBuoy, LogOut, X, Check,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Child } from "@/lib/queries";
import SidebarNavItem from "./SidebarNavItem";

interface SidebarProps {
  activeChild: Child | null;
  level: number;
  weekStreak: boolean[];
  streakCount: number;
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
}

const STREAK_DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Sidebar({ activeChild, level, weekStreak, streakCount, isOpen, onClose, onLogoutClick }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const onProfileSection = pathname.startsWith("/user-profile") && !pathname.startsWith("/user-profile/settings");
  const onSettingsSection = pathname.startsWith("/user-profile/settings");

  const navItems = [
    { icon: Home,       label: t("navHome"),           href: "/",                  isActive: pathname === "/" },
    { icon: BookOpen,   label: t("navDailyAdventure"), href: "/missions",          isActive: pathname.startsWith("/missions") },
    { icon: TrendingUp, label: t("navMyProgress"),     href: "/user-profile",      isActive: onProfileSection },
    { icon: Award,      label: t("navCertificates"),   href: "/certificates",     isActive: pathname.startsWith("/certificates") },
    { icon: Gift,       label: t("navRewardShop"),     href: "/shop",              isActive: pathname.startsWith("/shop") },
    { icon: Users,      label: t("navCommunity"),      href: "/community",         isActive: pathname.startsWith("/community") },
    { icon: UserCircle, label: t("navProfile"),        href: "/user-profile/settings", isActive: onSettingsSection },
    { icon: UserCheck,  label: t("navParentsZone"),    href: "/parents",           isActive: pathname.startsWith("/parents") },
    { icon: Settings,   label: t("navSettings"),       href: "/settings",          isActive: pathname.startsWith("/settings") },
    { icon: LifeBuoy,   label: t("navHelpSupport"),    href: "/help",              isActive: pathname.startsWith("/help") },
  ];

  const avatar = activeChild?.avatar_url;
  const childName = activeChild?.name ?? "Explorer";

  const content = (
    <div className="flex flex-col h-full px-4 py-5">
<div className="relative mb-4">
  {/* Close Button */}
  <button
    onClick={onClose}
    className="lg:hidden absolute right-0 top-0 text-indigo-200 hover:text-white p-1 transition-colors"
    aria-label="Close menu"
  >
    <X className="w-6 h-6" />
  </button>

  {/* Brand */}
  <Link
    href="/"
    onClick={onClose}
    className="flex flex-col items-center"
  >
    {/* Mascot Logo */}
    <img
      src="/nimi-logo.png"
      alt="Nimi"
      className="w-14 h-14 rounded-full border-2 border-yellow-400 shadow-lg bg-white"
    />

    {/* Brand Name */}
    <img
      src="/nimipiko-logo-text.png"
      alt="Nimipiko"
      className="h-8 w-auto mt-2"
    />

    {/* Tagline */}
   <p
  className="
    mt-1.5
    px-3
    py-1
    rounded-full
    bg-gradient-to-r
    from-pink-500/20
    via-purple-500/20
    to-blue-500/20
    text-[10px]
    font-bold
    text-yellow-200
    border border-white/10
    shadow-sm
    select-none
  "
>
  🌟 Learn • Play • Grow 🌟
</p>
  </Link>
</div>
      {/* Child card */}
      <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 mb-6">
        {avatar && !avatar.startsWith("http") ? (
          <div className="w-14 h-14 rounded-full border-4 border-purple-300 shadow-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-2xl select-none shrink-0">
            {avatar}
          </div>
        ) : (
          <img src={avatar ?? "/default-avatar.png"} alt={childName}
            className="w-14 h-14 rounded-full object-cover border-4 border-purple-300 shadow-lg shrink-0"
            onError={e => { (e.target as HTMLImageElement).src = "/avatar.png"; }} />
        )}
        <div className="min-w-0">
          <p className="font-black text-white truncate">{childName}</p>
          <span className="inline-block mt-1 text-[11px] font-bold bg-yellow-400/20 backdrop-blur border border-yellow-300/30 text-yellow-200 px-2.5 py-0.5 rounded-full">
            {t("levelExplorer").replace("{level}", String(level))}
          </span>
        </div>
      </div>

      {/* Nav list */}
      <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
        {navItems.map(item => (
          <SidebarNavItem key={item.label} {...item} onClick={onClose} />
        ))}
      </nav>

      {/* Your Streak */}
      <div className="bg-white/10 rounded-2xl p-3 mb-3">
        <p className="text-white font-black text-[11px] text-center mb-2">
          🔥 {t("dayStreak").replace("{count}", String(streakCount))}
        </p>
        <div className="flex items-center justify-between">
          {STREAK_DAY_LABELS.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-bold text-indigo-200">{label}</span>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                weekStreak[i] ? "bg-orange-400" : "bg-white/20"
              }`}>
                {weekStreak[i] && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-indigo-200 text-center mt-2">{t("streakEncouragement")}</p>
      </div>

      {/* Log out button */}
      <button
        onClick={() => { onClose(); onLogoutClick(); }}
        className="mt-4 flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-400/30 transition-colors"
      >
        <LogOut className="w-5 h-5 shrink-0" />
        <span>{t("authLogout")}</span>
      </button>

      {/* Piko mascot */}
      <div className="mt-4 flex justify-center">
        <div className="bg-white/10 rounded-2xl p-2">
          <img src="/piko-logo-circle.png.png" alt="PIKO"
            className="w-16 h-16 rounded-full object-cover border-4 border-blue-300 shadow-xl" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:z-30 bg-gradient-to-b from-sidebar-indigo to-sidebar-purple">
        {content}
      </aside>

      {/* Mobile off-canvas drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              key="sidebar-drawer"
              className="fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-sidebar-indigo to-sidebar-purple lg:hidden"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
