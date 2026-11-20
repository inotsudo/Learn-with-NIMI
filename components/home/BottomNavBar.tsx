"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Swords, User, MessageCircle, Award } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getComponentVariant } from "@/lib/design-system/componentVariants";

const NAV_ITEMS = [
  { href: "/home",         icon: Home,          key: "home",      labelKey: "navHome"       },
  { href: "/stories",      icon: BookOpen,      key: "stories",   labelKey: "navStories"    },
  { href: "/treasure",     icon: Swords,        key: "treasure",  labelKey: "navChallenges" },
  { href: null,            icon: null,          key: "nimi",      labelKey: ""              },
  { href: "/user-profile", icon: User,          key: "profile",   labelKey: "navProfile"      },
  { href: "/certificates", icon: Award,         key: "certs",     labelKey: "navCertificates" },
  { href: "/talk-to-nimi", icon: MessageCircle, key: "talk",      labelKey: "navTalk"       },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const [offset, setOffset] = useState(0);
  const lastY = useRef(0);
  const { themeId } = useAppTheme();
  const { t } = useLanguage();
  const assets = getThemeAssets(themeId);
  const cv = getComponentVariant(themeId);

  const isActive = (href: string | null) => {
    if (!href) return false;
    return href === "/home" ? pathname === "/home" : pathname.startsWith(href);
  };

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      if (y <= 10) { setOffset(0); return; }
      setOffset(prev => Math.min(90, Math.max(0, prev + delta)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden pointer-events-none"
      style={{ transform: `translateY(${offset}px)`, transition: "transform 0.18s cubic-bezier(0.25,0.1,0.25,1)" }}
    >
      <div className="pointer-events-auto mx-0 relative">

        {/* ── NIMI floating FAB — brand-primary ring ─────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-20">
          <Link href="/talk-to-nimi" aria-label="Talk to Nimi">
            <div
              className={`w-[64px] h-[64px] rounded-full p-[3px] ${cv.navigationStyle.fabGradient} ${cv.navigationStyle.fabShadow} active:scale-90 transition-transform duration-100`}
            >
              {/* Inner circle uses nav-bg so it matches the bar */}
              <div className="w-full h-full rounded-full flex items-center justify-center"
                style={{ background: "var(--ds-nav-bg)", border: "2px solid var(--ds-nav-border)" }}>
                <Image src={assets.nimiCircle} alt="" aria-hidden="true"
                  width={40} height={40} className="rounded-full object-cover" />
              </div>
            </div>
          </Link>
        </div>

        {/* ── Bar ───────────────────────────────────────────────── */}
        <div
          className={`relative rounded-t-[22px] overflow-hidden ${cv.navigationStyle.background}`}
          style={{
            borderTop:   "1px solid var(--ds-nav-border)",
            borderLeft:  "1px solid var(--ds-nav-border)",
            borderRight: "1px solid var(--ds-nav-border)",
            boxShadow:   "var(--ds-shadow-nav)",
            paddingBottom: "env(safe-area-inset-bottom,0px)",
          }}
        >
          {/* World-texture layer (very low opacity) */}
          <Image src={assets.navigation.bottomBar} alt="" aria-hidden="true" fill
            className="object-cover pointer-events-none opacity-[0.06]" />

          {/* Icons + labels row */}
          <div className="relative z-10 flex items-stretch h-[68px] px-1">
            {NAV_ITEMS.map((item) => {
              if (item.key === "nimi") {
                return <div key="nimi" className="w-[56px] shrink-0" aria-hidden="true" />;
              }

              const Icon = item.icon!;
              const active = isActive(item.href);
              const label = t(item.labelKey);

              return (
                <Link
                  key={item.key}
                  href={item.href!}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className="flex-1 flex flex-col items-center justify-center gap-[3px] py-2 active:scale-95 transition-transform duration-75"
                >
                  {/* Active pill */}
                  <div
                    className={`px-3 py-[7px] transition-all duration-200 rounded-full ${active ? `${cv.navigationStyle.activeIconBg} scale-[1.1]` : ""}`}
                  >
                    <Icon
                      className={`w-[20px] h-[20px] ${active ? cv.navigationStyle.activeIconColor : cv.navigationStyle.inactiveIconColor}`}
                      strokeWidth={active ? 2.5 : 1.7}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={`text-5xs font-black uppercase tracking-[0.05em] leading-none transition-colors duration-200 ${active ? cv.navigationStyle.activeIconColor : cv.navigationStyle.inactiveIconColor}`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
