import supabase from "@/lib/supabaseClient";
import { qcached, lscached, TTL_LONG } from "@/lib/queryCache";
import type { Product, Order, Subscription, Currency } from "./types";

const LS_PRODUCTS_TTL = 60 * 60_000; // 1 hour — survives page reloads so pricing shows instantly

export function getProducts(): Promise<Product[]> {
  return lscached("nimi:products:v3", LS_PRODUCTS_TTL, () =>
    qcached("products:v3", async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) { console.error("[getProducts]", error); return []; }
      return data ?? [];
    }, TTL_LONG)
  );
}

export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) { console.error("[getProduct]", error); return null; }
  return data;
}

export async function createOrder(params: {
  parentId: string;
  childId?: string;
  productId: string;
  currency: Currency;
  amount: number;
  paymentProvider: string;
  personalizationData?: Record<string, unknown>;
}): Promise<Order | null> {
  const { data, error } = await supabase.from("orders").insert({
    parent_id: params.parentId,
    child_id: params.childId ?? null,
    product_id: params.productId,
    currency: params.currency,
    amount: params.amount,
    payment_provider: params.paymentProvider,
    payment_status: params.amount === 0 ? "completed" : "pending",
    personalization_data: params.personalizationData ?? null,
    completed_at: params.amount === 0 ? new Date().toISOString() : null,
  }).select().single();
  if (error) { console.error("[createOrder]", error); return null; }

  if (params.amount === 0) {
    await grantAccess(params.parentId, params.productId, data.id);
  }

  return data;
}

export async function updateOrderStatus(orderId: string, status: string, providerTxId?: string): Promise<boolean> {
  const updates: Record<string, unknown> = { payment_status: status };
  if (providerTxId) updates.provider_transaction_id = providerTxId;
  if (status === "completed") updates.completed_at = new Date().toISOString();

  const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
  if (error) { console.error("[updateOrderStatus]", error); return false; }
  return true;
}

export async function grantAccess(parentId: string, productId: string, orderId: string): Promise<void> {
  const product = await supabase.from("products").select("tier, story_id").eq("id", productId).single();
  if (!product.data) return;

  const accessType = product.data.tier === "club" ? "club"
    : product.data.tier === "personalized" ? "personalized"
    : product.data.tier === "champion_pack" ? "challenge_pack"
    : product.data.tier === "family_bundle" ? "bundle"
    : "story";

  await supabase.from("content_access").insert({
    parent_id: parentId,
    access_type: accessType,
    story_id: product.data.story_id,
    order_id: orderId,
  });
}

export async function getParentAccess(parentId: string): Promise<string[]> {
  const { data } = await supabase
    .from("content_access")
    .select("access_type, story_id")
    .eq("parent_id", parentId)
    .eq("is_active", true);
  return (data ?? []).map(d => d.access_type + (d.story_id ? `:${d.story_id}` : ""));
}

export async function getParentOrders(parentId: string): Promise<Order[]> {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getActiveSubscription(parentId: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from("nimipiko_subscriptions")
    .select("*")
    .eq("parent_id", parentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) return data;

  // 24-hour grace period for recently-expired trials — lets the user finish
  // their session and see a clear "your trial ended" message rather than an
  // abrupt content lockout at the exact expiry second.
  const { data: grace } = await supabase
    .from("nimipiko_subscriptions")
    .select("*")
    .eq("parent_id", parentId)
    .eq("payment_provider", "trial")
    .eq("status", "expired")
    .gte("current_period_end", new Date(Date.now() - 24 * 3600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return grace ?? null;
}
