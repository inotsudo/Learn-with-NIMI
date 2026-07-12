import supabase from "@/lib/supabaseClient";
import { qcached, qinvalidate } from "@/lib/queryCache";
import type { ShopPurchase, ChildCosmetics } from "./types";

const EMPTY_COSMETICS: ChildCosmetics = {
  nimi_outfit: null, piko_outfit: null, frame: null, title_badge: null,
};

// All cosmetic shop items this child has ever unlocked.
export async function getShopPurchases(childId: string): Promise<ShopPurchase[]> {
  const { data, error } = await supabase
    .from("shop_purchases")
    .select("*")
    .eq("child_id", childId);
  if (error) {
    console.error("[getShopPurchases]", error.message);
    return [];
  }
  return (data ?? []) as ShopPurchase[];
}

// Records a shop purchase, spending `price` stars on `itemId`.
export async function purchaseShopItem(childId: string, itemId: string, price: number): Promise<ShopPurchase | null> {
  const { data, error } = await supabase
    .from("shop_purchases")
    .insert({ child_id: childId, item_id: itemId, price })
    .select()
    .single();
  if (error) {
    console.error("[purchaseShopItem]", error.message);
    return null;
  }
  return data as ShopPurchase;
}

export function getChildCosmetics(childId: string): Promise<ChildCosmetics> {
  return qcached(`childCosmetics:${childId}`, async () => {
    const { data } = await supabase
      .from("child_cosmetics")
      .select("nimi_outfit, piko_outfit, frame, title_badge")
      .eq("child_id", childId)
      .maybeSingle();
    return data ? (data as ChildCosmetics) : { ...EMPTY_COSMETICS };
  });
}

export async function equipItem(
  childId: string,
  slot: "nimi_outfit" | "piko_outfit" | "frame" | "title_badge",
  itemId: string | null,
): Promise<boolean> {
  const { error } = await supabase.from("child_cosmetics").upsert(
    { child_id: childId, [slot]: itemId, updated_at: new Date().toISOString() },
    { onConflict: "child_id" }
  );
  if (!error) qinvalidate(`childCosmetics:${childId}`);
  return !error;
}

// Returns total shield purchases for this child (each purchase = 1 shield).
export async function getStreakShieldsPurchased(childId: string): Promise<number> {
  const { data } = await supabase
    .from("shop_purchases")
    .select("id")
    .eq("child_id", childId)
    .eq("item_id", "streakShield");
  return (data ?? []).length;
}

// Returns the set of YYYY-MM-DD dates where a shield was activated.
export async function getUsedShieldDates(childId: string, language: "en" | "fr" | "rw"): Promise<Set<string>> {
  const { data } = await supabase
    .from("child_achievements")
    .select("slug")
    .eq("child_id", childId)
    .eq("language", language)
    .eq("type", "badge")
    .like("slug", "streak-shield-used-%");
  const set = new Set<string>();
  for (const row of data ?? []) {
    const dateStr = row.slug.replace("streak-shield-used-", "");
    set.add(dateStr);
  }
  return set;
}

// Marks a shield as used for the given YYYY-MM-DD date string.
export async function activateStreakShield(childId: string, language: "en" | "fr" | "rw", dateStr: string): Promise<boolean> {
  const { error } = await supabase.from("child_achievements").insert({
    child_id: childId, language, type: "badge",
    slug: `streak-shield-used-${dateStr}`,
  });
  return !error || error.code === "23505";
}
