"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Star, Sparkles, Shield, Zap, Heart, Gift, CreditCard, Phone } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MagicBackground from "@/components/magic/MagicBackground";
import MagicLoader from "@/components/magic/MagicLoader";
import supabase from "@/lib/supabaseClient";
import { getProducts } from "@/lib/payments/products";
import { getPrice, getProviderForCurrency } from "@/lib/payments/types";
import type { Product, Currency } from "@/lib/payments/types";
import { createOrder } from "@/lib/payments/products";

const TIER_CONFIG: Record<string, {
  emoji: string; gradient: string; popular?: boolean;
  icon: React.ReactNode; badge?: string;
}> = {
  discovery: { emoji: "🌟", gradient: "from-green-400 to-emerald-500", icon: <Gift className="w-6 h-6" />, badge: "Free" },
  story_pack: { emoji: "📖", gradient: "from-sky-400 to-blue-500", icon: <Star className="w-6 h-6" /> },
  family_bundle: { emoji: "👨‍👩‍👧", gradient: "from-purple-400 to-indigo-500", icon: <Heart className="w-6 h-6" />, popular: true },
  personalized: { emoji: "👑", gradient: "from-yellow-400 to-orange-500", icon: <Crown className="w-6 h-6" />, badge: "Premium" },
  champion_pack: { emoji: "🏆", gradient: "from-pink-400 to-rose-500", icon: <Zap className="w-6 h-6" /> },
  club: { emoji: "🎉", gradient: "from-violet-400 to-purple-600", icon: <Sparkles className="w-6 h-6" />, badge: "Best Value" },
};

const FEATURE_LABELS: Record<string, string> = {
  animated_song: "Animated Song Intro",
  story_preview: "Story Preview",
  character_intro: "Meet the Characters",
  first_challenge: "First Champion Challenge",
  full_story: "Complete Interactive Story",
  audio_narration: "Professional Voice Narration",
  three_languages: "3 Languages (EN/FR/RW)",
  song: "Original Theme Song",
  coloring_book: "Coloring Book Activity",
  vocabulary: "Vocabulary Section",
  champion_challenges: "Champion Challenges",
  multiple_stories: "Multiple Story Adventures",
  multiple_challenges: "Multiple Champion Challenges",
  community_access: "Nimi Community Access",
  extra_content: "Bonus Educational Content",
  everything_in_bundle: "Everything in Family Bundle",
  child_photo_in_story: "Child's Photo in Story",
  personalized_pdf: "Personalized PDF Download",
  champion_certificate: "Champion Certificate",
  treasure_gallery: "Champion Treasure Gallery",
  badges: "Collectible Badges",
  stickers: "Fun Stickers",
  certificates: "Achievement Certificates",
  new_stories: "New Stories Every Month",
  new_songs: "New Songs Every Month",
  new_challenges: "New Challenges",
  new_coloring: "New Coloring Books",
  new_rewards: "New Rewards & Badges",
  community_features: "Community Features",
  future_nimi_ai: "Future Nimi AI Access",
};

