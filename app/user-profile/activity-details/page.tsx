"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { PageSurface } from "@/components/layout/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getAllChildProgress } from "@/lib/queries";
import type { ProgressRow } from "@/lib/queries";
import ActivityDetailsList from "@/components/profile/ActivityDetailsList";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function ActivityDetailsPage() {
  const { t } = useLanguage();
  const [range, setRange] = useState<"week" | "all">("week");
  const [rows, setRows] = useState<ProgressRow[]>([]);

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) return;
      const all = await getAllChildProgress(child.id);
      setRows(all.filter(r => r.language === child.language));
    })();
  }, []);

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-black text-2xl sm:text-3xl text-ds-text">{t("activityDetailsTitle")}</h1>
              <p className="text-gray-500 text-sm mt-1">{t("activityDetailsSubtitle")}</p>
            </div>
            <div className="inline-flex bg-white border border-ds-border rounded-full p-1 gap-1 shrink-0">
              {(["week", "all"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors ${
                    range === r ? "bg-gray-100 text-ds-text shadow-sm" : "text-gray-500 hover:text-ds-text"
                  }`}
                >
                  {r === "week" ? t("weeklyRangeThisWeek") : t("weeklyRangeAllTime")}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <ActivityDetailsList rows={rows} range={range} />
          </div>
        </main>
      </PageSurface>
    </AppShell>
  );
}
