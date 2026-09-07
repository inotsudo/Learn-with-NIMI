"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import supabase from "@/lib/supabaseClient";
import type { Child } from "@/lib/queries";

interface SidebarProps {
  activeChild: Child | null;
  level: number;
  weekStreak: boolean[];
  streakCount: number;
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
}

const GROUPS = [
  {
    label: "LEARN & PLAY", emoji: "⭐",
    items: [
      { label: "Home",        icon: "🏠", href: "/home",                 match: (p: string) => p === "/home",                                                          bg: "rgba(249,215,89,0.22)",  color: "#F9D779", ring: "rgba(249,215,89,0.45)" },
      { label: "My Journey",  icon: "🗺️", href: "/stories",              match: (p: string) => p.startsWith("/stories"),                                               bg: "rgba(74,171,245,0.22)", color: "#7dd3fc", ring: "rgba(74,171,245,0.45)" },
      { label: "Challenges",  icon: "🏆", href: "/treasure",             match: (p: string) => p.startsWith("/treasure"),                                              bg: "rgba(251,191,36,0.22)", color: "#fbbf24", ring: "rgba(251,191,36,0.45)" },
    ],
  },
  {
    label: "EXPLORE", emoji: "🪐",
    items: [
      { label: "Community",    icon: "👥", href: "/community",           match: (p: string) => p.startsWith("/community"),                                             bg: "rgba(196,181,253,0.22)", color: "#c4b5fd", ring: "rgba(196,181,253,0.45)" },
      { label: "Star Shop",    icon: "🛍️", href: "/shop",                match: (p: string) => p.startsWith("/shop"),                                                  bg: "rgba(253,164,175,0.22)", color: "#fda4af", ring: "rgba(253,164,175,0.45)" },
      { label: "Talk to Nimi", icon: "🤖", href: "/talk-to-nimi",        match: (p: string) => p.startsWith("/talk-to-nimi"),                                          bg: "rgba(147,197,253,0.22)", color: "#93c5fd", ring: "rgba(147,197,253,0.45)" },
    ],
  },
  {
    label: "MY SPACE", emoji: "👤",
    items: [
      { label: "Profile",      icon: "👤", href: "/user-profile",        match: (p: string) => p.startsWith("/user-profile") && !p.startsWith("/user-profile/settings"), bg: "rgba(134,239,172,0.22)", color: "#86efac", ring: "rgba(134,239,172,0.45)" },
      { label: "Parents",      icon: "👨‍👩‍👧", href: "/parents",           match: (p: string) => p.startsWith("/parents"),                                                bg: "rgba(251,146,60,0.22)",  color: "#fdba74", ring: "rgba(251,146,60,0.45)" },
      { label: "Masterpiece",  icon: "🎨", href: "/masterpiece",         match: (p: string) => p.startsWith("/masterpiece"),                                           bg: "rgba(221,214,254,0.22)", color: "#c4b5fd", ring: "rgba(221,214,254,0.45)" },
      { label: "Settings",     icon: "⚙️", href: "/user-profile/settings", match: (p: string) => p.startsWith("/user-profile/settings"),                              bg: "rgba(165,243,252,0.20)", color: "#a5f3fc", ring: "rgba(165,243,252,0.45)" },
    ],
  },
];

