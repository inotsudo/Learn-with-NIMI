"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, LogOut, Crown, ChevronRight, Plane } from "lucide-react";
import ChildAvatar from "@/components/avatar/ChildAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { getActiveSubscription } from "@/lib/payments/products";
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

const NAV_ITEMS = [
  { group: "Learn & Play", label: "Home", icon: "🏠", href: "/home", match: (p: string) => p === "/home", tone: "gold" },
  { group: "Learn & Play", label: "My Journey", icon: "✈️", href: "/stories", match: (p: string) => p.startsWith("/stories"), tone: "sky" },
  { group: "Learn & Play", label: "Challenges", icon: "🏆", href: "/treasure", match: (p: string) => p.startsWith("/treasure"), tone: "amber" },
  { group: "Explore", label: "Community", icon: "👥", href: "/community", match: (p: string) => p.startsWith("/community"), tone: "violet" },
  { group: "Explore", label: "Star Shop", icon: "🛍️", href: "/shop", match: (p: string) => p.startsWith("/shop"), tone: "pink" },
  { group: "Explore", label: "Talk to Nimi", icon: "🤖", href: "/talk-to-nimi", match: (p: string) => p.startsWith("/talk-to-nimi"), tone: "blue" },
  { group: "My Space", label: "Profile", icon: "👤", href: "/user-profile", match: (p: string) => p.startsWith("/user-profile") && !p.startsWith("/user-profile/settings"), tone: "mint" },
  { group: "My Space", label: "Parents", icon: "👨‍👩‍👧", href: "/parents", match: (p: string) => p.startsWith("/parents"), tone: "orange" },
  { group: "My Space", label: "Masterpiece", icon: "🎨", href: "/masterpiece", match: (p: string) => p.startsWith("/masterpiece"), tone: "purple" },
  { group: "Settings", label: "Settings", icon: "⚙️", href: "/user-profile/settings", match: (p: string) => p.startsWith("/user-profile/settings"), tone: "cyan" },
];

