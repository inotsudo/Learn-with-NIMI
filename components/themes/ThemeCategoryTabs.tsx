"use client";

import { useRef } from "react";
import { THEME_CATEGORIES, type ThemeCategory } from "@/lib/design-system/themeMetadata";

interface Props {
  active:   ThemeCategory | "all";
  onChange: (category: ThemeCategory | "all") => void;
  className?: string;
}

const ALL_TAB = { id: "all" as const, label: "All Themes", emoji: "🎨" };
const TABS = [ALL_TAB, ...THEME_CATEGORIES];

export default function ThemeCategoryTabs({ active, onChange, className = "" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="Theme categories"
      className={`flex gap-2 overflow-x-auto scrollbar-hide pb-1 ${className}`}
    >
      {TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id as ThemeCategory | "all")}
            className={`
              flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium
              transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
              ${isActive
                ? "bg-white shadow-sm text-gray-900 border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              }
            `}
          >
            <span className="text-base leading-none">{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
