"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ShopCategory } from "./_shopData";

export type ShopFilter = "all" | ShopCategory;

const TABS: { id: ShopFilter; labelKey: string; emoji: string }[] = [
  { id: "all",      labelKey: "filterAll",      emoji: "🛍️" },
  { id: "costumes", labelKey: "filterCostumes",  emoji: "🦸" },
  { id: "frames",   labelKey: "filterFrames",    emoji: "🖼️" },
  { id: "titles",   labelKey: "filterTitles",    emoji: "🏷️" },
  { id: "powerups", labelKey: "filterPowerups",  emoji: "⚡" },
];

interface Props {
  filter: ShopFilter;
  onFilterChange: (filter: ShopFilter) => void;
}

export default function ShopFilterTabs({ filter, onFilterChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
      {TABS.map(tab => {
        const active = filter === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className="relative shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-colors duration-200 focus:outline-none"
            style={{ color: active ? "white" : "var(--ds-text-muted)" }}
          >
            {active && (
              <motion.div
                layoutId="shop-filter-pill"
                className="absolute inset-0 rounded-xl"
                style={{ backgroundColor: "var(--nimi-green)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10 text-base leading-none">{tab.emoji}</span>
            <span className="relative z-10">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
