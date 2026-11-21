"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, X } from "lucide-react";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import supabase from "@/lib/supabaseClient";
import type { Child } from "@/lib/queries";
import { WORLD } from "@/lib/design-system/world";
import "@/components/world-ui/world-ui.css";

/**
 * The Kit des Champions — the app's main menu. Opens like a case over the
 * world (every screen size; there is no permanent sidebar any more).
 * Same destinations as before; grown-up places sit apart at the bottom.
 */
interface SidebarProps {
  activeChild: Child | null;
  level: number;
  weekStreak: boolean[];
  streakCount: number;
  /** Real star total for the stars pill (it used to show the streak count). */
  totalStars?: number;
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
}

type Item = { label: string; icon: string; href: string; tile: string; match: (p: string) => boolean };

const KID_ITEMS: Item[] = [
  { label: "Home",         icon: "🛫", href: "/home",          tile: "#2B5A9A", match: p => p === "/home" },
  { label: "My Journey",   icon: "🗺️", href: "/stories",       tile: "#1F7A8C", match: p => p.startsWith("/stories") },
  { label: "Challenges",   icon: "🏆", href: "/treasure",      tile: "#B7791F", match: p => p.startsWith("/treasure") },
  { label: "Talk to Nimi", icon: "🤖", href: "/talk-to-nimi",  tile: "#3B6FD8", match: p => p.startsWith("/talk-to-nimi") },
  { label: "My Nimipiko",  icon: "🧒", href: "/user-profile",  tile: "#2F855A", match: p => p.startsWith("/user-profile") && !p.startsWith("/user-profile/settings") },
  { label: "Masterpiece",  icon: "🎨", href: "/masterpiece",   tile: "#7C3AED", match: p => p.startsWith("/masterpiece") },
];

const GROWN_UP_ITEMS: Item[] = [
  { label: "Parents",  icon: "👨‍👩‍👧", href: "/parents",               tile: "#C05621", match: p => p.startsWith("/parents") },
  { label: "Settings", icon: "⚙️",      href: "/user-profile/settings", tile: "#4A5568", match: p => p.startsWith("/user-profile/settings") },
];

export default function Sidebar({ activeChild, level, streakCount, totalStars, isOpen, onClose, onLogoutClick }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname() ?? "";
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void supabase.auth.getUser(); // keep session warm
  }, []);

  // Escape closes; focus the close button when the Kit opens.
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const tile = (item: Item) => {
    const active = item.match(pathname);
    return (
      <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className="wui-kit-tile">
        <span className="wui-kit-tile__icon" style={{ ["--tile" as string]: item.tile }} aria-hidden="true">{item.icon}</span>
        {item.label}
      </Link>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="kit"
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ padding: "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))" }}
        >
          <button type="button" aria-label="Close the Kit" tabIndex={-1} onClick={onClose}
            className="absolute inset-0 cursor-default bg-[#06101F]/70 backdrop-blur-sm" />

          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="kit-title"
            initial={{ opacity: 0, y: 60, scale: 0.9, rotateX: 18 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 40, scale: 0.94 }}
            transition={WORLD.spring.pop}
            className="wui-glass relative max-h-full w-full max-w-[560px] overflow-y-auto rounded-[30px] p-5 sm:p-6"
            style={{ transformPerspective: 1200 }}
          >
            {/* case handle */}
            <span aria-hidden="true" className="absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-[#FDE68A]/40" />

            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-full" style={{ boxShadow: "0 0 0 3px #06101F, 0 0 0 5px #E8BC56, 0 8px 18px rgba(0,0,0,0.4)" }}>
                {activeChild?.avatar_url
                  ? <ChildAvatar avatarUrl={activeChild.avatar_url} size={56} />
                  : <span className="grid h-14 w-14 place-items-center rounded-full bg-[#1A3558] font-baloo text-xl font-extrabold text-[#FDE68A]">{activeChild?.name?.charAt(0).toUpperCase() ?? "N"}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-baloo text-[10px] font-extrabold tracking-[0.26em] text-[#E8BC56]">KIT DES CHAMPIONS</p>
                <h2 id="kit-title" className="truncate font-baloo text-[22px] font-extrabold leading-tight text-[#FFF7E0]">{activeChild?.name ?? "Explorer"}</h2>
                <p className="font-nunito text-[12px] font-bold text-[#FFF7E0]/60">Level {level} · {streakCount > 0 ? `🔥 ${streakCount}-day streak` : "Ready to explore! ✨"}</p>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close the Kit" className="wui-orb !h-11 !w-11">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav aria-label="Main menu" className="mt-5 grid grid-cols-3 gap-2.5">
              {KID_ITEMS.map(tile)}
            </nav>

            <Link href="/treasure" onClick={onClose}
              className="wui-btn wui-btn--gold mt-4 w-full !min-h-[52px] !text-[16px]">
              <span className="wui-btn__shine" aria-hidden="true" />
              <span aria-hidden="true">⭐</span>
              <span className="relative">{totalStars ?? 0} stars</span>
            </Link>

            <div className="mt-5 flex items-center gap-2">
              <span className="font-baloo text-[10px] font-extrabold tracking-[0.24em] text-[#FFF7E0]/45">GROWN-UPS</span>
              <span className="h-px flex-1 bg-[#FDE68A]/20" aria-hidden="true" />
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
              {GROWN_UP_ITEMS.map(tile)}
              <button type="button" onClick={() => { onClose(); onLogoutClick(); }} className="wui-kit-tile !text-[#FECACA]">
                <span className="wui-kit-tile__icon" style={{ ["--tile" as string]: "#9B2C2C" }} aria-hidden="true"><LogOut className="h-6 w-6 text-white" /></span>
                {t("authLogout")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
