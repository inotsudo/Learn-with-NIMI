"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function CertificatesHeader() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="font-black text-2xl sm:text-3xl text-white">{t("achievements")}</h1>
      <p className="text-purple-200 text-sm mt-1">{t("achievementsPageSubtitle")}</p>
    </div>
  );
}
