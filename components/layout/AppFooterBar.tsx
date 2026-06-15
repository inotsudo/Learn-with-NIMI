"use client";

import { TRUST_BADGES } from "@/lib/constants/trustBadges";

export default function AppFooterBar() {
  return (
    <div className="bg-sidebar-purple py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2">
        {TRUST_BADGES.map(badge => {
          const Icon = badge.icon;
          return (
            <div key={badge.label}
              className={`${badge.bg} flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black tracking-wide text-white shadow-md`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{badge.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
