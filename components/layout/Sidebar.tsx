"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LogOut, Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
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
  { label: "Home",         href: "/home",          match: (p: string) => p === "/home",                  emoji: "🏠", activeBg: "bg-emerald-50",  activeText: "text-emerald-700", activeBorder: "border-emerald-200/60", activeBar: "bg-emerald-500" },
  { label: "Stories",      href: "/stories",       match: (p: string) => p.startsWith("/stories"),       emoji: "📚", activeBg: "bg-sky-50",      activeText: "text-sky-700",     activeBorder: "border-sky-200/60",     activeBar: "bg-sky-500"     },
  { label: "Challenges",   href: "/treasure",      match: (p: string) => p.startsWith("/treasure"),      emoji: "🏆", activeBg: "bg-amber-50",    activeText: "text-amber-700",   activeBorder: "border-amber-200/60",   activeBar: "bg-amber-500"   },
  { label: "Community",    href: "/community",     match: (p: string) => p.startsWith("/community"),     emoji: "👥", activeBg: "bg-cyan-50",     activeText: "text-cyan-700",    activeBorder: "border-cyan-200/60",    activeBar: "bg-cyan-500"    },
  { label: "Talk to Nimi", href: "/talk-to-nimi",  match: (p: string) => p.startsWith("/talk-to-nimi"),  emoji: "🤖", activeBg: "bg-violet-50",   activeText: "text-violet-700",  activeBorder: "border-violet-200/60",  activeBar: "bg-violet-500"  },
  { label: "Star Shop",    href: "/shop",          match: (p: string) => p.startsWith("/shop"),          emoji: "🛍️", activeBg: "bg-orange-50",   activeText: "text-orange-700",  activeBorder: "border-orange-200/60",  activeBar: "bg-orange-500"  },
  { label: "Masterpiece",  href: "/masterpiece",   match: (p: string) => p.startsWith("/masterpiece"),   emoji: "👑", activeBg: "bg-yellow-50",   activeText: "text-yellow-700",  activeBorder: "border-yellow-200/60",  activeBar: "bg-yellow-500"  },
  { label: "Profile",      href: "/user-profile",  match: (p: string) => p.startsWith("/user-profile"),  emoji: "👤", activeBg: "bg-teal-50",     activeText: "text-teal-700",    activeBorder: "border-teal-200/60",    activeBar: "bg-teal-500"    },
  { label: "Parents",      href: "/parents",       match: (p: string) => p.startsWith("/parents"),       emoji: "👨‍👩‍👧", activeBg: "bg-blue-50",     activeText: "text-blue-700",    activeBorder: "border-blue-200/60",    activeBar: "bg-blue-500"    },
];

export default function Sidebar({ activeChild, isOpen, onClose, onLogoutClick }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const [isClub, setIsClub] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsClub(false); return; }
      const sub = await getActiveSubscription(user.id);
      setIsClub(sub !== null);
    })();
  }, []);

  const content = (
    <div className="relative z-10 flex flex-col px-3 py-5 flex-1">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at top right, rgba(255,255,255,0.6), transparent 42%), url('${assets.navigation.particles}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.8,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-4 right-3 w-16 h-16 opacity-70"
        style={{
          backgroundImage: `url('${assets.navigation.ornaments}')`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          filter: "drop-shadow(0 4px 10px rgba(15,23,42,0.08))",
        }}
      />
      {/* Close — mobile only */}
      <button
        onClick={onClose}
        aria-label="Close menu"
        className="lg:hidden absolute right-3 top-4 text-gray-500 hover:text-[var(--ds-brand-primary)] p-1 transition z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Brand logo */}
      <Link href="/home" onClick={onClose} className="flex flex-col items-center mb-10 leaf border border-[color:var(--ds-border-primary)]/70 bg-white/90 p-2 shadow-[0_12px_26px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:scale-[1.01]">
        <img src={assets.nimiLogo} alt="NIMIPIKO"
          className="w-20 h-20 rounded-full border-2 border-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]"  loading="lazy" />
        <img src={assets.nimiLogoText} alt="NIMIPIKO" className="h-7 w-auto mt-2"  loading="lazy" />
        <p className="mt-1 px-2 py-0.5 rounded-full bg-[var(--ds-brand-soft)] text-[8px] font-bold text-[var(--ds-brand-primary)] select-none">
          🌟 Learn • Play • Grow 🌟
        </p>
      </Link>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.match(pathname);
          return (
            <Link key={item.label} href={item.href} onClick={onClose}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 leaf border font-baloo font-black text-[14px] transition-all duration-200 active:scale-[0.97] ${
                isActive
                  ? `${item.activeBg} ${item.activeText} ${item.activeBorder} shadow-sm`
                  : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}>
              {isActive && (
                <span className={`absolute left-0 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full ${item.activeBar}`} />
              )}
              <span className={`text-[20px] shrink-0 transition-transform duration-200 leading-none ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                {item.emoji}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Club upsell / member badge */}
      {isClub === false && (
        <Link
          href="/pricing"
          onClick={onClose}
          className="mt-10 block border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 leaf p-3 text-center shadow-[0_8px_20px_rgba(245,158,11,0.12)] hover:shadow-[0_10px_24px_rgba(245,158,11,0.2)] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Crown className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="font-baloo font-black text-amber-700 text-[12px] leading-tight">Join Club 👑</p>
          <p className="font-nunito text-amber-600/80 text-[9px] leading-snug mt-0.5">Unlock all themes, Nimi AI & more</p>
          <div className="mt-2 bg-amber-500 text-white font-baloo font-black text-[11px] px-3 py-1 rounded-full inline-block">
            Upgrade →
          </div>
        </Link>
      )}

      {isClub === true && (
        <div className="mt-10 border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 leaf p-3 text-center shadow-sm">
          <Crown className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="font-baloo font-black text-green-700 text-[12px]">Club Member 👑</p>
          <p className="font-nunito text-green-600/80 text-[9px] mt-0.5">All features unlocked</p>
        </div>
      )}

      {isClub === null && (
        <div className="mt-10 border border-gray-100 bg-gradient-to-br from-white/95 via-[var(--ds-brand-soft)]/80 to-white/95 leaf p-4 text-center shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <p className="font-baloo font-black text-gray-800 text-[13px]">{t("keepGoingLabel")}</p>
          <p className="font-nunito text-gray-500 text-[9px] leading-snug mt-0.5">{t("keepGoingBody")}</p>
          <div className="text-2xl mt-2">⭐</div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={() => { onClose(); onLogoutClick(); }}
        className="mt-3 flex items-center gap-2 px-3 py-2 leaf font-nunito font-bold text-[12px] bg-red-50 text-red-500 hover:bg-red-100 transition-all duration-200 hover:shadow-sm"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>{t("authLogout")}</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[200px] lg:z-30 border-r border-gray-200 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.90)), url('${assets.navigation.sidebar}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {content}
        </div>
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer panel */}
          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-[240px] border-r border-gray-200 overflow-y-auto"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.90)), url('${assets.navigation.sidebar}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {content}
          </aside>
        </>
      )}
    </>
  );
}
