"use client";

import type { ThemeRarity, ThemeUnlockType } from "@/lib/design-system/themeMetadata";
import { RARITY_COLORS, RARITY_LABELS } from "@/lib/design-system/themeMetadata";

export interface ThemeFilterState {
  rarity:     ThemeRarity | "all";
  unlockType: ThemeUnlockType | "all";
}

interface Props {
  filters:   ThemeFilterState;
  onChange:  (next: ThemeFilterState) => void;
  className?: string;
}

const RARITIES: (ThemeRarity | "all")[] = ["all", "common", "rare", "epic", "legendary"];
const UNLOCK_TYPES: { value: ThemeUnlockType | "all"; label: string }[] = [
  { value: "all",          label: "Any unlock"    },
  { value: "free",         label: "Free"           },
  { value: "stars",        label: "Stars"          },
  { value: "gems",         label: "Gems"           },
  { value: "subscription", label: "Subscription"  },
  { value: "achievement",  label: "Achievement"   },
  { value: "seasonal",     label: "Seasonal"       },
];

export default function ThemeFilters({ filters, onChange, className = "" }: Props) {
  const setRarity     = (r: ThemeRarity | "all")     => onChange({ ...filters, rarity: r });
  const setUnlockType = (u: ThemeUnlockType | "all") => onChange({ ...filters, unlockType: u });

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Rarity filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium shrink-0">Rarity:</span>
        <div className="flex gap-1">
          {RARITIES.map(r => {
            const isActive = filters.rarity === r;
            const colorCls = r === "all" ? "text-gray-600 bg-gray-100" : RARITY_COLORS[r];
            return (
              <button
                key={r}
                onClick={() => setRarity(r)}
                aria-pressed={isActive}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                  ${isActive
                    ? `${colorCls} ring-2 ring-offset-1 ring-current/30`
                    : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                  }`}
              >
                {r === "all" ? "All" : RARITY_LABELS[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unlock type filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium shrink-0">Unlock:</span>
        <select
          value={filters.unlockType}
          onChange={e => setUnlockType(e.target.value as ThemeUnlockType | "all")}
          aria-label="Filter by unlock type"
          className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1
                     focus:outline-none focus:ring-2 focus:ring-offset-0 cursor-pointer"
        >
          {UNLOCK_TYPES.map(ut => (
            <option key={ut.value} value={ut.value}>{ut.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
