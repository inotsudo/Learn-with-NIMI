"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit } from "lucide-react";
import { getChildren, getCurrentLevel } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/contexts/LanguageContext";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileStatsGrid from "@/components/profile/ProfileStatsGrid";
import ProfileBadgesRow from "@/components/profile/ProfileBadgesRow";
import AccountSettingsCard from "@/components/profile/AccountSettingsCard";
import AppPreferencesCard from "@/components/profile/AppPreferencesCard";
import type { Language } from "@/contexts/LanguageContext";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function MyProfilePage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [hasChildren, setHasChildren] = useState(true);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    setMounted(true);
    void load();
  }, []);

  const load = async () => {
    const list = await getChildren();
    if (list.length === 0) {
      setHasChildren(false);
      return;
    }

    const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
    const child = list.find(c => c.id === savedId) ?? list[0];
    setActiveChild(child);

    setLevel(await getCurrentLevel(child.id, child.language));
  };

  if (!mounted) return null;

  if (!hasChildren) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
          <p className="text-gray-600 font-semibold">Set up a learner profile to start your Daily Adventure!</p>
          <Link href="/" className="bg-purple-600 text-white font-black rounded-full px-6 py-2.5 shadow hover:bg-purple-700 transition">
            Go Home
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-black text-2xl sm:text-3xl text-gray-800">{t("myProfileTitle")}</h1>
              <p className="text-gray-500 text-sm mt-1">{t("myProfileSubtitle")}</p>
            </div>
            <button className="border-2 border-purple-200 text-purple-600 bg-white font-black rounded-full px-5 py-2.5 text-sm hover:bg-purple-50 transition flex items-center gap-2">
              <Edit className="w-4 h-4" /> {t("editProfile")}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 mt-4 items-stretch">
            <ProfileCard
              avatar={activeChild?.avatar_url ?? null}
              childName={activeChild?.name ?? "Explorer"}
              level={level}
            />
            <ProfileStatsGrid />
          </div>

          <div className="mt-4">
            <ProfileBadgesRow />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <AccountSettingsCard />
            <AppPreferencesCard
              activeChild={activeChild}
              onLanguageChanged={(lang: Language) =>
                setActiveChild(prev => prev ? { ...prev, language: lang } : prev)
              }
            />
          </div>
        </main>
      </div>
    </AppShell>
  );
}
