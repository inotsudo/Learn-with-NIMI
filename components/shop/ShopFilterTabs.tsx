"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { ShopCategory } from "./_shopData";

export type ShopFilter = "all" | ShopCategory;

const TABS: { id: ShopFilter; labelKey: string }[] = [
  { id: "all", labelKey: "filterAll" },
  { id: "accessories", labelKey: "filterAccessories" },
  { id: "backgrounds", labelKey: "filterBackgrounds" },
  { id: "toys", labelKey: "filterToys" },
];

interface Props {
  filter: ShopFilter;
  onFilterChange: (filter: ShopFilter) => void;
}

export default function ShopFilterTabs({ filter, onFilterChange }: Props) {
  const { t } = useLanguage();

  return (
    <div className="inline-flex flex-wrap gap-2">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-colors ${
            filter === tab.id
              ? "bg-purple-600 text-white shadow"
              : "border-2 border-purple-200 text-purple-600 bg-white"
          }`}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
}
