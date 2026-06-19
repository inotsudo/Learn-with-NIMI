"use client";

import { ChevronDown } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import ActivityDetailsList from "@/components/profile/ActivityDetailsList";
import AuthBackground from "@/components/auth/AuthBackground";

export default function ActivityDetailsPage() {
  const { t } = useLanguage();

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
        <AuthBackground />
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-black text-2xl sm:text-3xl text-white">{t("activityDetailsTitle")}</h1>
              <p className="text-purple-200 text-sm mt-1">{t("activityDetailsSubtitle")}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur border-2 border-white/15 rounded-full px-4 py-2 shadow-sm text-sm font-bold text-purple-100 shrink-0">
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
