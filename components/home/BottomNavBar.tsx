"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import "@/components/world-ui/world-ui.css";

/**
 * The dock: a floating glass bar of round 3D buttons, Nimi in the middle
 * (talk to Nimi). Hides while scrolling down, comes back on scroll up.
 * Left out on very short screens (phone landscape) — the Kit menu in the
 * top bar covers navigation there.
 */
const NAV_ITEMS = [
  { href: "/home",         icon: "🛫", key: "home",     labelKey: "navHome" },
  { href: "/stories",      icon: "📖", key: "stories",  labelKey: "navStories" },
  { href: "/treasure",     icon: "🏆", key: "treasure", labelKey: "navChallenges" },
  { href: null,            icon: "",   key: "nimi",     labelKey: "navTalk" },
  { href: "/user-profile", icon: "🧒", key: "profile",  labelKey: "navProfile" },
  { href: "/certificates", icon: "🎖️", key: "certs",    labelKey: "navCertificates" },
] as const;

export default function BottomNavBar() {
  const pathname = usePathname() ?? "";
  const [offset, setOffset] = useState(0);
  const lastY = useRef(0);
  const { themeId } = useAppTheme();
  const { t } = useLanguage();
  const assets = getThemeAssets(themeId);

  const isActive = (href: string | null) => {
    if (!href) return pathname.startsWith("/talk-to-nimi");
    return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
  };

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      if (y <= 10) { setOffset(0); return; }
      setOffset(prev => Math.min(120, Math.max(0, prev + delta)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Main navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center [@media(max-height:500px)]:hidden"
      style={{
        padding: "0 max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left))",
        transform: `translateY(${offset}px)`,
        transition: "transform 0.18s cubic-bezier(0.25,0.1,0.25,1)",
      }}
    >
      <div className="wui-dock pointer-events-auto">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href);
          const label = t(item.labelKey);
          if (item.key === "nimi") {
            return (
              <Link key="nimi" href="/talk-to-nimi" aria-label={label} aria-current={active ? "page" : undefined} className="wui-dock__item -mt-6">
                <span className="wui-orb wui-orb--gold !h-[62px] !w-[62px] !p-[3px]">
                  <Image src={assets.nimiCircle} alt="" width={52} height={52} className="h-full w-full rounded-full object-cover" />
                </span>
                <span className="sr-only">{label}</span>
              </Link>
            );
          }
          return (
            <Link key={item.key} href={item.href!} aria-label={label} aria-current={active ? "page" : undefined} className="wui-dock__item">
              <span className={`wui-orb !h-11 !w-11 text-[22px]${active ? " wui-orb--gold" : ""}`} aria-hidden="true">{item.icon}</span>
              <span className="max-w-[56px] truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