export default function Sidebar({ activeChild, streakCount, isOpen, onClose, onLogoutClick }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isClub, setIsClub]         = useState<boolean | null>(null);
  const [parentName, setParentName] = useState<string>("");
  const [parentAvatar] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("nimipiko-parent-avatar")
  );

  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsClub(false); return; }
        const [sub, row] = await Promise.all([
          getActiveSubscription(user.id).catch(() => null),
          (async () => {
            try {
              return await supabase.from("parents").select("name").eq("id", user.id).maybeSingle();
            } catch {
              return { data: null as { name: string } | null };
            }
          })(),
        ]);
        setIsClub(sub !== null);
        setParentName(row.data?.name ?? user.email?.split("@")[0] ?? "Parent");
      } catch {
        // Never leave isClub/parentName stuck at their initial empty state on failure —
        // that renders as a silently-missing Club card and blank parent chip.
        setIsClub(false);
        setParentName("Parent");
      }
    })();
  }, []);

  const content = (
    <div className="relative z-10 flex flex-col h-full overflow-y-auto" style={{ transform: "translateZ(0)" }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #020f22 0%, #091d39 28%, #091d39 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `radial-gradient(circle at 22% 16%, rgba(255,220,120,0.9) 0%, transparent 18%), radial-gradient(circle at 82% 12%, rgba(110,196,255,0.9) 0%, transparent 18%), radial-gradient(circle at 50% 94%, rgba(71,198,255,0.25) 0%, transparent 22%)`,
        }}
      />
      <div className="absolute left-5 top-6 text-xl opacity-80">✨</div>
      <div className="absolute right-4 top-20 text-sm opacity-70">☁️</div>
      <div className="absolute left-6 bottom-28 text-lg opacity-60">🚀</div>
      <div className="absolute right-5 bottom-32 text-sm opacity-60">⭐</div>

      <button
        onClick={onClose}
        aria-label="Close navigation"
        className="lg:hidden absolute right-3 top-3.5 z-20 w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-[#f7d56c] hover:bg-white/5 transition"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative px-6 pt-5 pb-3">
        <Image src="/nimipiko-logo-text.png" alt="Nimipiko Airways" width={250} height={54} className="h-auto w-[190px] object-contain" priority />
        <p className="ml-11 mt-0.5 font-baloo text-[11px] font-black tracking-[0.32em] text-[#e7f0ff]">AIRWAYS</p>
      </div>

      {
        <div className="px-5 pb-4">
          <div
            key={activeChild?.id ?? "explorer"}
            className="flex items-center gap-3 rounded-[25px] border p-3 shadow-[0_8px_22px_rgba(18,42,70,0.35)]"
            style={{
              background: "linear-gradient(135deg, rgba(248,205,92,0.15), rgba(122,180,255,0.12))",
              borderColor: "rgba(244,200,102,0.32)",
            }}
          >
            <div className="relative shrink-0">
              {activeChild?.avatar_url ? (
                  <ChildAvatar avatarUrl={activeChild.avatar_url} size={58} />
              ) : (
                <div
                  className="flex h-[58px] w-[58px] items-center justify-center rounded-full font-baloo text-xl font-black"
                  style={{ background: "linear-gradient(135deg,#173b66,#285595)", color: "#F9D779" }}
                >
                  {activeChild?.name?.charAt(0).toUpperCase() ?? "N"}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0F2342] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-baloo text-lg font-black leading-tight" style={{ color: "#F9F3E0" }}>
                {activeChild?.name || "Explorer"}
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug" style={{ color: "#DCE9FF" }}>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Online<br />Ready to learn and explore! ✨
              </p>
            </div>
            {isClub && <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: "#F9D779" }} />}
          </div>
        </div>
      }

      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-3 px-5 pb-3">
        {Object.entries({
          "LEARN & PLAY": NAV_ITEMS.filter(item => item.group === "Learn & Play"),
          "EXPLORE": NAV_ITEMS.filter(item => item.group === "Explore"),
          "MY SPACE": NAV_ITEMS.filter(item => item.group === "My Space"),
          "SETTINGS": NAV_ITEMS.filter(item => item.group === "Settings"),
        }).map(([label, items]) => (
          <div key={label} className="space-y-1.5">
            <div className="flex items-center gap-2 px-1 pb-1 pt-1">
              <span className="font-baloo text-[9px] font-black tracking-[0.18em] uppercase" style={{ color: "#eaf4ff" }}>{label}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-[#f4c866]/50 to-transparent" />
            </div>
            {items.map(item => {
              const isActive = item.match(pathname);
              const toneStyles: Record<string, { activeBg: string; activeIcon: string; iconText: string; dot: string }> = {
                gold: { activeBg: "rgba(247,196,90,0.30)", activeIcon: "linear-gradient(135deg, #f9d75a, #f7b24f)", iconText: "#14263f", dot: "#f8d96a" },
                sky: { activeBg: "rgba(125,211,252,0.20)", activeIcon: "linear-gradient(135deg, #7dd3fc, #60a5fa)", iconText: "#0b1c31", dot: "#7dd3fc" },
                amber: { activeBg: "rgba(251,191,36,0.20)", activeIcon: "linear-gradient(135deg, #fbbf24, #f59e0b)", iconText: "#11263c", dot: "#fbbf24" },
                violet: { activeBg: "rgba(196,181,253,0.22)", activeIcon: "linear-gradient(135deg, #c4b5fd, #8b5cf6)", iconText: "#171c34", dot: "#c4b5fd" },
                pink: { activeBg: "rgba(253,164,175,0.22)", activeIcon: "linear-gradient(135deg, #fda4af, #fb7185)", iconText: "#2e1520", dot: "#fda4af" },
                blue: { activeBg: "rgba(147,197,253,0.22)", activeIcon: "linear-gradient(135deg, #93c5fd, #60a5fa)", iconText: "#102241", dot: "#93c5fd" },
                mint: { activeBg: "rgba(134,239,172,0.22)", activeIcon: "linear-gradient(135deg, #86efac, #4ade80)", iconText: "#0d1f27", dot: "#86efac" },
                orange: { activeBg: "rgba(251,146,60,0.22)", activeIcon: "linear-gradient(135deg, #fdba74, #fb923c)", iconText: "#2c1e11", dot: "#fdba74" },
                purple: { activeBg: "rgba(196,181,253,0.22)", activeIcon: "linear-gradient(135deg, #ddd6fe, #a78bfa)", iconText: "#1a1636", dot: "#c4b5fd" },
                cyan: { activeBg: "rgba(125,211,252,0.18)", activeIcon: "linear-gradient(135deg, #a5f3fc, #67e8f9)", iconText: "#11212a", dot: "#a5f3fc" },
              };
              const palette = toneStyles[item.tone ?? "gold"];

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-full px-2.5 py-2 transition-all duration-200 active:scale-[0.99] ${isActive ? "-translate-y-px" : "hover:bg-white/[0.045]"}`}
                  style={
                    isActive
                      ? {
                          background: "linear-gradient(135deg, #FFE866 0%, #FFC436 54%, #F5A913 100%)",
                          boxShadow: "0 8px 18px rgba(4,18,42,.35), 0 0 16px rgba(255,205,54,.22), inset 0 2px 0 rgba(255,255,255,.7)",
                        }
                      : { background: "transparent" }
                  }
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[17px] leading-none transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                    style={{
                      background: isActive ? "rgba(255,255,255,.72)" : "rgba(72,135,210,.20)",
                      color: isActive ? "#0b2f68" : "#dceeff",
                      boxShadow: isActive ? "0 2px 5px rgba(180,122,0,.20), inset 0 1px 0 rgba(255,255,255,.9)" : "inset 0 1px 0 rgba(255,255,255,.12)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 font-baloo text-[15px] font-black leading-none tracking-tight" style={{ color: isActive ? "#082b78" : "#edf6ff" }}>
                    {item.label}
                  </span>
                  <span className="flex h-4 w-4 items-center justify-center text-sm" style={{ color: isActive ? "#082b78" : "rgba(255,255,255,0.48)" }}>
                    ›
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Stars counter button — matches reference bottom gold pill */}
      <div className="px-3 pb-2 pt-1">
        <Link
          href="/shop"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full rounded-2xl py-3 font-baloo font-black text-sm shadow-[0_4px_14px_rgba(201,168,76,0.35)] transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #F5C842 0%, #E8A820 100%)",
            color: "#06101F",
          }}
        >
          <span className="text-lg leading-none">⭐</span>
          <span>{/* streakCount used as proxy for stars display */}{streakCount > 0 ? streakCount : "0"} Stars</span>
          <span className="text-sm">›</span>
        </Link>
      </div>

      <div className="px-3 pb-3">
        <Link
          href="/parents"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 shadow-[0_8px_18px_rgba(17,36,60,0.2)]"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(244,200,102,0.10))",
            borderColor: "rgba(244,200,102,0.25)",
          }}
        >
          <div className="relative shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
              style={{ background: "linear-gradient(135deg,#1a3d67,#2d5c9d)", color: "#F9D779" }}
            >
              {parentAvatar ? <ChildAvatar avatarUrl={parentAvatar} size={30} /> : parentName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-baloo text-[11px] font-black leading-tight" style={{ color: "#F7F5EE" }}>
              {parentName}
            </p>
            <p className="text-[10px]" style={{ color: "#D8E8FF" }}>Parent Account</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "#F9D779" }} />
        </Link>

        <button
          onClick={() => { onClose(); onLogoutClick(); }}
          className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all hover:bg-red-950/40"
          style={{ color: "rgba(248,113,113,0.75)" }}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>{t("authLogout")}</span>
        </button>
      </div>

      <div className="h-4" />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside
        aria-label="Airways navigation"
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:overflow-hidden"
        style={{
          width: "var(--airways-sidebar-w, 220px)",
          background: "var(--airways-navy, #06101F)",
          borderRight: "1px solid rgba(201,168,76,0.14)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.45)",
        }}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            aria-label="Airways navigation"
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-[240px] overflow-hidden"
            style={{
              background: "var(--airways-navy, #06101F)",
              borderRight: "1px solid rgba(201,168,76,0.14)",
              boxShadow: "4px 0 32px rgba(0,0,0,0.6)",
            }}
          >
            {content}
          </aside>
        </>
      )}
    </>
  );
}
