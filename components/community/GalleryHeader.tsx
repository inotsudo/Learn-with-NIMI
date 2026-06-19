"use client";

import { Search, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type GalleryFilter = "all" | "art" | "coloring" | "story";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  filter: GalleryFilter;
  onFilterChange: (filter: GalleryFilter) => void;
}

export default function GalleryHeader({ search, onSearchChange, filter, onFilterChange }: Props) {
  const { t } = useLanguage();

  const tabs: { id: GalleryFilter; labelKey: string }[] = [
    { id: "all", labelKey: "filterAll" },
    { id: "art", labelKey: "filterArtwork" },
    { id: "coloring", labelKey: "filterColoring" },
    { id: "story", labelKey: "filterStories" },
  ];

  return (
    <div>
      <h1 className="font-black text-2xl sm:text-3xl text-white">{t("communityGalleryTitle")}</h1>
      <p className="text-purple-200 text-sm mt-1">{t("communityGallerySubtitle")}</p>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t("searchArtworkPlaceholder")}
            className="w-full bg-white/10 backdrop-blur border-2 border-white/15 rounded-full pl-9 pr-4 py-2 text-sm font-semibold text-white placeholder:text-white/40 placeholder:font-medium focus:outline-none focus:border-purple-300"
          />
        </div>

        <div className="inline-flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-colors ${
                filter === tab.id
                  ? "bg-purple-600 text-white shadow"
                  : "border-2 border-white/20 text-purple-200 bg-white/10 backdrop-blur"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border-2 border-white/15 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-purple-100 shrink-0 sm:ml-auto">
          <span>{t("sortByNewest")}</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
