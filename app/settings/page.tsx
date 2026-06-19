"use client";

import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import GeneralSettingsCard from "@/components/settings/GeneralSettingsCard";
import ContentSettingsCard from "@/components/settings/ContentSettingsCard";
import SettingsAccountCard from "@/components/settings/SettingsAccountCard";
import AuthBackground from "@/components/auth/AuthBackground";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <AppShell>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] flex flex-col">
        <AuthBackground />
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div>
            <h1 className="font-black text-2xl sm:text-3xl text-white">{t("settingsTitle")}</h1>
            <p className="text-purple-200 text-sm mt-1">{t("settingsSubtitle")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 items-start">
            <GeneralSettingsCard />
            <ContentSettingsCard />
            <SettingsAccountCard />
          </div>

          <p className="text-center text-purple-300 text-xs mt-6">{t("appVersionLabel")} 1.0.0</p>
        </main>
      </div>
    </AppShell>
  );
}
