"use client";

import { Gift } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SHOP_ITEMS, type ShopItem } from "./_shopData";
import ShopItemCard from "./ShopItemCard";
import type { ShopFilter } from "./ShopFilterTabs";

interface Props {
  filter: ShopFilter;
  balance: number;
  ownedIds: Set<string>;
  purchasingId: string | null;
  onBuy: (item: ShopItem) => void;
}

export default function ShopGrid({ filter, balance, ownedIds, purchasingId, onBuy }: Props) {
  const { t } = useLanguage();
  const items = filter === "all" ? SHOP_ITEMS : SHOP_ITEMS.filter(item => item.category === filter);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-2 py-12">
        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
          <Gift className="w-8 h-8 text-purple-200" />
        </div>
        <p className="font-black text-white">{t("noToysTitle")}</p>
        <p className="text-purple-300 text-sm">{t("noToysBody")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(item => (
        <ShopItemCard
          key={item.id}
          item={item}
          owned={ownedIds.has(item.id)}
          balance={balance}
          purchasing={purchasingId === item.id}
          onBuy={onBuy}
        />
      ))}
    </div>
  );
}
