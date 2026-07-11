"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, Loader2, Zap, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ShopItem } from "./_shopData";

interface Props {
  item: ShopItem;
  owned: boolean;
  count?: number;
  equipped?: boolean;
  balance: number;
  purchasing: boolean;
  onBuy: (item: ShopItem) => void;
  onEquip?: (item: ShopItem) => void;
  index?: number;
}

export default function ShopItemCard({
  item, owned, count = 0, equipped, balance, purchasing, onBuy, onEquip, index = 0,
}: Props) {
  const { t } = useLanguage();
  const affordable = balance >= item.price;
  const isConsumable = item.consumable === true;
  const isEquippable = !!item.slot && !isConsumable;
  const locked = !owned && !affordable && !isConsumable;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.045 }}
      whileHover={!locked ? { y: -4, scale: 1.02 } : {}}
      whileTap={!locked ? { scale: 0.97 } : {}}
      className="relative flex flex-col overflow-hidden cursor-default"
      style={{
        borderRadius: "var(--leaf-r)",
        border: equipped
          ? "2px solid var(--nimi-green)"
          : "1.5px solid var(--ds-border-primary)",
        background: "white",
        boxShadow: equipped
          ? "0 0 0 3px rgba(34,197,94,0.15), 0 8px 24px rgba(0,0,0,0.10)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.3s, border-color 0.3s",
      }}
    >
      {/* ── Visual tile ─────────────────────────────────────── */}
      <div className={`relative flex flex-col items-center justify-center gap-1 py-7 ${item.bg} ${locked ? "grayscale opacity-60" : ""} transition-all duration-300`}>

        {/* Emoji — floats gently when owned */}
        <motion.span
          className="text-6xl leading-none select-none"
          animate={owned ? { y: [0, -5, 0] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))" }}
        >
          {item.emoji}
        </motion.span>

        {/* Character label for costumes */}
        {item.category === "costumes" && (
          <span className="text-[10px] font-black text-white/75 uppercase tracking-widest mt-0.5">
            {item.slot === "nimi_outfit" ? "NIMI" : "PIKO"}
          </span>
        )}

        {/* ── Status badges ── */}
        <AnimatePresence mode="wait">
          {equipped && (
            <motion.div
              key="equipped"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="absolute top-2 right-2 flex items-center gap-1 text-white text-[9px] font-black uppercase px-2 py-1 rounded-full shadow-lg"
              style={{ background: "var(--nimi-green)" }}
            >
              <Zap className="w-2.5 h-2.5" />
              {t("shopEquippedLabel")}
            </motion.div>
          )}
          {!equipped && owned && !isConsumable && (
            <motion.div
              key="owned"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-600 text-[9px] font-black uppercase px-2 py-1 rounded-full shadow"
            >
              <Check className="w-2.5 h-2.5" />
              {t("shopOwnedLabel")}
            </motion.div>
          )}
          {isConsumable && count > 0 && (
            <motion.div
              key="count"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg"
            >
              ×{count}
            </motion.div>
          )}
          {locked && (
            <motion.div
              key="lock"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <Lock className="w-3.5 h-3.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info + Actions ────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <div>
          <p className="font-black text-ds-text text-sm leading-tight">{t(item.nameKey)}</p>
          <p className="text-ds-muted text-[10px] leading-snug mt-0.5 line-clamp-2">{t(item.descKey)}</p>
        </div>

        <div className="mt-auto space-y-1.5">
          {/* Equip / Unequip */}
          {owned && isEquippable && (
            <motion.button
              onClick={() => onEquip?.(item)}
              whileTap={{ scale: 0.95 }}
              className="w-full inline-flex items-center justify-center gap-1.5 font-black text-xs px-3 py-2 rounded-lg transition-colors duration-200"
              style={{
                background: equipped ? "#f3f4f6" : "var(--nimi-green)",
                color: equipped ? "#6b7280" : "white",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {equipped ? (
                  <motion.span
                    key="unequip"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" /> {t("shopUnequipBtn")}
                  </motion.span>
                ) : (
                  <motion.span
                    key="equip"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="flex items-center gap-1.5"
                  >
                    <Zap className="w-3 h-3" /> {t("shopEquipBtn")}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Buy / Get One */}
          {(!owned || isConsumable) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-amber-500 font-black text-sm">⭐ {item.price}</span>
                {!affordable && (
                  <span className="text-[10px] text-gray-400 font-bold">
                    {t("shopNeedMoreStars").replace("{n}", String(item.price - balance))}
                  </span>
                )}
              </div>
              <motion.button
                onClick={() => affordable && onBuy(item)}
                disabled={purchasing || !affordable}
                whileTap={affordable ? { scale: 0.95 } : {}}
                className="w-full inline-flex items-center justify-center gap-1.5 font-black text-xs px-3 py-2 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                style={{
                  background: affordable ? "var(--nimi-green)" : "#e5e7eb",
                  color: affordable ? "white" : "#9ca3af",
                  opacity: purchasing ? 0.7 : 1,
                }}
              >
                {purchasing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("shopUnlockingBtn")}</>
                ) : isConsumable ? (
                  <><ShoppingCart className="w-3 h-3" /> {t("shopBuyBtn")}</>
                ) : affordable ? (
                  <><Zap className="w-3 h-3" /> {t("shopUnlockBtn")}</>
                ) : (
                  <><Lock className="w-3 h-3" /> {t("shopUnlockBtn")}</>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Equipped glow ring — animated */}
      {equipped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            boxShadow: "inset 0 0 0 2px rgba(34,197,94,0.4)",
          }}
        />
      )}
    </motion.div>
  );
}
