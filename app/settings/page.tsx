"use client";

import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import GeneralSettingsCard from "@/components/settings/GeneralSettingsCard";
import ContentSettingsCard from "@/components/settings/ContentSettingsCard";
import SettingsAccountCard from "@/components/settings/SettingsAccountCard";
import ThemePicker from "@/components/settings/ThemePicker";
import MagicBackground from "@/components/magic/MagicBackground";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <AppShell>
      <div className="min-h-screen theme-bg relative">
        <MagicBackground variant="workshop" />
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 w-full">
          <div>
            <h1 className="font-baloo font-black text-2xl sm:text-3xl text-white">{t("settingsTitle")}</h1>
            <p className="theme-text-faint text-sm mt-1">{t("settingsSubtitle")}</p>
          </div>

          {/* Theme Picker */}
          <div className="mt-6 theme-card rounded-[24px] border theme-border p-5">
            <ThemePicker />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5 items-start">
            <GeneralSettingsCard />
            <ContentSettingsCard />
            <SettingsAccountCard />
          </div>

          <p className="text-center theme-text-faint text-xs mt-6">{t("appVersionLabel")} 1.0.0</p>
        </main>
      </div>
    </AppShell>
  );
}
