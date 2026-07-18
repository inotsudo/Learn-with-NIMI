"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Sparkles, Shield, CreditCard, Phone, Star, CheckCircle2, Tag } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION, SPRING } from "@/lib/design-system/motion";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import supabase from "@/lib/supabaseClient";
import { getProducts, getActiveSubscription } from "@/lib/payments/products";
import { lscached } from "@/lib/queryCache";
import { getPrice, getProviderForCurrency } from "@/lib/payments/types";
import type { Product, Currency, Subscription } from "@/lib/payments/types";
import PricingPaymentModal from "@/components/pricing/PricingPaymentModal";
import PricingGiftModal from "@/components/pricing/PricingGiftModal";

const FEATURE_LABELS: Record<string, string> = {
  all_stories: "All Interactive Stories",
  all_languages: "Language Profile (FR+EN · RW+FR · All 3)",
  nimi_ai: "Nimi AI Learning Companion",
  challenges: "Champion Challenges",
  community: "Nimipiko Friends Community",
  unlimited_updates: "Unlimited New Content",
  coloring_books: "Coloring Book Activities",
  songs: "Original Songs & Karaoke",
  certificates: "Achievement Certificates",
  personalized_story: "Personalized Hero Story",
  child_photo_in_book: "Child's Photo Woven Into the Story",
  personalized_pdf: "Downloadable PDF Keepsake",
  champion_certificate: "Champion Certificate",
  keepsake_memory: "A Memory That Lasts Forever",
};

type DiscountInfo = {
  code_id: string; code: string;
  discount_type: "percent" | "fixed"; discount_value: number;
  description: string | null;
};

