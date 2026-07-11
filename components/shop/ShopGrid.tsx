"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { SHOP_ITEMS, type ShopItem, type ShopCategory } from "./_shopData";
import ShopItemCard from "./ShopItemCard";
import type { ShopFilter } from "./ShopFilterTabs";
import type { ChildCosmetics } from "@/lib/queries";

interface Props {
  filter: ShopFilter;
  balance: number;
  ownedIds: Set<string>;
  purchaseCounts: Map<string, number>;
  cosmetics: ChildCosmetics;
  purchasingId: string | null;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
}

const CATEGORY_META: Record<ShopCategory, { label: string; emoji: string; desc: string }> = {
  costumes: { label: "Costumes", emoji: "🦸", desc: "Dress up NIMI and PIKO" },
  frames:   { label: "Frames",   emoji: "🖼️", desc: "Style your profile card" },
  titles:   { label: "Titles",   emoji: "🏷️", desc: "Show off your title" },
  powerups: { label: "Power-Ups",emoji: "⚡", desc: "Special abilities" },
};

export default function ShopGrid({ filter, balance, ownedIds, purchaseCounts, cosmetics, purchasingId, onBuy, onEquip }: Props) {
  const { t } = useLanguage();

  function isEquipped(item: ShopItem): boolean {
    if (!item.slot) return false;
    return cosmetics[item.slot] === item.id;
  }

  // When "all", group by category with section headers
  if (filter === "all") {
    const categories: ShopCategory[] = ["costumes", "frames", "titles", "powerups"];
    return (
      <div className="space-y-8">
        {categories.map(cat => {
          const items = SHOP_ITEMS.filter(i => i.category === cat);
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{meta.emoji}</span>
                <div>
                  <p className="font-black text-ds-text text-[15px] leading-tight">{t(`filter${cat.charAt(0).toUpperCase() + cat.slice(1)}` as any)}</p>
                  <p className="text-ds-muted text-[11px]">{meta.desc}</p>
                </div>
              </div>
              <GridRow items={items} balance={balance} ownedIds={ownedIds} purchaseCounts={purchaseCounts}
                cosmetics={cosmetics} purchasingId={purchasingId}
                onBuy={onBuy} onEquip={onEquip} isEquipped={isEquipped} startIndex={0} />
            </div>
          );
        })}
      </div>
    );
  }

  const items = SHOP_ITEMS.filter(i => i.category === filter);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={filter}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-16">
            <span className="text-5xl">🛒</span>
            <p className="font-black text-ds-text">{t("noToysTitle")}</p>
            <p className="text-gray-400 text-sm">{t("noToysBody")}</p>
          </div>
        ) : (
          <GridRow items={items} balance={balance} ownedIds={ownedIds} purchaseCounts={purchaseCounts}
            cosmetics={cosmetics} purchasingId={purchasingId}
            onBuy={onBuy} onEquip={onEquip} isEquipped={isEquipped} startIndex={0} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function GridRow({
  items, balance, ownedIds, purchaseCounts, cosmetics: _cosmetics, purchasingId,
  onBuy, onEquip, isEquipped, startIndex,
}: {
  items: ShopItem[];
  balance: number;
  ownedIds: Set<string>;
  purchaseCounts: Map<string, number>;
  cosmetics: ChildCosmetics;
  purchasingId: string | null;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
  isEquipped: (item: ShopItem) => boolean;
  startIndex: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <ShopItemCard
          key={item.id}
          item={item}
          owned={ownedIds.has(item.id)}
          count={purchaseCounts.get(item.id) ?? 0}
          equipped={isEquipped(item)}
          balance={balance}
          purchasing={purchasingId === item.id}
          onBuy={onBuy}
          onEquip={onEquip}
          index={startIndex + i}
        />
      ))}
    </div>
  );
}
