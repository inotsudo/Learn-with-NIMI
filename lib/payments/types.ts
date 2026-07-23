export type Currency = "USD" | "EUR" | "RWF";
export type PaymentProvider = "cybersource" | "mtn_momo" | "free" | "admin_grant" | "trial";
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
export type ProductTier = "discovery" | "story_pack" | "family_bundle" | "personalized" | "champion_pack" | "club";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: ProductTier;
  product_type: "one_time" | "subscription";
  price_usd: number | null;
  price_eur: number | null;
  price_rwf: number | null;
  billing_interval: "month" | "year" | null;
  features: string[];
  story_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  parent_id: string;
  child_id: string | null;
  product_id: string;
  currency: Currency;
  amount: number;
  payment_provider: PaymentProvider;
  payment_status: PaymentStatus;
  payment_ref: string | null;
  provider_transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PricingDisplay {
  amount: number;
  currency: Currency;
  symbol: string;
  formatted: string;
}

export function getPrice(product: Product, currency: Currency): PricingDisplay {
  const prices: Record<Currency, { amount: number | null; symbol: string }> = {
    USD: { amount: product.price_usd, symbol: "$" },
    EUR: { amount: product.price_eur, symbol: "€" },
    RWF: { amount: product.price_rwf, symbol: "RWF" },
  };
  const { amount, symbol } = prices[currency];
  const val = amount ?? 0;
  const formatted = currency === "RWF"
    ? `${val.toLocaleString()} ${symbol}`
    : `${symbol}${val.toFixed(2)}`;
  return { amount: val, currency, symbol, formatted };
}

export interface Subscription {
  id: string;
  parent_id: string;
  product_id: string;
  status: "active" | "cancelled" | "expired" | "past_due";
  currency: Currency;
  amount: number;
  billing_interval: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_provider: PaymentProvider;
  created_at: string;
}

export function getProviderForCurrency(currency: Currency): PaymentProvider {
  return currency === "RWF" ? "mtn_momo" : "cybersource";
}
