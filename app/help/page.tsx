"use client";

import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import HelpActionCards from "@/components/help/HelpActionCards";
import PopularQuestionsCard from "@/components/help/PopularQuestionsCard";
import SupportBanner from "@/components/help/SupportBanner";

export default function HelpSupportPage() {
  const { t } = useLanguage();

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div>
            <h1 className="font-black text-2xl sm:text-3xl text-gray-800">{t("helpSupportTitle")}</h1>
            <p className="text-gray-500 text-sm mt-1">{t("helpSupportSubtitle")}</p>
          </div>

          <div className="mt-4">
            <HelpActionCards />
          </div>

          <div className="mt-4">
            <PopularQuestionsCard />
          </div>

          <div className="mt-4">
            <SupportBanner />
          </div>
        </main>
      </div>
    </AppShell>
  );
}
