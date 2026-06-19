"use client";

import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import HelpActionCards from "@/components/help/HelpActionCards";
import PopularQuestionsCard from "@/components/help/PopularQuestionsCard";
import SupportBanner from "@/components/help/SupportBanner";
import AuthBackground from "@/components/auth/AuthBackground";

export default function HelpSupportPage() {
  const { t } = useLanguage();

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
        <AuthBackground />
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div>
            <h1 className="font-black text-2xl sm:text-3xl text-white">{t("helpSupportTitle")}</h1>
            <p className="text-purple-200 text-sm mt-1">{t("helpSupportSubtitle")}</p>
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
