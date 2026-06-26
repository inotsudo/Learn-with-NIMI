"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Trophy, Users, MessageCircle, UsersRound, ShoppingBag } from "lucide-react";

const NAV = [
  { href: "/",             icon: Home,           key: "home" },
  { href: "/stories",      icon: BookOpen,       key: "stories" },
  { href: "/treasure",     icon: Trophy,         key: "treasure" },
  { href: null,            icon: null,           key: "nimi" },
  { href: "/community",    icon: Users,          key: "community" },
  { href: "/talk-to-nimi", icon: MessageCircle,  key: "talk" },
  { href: "/parents",      icon: UsersRound,     key: "parents" },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const [offset, setOffset] = useState(0);
  const lastY = useRef(0);

  const isActive = (href: string | null) => {
    if (!href) return false;
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
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
    <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden pointer-events-none"
      style={{ transform: `translateY(${offset}px)`, transition: "transform 0.18s cubic-bezier(0.25, 0.1, 0.25, 1)" }}>
      <div className="pointer-events-auto mx-0">

        {/* Bar */}
        <div className="relative theme-card rounded-t-[22px] shadow-[0_-4px_30px_rgba(10,0,40,0.7)] border-t border-x theme-border">

          {/* NIMI floating center — sits above the bar */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-10">
            <Link href="/talk-to-nimi">
              <div className="w-[60px] h-[60px] rounded-full p-[3px] bg-gradient-to-br from-purple-400 via-purple-600 to-indigo-700 shadow-[0_0_20px_rgba(139,92,246,0.5)] active:scale-90 transition-transform">
                <div className="w-full h-full rounded-full theme-card flex items-center justify-center border-2 theme-border">
                  <img src="/nimi-logo-circle.png" alt="NIMI" className="w-10 h-10 rounded-full object-cover" />
                </div>
              </div>
            </Link>
          </div>

          {/* Icons row */}
          <div className="flex items-center h-[56px] px-2">
            {NAV.map((item) => {
              if (item.key === "nimi") {
                return <div key="nimi" className="w-[48px] shrink-0" />;
              }

              const Icon = item.icon!;
              const active = isActive(item.href);

              return (
                <Link key={item.key} href={item.href!} className="flex-1 flex justify-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90 ${
                    active ? "bg-yellow-900/40" : ""
                  }`}>
                    <Icon
                      className={`w-[22px] h-[22px] ${active ? "text-yellow-400" : "theme-text-faint"}`}
                      strokeWidth={active ? 2.5 : 1.6}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
