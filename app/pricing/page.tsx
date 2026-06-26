"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Sparkles, Shield, CreditCard, Phone, Star } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MagicBackground from "@/components/magic/MagicBackground";
import MagicLoader from "@/components/magic/MagicLoader";
import supabase from "@/lib/supabaseClient";
import { getProducts, createOrder } from "@/lib/payments/products";
import { getPrice, getProviderForCurrency } from "@/lib/payments/types";
import type { Product, Currency } from "@/lib/payments/types";

const FEATURE_LABELS: Record<string, string> = {
  all_stories: "All Interactive Stories",
  all_languages: "3 Languages (EN/FR/RW)",
  nimi_ai: "Nimi AI Learning Companion",
  challenges: "Champion Challenges",
  community: "Nimi Community Access",
  unlimited_updates: "Unlimited New Content",
  coloring_books: "Coloring Book Activities",
  songs: "Original Songs & Karaoke",
  certificates: "Achievement Certificates",
  personalized_story: "Personalized Hero Story",
  child_photo_in_book: "Child's Photo in the Book",
  personalized_pdf: "Downloadable PDF Keepsake",
  champion_certificate: "Champion Certificate",
  keepsake_memory: "A Memory That Lasts Forever",
};

const CURRENCIES: { code: Currency; label: string; flag: string }[] = [
  { code: "USD", label: "USD", flag: "🇺🇸" },
  { code: "RWF", label: "RWF", flag: "🇷🇼" },
];

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [showPayment, setShowPayment] = useState<Product | null>(null);

  useEffect(() => {
    void (async () => {
      const p = await getProducts();
      setProducts(p);
      setLoading(false);
    })();
  }, []);

  const handlePurchase = useCallback((product: Product) => {
    setShowPayment(product);
  }, []);

  if (loading) return <AppShell><MagicLoader variant="shop" /></AppShell>;

  const club = products.find(p => p.slug === "nimipiko-club");
  const masterpiece = products.find(p => p.slug === "masterpiece");

  return (
    <AppShell>
      <div className="min-h-screen theme-bg relative">
        <MagicBackground variant="market" />
        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-28 w-full">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-2xl shadow-orange-500/30">
              👑
            </motion.div>
            <h1 className="font-baloo font-black text-[32px] sm:text-[42px] text-white leading-tight">
              Join the Nimipiko Universe
            </h1>
            <p className="theme-text-muted text-[15px] font-nunito mt-2 max-w-lg mx-auto">
              Every story is a complete learning adventure — reading, singing, creating, and growing together.
            </p>

            {/* Currency toggle */}
            <div className="flex justify-center mt-6 gap-2">
              {CURRENCIES.map(c => (
                <button key={c.code} onClick={() => setCurrency(c.code)}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full font-baloo font-bold text-[14px] transition ${
                    currency === c.code
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg"
                      : "theme-card border theme-border text-white/50 hover:text-white/70"
                  }`}>
                  <span>{c.flag}</span> {c.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Two pillars side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ═══ PILLAR 1: Nimipiko Club ═══ */}
            {club && (() => {
              const price = getPrice(club, currency);
              const provider = getProviderForCurrency(currency);
              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative rounded-[28px] overflow-hidden border-2 border-yellow-400/30 shadow-2xl shadow-yellow-500/10"
                  style={{ backgroundColor: "var(--theme-card)" }}>

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
                        <p className="text-white/70 text-[12px] font-bold">Monthly Membership</p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="px-6 pt-5 pb-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-baloo font-black text-white text-[40px]">{price.formatted}</span>
                      <span className="theme-text-faint text-[15px] font-bold">/month</span>
                    </div>
                    <p className="theme-text-muted text-[13px] mt-1">Full access to everything. Cancel anytime.</p>
                  </div>

                  {/* Features */}
                  <div className="px-6 pb-5 space-y-2.5">
                    {(club.features as string[]).map(f => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4.5 h-4.5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-white text-[13px]">{FEATURE_LABELS[f] ?? f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handlePurchase(club)}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[16px] shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                      {provider === "mtn_momo" ? <><Phone className="w-5 h-5" /> Subscribe with MoMo</>
                        : <><CreditCard className="w-5 h-5" /> Subscribe Now</>}
                    </motion.button>
                    <p className="text-center theme-text-faint text-[10px] mt-2">
                      {provider === "mtn_momo" ? "📱 MTN Mobile Money Rwanda" : "🔒 Visa, Mastercard & Amex"}
                    </p>
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
                  className="relative rounded-[28px] overflow-hidden border-2 border-white/10"
                  style={{ backgroundColor: "var(--theme-card)" }}>

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
                      <span className="font-baloo font-black text-white text-[40px]">{price.formatted}</span>
                      <span className="theme-text-faint text-[15px] font-bold">one-time</span>
                    </div>
                    <p className="theme-text-muted text-[13px] mt-1">A personalized memory your child will treasure.</p>
                  </div>

                  {/* Features */}
                  <div className="px-6 pb-5 space-y-2.5">
                    {(masterpiece.features as string[]).map(f => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4.5 h-4.5 text-yellow-400 shrink-0 mt-0.5" />
                        <span className="text-white text-[13px]">{FEATURE_LABELS[f] ?? f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handlePurchase(masterpiece)}
                      className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-black text-[16px] hover:bg-white/15 transition flex items-center justify-center gap-2">
                      {provider === "mtn_momo" ? <><Phone className="w-5 h-5" /> Buy with MoMo</>
                        : <><CreditCard className="w-5 h-5" /> Buy Masterpiece</>}
                    </motion.button>
                    <p className="text-center theme-text-faint text-[10px] mt-2">
                      {provider === "mtn_momo" ? "📱 MTN Mobile Money Rwanda" : "🔒 Visa, Mastercard & Amex"}
                    </p>
                  </div>
                </motion.div>
              );
            })()}
          </div>

          {/* Trust + revenue goal hint */}
          <div className="flex justify-center gap-6 mt-10 flex-wrap">
            {[
              { icon: <Shield className="w-5 h-5" />, label: "Secure Payments" },
              { icon: <span className="text-lg">🌍</span>, label: "3 Languages" },
              { icon: <span className="text-lg">👨‍👩‍👧</span>, label: "Family Safe" },
              { icon: <span className="text-lg">🏫</span>, label: "School Licensing Coming Soon" },
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
  const [phone, setPhone] = useState("");

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
          amount: price.amount,
          paymentProvider: "cybersource",
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
  }, [provider, product.id, currency, price.amount]);

  const handleMomoSubmit = async () => {
    setStep("processing");
    setErrorMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const order = await createOrder({
        parentId: user.id, productId: product.id, currency,
        amount: price.amount, paymentProvider: "mtn_momo",
      });
      if (!order) { setStep("error"); setErrorMsg("Failed to create order"); return; }

      const res = await fetch("/api/payments/mtn-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, phoneNumber: phone, amount: price.amount }),
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
          transition={{ type: "spring", stiffness: 250, damping: 25 }}
          className="w-full sm:max-w-md theme-card rounded-t-[32px] sm:rounded-[28px] border-t-2 sm:border-2 border-white/15 p-6 pb-8 sm:pb-6 sm:mx-4">

          <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-4 sm:hidden" />

          {step === "loading" && (
            <div className="text-center py-8">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl">
                💳
              </motion.div>
              <p className="font-baloo font-black text-white text-[16px]">Secure Card Checkout</p>
              <p className="theme-text-faint text-[12px] mt-1">Loading CyberSource payment form...</p>
            </div>
          )}

          {step === "card" && (
            <>
              <h3 className="font-baloo font-black text-white text-[20px] mb-1">{product.name}</h3>
              <p className="font-baloo font-black text-yellow-400 text-[28px] mb-4">
                {price.formatted}{product.product_type === "subscription" ? <span className="text-[14px] theme-text-faint">/mo</span> : ""}
              </p>
              <div id="cs-payment-list" className="mb-3" />
              <div id="cs-payment-form" className="min-h-[200px] rounded-xl overflow-hidden" />
              <div className="flex items-center gap-2 mt-3">
                <Shield className="w-4 h-4 text-green-400" />
                <p className="theme-text-faint text-[10px]">256-bit SSL encrypted — Visa, Mastercard, Amex</p>
              </div>
              <button onClick={onClose} className="w-full mt-3 py-2.5 rounded-2xl border border-white/15 text-white/50 font-bold text-[12px]">Cancel</button>
            </>
          )}

          {step === "momo" && (
            <>
              <h3 className="font-baloo font-black text-white text-[20px] mb-1">{product.name}</h3>
              <p className="font-baloo font-black text-yellow-400 text-[28px] mb-4">
                {price.formatted}{product.product_type === "subscription" ? <span className="text-[14px] theme-text-faint">/mo</span> : ""}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold theme-text-muted mb-1 block">MTN Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="078 XXX XXXX"
                    className="w-full theme-card-hover border theme-border rounded-xl px-4 py-3 text-white text-[14px] focus:outline-none bg-transparent" />
                </div>
                <p className="theme-text-faint text-[10px]">📱 A payment prompt will be sent to your MTN MoMo</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/15 text-white/50 font-bold text-[13px]">Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleMomoSubmit}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-[14px] shadow-lg">
                  Pay Now
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
              {provider === "mtn_momo" && <p className="theme-text-muted text-[13px] mt-2">Check your phone and enter your PIN</p>}
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl">✅</motion.div>
              <h3 className="font-baloo font-black text-white text-[22px]">Welcome to the Universe!</h3>
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