const CURRENCIES: { code: Currency; label: string; flag: string }[] = [
  { code: "USD", label: "USD ($)", flag: "🇺🇸" },
  { code: "EUR", label: "EUR (€)", flag: "🇪🇺" },
  { code: "RWF", label: "RWF", flag: "🇷🇼" },
];

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState<Product | null>(null);

  useEffect(() => {
    void (async () => {
      const p = await getProducts();
      setProducts(p);
      setLoading(false);
    })();
  }, []);

  const handlePurchase = useCallback(async (product: Product) => {
    if (product.tier === "discovery") {
      setPurchasing(product.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }
      await createOrder({
        parentId: user.id,
        productId: product.id,
        currency,
        amount: 0,
        paymentProvider: "free",
      });
      setPurchasing(null);
      alert("Welcome to Nimipiko! Your Discovery access is now active.");
      return;
    }
    setShowPayment(product);
  }, [currency]);

  if (loading) return <AppShell><MagicLoader variant="shop" /></AppShell>;

  return (
    <AppShell>
      <div className="min-h-screen theme-bg relative">
        <MagicBackground variant="market" />
        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 w-full">

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-baloo font-black text-[32px] sm:text-[42px] text-white leading-tight">
                The Nimipiko Learning Universe
              </h1>
              <p className="theme-text-muted text-[15px] font-nunito mt-2 max-w-xl mx-auto">
                Every story is a complete learning adventure — reading, singing, creating, exploring, and growing together.
              </p>
            </motion.div>

            {/* Currency switcher */}
            <div className="flex justify-center mt-5 gap-2">
              {CURRENCIES.map(c => (
                <button key={c.code} onClick={() => setCurrency(c.code)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-baloo font-bold text-[13px] transition ${
                    currency === c.code
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg"
                      : "theme-card border theme-border text-white/50 hover:text-white/70"
                  }`}>
                  <span>{c.flag}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product, i) => {
              const config = TIER_CONFIG[product.tier] ?? TIER_CONFIG.story_pack;
              const price = getPrice(product, currency);
              const provider = getProviderForCurrency(currency);

              return (
                <motion.div key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 120 }}
                  className={`relative rounded-[24px] overflow-hidden border-2 transition-all ${
                    config.popular ? "border-yellow-400/40 shadow-xl shadow-yellow-500/10" : "border-white/10"
                  }`}
                  style={{ backgroundColor: "var(--theme-card)" }}>

                  {/* Popular badge */}
                  {config.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">
                      MOST POPULAR
                    </div>
                  )}
                  {config.badge && !config.popular && (
                    <div className="absolute top-0 right-0 bg-white/10 text-white/70 text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                      {config.badge}
                    </div>
                  )}

                  {/* Header gradient */}
                  <div className={`bg-gradient-to-r ${config.gradient} p-5 pb-4`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                        {config.icon}
                      </div>
                      <div>
                        <h3 className="font-baloo font-black text-white text-[20px] leading-tight">{product.name}</h3>
                        {product.product_type === "subscription" && (
                          <p className="text-white/70 text-[11px] font-bold">per month</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex items-baseline gap-1">
                      {price.amount === 0 ? (
                        <span className="font-baloo font-black text-green-400 text-[32px]">Free</span>
                      ) : (
                        <>
                          <span className="font-baloo font-black text-white text-[32px]">{price.formatted}</span>
                          {product.product_type === "subscription" && (
                            <span className="theme-text-faint text-[13px] font-bold">/mo</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="theme-text-faint text-[12px] mt-1">{product.description}</p>
                  </div>

                  {/* Features */}
                  <div className="px-5 pb-4 space-y-2">
                    {(product.features as string[]).map(feat => (
                      <div key={feat} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span className="theme-text text-[12px]">{FEATURE_LABELS[feat] ?? feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-5">
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handlePurchase(product)}
                      disabled={purchasing === product.id}
                      className={`w-full py-3 rounded-2xl font-baloo font-black text-[15px] transition-all flex items-center justify-center gap-2 ${
                        price.amount === 0
                          ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/20"
                          : config.popular
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "bg-white/10 text-white border border-white/15 hover:bg-white/15"
                      } disabled:opacity-50`}>
                      {purchasing === product.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : price.amount === 0 ? (
                        <>Start Free</>
                      ) : provider === "mtn_momo" ? (
                        <><Phone className="w-4 h-4" /> Pay with MTN MoMo</>
                      ) : (
                        <><CreditCard className="w-4 h-4" /> Pay with Card</>
                      )}
                    </motion.button>
                    {provider === "cybersource" && price.amount > 0 && (
                      <p className="text-center theme-text-faint text-[10px] mt-2 flex items-center justify-center gap-1">
                        <Shield className="w-3 h-3" /> Visa, Mastercard & Amex accepted
                      </p>
                    )}
                    {provider === "mtn_momo" && price.amount > 0 && (
                      <p className="text-center theme-text-faint text-[10px] mt-2">
                        📱 MTN Mobile Money Rwanda
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="flex justify-center gap-6 mt-8 flex-wrap">
            {[
              { icon: <Shield className="w-5 h-5" />, label: "Secure Payments" },
              { icon: <span className="text-lg">🔒</span>, label: "SSL Encrypted" },
              { icon: <span className="text-lg">👨‍👩‍👧</span>, label: "Family Safe" },
              { icon: <span className="text-lg">🌍</span>, label: "3 Languages" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 theme-text-faint text-[11px] font-bold">
                {b.icon} {b.label}
              </div>
            ))}
          </div>
        </main>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPayment && (
            <PaymentModal
              product={showPayment}
              currency={currency}
              onClose={() => setShowPayment(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// ── Payment Modal ──────────────────────────────────────────
function PaymentModal({ product, currency, onClose }: {
  product: Product; currency: Currency; onClose: () => void;
}) {
  const price = getPrice(product, currency);
  const provider = getProviderForCurrency(currency);
  const [step, setStep] = useState<"loading" | "card" | "momo" | "processing" | "success" | "error">(
    provider === "cybersource" ? "loading" : "momo"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState("");

  // MoMo fields
  const [phone, setPhone] = useState("");

  // CyberSource Unified Payments
  useEffect(() => {
    if (provider !== "cybersource") return;
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/loginpage"; return; }

        // Create order first
        const order = await createOrder({
          parentId: user.id,
          productId: product.id,
          currency,
          amount: price.amount,
          paymentProvider: "cybersource",
        });
        if (!order || cancelled) { if (!cancelled) { setStep("error"); setErrorMsg("Failed to create order"); } return; }
        setOrderId(order.id);

        // Get capture context
        const ctxRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });
        const { captureContext, error } = await ctxRes.json();
        if (error || !captureContext || cancelled) {
          if (!cancelled) { setStep("error"); setErrorMsg("Failed to initialize payment"); }
          return;
        }

        // Decode JWT to get SDK URL
        const jwtParts = captureContext.split(".");
        const ctx = JSON.parse(atob(jwtParts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const sdkUrl = ctx.ctx?.[0]?.data?.clientLibrary || ctx.ctx?.[0]?.clientLibrary;
        if (!sdkUrl || cancelled) {
          if (!cancelled) { setStep("error"); setErrorMsg("Invalid payment session"); }
          return;
        }

        // Load CyberSource SDK
        const scriptId = "cybersource-up-sdk";
        if (!document.getElementById(scriptId)) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = sdkUrl;
          script.async = true;
          document.head.appendChild(script);
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("SDK load failed"));
          });
        }

        if (cancelled) return;
        setStep("card");

        // Wait for containers to render
        await new Promise(r => setTimeout(r, 200));

        // Initialize Unified Payments
        const accept = await (window as any).Accept(captureContext);
        const up = await accept.unifiedPayments(false);

        const transientToken = await up.show({
          containers: {
            paymentSelection: "#cs-payment-list",
            paymentScreen: "#cs-payment-form",
          },
        });

        if (cancelled) return;

        // Store for crash recovery
        sessionStorage.setItem("nimipiko_pending_payment", JSON.stringify({ orderId: order.id }));

        // Complete payment — keep "card" step visible so CyberSource's
        // 3D Secure / Purchase Authentication popup isn't covered
        const completionJwt = await up.complete(transientToken);

        // Only show our processing overlay AFTER CyberSource finishes
        setStep("processing");

        // Confirm server-side
        const confirmRes = await fetch("/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: completionJwt, orderId: order.id }),
        });
        const confirmResult = await confirmRes.json();

        sessionStorage.removeItem("nimipiko_pending_payment");

        if (confirmResult.success) {
          setStep("success");
        } else {
          setStep("error");
          setErrorMsg(confirmResult.message || "Payment was declined");
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[Unified Payments]", err);
          setStep("error");
          setErrorMsg(err?.message || "Payment failed");
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [provider, product.id, currency, price.amount]);

  const handleMomoSubmit = async () => {
    setStep("processing");
    setErrorMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const order = await createOrder({
        parentId: user.id,
        productId: product.id,
        currency,
        amount: price.amount,
        paymentProvider: "mtn_momo",
      });
      if (!order) { setStep("error"); setErrorMsg("Failed to create order"); return; }

      const res = await fetch("/api/payments/mtn-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, phoneNumber: phone, amount: price.amount }),
      });
      const result = await res.json();
      if (result.success) {
        pollMomoStatus(order.id, result.referenceId);
      } else { setStep("error"); setErrorMsg(result.error || "MoMo request failed"); }
    } catch (err) {
      setStep("error"); setErrorMsg("Something went wrong");
    }
  };

  const pollMomoStatus = async (oid: string, ref: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/payments/mtn-momo?orderId=${oid}&referenceId=${ref}`);
        const data = await res.json();
        if (data.status === "completed") { setStep("success"); return; }
        if (data.status === "failed") { setStep("error"); setErrorMsg(data.reason || "Payment was declined"); return; }
      } catch { /* continue polling */ }
    }
    setStep("error"); setErrorMsg("Payment timed out. Check your phone and try again.");
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 50 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 51 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 250, damping: 25 }}
          className="w-full sm:max-w-md theme-card rounded-t-[32px] sm:rounded-[28px] border-t-2 sm:border-2 border-white/15 p-6 pb-8 sm:pb-6 sm:mx-4">

          <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4 sm:hidden" />

          {/* CyberSource loading */}
          {step === "loading" && (
            <div className="text-center py-8">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl">
                💳
              </motion.div>
              <p className="font-baloo font-black text-white text-[16px]">Secure Card Checkout</p>
              <p className="theme-text-faint text-[12px] mt-1">Loading CyberSource payment form...</p>
              <div className="flex justify-center gap-1.5 mt-4">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--theme-accent)" }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </div>
          )}

          {/* CyberSource Unified Payments UI — hosted by CyberSource */}
          {step === "card" && (
            <>
              <h3 className="font-baloo font-black text-white text-[20px] mb-1">{product.name}</h3>
              <p className="font-baloo font-black text-yellow-400 text-[28px] mb-4">{price.formatted}</p>

              <div id="cs-payment-list" className="mb-3" />
              <div id="cs-payment-form" className="min-h-[200px] rounded-xl overflow-hidden" />

              <div className="flex items-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-green-400" />
                <p className="theme-text-faint text-[10px]">256-bit SSL encrypted — Visa, Mastercard, Amex</p>
              </div>
              <button onClick={onClose} className="w-full mt-3 py-2.5 rounded-2xl border border-white/15 text-white/50 font-bold text-[12px] hover:bg-white/5 transition">
                Cancel
              </button>
            </>
          )}

          {/* MTN MoMo form */}
          {step === "momo" && (
            <>
              <h3 className="font-baloo font-black text-white text-[20px] mb-1">{product.name}</h3>
              <p className="font-baloo font-black text-yellow-400 text-[28px] mb-4">{price.formatted}</p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold theme-text-muted mb-1 block">MTN Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="078 XXX XXXX"
                    className="w-full theme-card-hover border theme-border rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none bg-transparent" />
                </div>
                <p className="theme-text-faint text-[10px]">📱 A payment prompt will be sent to your MTN MoMo. Enter your PIN to confirm.</p>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/15 text-white/50 font-bold text-[13px] hover:bg-white/5 transition">
                  Cancel
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleMomoSubmit}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-[14px] shadow-lg">
                  Send Payment Request
                </motion.button>
              </div>
            </>
          )}

          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4 text-4xl">⏳</motion.div>
              <p className="font-baloo font-black text-white text-[18px]">
                {provider === "mtn_momo" ? "Waiting for MoMo confirmation..." : "Processing payment..."}
              </p>
              {provider === "mtn_momo" && (
                <p className="theme-text-muted text-[13px] mt-2">Check your phone and enter your PIN</p>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl">
                ✅
              </motion.div>
              <h3 className="font-baloo font-black text-white text-[22px]">Payment Successful!</h3>
              <p className="theme-text-muted text-[14px] mt-2">Your {product.name} is now active. Enjoy the adventure!</p>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
                className="mt-5 px-8 py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[14px]">
                Start Exploring
              </motion.button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">❌</div>
              <h3 className="font-baloo font-black text-white text-[18px]">Payment Failed</h3>
              <p className="text-red-300 text-[13px] mt-2">{errorMsg}</p>
              <div className="flex gap-3 mt-5 justify-center">
                <button onClick={onClose} className="px-6 py-3 rounded-2xl border border-white/15 text-white/50 font-bold text-[13px]">Close</button>
                <button onClick={onClose} className="px-6 py-3 rounded-2xl bg-white/10 text-white font-bold text-[13px]">Try Again</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
