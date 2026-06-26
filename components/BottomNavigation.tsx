"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Users, UserCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { launchMagic } from "@/lib/sparkle";

export default function BottomNavigation() {
  const [isClient, setIsClient] = useState(false);
  const [activeHover, setActiveHover] = useState<string | null>(null);
  const [isClickAnimating, setIsClickAnimating] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const pathname = usePathname();
  const { t, language } = useLanguage();
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleClick = (href: string, e: React.MouseEvent) => {
    if (href === "/rewards") {
      e.preventDefault();
      launchMagic();
      setIsClickAnimating(true);
      setTimeout(() => setIsClickAnimating(false), 1000);
    }
  };

  const navItems = [
    {
      name: t("home") || fallbackName("home", language),
      href: "/",
      icon: Home,
      activeColor: "bg-pink-200 text-pink-700",
      hoverColor: "hover:bg-pink-100 hover:text-pink-600",
      underlineColor: "bg-pink-500",
    },
    {
      name: fallbackName("mission", language),
      href: "/missions",
      icon: BookOpen,
      activeColor: "bg-green-200 text-green-700",
      hoverColor: "hover:bg-green-100 hover:text-green-600",
      underlineColor: "bg-green-500",
    },
    {
      name: t("community") || fallbackName("community", language),
      href: "/community",
      icon: Users,
      activeColor: "theme-accent-soft theme-text-muted",
      hoverColor: "hover:theme-accent-soft hover:theme-text-muted",
      underlineColor: "theme-accent",
    },
    {
      name: fallbackName("Guardian", language),
      href: "/parents",
      icon: UserCheck,
      activeColor: "bg-yellow-200 text-yellow-700",
      hoverColor: "hover:bg-yellow-100 hover:text-yellow-600",
      underlineColor: "bg-yellow-500",
    },
  ];

  if (!isClient) return null;

  return (
    <>
      {/* Page wrapper padding to prevent nav overlap */}
      <div className="pb-16 md:pb-20">
        {/* Your page content goes here */}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t-4 border-pink-300 shadow-2xl z-50 h-16 md:h-20"
        aria-label="Primary"
      >
        <div className="flex items-center justify-around h-full max-w-4xl mx-auto px-2 sm:px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isHovered = activeHover === item.href;
            const activeAndAnimating = isActive && isClickAnimating;
            const hideLabel = isHovered || isActive;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleClick(item.href, e)}
                onMouseEnter={() => {
                  if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                  hoverTimeout.current = setTimeout(() => {
                    setActiveHover(item.href);
                  }, 150);
                }}
                onMouseLeave={() => {
                  if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                  setActiveHover(null);
                }}
                onFocus={() => setIsFocused(item.href)}
                onBlur={() => setIsFocused(null)}
                className={`
                  group relative flex flex-col items-center justify-center flex-1 h-full 
                  transition-transform duration-300 will-change-transform
                  ${
                    isActive
                      ? "scale-110"
                      : isHovered
                      ? "scale-105 rotate-1"
                      : "scale-100 rotate-0"
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-500
                `}
                aria-current={isActive ? "page" : undefined}
                tabIndex={0}
                aria-label={item.name}
              >
                {/* Animated background pulse */}
                <span
                  className={`absolute inset-0 mx-auto w-14 h-14 rounded-full opacity-0
                    ${
                      isHovered
                        ? `${item.activeColor.replace(
                            "bg-",
                            "bg-opacity-25 bg-"
                          )} animate-pulse opacity-25`
                        : ""
                    }
                    ${
                      activeAndAnimating
                        ? "animate-[pulse_1s_ease-in-out_infinite] opacity-30"
                        : ""
                    }
                  `}
                  aria-hidden="true"
                />

                {/* Smaller icon card */}
                <span
                  className={`
                    relative rounded-full p-1.5 md:p-2 transition-all duration-300 will-change-transform
                    ${
                      isActive
                        ? `${item.activeColor} shadow-[0_0_8px_1px_rgba(0,0,0,0.1)]`
                        : `bg-gray-100 text-gray-500 ${item.hoverColor}`
                    }
                    ${isHovered ? "scale-110 rotate-3 shadow-lg" : ""}
                    ${activeAndAnimating ? "animate-bounce" : ""}
                  `}
                >
                  <item.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform duration-200 ${
                      isActive || isHovered
                        ? "text-current"
                        : "text-gray-400 group-hover:text-current"
                    }`}
                    aria-hidden="true"
                  />
                </span>

                {/* Label (hidden on hover or active) */}
                <span
                  className={`
                    text-xs sm:text-sm font-bold mt-0.5 transition-all duration-200
                    truncate max-w-full px-1 select-none
                    ${
                      hideLabel
                        ? "opacity-0 scale-90"
                        : isActive
                        ? "text-black font-extrabold opacity-100"
                        : "text-gray-600 group-hover:text-black opacity-100"
                    }
                    hidden sm:block
                  `}
                >
                  {item.name}
                </span>

                {/* Underline for active */}
                {isActive && (
                  <span
                    className={`absolute bottom-1 w-6 h-1 rounded-full transition-all duration-500 ${item.underlineColor}`}
                    aria-hidden="true"
                  />
                )}

                {/* Tooltip when hovered or focused */}
                {(isHovered || isFocused === item.href) && (
                  <span
                    className="absolute -top-7 px-2 py-1 rounded-md bg-black text-white text-xs whitespace-nowrap select-none pointer-events-none opacity-90"
                    role="tooltip"
                  >
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function fallbackName(key: string, lang: string) {
  const dictionary: Record<string, Record<string, string>> = {
    home: {
      en: "Home",
      es: "Inicio",
      fr: "Accueil",
      sw: "Nyumbani",
      rw: "Ahabanza",
    },
    mission: {
      en: "Mission",
      es: "Misión",
      fr: "Mission",
      sw: "Misheni",
      rw: "Ubutumwa",
    },
    community: {
      en: "Community",
      es: "Comunidad",
      fr: "Communauté",
      sw: "Jumuiya",
      rw: "Umuryango",
    },
    guardian: {
      en: "Guardian",
      es: "Tutor",
      fr: "Tuteur",
      sw: "Mlezi",
      rw: "Umurera",
    },
  };

  return dictionary[key]?.[lang] || dictionary[key]?.en || key;
}
