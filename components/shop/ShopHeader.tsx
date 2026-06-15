"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  balance: number;
  gems: number;
}

export default function ShopHeader({ balance, gems }: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-black text-2xl sm:text-3xl text-gray-800">{t("rewardShopTitle")}</h1>
        <p className="text-gray-500 text-sm mt-1">{t("rewardShopSubtitle")}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 font-black text-sm px-3 py-1.5 rounded-full">
          <span>⭐</span><span>{balance}</span>
          <span className="text-[10px] uppercase font-bold text-yellow-600/70">{t("shopStarsAvailable")}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 font-black text-sm px-3 py-1.5 rounded-full">
          <span>💎</span><span>{gems}</span>
          <span className="text-[10px] uppercase font-bold text-blue-600/70">{t("shopBadgesEarned")}</span>
        </div>
      </div>
    </div>
  );
}
