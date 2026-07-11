"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Swords, Users, MessageCircle, ShoppingBag } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { getComponentVariant } from "@/lib/design-system/componentVariants";

const NAV = [
  { href: "/home",         icon: Home,          key: "home",      label: "Home"       },
  { href: "/stories",      icon: BookOpen,      key: "stories",   label: "Stories"    },
  { href: "/treasure",     icon: Swords,        key: "treasure",  label: "Challenges" },
  { href: null,            icon: null,          key: "nimi",      label: ""           },
  { href: "/community",    icon: Users,         key: "community", label: "Friends"    },
  { href: "/shop",         icon: ShoppingBag,   key: "shop",      label: "Shop"       },
  { href: "/talk-to-nimi", icon: MessageCircle, key: "talk",      label: "Talk"       },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const [offset, setOffset] = useState(0);
  const lastY = useRef(0);
  const { themeId } = useAppTheme();
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
      style={{ transform: `translateY(${offset}px)`, transition: "transform 0.18s cubic-bezier(0.25, 0.1, 0.25, 1)" }}
    >
      {/* Outer wrapper is the containing block for the floating FAB */}
      <div className="pointer-events-auto mx-0 relative">

        {/* NIMI floating center — sits ABOVE the bar, outside overflow-hidden */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-20">
          <Link href="/talk-to-nimi" aria-label="Talk to Nimi">
            <div className={`w-[64px] h-[64px] rounded-full p-[3px] ${cv.navigationStyle.fabGradient} ${cv.navigationStyle.fabShadow} active:scale-90 transition-transform duration-100`}>
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center border-2 border-ds-border">
                <img src={assets.nimiCircle} alt="" aria-hidden="true" className="w-10 h-10 rounded-full object-cover"  loading="lazy" />
              </div>
            </div>
          </Link>
        </div>

        {/* Bar — overflow-hidden only clips the texture, not the FAB */}
        <div
          className={`relative ${cv.navigationStyle.background} rounded-t-[22px] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-x border-ds-border overflow-hidden`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* World bottom bar texture */}
          <img src={assets.navigation.bottomBar} alt="" aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-[0.07]"  loading="lazy" />

          {/* Icons + labels row — 68 px tall to accommodate labels */}
          <div className="relative z-10 flex items-stretch h-[68px] px-1">
            {NAV.map((item) => {
              if (item.key === "nimi") {
                return <div key="nimi" className="w-[56px] shrink-0" aria-hidden="true" />;
              }

              const Icon = item.icon!;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.key}
                  href={item.href!}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="flex-1 flex flex-col items-center justify-center gap-[3px] py-2 active:scale-95 transition-transform duration-75"
                >
                  {/* Pill highlight around icon — only visible when active */}
                  <div
                    className={`px-3 py-[7px] transition-all duration-200 ${
                      active ? `${cv.navigationStyle.activeIconBg} scale-[1.1]` : ""
                    }`}
                    style={{ borderRadius: "999px" }}
                  >
                    <Icon
                      className={`w-[20px] h-[20px] ${
                        active
                          ? cv.navigationStyle.activeIconColor
                          : cv.navigationStyle.inactiveIconColor
                      }`}
                      strokeWidth={active ? 2.5 : 1.7}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[8px] font-black uppercase tracking-[0.05em] leading-none transition-colors duration-200 ${
                      active
                        ? cv.navigationStyle.activeIconColor
                        : cv.navigationStyle.inactiveIconColor
                    }`}
                  >
                    {item.label}
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
