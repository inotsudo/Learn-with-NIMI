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
        <h1 className="font-black text-2xl sm:text-3xl text-white">{t("rewardShopTitle")}</h1>
        <p className="theme-text text-sm mt-1">{t("rewardShopSubtitle")}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-yellow-400/20 text-yellow-200 font-black text-sm px-3 py-1.5 rounded-full">
          <span>⭐</span><span>{balance}</span>
          <span className="text-[10px] uppercase font-bold text-yellow-200/70">{t("shopStarsAvailable")}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-400/20 text-blue-200 font-black text-sm px-3 py-1.5 rounded-full">
          <span>💎</span><span>{gems}</span>
          <span className="text-[10px] uppercase font-bold text-blue-200/70">{t("shopBadgesEarned")}</span>
        </div>
      </div>
    </div>
  );
}
