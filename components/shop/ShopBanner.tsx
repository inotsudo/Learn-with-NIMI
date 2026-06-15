"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { SHOP_ITEMS } from "./_shopData";

interface Props {
  balance: number | null;
  ownedIds: Set<string>;
}

export default function ShopBanner({ balance, ownedIds }: Props) {
  const { t } = useLanguage();

  let message = `✨ ${t("collectStarsBanner")} ✨`;

  if (balance !== null) {
    const unowned = SHOP_ITEMS.filter(item => !ownedIds.has(item.id));
    if (unowned.length === 0) {
      message = t("shopAllUnlockedBanner");
    } else {
      const cheapest = unowned.reduce((a, b) => (a.price <= b.price ? a : b));
      if (balance >= cheapest.price) {
        message = t("shopCanUnlockBanner");
      } else {
        message = t("shopNeedMoreBanner")
          .replace("{n}", String(cheapest.price - balance))
          .replace("{item}", t(cheapest.nameKey));
      }
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-md p-5 text-white text-center">
      <p className="font-black text-sm sm:text-base">{message}</p>
    </div>
  );
}
