"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { PageSurface } from "@/components/layout/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import GeneralSettingsCard from "@/components/settings/GeneralSettingsCard";
import ContentSettingsCard from "@/components/settings/ContentSettingsCard";
import SettingsAccountCard from "@/components/settings/SettingsAccountCard";
import ReferralCard from "@/components/settings/ReferralCard";
import SentGiftsCard from "@/components/settings/SentGiftsCard";
import supabase from "@/lib/supabaseClient";

export default function SettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/loginpage"); }
    })();
  }, [router]);

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 w-full">
          <div>
            <h1 className="font-baloo font-black text-2xl sm:text-3xl text-ds-text">{t("settingsTitle")}</h1>
            <p className="text-[var(--ds-text-tertiary)] text-sm mt-1">{t("settingsSubtitle")}</p>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5 items-start">
            <GeneralSettingsCard />
            <ContentSettingsCard />
            <SettingsAccountCard />
          </div>

          {/* Referral program + sent gifts */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReferralCard />
            <SentGiftsCard />
          </div>

          <p className="text-center text-[var(--ds-text-tertiary)] text-xs mt-6">{t("appVersionLabel")} 1.0.0</p>
        </main>
      </PageSurface>
    </AppShell>
  );
}
