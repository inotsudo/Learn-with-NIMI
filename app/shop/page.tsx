"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import {
  getChildren, getTotalStars, getChildBadges,
  getShopPurchases, purchaseShopItem, getChildCosmetics, equipItem,
  type Child, type ShopPurchase, type ChildCosmetics,
} from "@/lib/queries";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopFilterTabs, { type ShopFilter } from "@/components/shop/ShopFilterTabs";
import ShopGrid from "@/components/shop/ShopGrid";
import { SHOP_ITEMS, SHOP_ITEM_MAP, type ShopItem } from "@/components/shop/_shopData";
import { PageSurface } from "@/components/layout/primitives";
import { Check, X } from "lucide-react";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";
const CONSUMABLE_IDS = new Set(SHOP_ITEMS.filter(i => i.consumable).map(i => i.id));
const EMPTY_COSMETICS: ChildCosmetics = { nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null };

// ── Toast ────────────────────────────────────────────────────
function Toast({ message, type, onDone }: { message: string; type: "success" | "error"; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl font-black text-sm text-white max-w-xs text-center ${
        type === "success" ? "" : "bg-red-500"
      }`}
      style={type === "success" ? { background: "var(--nimi-green)" } : {}}
    >
      {type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
      {message}
    </motion.div>
  );
}

// ── Currently Wearing strip ───────────────────────────────────
function CurrentlyWearing({ cosmetics, nimiSrc, pikoSrc, onUnequip }: {
  cosmetics: ChildCosmetics;
  nimiSrc: string;
  pikoSrc: string;
  onUnequip: (slot: keyof ChildCosmetics) => void;
}) {
  const { t } = useLanguage();
  const slots: { key: keyof ChildCosmetics; label: string; src?: string }[] = [
    { key: "nimi_outfit", label: "NIMI", src: nimiSrc },
    { key: "piko_outfit", label: "PIKO", src: pikoSrc },
    { key: "frame",       label: t("filterFrames") },
    { key: "title_badge", label: t("filterTitles") },
  ];

  const anyEquipped = slots.some(s => cosmetics[s.key]);
  if (!anyEquipped) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="overflow-hidden"
    >
      <div className="mt-4 p-3 rounded-2xl border border-ds-border bg-ds-surface/60">
        <p className="font-black text-ds-text text-[11px] uppercase tracking-widest mb-2.5">{t("shopCurrentlyWearing")}</p>
        <div className="flex gap-2 flex-wrap">
          {slots.map(slot => {
            const item = cosmetics[slot.key] ? SHOP_ITEM_MAP[cosmetics[slot.key]!] : null;
            if (!item) return null;
            return (
              <motion.button
                key={slot.key}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onUnequip(slot.key)}
                className="group relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border-2 text-xs font-bold transition-colors"
                style={{ borderColor: "var(--nimi-green)", background: "rgba(34,197,94,0.06)", color: "var(--ds-text)" }}
                title={t("shopRemoveItem")}
              >
                {slot.src && (
                  <Image src={slot.src} alt={slot.label} width={20} height={20} className="w-5 h-5 rounded-full object-cover shrink-0 border border-green-200" />
                )}
                <span className="text-base leading-none">{item.emoji}</span>
                <span className="font-black text-[11px]">{t(item.nameKey)}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-400 ml-0.5">×</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function RewardShopPage() {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const [filter, setFilter] = useState<ShopFilter>("all");
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [totalStars, setTotalStars] = useState(0);
  const [gems, setGems] = useState(0);
  const [purchases, setPurchases] = useState<ShopPurchase[]>([]);
  const [cosmetics, setCosmetics] = useState<ChildCosmetics>({ ...EMPTY_COSMETICS });
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastKey = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    toastKey.current++;
    setToast({ message, type });
  }, []);

  const loadStarsAndGems = useCallback(async (childId: string, language: Language) => {
    const [stars, badges] = await Promise.all([
      getTotalStars(childId, language),
      getChildBadges(childId, language),
    ]);
    setTotalStars(stars);
    setGems(badges.length);
  }, []);

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0] ?? null;
      setActiveChild(child);
      if (child) {
        await Promise.all([
          loadStarsAndGems(child.id, child.language),
          getShopPurchases(child.id).then(setPurchases),
          getChildCosmetics(child.id).then(setCosmetics),
        ]);
      }
      setLoading(false);
    })();
  }, [loadStarsAndGems]);

  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent<{ language: Language }>).detail?.language;
      if (!lang || !activeChild) return;
      const updated = { ...activeChild, language: lang };
      setActiveChild(updated);
      void loadStarsAndGems(updated.id, lang);
    };
    window.addEventListener("app:languageChange", handler);
    return () => window.removeEventListener("app:languageChange", handler);
  }, [activeChild, loadStarsAndGems]);

  const spent = purchases.reduce((sum, p) => sum + p.price, 0);
  const balance = activeChild ? Math.max(0, totalStars - spent) : null;
  const ownedIds = new Set(purchases.map(p => p.item_id));
  const purchaseCounts = purchases.reduce((acc, p) => {
    acc.set(p.item_id, (acc.get(p.item_id) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  const handleBuy = useCallback(async (item: ShopItem) => {
    if (!activeChild || balance === null || balance < item.price) return;
    if (!CONSUMABLE_IDS.has(item.id) && ownedIds.has(item.id)) return;
    setPurchasingId(item.id);
    const purchase = await purchaseShopItem(activeChild.id, item.id, item.price);
    setPurchasingId(null);
    if (!purchase) {
      showToast(t("shopPurchaseErrorMsg"), "error");
      return;
    }
    setPurchases(prev => [...prev, purchase]);
    showToast(`${item.emoji} ${t(item.nameKey)} ${t("shopUnlockedCelebration")}`, "success");
  }, [activeChild, balance, ownedIds, t, showToast]);

  const handleEquip = useCallback(async (item: ShopItem) => {
    if (!activeChild || !item.slot) return;
    const alreadyEquipped = cosmetics[item.slot] === item.id;
    const newValue = alreadyEquipped ? null : item.id;
    const newCosmetics = { ...cosmetics, [item.slot]: newValue };
    setCosmetics(newCosmetics);
    const ok = await equipItem(activeChild.id, item.slot, newValue);
    if (!ok) {
      setCosmetics(prev => ({ ...prev, [item.slot!]: cosmetics[item.slot!] }));
      showToast(t("shopEquipErrorMsg"), "error");
    } else {
      window.dispatchEvent(new CustomEvent("app:cosmeticsChange", { detail: { cosmetics: newCosmetics } }));
      if (!alreadyEquipped) {
        showToast(`${item.emoji} ${t("shopEquippedCelebration").replace("{name}", t(item.nameKey))}`, "success");
      }
    }
  }, [activeChild, cosmetics, t, showToast]);

  const handleUnequip = useCallback(async (slot: keyof ChildCosmetics) => {
    if (!activeChild) return;
    const newCosmetics = { ...cosmetics, [slot]: null };
    setCosmetics(newCosmetics);
    await equipItem(activeChild.id, slot, null);
    window.dispatchEvent(new CustomEvent("app:cosmeticsChange", { detail: { cosmetics: newCosmetics } }));
  }, [activeChild, cosmetics]);

  return (
    <AppShell>
      <PageSurface>
        <AnimatePresence>
          {toast && (
            <Toast
              key={toastKey.current}
              message={toast.message}
              type={toast.type}
              onDone={() => setToast(null)}
            />
          )}
        </AnimatePresence>

        <main className="max-w-5xl mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-6 pb-28 flex-1 w-full">
          {loading ? (
            <div className="space-y-4 py-2">
              <Bone className="h-10 w-full rounded-full" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <Bone key={i} className="h-52 leaf-lg" />)}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <ShopHeader balance={balance ?? 0} gems={gems} />

              {/* Currently Wearing */}
              <CurrentlyWearing
                cosmetics={cosmetics}
                nimiSrc={assets.nimiCircle}
                pikoSrc={assets.pikoCircle}
                onUnequip={handleUnequip}
              />

              {/* Filter tabs */}
              <div className="mt-5 mb-4">
                <ShopFilterTabs filter={filter} onFilterChange={setFilter} />
              </div>

              {/* Grid */}
              <ShopGrid
                filter={filter}
                balance={balance ?? 0}
                ownedIds={ownedIds}
                purchaseCounts={purchaseCounts}
                cosmetics={cosmetics}
                purchasingId={purchasingId}
                onBuy={handleBuy}
                onEquip={handleEquip}
              />
            </motion.div>
          )}
        </main>
      </PageSurface>
    </AppShell>
  );
}
