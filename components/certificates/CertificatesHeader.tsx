"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function CertificatesHeader() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="font-black text-2xl sm:text-3xl text-gray-800">{t("achievements")}</h1>
      <p className="text-gray-500 text-sm mt-1">{t("achievementsPageSubtitle")}</p>
    </div>
  );
}