function applyDiscount(amount: number, info: DiscountInfo): number {
  if (info.discount_type === "percent") return Math.max(0, amount * (1 - info.discount_value / 100));
  return Math.max(0, amount - info.discount_value);
}

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "RWF") return `${Math.round(amount).toLocaleString()} RWF`;
  if (currency === "EUR") return `€${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

export default function PricingPage() {
  const m = useThemeMotion();
  const searchParams = useSearchParams();
  const addChildReason = searchParams.get("reason") === "add-child";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [showPayment, setShowPayment] = useState<{
    product: Product; effectiveAmount?: number; discountCodeId?: string; successRedirectUrl?: string;
  } | null>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  const [showGift, setShowGift] = useState(false);

  // Promo code state
  const [discountInput, setDiscountInput] = useState("");
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [discountStatus, setDiscountStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [discountError, setDiscountError] = useState("");

  useEffect(() => {
    void (async () => {
      // Start the auth → subscription chain immediately so it runs in parallel
      // with the products and geo fetches, not sequentially after them.
      const subPromise = supabase.auth.getUser().then(({ data: { user } }) =>
        user?.id ? getActiveSubscription(user.id) : Promise.resolve(null)
      );

      const [p, geo] = await Promise.all([
        getProducts(),
        lscached("nimi:geo", 24 * 60 * 60_000, () =>
          fetch("/api/geo").then(r => r.json()).catch(() => ({ currency: "USD" }))
        ),
      ]);
      setProducts(p);
      setCurrency(geo.currency === "RWF" ? "RWF" : geo.currency === "EUR" ? "EUR" : "USD");

      const sub = await subPromise;
      setActiveSub(sub);
      setLoading(false);
    })();
  }, []);

  const applyCode = useCallback(async (slug: string) => {
    const code = discountInput.trim();
    if (!code) return;
    setDiscountStatus("loading");
    setDiscountError("");
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, productSlug: slug }),
      });
      const data = await res.json();
      if (data.valid) {
        setDiscountInfo(data as DiscountInfo);
        setDiscountStatus("ok");
      } else {
        setDiscountStatus("err");
        setDiscountError(data.error ?? "Invalid code");
        setDiscountInfo(null);
      }
    } catch {
      setDiscountStatus("err");
      setDiscountError("Network error");
      setDiscountInfo(null);
    }
  }, [discountInput]);

  const handlePurchase = useCallback((product: Product, effectiveAmount?: number, discountCodeId?: string, successRedirectUrl?: string) => {
    setShowPayment({ product, effectiveAmount, discountCodeId, successRedirectUrl });
  }, []);

  if (loading) return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 space-y-4">
        <Bone className="h-44 leaf-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Bone className="h-80 leaf-lg" />
          <Bone className="h-80 leaf-lg" />
        </div>
      </div>
    </AppShell>
  );

  const clubMonthly = products.find(p => p.slug === "nimipiko-club");
  const clubAnnual  = products.find(p => p.slug === "nimipiko-club-annual");
  // Active billing plan — fall back to monthly if annual not yet in DB
  const club = (billingAnnual && clubAnnual) ? clubAnnual : clubMonthly;
  const masterpiece = products.find(p => p.slug === "masterpiece");

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 w-full content-enter">

          {/* Contextual upsell banner — shown when redirected from "Add Kid" paywall */}
          {addChildReason && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3.5"
            >
              <span className="text-2xl shrink-0">👨‍👩‍👧‍👦</span>
              <div>
                <p className="font-black text-ds-text text-[14px]">Your free plan includes 1 explorer</p>
                <p className="text-gray-500 text-[13px] mt-0.5">
                  Subscribe to Nimipiko Club and add unlimited children to the same account.
                </p>
              </div>
            </motion.div>
          )}

          {/* Header */}
          <HeroBanner zone="familyHub" className="mb-8 overflow-hidden">
            <div className="relative z-10 p-6 sm:p-8 text-center">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: DURATION.loopFloat, repeat: Infinity }}
                className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl border border-white/30">
                👑
              </motion.div>
              <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.15em] mb-1">
                Nimipiko: The Immersive Early Learning Platform
              </p>
              <h1 className="font-baloo font-black text-[32px] sm:text-[42px] text-white leading-tight">
                Grow With Every Story.
              </h1>
              <p className="text-white/80 text-[15px] font-nunito mt-2 max-w-lg mx-auto">
                Every story is a complete learning adventure — reading, singing, creating, and growing together.
              </p>
            </div>
          </HeroBanner>

          {/* ═══ DISCOVERY — FREE ENTRY POINT ═══ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative overflow-hidden border border-green-200 dark:border-green-800/60 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 shadow-sm"
            style={{ borderRadius: "var(--leaf-r-lg)" }}>
            <div className="relative z-10 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Left: label + description */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-800/40 flex items-center justify-center text-2xl shrink-0">🎁</div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-baloo font-black text-green-700 dark:text-green-400 text-[18px]">Start for FREE</span>
                      <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">NO CARD NEEDED</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-[13px]">
                      Experience the Nimipiko Learning Universe before you subscribe. Your first adventure is completely free.
                    </p>
                  </div>
                </div>
                {/* Right: CTA */}
                <a href="/signup"
                  className="shrink-0 px-6 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white font-black text-[14px] transition flex items-center gap-2 justify-center">
                  Create Free Account →
                </a>
              </div>
              {/* What's free */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: "🎵", label: "Animated Song", sub: "Lyric video intro" },
                  { icon: "📖", label: "Story Preview", sub: "Taste the content" },
                  { icon: "🦸", label: "Meet the Heroes", sub: "Character intro" },
                  { icon: "🏆", label: "First Challenge", sub: "Champion activity" },
                ].map(({ icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-2 bg-white/80 dark:bg-white/10 rounded-xl px-3 py-2 border border-green-200/60 dark:border-green-700/30">
                    <span className="text-lg shrink-0">{icon}</span>
                    <div>
                      <p className="font-bold text-[12px] text-gray-800 dark:text-gray-100">{label}</p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Billing toggle */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 mb-8">
            <div role="tablist" aria-label="Billing period" className="flex items-center gap-3 bg-ds-page rounded-full p-1 border border-ds-border">
              <button
                role="tab"
                aria-selected={!billingAnnual}
                onClick={() => setBillingAnnual(false)}
                className={`px-5 py-2 rounded-full font-baloo font-black text-[13px] transition-all ${
                  !billingAnnual ? "bg-ds-card text-ds-text shadow-sm" : "text-ds-muted"
                }`}
              >Monthly</button>
              <button
                role="tab"
                aria-selected={billingAnnual}
                onClick={() => setBillingAnnual(true)}
                className={`px-5 py-2 rounded-full font-baloo font-black text-[13px] transition-all flex items-center gap-2 ${
                  billingAnnual ? "bg-ds-card text-ds-text shadow-sm" : "text-ds-muted"
                }`}
              >
                Annual
                {clubMonthly && clubAnnual && (() => {
                  const monthly = getPrice(clubMonthly, currency).amount;
                  const annual = getPrice(clubAnnual, currency).amount;
                  const pct = Math.round((1 - annual / (monthly * 12)) * 100);
                  return pct > 0
                    ? <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">SAVE {pct}%</span>
                    : null;
                })()}
              </button>
            </div>
            {billingAnnual && clubMonthly && clubAnnual && (() => {
              const monthly = getPrice(clubMonthly, currency).amount;
              const annual  = getPrice(clubAnnual,  currency).amount;
              const monthsFree = Math.round((monthly * 12 - annual) / monthly);
              return (
                <p className="font-nunito text-green-700 dark:text-green-400 text-[12px] font-bold">
                  🎉 {monthsFree} months free — billed once per year
                </p>
              );
            })()}
          </motion.div>

          {/* ═══ BRAND STORY — THE LEARNING UNIVERSE ═══ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-8 text-center px-2">
            <p className="font-baloo font-black text-ds-text text-[20px] sm:text-[24px] leading-snug">
              We are not selling digital books.
            </p>
            <p className="font-baloo font-black text-[var(--ds-brand-primary)] text-[20px] sm:text-[24px] leading-snug mb-3">
              We are building the Nimipiko Learning Universe.
            </p>
            <p className="text-gray-500 text-[13px] max-w-xl mx-auto leading-relaxed">
              Every story unlocks a complete interactive learning ecosystem — Interactive Storybooks, Professional Voice Overs, Songs &amp; Karaoke, Animated Videos, Coloring Books, Language Learning, Champion Challenges, Community, and Personalized Adventures.
            </p>
          </motion.div>

          {/* Two-Pillar intro */}
          <div className="flex items-center gap-4 mb-6 px-1">
            <div className="flex-1 h-px bg-ds-border" />
            <div className="text-center">
              <p className="font-baloo font-black text-ds-text text-[13px] tracking-wide">TWO PILLARS · TWO WAYS TO GROW</p>
              <p className="font-nunito text-gray-400 text-[11px] mt-0.5">Choose one or both — they work together</p>
            </div>
            <div className="flex-1 h-px bg-ds-border" />
          </div>

          {/* Two pillars side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ═══ PILLAR 1: Nimipiko Club ═══ */}
            {club && (() => {
              const price = getPrice(club, currency);
              const provider = getProviderForCurrency(currency);
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative overflow-hidden border-2 border-yellow-400/40 shadow-ds-card bg-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>

                  {/* Popular badge */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-center py-1.5">
                    <span className="text-orange-950 font-black text-[11px] tracking-wider">⭐ MOST POPULAR</span>
                  </div>

                  {/* Header */}
                  <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 pt-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="font-baloo font-black text-white text-[24px]">Nimipiko Club</h2>
                        <p className="text-white/70 text-[12px] font-bold">
                          {billingAnnual ? "Annual Membership · Best Value" : "Monthly Membership"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="px-6 pt-5 pb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-baloo font-black text-ds-text text-[40px]">{price.formatted}</span>
                      <span className="text-gray-400 text-[15px] font-bold">/{billingAnnual ? "year" : "month"}</span>
                    </div>
                    {billingAnnual && clubMonthly && clubAnnual && (() => {
                      const annualPrice = getPrice(clubAnnual, currency);
                      const monthlyPrice = getPrice(clubMonthly, currency);
                      const perMonth = annualPrice.amount / 12;
                      const saved = monthlyPrice.amount * 12 - annualPrice.amount;
                      const perMonthFmt = `${formatAmount(perMonth, currency)}/month`;
                      const savedFmt = formatAmount(saved, currency);
                      return (
                        <p className="text-green-600 dark:text-green-400 text-[12px] font-bold mt-0.5">
                          ≈ {perMonthFmt} · saves {savedFmt}
                        </p>
                      );
                    })()}
                    <p className="text-gray-500 dark:text-gray-400 text-[13px] mt-1">Full access to everything. Cancel anytime.</p>
                  </div>

                  {/* Features */}
                  <div className="px-6 pb-5 space-y-2.5">
                    {(club.features as string[]).map(f => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[var(--ds-brand-primary)] shrink-0 mt-0.5" />
                        <span className="text-ds-text text-[13px]">{FEATURE_LABELS[f] ?? f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Nimi AI callout */}
                  <div className="mx-6 mb-4 flex items-center gap-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 rounded-xl px-3 py-2.5">
                    <span className="text-xl shrink-0">🤖</span>
                    <div>
                      <p className="font-black text-indigo-700 dark:text-indigo-300 text-[12px]">Nimi AI Learning Companion — Included</p>
                      <p className="text-indigo-500 dark:text-indigo-400 text-[10px]">Your child&apos;s personal AI friend who speaks about stories, characters &amp; values.</p>
                    </div>
                  </div>

                  {/* Language profile picker (visual) */}
                  <div className="px-6 pb-4">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Your language profile</p>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: "🇫🇷 FR + 🇬🇧 EN", desc: "French & English" },
                        { label: "🇷🇼 RW + 🇫🇷 FR", desc: "Kinyarwanda & French" },
                        { label: "🌍 All 3", desc: "EN · FR · RW" },
                      ].map(({ label, desc }) => (
                        <div key={label} className="flex flex-col items-center bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/40 rounded-xl px-3 py-2 text-center">
                          <span className="font-baloo font-black text-indigo-700 dark:text-indigo-300 text-[12px]">{label}</span>
                          <span className="text-indigo-400 dark:text-indigo-400 text-[9px] font-bold">{desc}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-2">Choose your profile in account settings after subscribing.</p>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    {activeSub ? (
                      <div className="w-full py-3.5 leaf bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700/40 flex items-center justify-center gap-2 text-green-700 dark:text-green-400 font-black text-[15px]">
                        <CheckCircle2 className="w-5 h-5" />
                        {activeSub.cancel_at_period_end ? "Cancels at period end" : "You're a Club Member ✓"}
                      </div>
                    ) : (
                      <>
                        {/* Promo code input */}
                        <div className="mb-4">
                          {discountInfo ? (
                            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-green-700 dark:text-green-400 font-black text-[12px]">{discountInfo.code} applied!</span>
                                {discountInfo.description && (
                                  <span className="text-green-600 dark:text-green-500 text-[11px]">· {discountInfo.description}</span>
                                )}
                              </div>
                              <button onClick={() => { setDiscountInfo(null); setDiscountInput(""); setDiscountStatus("idle"); }}
                                className="text-green-500 hover:text-red-400 text-[10px] font-bold transition">Remove</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={discountInput}
                                onChange={e => { setDiscountInput(e.target.value.toUpperCase()); setDiscountStatus("idle"); setDiscountError(""); }}
                                onKeyDown={e => e.key === "Enter" && applyCode(club.slug)}
                                placeholder="Promo code"
                                className="flex-1 border border-ds-border bg-ds-input leaf px-3 py-2.5 text-ds-text text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400"
                              />
                              <button
                                onClick={() => applyCode(club.slug)}
                                disabled={discountStatus === "loading" || !discountInput.trim()}
                                className="px-4 py-2.5 leaf bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-ds-text font-black text-[12px] transition disabled:opacity-50">
                                {discountStatus === "loading" ? "..." : "Apply"}
                              </button>
                            </div>
                          )}
                          {discountStatus === "err" && (
                            <p className="text-red-500 text-[11px] mt-1 font-semibold">{discountError}</p>
                          )}
                        </div>

                        {/* Discounted price display */}
                        {discountInfo && (() => {
                          const discounted = applyDiscount(price.amount, discountInfo);
                          return (
                            <div className="flex items-center gap-2 mb-3 justify-center">
                              <span className="line-through text-gray-400 text-[15px] font-bold">{price.formatted}</span>
                              <span className="text-green-700 dark:text-green-400 font-black text-[22px]">{formatAmount(discounted, currency)}</span>
                              <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                {discountInfo.discount_type === "percent"
                                  ? `${discountInfo.discount_value}% OFF`
                                  : `${formatAmount(discountInfo.discount_value, currency)} OFF`}
                              </span>
                            </div>
                          );
                        })()}

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={m.buttonPress}
                          onClick={() => {
                            const effectiveAmount = discountInfo ? applyDiscount(price.amount, discountInfo) : undefined;
                            handlePurchase(club, effectiveAmount, discountInfo?.code_id);
                          }}
                          className="w-full py-4 leaf bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[16px] shadow-xl shadow-orange-200 flex items-center justify-center gap-2">
                          {provider === "mtn_momo" ? <><Phone className="w-5 h-5" /> Choose Payment Method</>
                            : <><CreditCard className="w-5 h-5" /> Subscribe Now</>}
                        </motion.button>
                        <p className="text-center text-gray-500 dark:text-gray-400 text-[10px] mt-2">
                          {provider === "mtn_momo" ? "📱 MTN MoMo or 💳 Card" : "🔒 Visa, Mastercard & Amex"}
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })()}

            {/* ═══ PILLAR 2: Masterpiece ═══ */}
            {masterpiece && (() => {
              const price = getPrice(masterpiece, currency);
              const provider = getProviderForCurrency(currency);
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative overflow-hidden border-2 border-ds-border shadow-ds-card bg-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>

                  {/* Badge */}
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[10px] px-3 py-1 rounded-full">
                    PREMIUM
                  </div>

                  {/* Header */}
                  <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center">
                        <Crown className="w-7 h-7 text-amber-900" />
                      </div>
                      <div>
                        <h2 className="font-baloo font-black text-amber-950 text-[24px]">Masterpiece</h2>
                        <p className="text-amber-800 text-[12px] font-bold">Personalized Hero Story</p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="px-6 pt-5 pb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-baloo font-black text-ds-text text-[40px]">{price.formatted}</span>
                      <span className="text-gray-400 text-[15px] font-bold">one-time</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-[13px] mt-1">One-time · no subscription needed. Your child becomes the hero.</p>
                  </div>

                  {/* Features */}
                  <div className="px-6 pb-5 space-y-2.5">
                    {(masterpiece.features as string[]).map(f => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span className="text-ds-text text-[13px]">{FEATURE_LABELS[f] ?? f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={m.buttonPress}
                      onClick={() => handlePurchase(masterpiece, undefined, undefined, "/masterpiece")}
                      className="w-full py-4 leaf bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white font-black text-[16px] shadow-md transition flex items-center justify-center gap-2">
                      {provider === "mtn_momo" ? <><Phone className="w-5 h-5" /> Choose Payment Method</>
                        : <><CreditCard className="w-5 h-5" /> Buy Masterpiece</>}
                    </motion.button>
                    <p className="text-center text-gray-400 text-[10px] mt-2">
                      {provider === "mtn_momo" ? "📱 MTN MoMo or 💳 Card" : "🔒 Visa, Mastercard & Amex"}
                    </p>
                  </div>
                </motion.div>
              );
            })()}
          </div>

          {/* ═══ GIVE AS GIFT ═══ */}
          {(clubMonthly || clubAnnual) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 relative overflow-hidden border border-ds-border shadow-ds-card"
              style={{ borderRadius: "var(--leaf-r-lg)" }}>

              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-orange-950/30" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-200/40 to-transparent dark:from-pink-800/20 rounded-full translate-x-20 -translate-y-20" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-200/30 to-transparent dark:from-rose-800/10 rounded-full -translate-x-16 translate-y-16" />

              <div className="relative z-10 p-6 sm:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg shrink-0">
                      🎁
                    </div>
                    <div>
                      <h2 className="font-baloo font-black text-ds-text text-[22px] leading-tight">Surprise someone who deserves it 🌟</h2>
                      <p className="text-rose-900/60 dark:text-rose-200/70 text-[13px] mt-0.5">Stories, songs &amp; adventures — wrapped up as a gift</p>
                    </div>
                  </div>
                  <div className="sm:ml-auto shrink-0">
                    <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                      ✨ Birthdays · Holidays · Just because
                    </span>
                  </div>
                </div>

                {/* Gift value callout */}
                <div className="flex items-center gap-3 bg-white/70 dark:bg-white/8 border border-rose-200/60 dark:border-rose-700/30 rounded-2xl px-4 py-3 mb-6">
                  <span className="text-2xl shrink-0">💝</span>
                  <div>
                    <p className="font-baloo font-black text-rose-700 dark:text-rose-300 text-[14px]">Any amount — you decide what feels right</p>
                    <p className="text-gray-500 dark:text-gray-400 text-[12px] mt-0.5">
                      From {currency === "RWF" ? "9,900 RWF" : currency === "EUR" ? "€13.99" : "$14.99"} — enough to unlock a full month of learning. No subscription forced on the recipient.
                    </p>
                  </div>
                </div>

                {/* What they get */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                  {[
                    { icon: "📖", text: "Stories & songs in 3 languages" },
                    { icon: "💬", text: "Share by WhatsApp or email" },
                    { icon: "🕐", text: "Recipient redeems whenever" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2 bg-white/70 dark:bg-white/10 rounded-xl px-3 py-2 border border-rose-200/50 dark:border-rose-700/25">
                      <span className="text-lg shrink-0">{icon}</span>
                      <span className="text-ds-text text-[12px] font-bold">{text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={m.buttonPress}
                    onClick={() => setShowGift(true)}
                    className="flex-1 sm:flex-none sm:px-8 py-3.5 leaf bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-[15px] shadow-lg shadow-rose-200 dark:shadow-rose-900/30 flex items-center justify-center gap-2 transition">
                    🎁 Send a Gift
                  </motion.button>
                  <p className="text-rose-900/50 dark:text-rose-200/50 text-[11px] font-bold text-center sm:text-left">
                    🔒 Secure checkout · No account needed for the recipient
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Trust badges */}
          <div className="flex justify-center gap-6 mt-10 flex-wrap">
            {[
              { icon: <Shield className="w-5 h-5" />, label: "Secure Payments" },
              { icon: <span className="text-lg">🌍</span>, label: "3 Languages" },
              { icon: <span className="text-lg">👨‍👩‍👧</span>, label: "Family Safe" },
              { icon: <span className="text-lg">🏫</span>, label: "School Licensing Available" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
                {b.icon} {b.label}
              </div>
            ))}
          </div>

          {/* Parent testimonials */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-10 border border-ds-border bg-ds-card/80 backdrop-blur-sm p-6 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
            <p className="font-black text-ds-text text-[15px] mb-4 text-center">❤️ What parents say</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {([
                { quote: "My daughter asks for Nimipiko every day. Worth every penny!", name: "Sarah M.", lang: "🇺🇸", stars: 5 },
                { quote: "Stories in Kinyarwanda — I cried happy tears the first time she read one!", name: "Amina R.", lang: "🇷🇼", stars: 5 },
                { quote: "Best subscription we have. My son finished 3 stories in one weekend.", name: "David K.", lang: "🇫🇷", stars: 5 },
              ] as const).map(({ quote, name, lang, stars }) => (
                <div key={name} className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-white/5 border border-ds-border" style={{ borderRadius: 'var(--leaf-r)' }}>
                  <div className="flex gap-0.5">
                    {Array.from({ length: stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="font-nunito text-gray-700 dark:text-gray-300 text-[13px] italic leading-relaxed flex-1">"{quote}"</p>
                  <p className="font-baloo font-black text-[12px] text-ds-text">{lang} {name}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ NIMIPIKO FOR SCHOOLS ═══ */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="mt-10 relative overflow-hidden border border-ds-border shadow-ds-card bg-ds-card"
            style={{ borderRadius: "var(--leaf-r-lg)" }}>

            {/* Background accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-sky-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-sky-950/30 pointer-events-none" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-blue-200/30 to-transparent dark:from-blue-800/15 rounded-full translate-x-24 -translate-y-24 pointer-events-none" />

            <div className="relative z-10 p-6 sm:p-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shrink-0">
                    🏫
                  </div>
                  <div>
                    <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide mb-1">
                      For Schools &amp; Institutions
                    </span>
                    <h2 className="font-baloo font-black text-ds-text text-[22px] leading-tight">Nimipiko for Schools &amp; Educators</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-[13px] mt-0.5">
                      Institutional licensing for classrooms, childcare centres, and schools — with an Educator Dashboard to track class progress.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing tiers table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <thead>
                    <tr className="border-b border-ds-border">
                      <th className="pb-2 pr-4 font-baloo font-black text-ds-text text-[13px]">Tier</th>
                      <th className="pb-2 pr-4 font-baloo font-black text-ds-text text-[13px]">Volume</th>
                      <th className="pb-2 pr-4 font-baloo font-black text-ds-text text-[13px]">USD</th>
                      <th className="pb-2 pr-4 font-baloo font-black text-ds-text text-[13px]">EUR</th>
                      <th className="pb-2 font-baloo font-black text-ds-text text-[13px]">RWF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ds-border">
                    {[
                      { tier: "Small Group License", volume: "10–50 students", usd: "$7.00", eur: "€6.50", rwf: "5,000–6,000", highlight: false },
                      { tier: "Large Institution License", volume: "50+ students", usd: "$5.00", eur: "€4.60", rwf: "4,000–5,000", highlight: false },
                      { tier: "Custom Enterprise", volume: "100+ students", usd: "Custom", eur: "Custom", rwf: "Custom", highlight: true },
                    ].map(({ tier, volume, usd, eur, rwf, highlight }) => (
                      <tr key={tier} className={highlight ? "bg-blue-50/60 dark:bg-blue-900/20" : ""}>
                        <td className="py-3 pr-4">
                          <span className={`font-baloo font-black text-[13px] ${highlight ? "text-blue-700 dark:text-blue-300" : "text-ds-text"}`}>
                            {tier}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-gray-500 text-[13px] font-semibold">{volume}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`font-baloo font-black text-[14px] ${highlight ? "text-blue-600 dark:text-blue-400" : "text-ds-text"}`}>
                            {usd}
                          </span>
                          {!highlight && <span className="text-gray-400 text-[10px] ml-1">/student/mo</span>}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`font-baloo font-black text-[14px] ${highlight ? "text-blue-600 dark:text-blue-400" : "text-ds-text"}`}>
                            {eur}
                          </span>
                          {!highlight && <span className="text-gray-400 text-[10px] ml-1">/student/mo</span>}
                        </td>
                        <td className="py-3">
                          <span className={`font-baloo font-black text-[14px] ${highlight ? "text-blue-600 dark:text-blue-400" : "text-ds-text"}`}>
                            {rwf}
                          </span>
                          {!highlight && <span className="text-gray-400 text-[10px] ml-1"> RWF/student/mo</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* What schools get */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                {[
                  { icon: "📊", text: "Educator Dashboard with class progress" },
                  { icon: "🌍", text: "All 3 languages (EN · FR · RW)" },
                  { icon: "👩‍🏫", text: "Separate from parent account logic" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 bg-white dark:bg-white/10 rounded-xl px-3 py-2.5 border border-blue-200 dark:border-blue-700/30 shadow-sm">
                    <span className="text-lg shrink-0">{icon}</span>
                    <span className="text-gray-800 dark:text-gray-100 text-[12px] font-bold">{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="/schools"
                  className="flex-1 sm:flex-none sm:px-8 py-3.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-[15px] shadow-lg shadow-blue-200 dark:shadow-blue-900/30 flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  🏫 View School Licensing Plans
                </a>
                <p className="text-blue-900/50 dark:text-blue-200/50 text-[11px] font-bold text-center sm:text-left">
                  From $7 · €6.50 · 5,000 RWF /student/month · volume discounts available
                </p>
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-6 border border-ds-border bg-white/60 backdrop-blur-sm p-6 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
            <p className="font-black text-ds-text text-[15px] mb-4 text-center">💬 Frequently asked questions</p>
            <div className="space-y-4">
              {([
                { q: "Can I try before subscribing?", a: "Yes! Create a free account and explore the first story in each language before subscribing." },
                { q: "How many children can use one subscription?", a: "The Nimipiko Club covers your whole family — add up to 5 child profiles, each with their own progress and achievements." },
                { q: "Can I cancel anytime?", a: "Absolutely. Cancel in one click from the Parents Zone — no fees, no questions asked. Your child keeps their progress even after cancelling." },
                { q: "Which payment methods are accepted?", a: "We accept Visa, Mastercard and Amex for card payments. Rwandan families can pay with MTN Mobile Money or by card." },
                { q: "Is the content safe for young children?", a: "Every story and activity is educator-reviewed for children aged 2–10. Zero ads, zero in-app purchases beyond what you choose here." },
                { q: "Does Nimipiko offer school or classroom licensing?", a: "Yes! We offer institutional licenses starting at $7/student/month (5,000–6,000 RWF) with volume discounts for 50+ learners. Visit our Schools page to see plans and submit an inquiry." },
              ] as const).map(({ q, a }) => (
                <div key={q} className="border-b border-ds-border pb-4 last:border-0 last:pb-0">
                  <p className="font-baloo font-black text-ds-text text-[14px] mb-1.5">{q}</p>
                  <p className="font-nunito text-gray-600 text-[13px] leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </main>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPayment && (
            <PricingPaymentModal
              product={showPayment.product}
              currency={currency}
              effectiveAmount={showPayment.effectiveAmount}
              discountCodeId={showPayment.discountCodeId}
              successRedirectUrl={showPayment.successRedirectUrl}
              onClose={() => setShowPayment(null)}
            />
          )}
          {showGift && (
            <PricingGiftModal currency={currency} onClose={() => setShowGift(false)} />
          )}
        </AnimatePresence>
      </PageSurface>
    </AppShell>
  );
}
