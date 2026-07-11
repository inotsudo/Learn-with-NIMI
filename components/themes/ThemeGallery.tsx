"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";
import {
  getAllThemes,
  getThemesByCategory,
  searchThemes,
  type ThemeCategory,
  type ThemeMetadata,
} from "@/lib/design-system/themeMetadata";
import type { ThemeFilterState } from "./ThemeFilters";
import type { AppThemeId } from "@/lib/design-system/theme";

import ThemeHeader from "./ThemeHeader";
import ThemeCategoryTabs from "./ThemeCategoryTabs";
import ThemeSearch from "./ThemeSearch";
import ThemeFilters from "./ThemeFilters";
import ThemeCard from "./ThemeCard";
import ThemeDetails from "./ThemeDetails";
import ThemeUnlockModal from "./ThemeUnlockModal";
import ThemePreviewModal from "./ThemePreviewModal";

// ── Skeleton card ─────────────────────────────────────────────────────────────
function ThemeCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white animate-pulse">
      <div className="h-36 bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="flex justify-between gap-2">
          <div className="h-4 w-24 rounded-full bg-gray-100" />
          <div className="h-4 w-14 rounded-full bg-gray-100" />
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100" />
        <div className="h-3 w-3/4 rounded-full bg-gray-100" />
        <div className="h-8 rounded-lg bg-gray-100 mt-2" />
      </div>
    </div>
  );
}

export default function ThemeGallery() {
  const { themeId, setThemeId } = useAppTheme();
  const cv = getComponentVariant(themeId);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<ThemeCategory | "all">("featured");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [filters,        setFilters]        = useState<ThemeFilterState>({ rarity: "all", unlockType: "all" });

  // Modal state
  const [detailsMeta, setDetailsMeta] = useState<ThemeMetadata | null>(null);
  const [unlockMeta,  setUnlockMeta]  = useState<ThemeMetadata | null>(null);
  const [previewMeta, setPreviewMeta] = useState<ThemeMetadata | null>(null);

  // ── Derived theme list ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = searchQuery
      ? searchThemes(searchQuery)
      : getThemesByCategory(activeCategory === "all" ? "featured" : activeCategory);

    if (searchQuery) {
      // When searching, show all regardless of category
      list = searchThemes(searchQuery);
    } else if (activeCategory === "all") {
      list = getAllThemes();
    }

    if (filters.rarity     !== "all") list = list.filter(t => t.rarity     === filters.rarity);
    if (filters.unlockType !== "all") list = list.filter(t => t.unlockType === filters.unlockType);

    return list;
  }, [activeCategory, searchQuery, filters]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleApply = useCallback((meta: ThemeMetadata) => {
    if (!meta.isInstalled) return;
    setThemeId(meta.id as AppThemeId);
    setDetailsMeta(null);
  }, [setThemeId]);

  const handlePreview = useCallback((meta: ThemeMetadata) => {
    if (!meta.isInstalled) return;
    setDetailsMeta(null);
    setPreviewMeta(meta);
  }, []);

  const handleUnlock = useCallback((meta: ThemeMetadata) => {
    setDetailsMeta(null);
    setUnlockMeta(meta);
  }, []);

  const handleCategoryChange = (cat: ThemeCategory | "all") => {
    setActiveCategory(cat);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <ThemeHeader resultCount={filtered.length} />

      {/* Search + controls */}
      <div className="flex flex-col gap-3">
        <ThemeSearch value={searchQuery} onChange={setSearchQuery} />

        {!searchQuery && (
          <ThemeCategoryTabs active={activeCategory} onChange={handleCategoryChange} />
        )}

        <ThemeFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <span className="text-4xl">🎨</span>
          <p className="text-sm font-medium">No themes match your search</p>
          <button
            onClick={() => { setSearchQuery(""); setFilters({ rarity: "all", unlockType: "all" }); }}
            className="text-xs underline hover:no-underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(meta => (
            <ThemeCard
              key={meta.id}
              meta={meta}
              onPreview={handlePreview}
              onApply={handleApply}
              onShowDetails={setDetailsMeta}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ThemeDetails
        meta={detailsMeta}
        onClose={() => setDetailsMeta(null)}
        onPreview={handlePreview}
        onApply={handleApply}
        onUnlock={handleUnlock}
      />

      <ThemeUnlockModal
        meta={unlockMeta}
        onClose={() => setUnlockMeta(null)}
      />

      <ThemePreviewModal
        meta={previewMeta}
        onClose={() => setPreviewMeta(null)}
      />
    </div>
  );
}
