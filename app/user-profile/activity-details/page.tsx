"use client";

import { ChevronDown } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import ActivityDetailsList from "@/components/profile/ActivityDetailsList";

export default function ActivityDetailsPage() {
  const { t } = useLanguage();

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-black text-2xl sm:text-3xl text-gray-800">{t("activityDetailsTitle")}</h1>
              <p className="text-gray-500 text-sm mt-1">{t("activityDetailsSubtitle")}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white border-2 border-gray-100 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-gray-600 shrink-0">
              <span>{t("thisWeek")}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-4">
            <ActivityDetailsList />
          </div>
        </main>
      </div>
    </AppShell>
  );
}
