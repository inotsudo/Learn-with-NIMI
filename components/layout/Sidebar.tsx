"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  Home, BookOpen, Trophy, Users, MessageCircle, UserCircle, LogOut, ShoppingBag, Star,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useKidTheme } from "@/contexts/ThemeProvider";
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

export default function Sidebar({ activeChild, isOpen, onClose, onLogoutClick }: SidebarProps) {
  const { t } = useLanguage();
  const { theme } = useKidTheme();
  const pathname = usePathname();
  const onSettingsSection = pathname.startsWith("/user-profile/settings");

  const navItems = [
    { icon: Home,          label: "Home",         href: "/",              isActive: pathname === "/",                     emoji: "🏠" },
    { icon: BookOpen,      label: "Stories",       href: "/stories",      isActive: pathname.startsWith("/stories"),      emoji: "📚" },
    { icon: Trophy,        label: "Challenges",    href: "/treasure",     isActive: pathname.startsWith("/treasure"),     emoji: "🏆" },
    { icon: Users,         label: "Community",     href: "/community",    isActive: pathname.startsWith("/community"),    emoji: "👥" },
    { icon: MessageCircle, label: "Talk to Nimi",  href: "/talk-to-nimi", isActive: pathname.startsWith("/talk-to-nimi"), emoji: "🤖" },
    { icon: ShoppingBag,   label: "Star Shop",     href: "/shop",         isActive: pathname.startsWith("/shop"),         emoji: "🛍️" },
    { icon: UserCircle,    label: "Profile",       href: "/user-profile", isActive: pathname.startsWith("/user-profile"), emoji: "👤" },
    { icon: Users,         label: "Parents",       href: "/parents",      isActive: pathname.startsWith("/parents"),      emoji: "👨‍👩‍👧" },
  ];

  const content = (
    <div className="flex flex-col px-3 py-5">
      {/* Close (mobile) */}
      <button onClick={onClose}
        className="lg:hidden absolute right-3 top-4 theme-text hover:text-white p-1 transition z-10">
        <X className="w-6 h-6" />
      </button>

      {/* Brand logo */}
      <Link href="/" onClick={onClose} className="flex flex-col items-center mb-14">
        <img src="/nimi-logo.png" alt="NIMIPIKO"
          className="w-20 h-20 rounded-full border-2 border-yellow-400/40 shadow-lg" />
        <img src="/nimipiko-logo-text.png" alt="NIMIPIKO"
          className="h-7 w-auto mt-2" />
        <p className="mt-1 px-2 py-0.5 rounded-full theme-accent/15 text-[8px] font-bold text-yellow-200/70 select-none">
          🌟 Learn • Play • Grow 🌟
        </p>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-2">
        {navItems.map(item => (
          <SidebarNavItem key={item.label} {...item} onClick={onClose} />
        ))}
      </nav>

      {/* Keep Going card */}
      <div className="theme-card border theme-border rounded-xl p-4 mt-16 text-center">
        <p className="font-baloo font-black text-green-400 text-[13px]">Keep going!</p>
        <p className="font-nunito theme-text text-[9px] leading-snug mt-0.5">Every story you complete makes you a star!</p>
        <img src="/assets/star-mascot.svg" alt="" className="w-12 h-12 mx-auto mt-2" />
      </div>

      {/* Logout */}
      <button
        onClick={() => { onClose(); onLogoutClick(); }}
        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl font-nunito font-bold text-[12px] bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>{t("authLogout")}</span>
      </button>
    </div>
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[200px] lg:z-30 border-r"
      style={{ background: theme.sidebar, borderColor: theme.border }}>
      {content}
    </aside>
  );
}
