"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Sparkles, Shield, CreditCard, Phone, Star, CheckCircle2, Tag } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION, EASE, SPRING } from "@/lib/design-system/motion";
import AppShell from "@/components/layout/AppShell";
import { PageSurface, HeroBanner } from "@/components/layout/primitives";
import MagicLoader from "@/components/magic/MagicLoader";
import supabase from "@/lib/supabaseClient";
import { getProducts, createOrder, getActiveSubscription } from "@/lib/payments/products";
import { getPrice, getProviderForCurrency } from "@/lib/payments/types";
import type { Product, Currency, Subscription } from "@/lib/payments/types";

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

const CURRENCIES: { code: Currency; label: string; flag: string }[] = [
  { code: "USD", label: "USD", flag: "🇺🇸" },
  { code: "RWF", label: "RWF", flag: "🇷🇼" },
];

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
  return `$${amount.toFixed(2)}`;
}

export default function PricingPage() {
  const m = useThemeMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [showPayment, setShowPayment] = useState<{
    product: Product; effectiveAmount?: number; discountCodeId?: string;
  } | null>(null);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  const [showGift, setShowGift] = useState<Product | null>(null);

  // Promo code state
  const [discountInput, setDiscountInput] = useState("");
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [discountStatus, setDiscountStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [discountError, setDiscountError] = useState("");

  useEffect(() => {
    void (async () => {
      const [p, geo, { data: { user } }] = await Promise.all([
        getProducts(),
        fetch("/api/geo").then(r => r.json()).catch(() => ({ currency: "USD" })),
        supabase.auth.getUser(),
      ]);
      setProducts(p);
      setCurrency(geo.currency === "RWF" ? "RWF" : "USD");
      if (user?.id) {
        const sub = await getActiveSubscription(user.id);
        setActiveSub(sub);
      }
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

  const handlePurchase = useCallback((product: Product, effectiveAmount?: number, discountCodeId?: string) => {
    setShowPayment({ product, effectiveAmount, discountCodeId });
  }, []);

  if (loading) return <AppShell><MagicLoader variant="shop" /></AppShell>;

  const clubMonthly = products.find(p => p.slug === "nimipiko-club");
  const clubAnnual  = products.find(p => p.slug === "nimipiko-club-annual");
  // Active billing plan — fall back to monthly if annual not yet in DB
  const club = (billingAnnual && clubAnnual) ? clubAnnual : clubMonthly;
  const masterpiece = products.find(p => p.slug === "masterpiece");

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 w-full">

          {/* Header */}
          <HeroBanner zone="familyHub" className="mb-8 overflow-hidden">
            <div className="relative z-10 p-6 sm:p-8 text-center">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: DURATION.loopFloat, repeat: Infinity }}
                className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl border border-white/30">
                👑
              </motion.div>
              <h1 className="font-baloo font-black text-[32px] sm:text-[42px] text-white leading-tight">
                Join the Nimipiko Universe
              </h1>
              <p className="text-white/80 text-[15px] font-nunito mt-2 max-w-lg mx-auto">
                Every story is a complete learning adventure — reading, singing, creating, and growing together.
              </p>

              <div className="flex justify-center mt-6 gap-2">
                {CURRENCIES.map(c => (
                  <button key={c.code} onClick={() => setCurrency(c.code)}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full font-baloo font-bold text-[14px] transition ${
                      currency === c.code
                        ? "bg-white text-[var(--ds-brand-primary)] shadow-lg"
                        : "bg-white/20 border border-white/30 text-white/90 hover:bg-white/30"
                    }`}>
                    <span>{c.flag}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>
          </HeroBanner>

          {/* Billing toggle */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-3 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setBillingAnnual(false)}
                className={`px-5 py-2 rounded-full font-baloo font-black text-[13px] transition-all ${
                  !billingAnnual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >Monthly</button>
              <button
                onClick={() => setBillingAnnual(true)}
                className={`px-5 py-2 rounded-full font-baloo font-black text-[13px] transition-all flex items-center gap-2 ${
                  billingAnnual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                Annual
                <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">SAVE 33%</span>
              </button>
            </div>
            {billingAnnual && (
              <p className="font-nunito text-green-700 text-[12px] font-bold">🎉 2 months free — billed once per year</p>
            )}
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
                  className="relative overflow-hidden border-2 border-yellow-400/40 shadow-ds-card bg-white" style={{ borderRadius: 'var(--leaf-r-lg)' }}>

                  {/* Popular badge */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-center py-1.5">
                    <span className="text-white font-black text-[11px] tracking-wider">⭐ MOST POPULAR</span>
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
                    {billingAnnual && clubMonthly && (
                      <p className="text-green-600 text-[12px] font-bold mt-0.5">
                        ≈ {currency === "RWF"
                          ? `${Math.round((clubAnnual?.price_rwf ?? 99000) / 12).toLocaleString()} RWF/month`
                          : `$${((clubAnnual?.price_usd ?? 119.99) / 12).toFixed(2)}/month`
                        } · saves {currency === "RWF"
                          ? `${((clubMonthly.price_rwf ?? 9900) * 12 - (clubAnnual?.price_rwf ?? 99000)).toLocaleString()} RWF`
                          : `$${((clubMonthly.price_usd ?? 14.99) * 12 - (clubAnnual?.price_usd ?? 119.99)).toFixed(2)}`
                        }
                      </p>
                    )}
                    <p className="text-gray-500 text-[13px] mt-1">Full access to everything. Cancel anytime.</p>
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

                  {/* Language profile picker (visual) */}
                  <div className="px-6 pb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your language profile</p>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: "🇫🇷 FR + 🇬🇧 EN", desc: "French & English" },
                        { label: "🇷🇼 RW + 🇫🇷 FR", desc: "Kinyarwanda & French" },
                        { label: "🌍 All 3", desc: "EN · FR · RW" },
                      ].map(({ label, desc }) => (
                        <div key={label} className="flex flex-col items-center bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-center">
                          <span className="font-baloo font-black text-indigo-700 text-[12px]">{label}</span>
                          <span className="text-indigo-400 text-[9px] font-bold">{desc}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-400 text-[10px] mt-2">Choose your profile in account settings after subscribing.</p>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    {activeSub ? (
                      <div className="w-full py-3.5 leaf bg-green-50 border-2 border-green-200 flex items-center justify-center gap-2 text-green-700 font-black text-[15px]">
                        <CheckCircle2 className="w-5 h-5" />
                        {activeSub.cancel_at_period_end ? "Cancels at period end" : "You're a Club Member ✓"}
                      </div>
                    ) : (
                      <>
                        {/* Promo code input */}
                        <div className="mb-4">
                          {discountInfo ? (
                            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-green-600" />
                                <span className="text-green-700 font-black text-[12px]">{discountInfo.code} applied!</span>
                                {discountInfo.description && (
                                  <span className="text-green-600 text-[11px]">· {discountInfo.description}</span>
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
                                className="px-4 py-2.5 leaf bg-gray-100 hover:bg-gray-200 text-ds-text font-black text-[12px] transition disabled:opacity-50">
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
                              <span className="text-green-700 font-black text-[22px]">{formatAmount(discounted, currency)}</span>
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
                          {provider === "mtn_momo" ? <><Phone className="w-5 h-5" /> Subscribe with MoMo</>
                            : <><CreditCard className="w-5 h-5" /> Subscribe Now</>}
                        </motion.button>
                        <p className="text-center text-gray-400 text-[10px] mt-2">
                          {provider === "mtn_momo" ? "📱 MTN Mobile Money Rwanda" : "🔒 Visa, Mastercard & Amex"}
                        </p>
                        <button
                          onClick={() => setShowGift(club)}
                          className="w-full mt-3 py-2.5 leaf border border-dashed border-yellow-400 text-yellow-700 font-black text-[12px] hover:bg-yellow-50 transition flex items-center justify-center gap-1.5">
                          🎁 Give as a gift
                        </button>
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
                  className="relative overflow-hidden border-2 border-ds-border shadow-ds-card bg-white" style={{ borderRadius: 'var(--leaf-r-lg)' }}>

                  {/* Badge */}
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[10px] px-3 py-1 rounded-full">
                    PREMIUM
                  </div>

                  {/* Header */}
                  <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Crown className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="font-baloo font-black text-white text-[24px]">Masterpiece</h2>
                        <p className="text-white/70 text-[12px] font-bold">Personalized Hero Story</p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="px-6 pt-5 pb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-baloo font-black text-ds-text text-[40px]">{price.formatted}</span>
                      <span className="text-gray-400 text-[15px] font-bold">one-time</span>
                    </div>
                    <p className="text-gray-500 text-[13px] mt-1">One-time · no subscription needed. Your child becomes the hero.</p>
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
                      onClick={() => handlePurchase(masterpiece)}
                      className="w-full py-4 leaf bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white font-black text-[16px] shadow-md transition flex items-center justify-center gap-2">
                      {provider === "mtn_momo" ? <><Phone className="w-5 h-5" /> Buy with MoMo</>
                        : <><CreditCard className="w-5 h-5" /> Buy Masterpiece</>}
                    </motion.button>
                    <p className="text-center text-gray-400 text-[10px] mt-2">
                      {provider === "mtn_momo" ? "📱 MTN Mobile Money Rwanda" : "🔒 Visa, Mastercard & Amex"}
                    </p>
                  </div>
                </motion.div>
              );
            })()}
          </div>

          {/* Trust badges */}
          <div className="flex justify-center gap-6 mt-10 flex-wrap">
            {[
              { icon: <Shield className="w-5 h-5" />, label: "Secure Payments" },
              { icon: <span className="text-lg">🌍</span>, label: "3 Languages" },
              { icon: <span className="text-lg">👨‍👩‍👧</span>, label: "Family Safe" },
              { icon: <span className="text-lg">🏫</span>, label: "School Licensing Coming Soon" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 text-gray-400 text-[11px] font-bold">
                {b.icon} {b.label}
              </div>
            ))}
          </div>

          {/* Parent testimonials */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-10 border border-ds-border bg-white/60 backdrop-blur-sm p-6 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
            <p className="font-black text-ds-text text-[15px] mb-4 text-center">❤️ What parents say</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {([
                { quote: "My daughter asks for Nimipiko every day. Worth every penny!", name: "Sarah M.", lang: "🇺🇸", stars: 5 },
                { quote: "Stories in Kinyarwanda — I cried happy tears the first time she read one!", name: "Amina R.", lang: "🇷🇼", stars: 5 },
                { quote: "Best subscription we have. My son finished 3 stories in one weekend.", name: "David K.", lang: "🇫🇷", stars: 5 },
              ] as const).map(({ quote, name, lang, stars }) => (
                <div key={name} className="flex flex-col gap-2 p-4 bg-gray-50 border border-ds-border" style={{ borderRadius: 'var(--leaf-r)' }}>
                  <div className="flex gap-0.5">
                    {Array.from({ length: stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="font-nunito text-gray-700 text-[13px] italic leading-relaxed flex-1">"{quote}"</p>
                  <p className="font-baloo font-black text-[12px] text-ds-text">{lang} {name}</p>
                </div>
              ))}
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
                { q: "Which payment methods are accepted?", a: "We accept Visa, Mastercard and Amex (via CyberSource) for USD. Rwandan families can pay with MTN Mobile Money." },
                { q: "Is the content safe for young children?", a: "Every story and activity is educator-reviewed for children aged 2–10. Zero ads, zero in-app purchases beyond what you choose here." },
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
            <PaymentModal
              product={showPayment.product}
              currency={currency}
              effectiveAmount={showPayment.effectiveAmount}
              discountCodeId={showPayment.discountCodeId}
              onClose={() => setShowPayment(null)}
            />
          )}
          {showGift && (
            <GiftModal product={showGift} currency={currency} onClose={() => setShowGift(null)} />
          )}
        </AnimatePresence>
      </PageSurface>
    </AppShell>
  );
}

// ── Payment Modal ──────────────────────────────────────────
function PaymentModal({ product, currency, effectiveAmount, discountCodeId, onClose }: {
  product: Product; currency: Currency;
  effectiveAmount?: number; discountCodeId?: string;
  onClose: () => void;
}) {
  const m = useThemeMotion();
  const price = getPrice(product, currency);
  const chargeAmount = effectiveAmount ?? price.amount;
  const provider = getProviderForCurrency(currency);
  const [step, setStep] = useState<"loading" | "card" | "momo" | "processing" | "success" | "error">(
    provider === "cybersource" ? "loading" : "momo"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [phone, setPhone] = useState("");

  // Auto-redirect to /stories 3s after successful payment
  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => { window.location.href = "/stories"; }, 3000);
    return () => clearTimeout(t);
  }, [step]);

  // CyberSource Unified Payments
  useEffect(() => {
    if (provider !== "cybersource") return;
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/loginpage"; return; }

        const order = await createOrder({
          parentId: user.id,
          productId: product.id,
          currency,
          amount: chargeAmount,
          paymentProvider: "cybersource",
          ...(discountCodeId ? { personalizationData: { discount_code_id: discountCodeId } } : {}),
        });
        if (!order || cancelled) { if (!cancelled) { setStep("error"); setErrorMsg("Failed to create order"); } return; }

        const ctxRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });
        const { captureContext, success } = await ctxRes.json();
        if (!success || !captureContext || cancelled) {
          if (!cancelled) { setStep("error"); setErrorMsg("Failed to initialize payment"); }
          return;
        }

        const jwtParts = captureContext.split(".");
        const ctx = JSON.parse(atob(jwtParts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const sdkUrl = ctx.ctx?.[0]?.data?.clientLibrary || ctx.ctx?.[0]?.clientLibrary;
        if (!sdkUrl || cancelled) {
          if (!cancelled) { setStep("error"); setErrorMsg("Invalid payment session"); }
          return;
        }

        const scriptId = "cybersource-up-sdk";
        if (!document.getElementById(scriptId)) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = sdkUrl;
          script.async = true;
          script.crossOrigin = "anonymous";
          document.head.appendChild(script);
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("SDK load failed"));
          });
        }

        if (cancelled) return;
        setStep("card");
        await new Promise(r => setTimeout(r, 200));

        const accept = await (window as any).Accept(captureContext);
        const up = await accept.unifiedPayments(false);

        const transientToken = await up.show({
          containers: {
            paymentSelection: "#cs-payment-list",
            paymentScreen: "#cs-payment-form",
          },
        });

        if (!transientToken || cancelled) return;

        sessionStorage.setItem("nimipiko_pending_payment", JSON.stringify({ orderId: order.id }));
        const completionJwt = await up.complete(transientToken);
        setStep("processing");

        const confirmRes = await fetch("/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: completionJwt, orderId: order.id }),
        });
        const confirmResult = await confirmRes.json();
        sessionStorage.removeItem("nimipiko_pending_payment");

        if (confirmResult.success) setStep("success");
        else { setStep("error"); setErrorMsg(confirmResult.message || "Payment was declined"); }
      } catch (err: any) {
        if (!cancelled) { setStep("error"); setErrorMsg(err?.message || "Payment failed"); }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [provider, product.id, currency, chargeAmount]);

  const handleMomoSubmit = async () => {
    setStep("processing");
    setErrorMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const order = await createOrder({
        parentId: user.id, productId: product.id, currency,
        amount: chargeAmount, paymentProvider: "mtn_momo",
        ...(discountCodeId ? { personalizationData: { discount_code_id: discountCodeId } } : {}),
      });
      if (!order) { setStep("error"); setErrorMsg("Failed to create order"); return; }

      const res = await fetch("/api/payments/mtn-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, phoneNumber: phone, amount: chargeAmount }),
      });
      const result = await res.json();
      if (result.success) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const s = await fetch(`/api/payments/mtn-momo?orderId=${order.id}&referenceId=${result.referenceId}`);
          const d = await s.json();
          if (d.status === "completed") { setStep("success"); return; }
          if (d.status === "failed") { setStep("error"); setErrorMsg(d.reason || "Payment declined"); return; }
        }
        setStep("error"); setErrorMsg("Payment timed out");
      } else { setStep("error"); setErrorMsg(result.error || "MoMo request failed"); }
    } catch { setStep("error"); setErrorMsg("Something went wrong"); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 50 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 51 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
          transition={{ ...SPRING.dialog }}
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-ds-border shadow-ds-card p-6 pb-8 sm:pb-6 sm:mx-4">

          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

          {step === "loading" && (
            <div className="text-center py-8">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: DURATION.loopFast, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--nimi-green)] flex items-center justify-center text-3xl shadow-xl">
                💳
              </motion.div>
              <p className="font-baloo font-black text-ds-text text-[16px]">Secure Card Checkout</p>
              <p className="text-gray-400 text-[12px] mt-1">Loading CyberSource payment form...</p>
            </div>
          )}

          {step === "card" && (
            <>
              <h3 className="font-baloo font-black text-ds-text text-[20px] mb-1">{product.name}</h3>
              <div className="flex items-baseline gap-2 mb-4">
                {effectiveAmount !== undefined && effectiveAmount < price.amount && (
                  <span className="line-through text-gray-400 text-[18px] font-bold">{price.formatted}</span>
                )}
                <p className="font-baloo font-black text-yellow-600 text-[28px]">
                  {effectiveAmount !== undefined && effectiveAmount < price.amount
                    ? formatAmount(effectiveAmount, currency)
                    : price.formatted}
                  {product.product_type === "subscription" ? <span className="text-[14px] text-gray-400">/mo</span> : ""}
                </p>
                {effectiveAmount !== undefined && effectiveAmount < price.amount && (
                  <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">PROMO</span>
                )}
              </div>
              <div id="cs-payment-list" className="mb-3" />
              <div id="cs-payment-form" className="min-h-[200px] leaf overflow-hidden" />
              <div className="flex items-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-[var(--ds-brand-primary)]" />
                <p className="text-gray-500 text-[10px]">256-bit SSL encrypted — Visa, Mastercard, Amex</p>
              </div>
              <button onClick={onClose} className="w-full mt-3 py-2.5 leaf border border-ds-border text-gray-400 font-bold text-[12px] hover:bg-gray-50 transition">Cancel</button>
            </>
          )}

          {step === "momo" && (
            <>
              <h3 className="font-baloo font-black text-ds-text text-[20px] mb-1">{product.name}</h3>
              <div className="flex items-baseline gap-2 mb-4">
                {effectiveAmount !== undefined && effectiveAmount < price.amount && (
                  <span className="line-through text-gray-400 text-[18px] font-bold">{price.formatted}</span>
                )}
                <p className="font-baloo font-black text-yellow-600 text-[28px]">
                  {effectiveAmount !== undefined && effectiveAmount < price.amount
                    ? formatAmount(effectiveAmount, currency)
                    : price.formatted}
                  {product.product_type === "subscription" ? <span className="text-[14px] text-gray-400">/mo</span> : ""}
                </p>
                {effectiveAmount !== undefined && effectiveAmount < price.amount && (
                  <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">PROMO</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">MTN Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="078 XXX XXXX"
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
                </div>
                <p className="text-gray-400 text-[10px]">📱 A payment prompt will be sent to your MTN MoMo</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={onClose} className="flex-1 py-3 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
                <motion.button whileTap={m.buttonPress} onClick={handleMomoSubmit}
                  className="flex-1 py-3 leaf bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white font-black text-[14px] shadow-md transition">
                  Pay Now
                </motion.button>
              </div>
            </>
          )}

          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: DURATION.loopBase, repeat: Infinity, ease: EASE.linear }}
                className="w-16 h-16 mx-auto mb-4 text-4xl">⏳</motion.div>
              <p className="font-baloo font-black text-ds-text text-[18px]">
                {provider === "mtn_momo" ? "Waiting for MoMo confirmation..." : "Processing payment..."}
              </p>
              {provider === "mtn_momo" && <p className="text-gray-500 text-[13px] mt-2">Check your phone and enter your PIN</p>}
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="text-6xl mb-4">🎉</motion.div>
              <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="font-baloo font-black text-ds-text text-[24px]">
                Welcome to the Universe!
              </motion.h3>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-gray-500 text-[14px] mt-2">
                Your {product.name} is now active. Taking you to the stories…
              </motion.p>
              <motion.a href="/stories" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="inline-block mt-6 px-8 py-3.5 leaf bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[15px] shadow-xl">
                📖 Go to Stories Now
              </motion.a>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">❌</div>
              <h3 className="font-baloo font-black text-ds-text text-[18px]">Payment Failed</h3>
              <p className="text-red-500 text-[13px] mt-2">{errorMsg}</p>
              <div className="flex gap-3 mt-5 justify-center">
                <button onClick={onClose} className="px-6 py-3 leaf border border-ds-border text-gray-500 font-bold text-[13px] hover:bg-gray-50 transition">Close</button>
                <button onClick={onClose} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Try Again</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

// ── Gift Modal ─────────────────────────────────────────────
function GiftModal({ product, currency, onClose }: {
  product: Product; currency: Currency; onClose: () => void;
}) {
  const m = useThemeMotion();
  const price = getPrice(product, currency);
  const provider = getProviderForCurrency(currency);
  const [step, setStep] = useState<"form" | "pay-loading" | "pay-card" | "pay-momo" | "processing" | "success" | "error">("form");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const giftIdRef = useState<string>("");
  const orderIdRef = useState<string>("");

  const handleGiftPay = async () => {
    if (!recipientEmail.includes("@")) { setErrorMsg("Enter a valid email"); return; }
    setErrorMsg("");
    setStep(provider === "cybersource" ? "pay-loading" : "pay-momo");

    // Create the gift + order via /api/gift
    const res = await fetch("/api/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        currency,
        amount: price.amount,
        paymentProvider: provider,
        recipientEmail,
        recipientName: recipientName.trim() || null,
        message: message.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.orderId) {
      setStep("error"); setErrorMsg(data.error ?? "Failed to create gift order");
      return;
    }
    giftIdRef[1](data.giftId);
    orderIdRef[1](data.orderId);

    if (provider === "mtn_momo") return; // flow continues via handleMomoPay
    // CyberSource: init checkout
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const ctxRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId }),
      });
      const { captureContext, success } = await ctxRes.json();
      if (!success || !captureContext) { setStep("error"); setErrorMsg("Failed to initialize payment"); return; }

      const jwtParts = captureContext.split(".");
      const ctx = JSON.parse(atob(jwtParts[1].replace(/-/g, "+").replace(/_/g, "/")));
      const sdkUrl = ctx.ctx?.[0]?.data?.clientLibrary || ctx.ctx?.[0]?.clientLibrary;
      if (!sdkUrl) { setStep("error"); setErrorMsg("Invalid payment session"); return; }

      const scriptId = "cybersource-up-sdk";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId; script.src = sdkUrl; script.async = true; script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        await new Promise<void>((resolve, reject) => { script.onload = () => resolve(); script.onerror = () => reject(); });
      }

      setStep("pay-card");
      await new Promise(r => setTimeout(r, 200));

      const accept = await (window as any).Accept(captureContext);
      const up = await accept.unifiedPayments(false);
      const transientToken = await up.show({
        containers: { paymentSelection: "#cs-gift-list", paymentScreen: "#cs-gift-form" },
      });
      if (!transientToken) return;

      sessionStorage.setItem("nimipiko_pending_payment", JSON.stringify({ orderId: data.orderId }));
      const completionJwt = await up.complete(transientToken);
      setStep("processing");

      const confirmRes = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: completionJwt, orderId: data.orderId }),
      });
      const confirmResult = await confirmRes.json();
      sessionStorage.removeItem("nimipiko_pending_payment");
      if (confirmResult.success) setStep("success");
      else { setStep("error"); setErrorMsg(confirmResult.message || "Payment was declined"); }
    } catch (err: any) {
      setStep("error"); setErrorMsg(err?.message || "Payment failed");
    }
  };

  const handleMomoPay = async () => {
    setStep("processing");
    try {
      const res = await fetch("/api/payments/mtn-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderIdRef[0], phoneNumber: phone, amount: price.amount }),
      });
      const result = await res.json();
      if (result.success) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const s = await fetch(`/api/payments/mtn-momo?orderId=${orderIdRef[0]}&referenceId=${result.referenceId}`);
          const d = await s.json();
          if (d.status === "completed") { setStep("success"); return; }
          if (d.status === "failed") { setStep("error"); setErrorMsg(d.reason || "Payment declined"); return; }
        }
        setStep("error"); setErrorMsg("Payment timed out");
      } else { setStep("error"); setErrorMsg(result.error || "MoMo request failed"); }
    } catch { setStep("error"); setErrorMsg("Something went wrong"); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 50 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 51 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
          transition={{ ...SPRING.dialog }}
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-ds-border shadow-ds-card p-6 pb-8 sm:pb-6 sm:mx-4">

          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

          {step === "form" && (
            <>
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">🎁</div>
                <h3 className="font-baloo font-black text-ds-text text-[22px]">Gift Nimipiko Club</h3>
                <p className="text-gray-500 text-[13px] mt-1">{price.formatted}/{billingAnnual(product) ? "year" : "month"} · sent to someone you love</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">Recipient email *</label>
                  <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">Recipient name (optional)</label>
                  <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    placeholder="Emma"
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">Personal message (optional)</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Happy birthday! I hope your child loves exploring these stories..."
                    rows={3}
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400 resize-none" />
                </div>
              </div>
              {errorMsg && <p className="text-red-500 text-[12px] mt-2">{errorMsg}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={onClose} className="flex-1 py-3 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
                <motion.button whileTap={m.buttonPress} onClick={handleGiftPay}
                  className="flex-1 py-3 leaf bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[14px] shadow-md">
                  {provider === "mtn_momo" ? "Continue with MoMo" : `Pay ${price.formatted}`}
                </motion.button>
              </div>
            </>
          )}

          {step === "pay-loading" && (
            <div className="text-center py-8">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                className="text-5xl mb-4">🎁</motion.div>
              <p className="font-baloo font-black text-ds-text text-[16px]">Preparing gift checkout...</p>
            </div>
          )}

          {step === "pay-card" && (
            <>
              <h3 className="font-baloo font-black text-ds-text text-[20px] mb-1">Gift · {product.name}</h3>
              <p className="font-baloo font-black text-yellow-600 text-[28px] mb-4">{price.formatted}</p>
              <p className="text-gray-400 text-[12px] mb-3">🎁 Will be sent to <strong>{recipientEmail}</strong></p>
              <div id="cs-gift-list" className="mb-3" />
              <div id="cs-gift-form" className="min-h-[200px] leaf overflow-hidden" />
              <div className="flex items-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-[var(--ds-brand-primary)]" />
                <p className="text-gray-500 text-[10px]">256-bit SSL encrypted — Visa, Mastercard, Amex</p>
              </div>
              <button onClick={onClose} className="w-full mt-3 py-2.5 leaf border border-ds-border text-gray-400 font-bold text-[12px] hover:bg-gray-50 transition">Cancel</button>
            </>
          )}

          {step === "pay-momo" && (
            <>
              <h3 className="font-baloo font-black text-ds-text text-[20px] mb-1">Gift · {product.name}</h3>
              <p className="font-baloo font-black text-yellow-600 text-[28px] mb-2">{price.formatted}</p>
              <p className="text-gray-400 text-[12px] mb-4">🎁 Will be sent to <strong>{recipientEmail}</strong></p>
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">Your MTN Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="078 XXX XXXX"
                  className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={onClose} className="flex-1 py-3 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
                <motion.button whileTap={m.buttonPress} onClick={handleMomoPay}
                  className="flex-1 py-3 leaf bg-[var(--nimi-green)] text-white font-black text-[14px] shadow-md">
                  Pay Now
                </motion.button>
              </div>
            </>
          )}

          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="text-4xl mx-auto mb-4 w-fit">⏳</motion.div>
              <p className="font-baloo font-black text-ds-text text-[18px]">Processing payment...</p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="text-6xl mb-4">🎁</motion.div>
              <h3 className="font-baloo font-black text-ds-text text-[24px]">Gift sent!</h3>
              <p className="text-gray-500 text-[14px] mt-2">
                {recipientEmail} will receive an email with a link to claim their Nimipiko Club.
              </p>
              <button onClick={onClose}
                className="mt-6 px-8 py-3.5 leaf bg-[var(--nimi-green)] text-white font-black text-[15px] shadow-md">
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <h3 className="font-baloo font-black text-ds-text text-[18px]">Payment Failed</h3>
              <p className="text-red-500 text-[13px] mt-2">{errorMsg}</p>
              <div className="flex gap-3 mt-5 justify-center">
                <button onClick={onClose} className="px-6 py-3 leaf border border-ds-border text-gray-500 font-bold text-[13px] hover:bg-gray-50 transition">Close</button>
                <button onClick={() => setStep("form")} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Try Again</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

function billingAnnual(product: Product) {
  return (product as any).billing_interval === "year";
}
