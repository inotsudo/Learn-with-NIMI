"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION, EASE, SPRING } from "@/lib/design-system/motion";
import supabase from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { getPrice } from "@/lib/payments/types";
import type { Product, Currency } from "@/lib/payments/types";

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "RWF") return `${Math.round(amount).toLocaleString()} RWF`;
  return `$${amount.toFixed(2)}`;
}

type Step = "choose" | "loading" | "card" | "momo" | "processing" | "success" | "error";
type ActiveProvider = "cybersource" | "mtn_momo";

interface Props {
  product: Product;
  currency: Currency;
  effectiveAmount?: number;
  discountCodeId?: string;
  onClose: () => void;
}

export default function PricingPaymentModal({ product, currency, effectiveAmount, discountCodeId, onClose }: Props) {
  const m = useThemeMotion();
  const price = getPrice(product, currency);
  const chargeAmount = effectiveAmount ?? price.amount;
  const isRwanda = currency === "RWF";

  // Rwanda users pick their method; everyone else goes straight to CyberSource card.
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(
    isRwanda ? null : "cybersource"
  );
  const [step, setStep] = useState<Step>(isRwanda ? "choose" : "loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [countdown, setCountdown] = useState(3);
  const momoAbort = useRef(false);
  const pendingCsOrderId = useRef<string | null>(null);

  // Countdown → redirect on success
  useEffect(() => {
    if (step !== "success") return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); window.location.href = "/stories"; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);


  // CyberSource card flow — triggers when provider is set to "cybersource"
  useEffect(() => {
    if (activeProvider !== "cybersource") return;
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/loginpage"; return; }

        // Send currency as-is (RWF for Rwanda); the server converts to USD for CyberSource.
        const orderRes = await authedFetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id, currency, paymentProvider: "cybersource",
            ...(discountCodeId ? { discountCodeId } : {}),
          }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData.orderId || cancelled) {
          if (!cancelled) { setStep("error"); setErrorMsg(orderData.error ?? "Failed to create order"); }
          return;
        }
        const orderId = orderData.orderId as string;
        pendingCsOrderId.current = orderId;

        const ctxRes = await authedFetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
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
          script.id = scriptId; script.src = sdkUrl; script.async = true;
          document.head.appendChild(script);
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("SDK load failed"));
          });
        }

        if (cancelled) return;

        // Poll up to 3 s for Accept to be available (SecureAcceptance.js loads async after the primary script).
        for (let i = 0; i < 30; i++) {
          if (typeof (window as any).Accept === "function") break;
          await new Promise(r => setTimeout(r, 100));
        }
        if (typeof (window as any).Accept !== "function") {
          setStep("error");
          setErrorMsg("Payment SDK failed to initialize — please reload and try again");
          return;
        }

        // Initialize BEFORE switching to "card" step — up.show() needs the containers in the DOM.
        const accept = await (window as any).Accept(captureContext);
        const up = await accept.unifiedPayments(false);

        if (cancelled) return;
        // Now render the card containers, then wait one tick for React to flush.
        setStep("card");
        await new Promise(r => setTimeout(r, 50));

        const transientToken = await up.show({
          containers: { paymentSelection: "#cs-payment-list", paymentScreen: "#cs-payment-form" },
        });

        if (!transientToken || cancelled) return;

        sessionStorage.setItem("nimipiko_pending_payment", JSON.stringify({ orderId }));
        const completionJwt = await up.complete(transientToken);
        setStep("processing");

        const confirmRes = await authedFetch("/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: completionJwt, orderId }),
        });
        const confirmResult = await confirmRes.json();
        sessionStorage.removeItem("nimipiko_pending_payment");

        if (confirmResult.success) {
          pendingCsOrderId.current = null;
          setStep("success");
        } else { setStep("error"); setErrorMsg(confirmResult.message || "Payment was declined"); }
      } catch (err: any) {
        if (!cancelled) { setStep("error"); setErrorMsg(err?.message || "Payment failed"); }
      }
    };

    init();
    return () => {
      cancelled = true;
      momoAbort.current = true;
      const oid = pendingCsOrderId.current;
      if (oid) {
        pendingCsOrderId.current = null;
        void fetch(`/api/orders/${oid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        }).catch(() => {});
      }
    };
  }, [activeProvider, product.id, currency, chargeAmount]);

  const handlePickCard = () => {
    setActiveProvider("cybersource");
    setStep("loading");
  };

  const handlePickMomo = () => {
    setActiveProvider("mtn_momo");
    setStep("momo");
  };

  const handleMomoSubmit = async () => {
    const cleanPhone = phone.replace(/[\s\-]/g, "");
    if (cleanPhone.length < 9) { setErrorMsg("Enter a valid MTN phone number"); return; }
    setErrorMsg("");

    setStep("processing");
    momoAbort.current = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const orderRes = await authedFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id, currency, paymentProvider: "mtn_momo",
          ...(discountCodeId ? { discountCodeId } : {}),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) { setStep("error"); setErrorMsg(orderData.error ?? "Failed to create order"); return; }
      const momoOrderId = orderData.orderId as string;

      const res = await authedFetch("/api/payments/mtn-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: momoOrderId, phoneNumber: cleanPhone }),
      });
      const result = await res.json();
      if (result.success) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 5000));
          if (momoAbort.current) return;
          const s = await authedFetch(`/api/payments/mtn-momo?orderId=${momoOrderId}&referenceId=${result.referenceId}`);
          const d = await s.json();
          if (momoAbort.current) return;
          if (d.status === "completed") { setStep("success"); return; }
          if (d.status === "failed") { setStep("error"); setErrorMsg(d.reason || "Payment declined"); return; }
        }
        if (!momoAbort.current) { setStep("error"); setErrorMsg("Payment timed out — please try again"); }
      } else { setStep("error"); setErrorMsg(result.error || "MoMo request failed"); }
    } catch { if (!momoAbort.current) { setStep("error"); setErrorMsg("Something went wrong"); } }
  };

  const priceDisplay = effectiveAmount !== undefined && effectiveAmount < price.amount
    ? formatAmount(effectiveAmount, currency)
    : price.formatted;
  const hasDiscount = effectiveAmount !== undefined && effectiveAmount < price.amount;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 50 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 51 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
          transition={{ ...SPRING.dialog }}
          className="w-full sm:max-w-md bg-ds-card rounded-t-3xl sm:rounded-3xl border border-ds-border shadow-ds-card p-6 pb-8 sm:pb-6 sm:mx-4">

          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

          {/* ── Method picker (Rwanda only) ───────────────────────────── */}
          {step === "choose" && (
            <>
              <div className="text-center mb-5">
                <h3 className="font-baloo font-black text-ds-text text-[20px] mb-1">{product.name}</h3>
                <div className="flex items-baseline justify-center gap-2">
                  {hasDiscount && <span className="line-through text-gray-400 text-[16px] font-bold">{price.formatted}</span>}
                  <p className="font-baloo font-black text-yellow-600 text-[26px]">{priceDisplay}</p>
                  {hasDiscount && <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">PROMO</span>}
                </div>
              </div>
              <p className="text-[11px] font-bold text-gray-500 text-center mb-3 uppercase tracking-wide">Choose payment method</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.button whileTap={m.buttonPress} onClick={handlePickMomo}
                  className="flex flex-col items-center gap-2 p-4 leaf border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition text-center">
                  <span className="text-3xl">📱</span>
                  <span className="font-baloo font-black text-ds-text text-[14px]">MTN MoMo</span>
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">Pay with mobile money</span>
                </motion.button>
                <motion.button whileTap={m.buttonPress} onClick={handlePickCard}
                  className="flex flex-col items-center gap-2 p-4 leaf border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-center">
                  <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <span className="font-baloo font-black text-ds-text text-[14px]">Debit / Card</span>
                  {isRwanda && <span className="text-gray-400 text-[10px]">USD equivalent</span>}
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">Visa, Mastercard, Amex</span>
                </motion.button>
              </div>
              <button onClick={onClose} className="w-full py-2.5 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
            </>
          )}

          {/* ── CyberSource loading ───────────────────────────────────── */}
          {step === "loading" && (
            <div className="text-center py-8">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: DURATION.loopFast, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--nimi-green)] flex items-center justify-center text-3xl shadow-xl">
                💳
              </motion.div>
              <p className="font-baloo font-black text-ds-text text-[16px]">Secure Card Checkout</p>
              <p className="text-gray-400 text-[12px] mt-1">Loading payment form...</p>
            </div>
          )}

          {/* ── Card form ────────────────────────────────────────────── */}
          {step === "card" && (
            <>
              <div className="flex items-center gap-2 mb-3">
                {isRwanda && (
                  <button onClick={() => { setActiveProvider(null); setStep("choose"); }}
                    className="text-gray-400 hover:text-ds-text transition text-[12px] font-bold">← Back</button>
                )}
                <h3 className="font-baloo font-black text-ds-text text-[20px]">{product.name}</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                {hasDiscount && <span className="line-through text-gray-400 text-[18px] font-bold">{price.formatted}</span>}
                <p className="font-baloo font-black text-yellow-600 text-[28px]">
                  {priceDisplay}
                  {product.product_type === "subscription" ? <span className="text-[14px] text-gray-400">/mo</span> : ""}
                </p>
                {hasDiscount && <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">PROMO</span>}
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

          {/* ── MoMo phone entry ─────────────────────────────────────── */}
          {step === "momo" && (
            <>
              <div className="flex items-center gap-2 mb-3">
                {isRwanda && (
                  <button onClick={() => { setActiveProvider(null); setStep("choose"); }}
                    className="text-gray-400 hover:text-ds-text transition text-[12px] font-bold">← Back</button>
                )}
                <h3 className="font-baloo font-black text-ds-text text-[20px]">{product.name}</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                {hasDiscount && <span className="line-through text-gray-400 text-[18px] font-bold">{price.formatted}</span>}
                <p className="font-baloo font-black text-yellow-600 text-[28px]">
                  {priceDisplay}
                  {product.product_type === "subscription" ? <span className="text-[14px] text-gray-400">/mo</span> : ""}
                </p>
                {hasDiscount && <span className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">PROMO</span>}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">MTN Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="078 XXX XXXX"
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
                </div>
                <p className="text-gray-400 text-[10px]">📱 A payment prompt will be sent to your MTN MoMo</p>
                {errorMsg && <p className="text-red-500 text-[11px] mt-1 font-semibold">{errorMsg}</p>}
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

          {/* ── Processing ───────────────────────────────────────────── */}
          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: DURATION.loopBase, repeat: Infinity, ease: EASE.linear }}
                className="w-16 h-16 mx-auto mb-4 text-4xl">⏳</motion.div>
              <p className="font-baloo font-black text-ds-text text-[18px]">
                {activeProvider === "mtn_momo" ? "Waiting for MoMo confirmation..." : "Processing payment..."}
              </p>
              {activeProvider === "mtn_momo" && (
                <>
                  <p className="text-gray-500 text-[13px] mt-2">Check your phone and enter your PIN</p>
                  <button
                    onClick={() => { momoAbort.current = true; setStep("momo"); setErrorMsg(""); }}
                    className="mt-5 px-5 py-2 leaf border border-ds-border text-gray-400 font-bold text-[12px] hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Success ──────────────────────────────────────────────── */}
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
                Your {product.name} is now active.
              </motion.p>
              <motion.a href="/stories" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="inline-flex items-center gap-2 mt-6 px-8 py-3.5 leaf bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[15px] shadow-xl">
                📖 Go to Stories
                <span className="bg-white/30 rounded-full text-[11px] font-black px-2 py-0.5">{countdown}s</span>
              </motion.a>
            </div>
          )}

          {/* ── Error ────────────────────────────────────────────────── */}
          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">❌</div>
              <h3 className="font-baloo font-black text-ds-text text-[18px]">Payment Failed</h3>
              <p className="text-red-500 text-[13px] mt-2">{errorMsg}</p>
              <div className="flex flex-col gap-3 mt-5 items-center">
                <div className="flex gap-3">
                  <button onClick={onClose} className="px-6 py-3 leaf border border-ds-border text-gray-500 font-bold text-[13px] hover:bg-gray-50 transition">Close</button>
                  {activeProvider === "mtn_momo"
                    ? <button onClick={() => { setErrorMsg(""); setStep("momo"); }} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Try Again</button>
                    : isRwanda
                      ? <button onClick={() => { setActiveProvider(null); setStep("choose"); }} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Try Different Method</button>
                      : <button onClick={onClose} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Close & Reopen to Retry</button>
                  }
                </div>
                {activeProvider === "cybersource" && !isRwanda && (
                  <p className="text-gray-400 text-[10px] text-center">Card sessions can't be resumed — close this dialog and click Subscribe again.</p>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </>
  );
}