export default function Sidebar({ activeChild, streakCount, isOpen, onClose, onLogoutClick }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  useEffect(() => {
    void supabase.auth.getUser(); // keep session warm
  }, []);

  const content = (
    <div
      className="relative flex flex-col h-full overflow-y-auto overflow-x-hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Background: deep navy gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(175deg,#071428 0%,#091d39 55%,#071020 100%)" }}
      />

      {/* Top gold atmospheric glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-[0.06]"
        style={{ background: "radial-gradient(ellipse 80% 100% at 50% 0%,#F9C932,transparent)" }}
      />

      {/* Right-edge subtle shimmer */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{ background: "linear-gradient(180deg,transparent,rgba(244,200,102,0.14) 30%,rgba(244,200,102,0.10) 70%,transparent)" }}
      />

      {/* Mobile close button */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="lg:hidden absolute right-2.5 top-2.5 z-20 w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
      >
        <X className="w-4 h-4" />
      </button>

      {/* ── Logo ── */}
      <div className="relative flex flex-col items-center pt-6 pb-3 px-4 shrink-0">
        {/* Gold halo glow behind logo */}
        <div
          className="absolute top-4 w-[96px] h-[96px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(249,201,50,0.22) 0%,transparent 72%)" }}
        />
        {/* Logo circle */}
        <div
          className="relative w-[84px] h-[84px] rounded-full overflow-hidden"
          style={{
            background: "#fff",
            padding: 3,
            boxShadow: "0 0 0 2px rgba(244,200,102,0.30), 0 8px 28px rgba(0,0,0,0.50)",
          }}
        >
          <Image
            src="/icons/icon-512-maskable.png"
            alt="Nimipiko"
            width={512}
            height={512}
            className="w-full h-full object-contain"
            priority
          />
        </div>
      </div>

      {/* ── Child profile card ── */}
      <div className="px-3 pb-3 shrink-0">
        <div
          className="flex items-center gap-3 rounded-[25px] border p-3"
          style={{
            background: "linear-gradient(135deg,rgba(248,205,92,0.15),rgba(122,180,255,0.12))",
            borderColor: "rgba(244,200,102,0.32)",
            boxShadow: "0 8px 22px rgba(18,42,70,0.35)",
          }}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            {activeChild?.avatar_url
              ? <ChildAvatar avatarUrl={activeChild.avatar_url} size={58} />
              : (
                <div
                  className="flex h-[58px] w-[58px] items-center justify-center rounded-full font-baloo text-xl font-black"
                  style={{ background: "linear-gradient(135deg,#173b66,#285595)", color: "#F9D779" }}
                >
                  {activeChild?.name?.charAt(0).toUpperCase() ?? "N"}
                </div>
              )
            }
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0F2342] bg-emerald-400" />
          </div>

          {/* Name + status + greeting */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-baloo text-lg font-black leading-tight" style={{ color: "#F9F3E0" }}>
              {activeChild?.name ?? "Explorer"}
            </p>
            <p className="mt-1 text-xs font-semibold leading-snug" style={{ color: "#DCE9FF" }}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Online<br />Ready to learn and explore! ✨
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav groups ── */}
      <nav className="relative flex-1 flex flex-col px-2.5 pb-1 gap-0.5">
        {GROUPS.map(({ label, emoji, items }, gi) => (
          <div key={label} className={gi > 0 ? "mt-1" : ""}>
            {/* Group header */}
            <div className="flex items-center gap-1.5 px-1.5 pt-1.5 pb-1">
              <span style={{ fontSize: 10, lineHeight: 1 }}>{emoji}</span>
              <span
                className="font-baloo font-black tracking-[0.18em] uppercase"
                style={{ fontSize: 9, color: "rgba(180,210,255,0.48)" }}
              >
                {label}
              </span>
              <span
                className="flex-1 h-px"
                style={{ background: "linear-gradient(90deg,rgba(244,200,102,0.20),transparent 80%)" }}
              />
            </div>

            {/* Items */}
            <div className="flex flex-col gap-px">
              {items.map(item => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className="group relative flex items-center gap-2 rounded-xl px-2 py-[7px] transition-all duration-150 active:scale-[0.97]"
                    style={active ? {
                      background: "linear-gradient(135deg,#FFE866,#FFC436,#F5A913)",
                      boxShadow: "0 2px 10px rgba(245,169,19,0.35), inset 0 1px 0 rgba(255,255,255,0.50)",
                    } : {
                      background: "transparent",
                    }}
                  >
                    {/* Hover layer (inactive only) */}
                    {!active && (
                      <span
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                        style={{ background: "rgba(255,255,255,0.055)" }}
                      />
                    )}

                    {/* Left accent line (active) */}
                    {active && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full pointer-events-none"
                        style={{ background: "rgba(255,255,255,0.60)" }}
                      />
                    )}

                    {/* Icon bubble */}
                    <span
                      className="relative shrink-0 w-[26px] h-[26px] rounded-lg flex items-center justify-center"
                      style={{
                        fontSize: 13,
                        lineHeight: 1,
                        background: active ? "rgba(255,255,255,0.82)" : item.bg,
                        boxShadow: active
                          ? "inset 0 1px 0 rgba(255,255,255,0.90), 0 1px 4px rgba(0,0,0,0.12)"
                          : `0 0 0 1px ${item.ring}`,
                      }}
                    >
                      {item.icon}
                    </span>

                    {/* Label */}
                    <span
                      className="flex-1 font-baloo font-black leading-none"
                      style={{
                        fontSize: 12.5,
                        color: active ? "#06101F" : "rgba(215,232,255,0.88)",
                      }}
                    >
                      {item.label}
                    </span>

                    {/* Chevron (active) */}
                    {active && (
                      <span
                        className="text-[10px] font-black leading-none"
                        style={{ color: "rgba(6,16,31,0.55)" }}
                      >›</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom section ── */}
      <div className="relative shrink-0 mt-2">
        {/* Top divider */}
        <div
          className="mx-3 mb-3 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(244,200,102,0.15),transparent)" }}
        />

        {/* Stars / shop pill */}
        <div className="mx-3 mb-2">
          <Link
            href="/shop"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-2.5 font-baloo font-black transition-all hover:brightness-108 active:scale-[0.97]"
            style={{
              fontSize: 12.5,
              background: "linear-gradient(135deg,#F9C932,#E8A820)",
              color: "#06101F",
              boxShadow: "0 3px 0 rgba(140,88,0,0.32), 0 5px 16px rgba(232,168,32,0.25)",
            }}
          >
            <span style={{ fontSize: 15 }}>⭐</span>
            <span>{streakCount > 0 ? streakCount : "0"} Stars</span>
            <span style={{ fontSize: 11, opacity: 0.55 }}>›</span>
          </Link>
        </div>

        {/* Logout */}
        <div className="mx-3 mb-5">
          <button
            onClick={() => { onClose(); onLogoutClick(); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-all hover:bg-red-950/30 active:scale-[0.97]"
            style={{ color: "rgba(248,113,113,0.60)" }}
          >
            {/* logout arrow icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="font-baloo font-semibold" style={{ fontSize: 11.5 }}>
              {t("authLogout")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const shellStyle: React.CSSProperties = {
    background: "#06101F",
    borderRight: "1px solid rgba(201,168,76,0.10)",
    boxShadow: "4px 0 28px rgba(0,0,0,0.55)",
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Airways navigation"
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:overflow-hidden"
        style={{ width: "var(--airways-sidebar-w,220px)", ...shellStyle }}
      >
        {content}
      </aside>

      {/* Mobile overlay + drawer */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            aria-label="Airways navigation"
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-[230px] overflow-hidden"
            style={shellStyle}
          >
            {content}
          </aside>
        </>
      )}
    </>
  );
}
