"use client";

import { Lock, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ShopItem } from "./_shopData";

interface Props {
  item: ShopItem;
  owned: boolean;
  balance: number;
  purchasing: boolean;
  onBuy: (item: ShopItem) => void;
}

export default function ShopItemCard({ item, owned, balance, purchasing, onBuy }: Props) {
  const { t } = useLanguage();
  const affordable = balance >= item.price;

  return (
    <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-2xl shadow-sm overflow-hidden">
      <div className={`relative aspect-square flex items-center justify-center text-5xl ${item.bg}`}>
        {item.emoji}
        {owned && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full shadow">
            <Check className="w-3 h-3" /> {t("shopOwnedLabel")}
          </div>
        )}
        {!owned && !affordable && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-black text-white text-sm truncate">{t(item.nameKey)}</p>
        {owned ? (
          <p className="text-green-300 font-bold text-sm mt-1">✓ {t("shopOwnedLabel")}</p>
        ) : affordable ? (
          <>
            <p className="text-yellow-300 font-bold text-sm mt-1">⭐ {item.price}</p>
            <button
              onClick={() => onBuy(item)}
              disabled={purchasing}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-purple-600 text-white font-black text-xs px-3 py-1.5 rounded-full hover:bg-purple-700 transition disabled:opacity-50"
            >
              {purchasing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {purchasing ? t("shopUnlockingBtn") : t("shopUnlockBtn")}
            </button>
          </>
        ) : (
          <p className="text-purple-300 font-bold text-xs mt-1">
            {t("shopNeedMoreStars").replace("{n}", String(item.price - balance))}
          </p>
        )}
      </div>
    </div>
  );
}
