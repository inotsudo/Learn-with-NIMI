"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { getChildren, getTotalStars, getChildAchievements, getShopPurchases, purchaseShopItem, type Child, type ShopPurchase } from "@/lib/queries";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopFilterTabs, { type ShopFilter } from "@/components/shop/ShopFilterTabs";
import ShopGrid from "@/components/shop/ShopGrid";
import ShopBanner from "@/components/shop/ShopBanner";
import type { ShopItem } from "@/components/shop/_shopData";
import { CelebrationBanner } from "@/components/community/CelebrationBanner";
import { ErrorToast } from "@/components/community/ErrorToast";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

export default function RewardShopPage() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ShopFilter>("all");

  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [totalStars, setTotalStars] = useState(0);
  const [gems, setGems] = useState(0);
  const [purchases, setPurchases] = useState<ShopPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const loadStarsAndGems = useCallback(async (childId: string, language: Language) => {
    setTotalStars(await getTotalStars(childId, language));
    const achievements = await getChildAchievements(childId);
    setGems(achievements.filter(a => a.type === "badge" && a.language === language).length);
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
        ]);
      }
      setLoading(false);
    })();
  }, [loadStarsAndGems]);

  // Reflects journey-language switches fired from anywhere in the app —
  // the spendable balance is tied to the active journey's stars.
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

  const handleBuy = useCallback(async (item: ShopItem) => {
    if (!activeChild || balance === null || balance < item.price || ownedIds.has(item.id)) return;
    setPurchasingId(item.id);
    const purchase = await purchaseShopItem(activeChild.id, item.id, item.price);
    setPurchasingId(null);
    if (!purchase) {
      setError(t("shopPurchaseErrorMsg"));
      return;
    }
    setPurchases(prev => [...prev, purchase]);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  }, [activeChild, balance, ownedIds, t]);

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
        <CelebrationBanner isVisible={showCelebration} text={t("shopUnlockedCelebration")} />
        <ErrorToast error={error} onDismiss={() => setError(null)} />

        <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 flex-1 w-full">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 w-2/3 bg-white/60 rounded-xl" />
              <div className="h-8 w-1/2 bg-white/60 rounded-full" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 w-2/3 bg-gray-100 rounded" />
                      <div className="h-4 w-full bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <ShopHeader balance={balance ?? 0} gems={gems} />

              <div className="mt-4">
                <ShopFilterTabs filter={filter} onFilterChange={setFilter} />
              </div>

              <div className="mt-4">
                <ShopGrid
                  filter={filter}
                  balance={balance ?? 0}
                  ownedIds={ownedIds}
                  purchasingId={purchasingId}
                  onBuy={handleBuy}
                />
              </div>

              <div className="mt-4">
                <ShopBanner balance={balance} ownedIds={ownedIds} />
              </div>
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
}
