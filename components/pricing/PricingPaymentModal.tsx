"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard, Phone } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION, EASE, SPRING } from "@/lib/design-system/motion";
import supabase from "@/lib/supabaseClient";
import { getPrice, getProviderForCurrency } from "@/lib/payments/types";
import type { Product, Currency } from "@/lib/payments/types";

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "RWF") return `${Math.round(amount).toLocaleString()} RWF`;
  return `$${amount.toFixed(2)}`;
}

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
  const provider = getProviderForCurrency(currency);
  const [step, setStep] = useState<"loading" | "card" | "momo" | "processing" | "success" | "error">(
    provider === "cybersource" ? "loading" : "momo"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [momoAttempt, setMomoAttempt] = useState(0);
  const [momoElapsed, setMomoElapsed] = useState(0);
  const momoAbort = useRef(false);
  // Tracks the pending CS order so we can cancel it if the modal closes before payment
  const pendingCsOrderId = useRef<string | null>(null);

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

  // Elapsed-time counter shown while MoMo is processing
  useEffect(() => {
    if (step !== "processing" || provider !== "mtn_momo") return;
    setMomoElapsed(0);
    const interval = setInterval(() => setMomoElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [step, provider]);

  useEffect(() => {
    if (provider !== "cybersource") return;
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = "/loginpage"; return; }

        // Create order server-side — server derives the canonical price from the DB.
        const orderRes = await fetch("/api/orders", {
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
        // Track so cleanup can cancel it if the modal closes before the user pays
        pendingCsOrderId.current = orderId;

        const ctxRes = await fetch("/api/checkout", {
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
          script.id = scriptId; script.src = sdkUrl; script.async = true; script.crossOrigin = "anonymous";
          document.head.appendChild(script);
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("SDK load failed"));
          });
        }

        if (cancelled) return;
        setStep("card");
        await new Promise(r => setTimeout(r, 200));

        const accept = await window.Accept!(captureContext);
        const up = await accept.unifiedPayments(false);

        const transientToken = await up.show({
          containers: { paymentSelection: "#cs-payment-list", paymentScreen: "#cs-payment-form" },
        });

        if (!transientToken || cancelled) return;

        sessionStorage.setItem("nimipiko_pending_payment", JSON.stringify({ orderId }));
        const completionJwt = await up.complete(transientToken);
        setStep("processing");

        const confirmRes = await fetch("/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: completionJwt, orderId }),
        });
        const confirmResult = await confirmRes.json();
        sessionStorage.removeItem("nimipiko_pending_payment");

        if (confirmResult.success) {
          pendingCsOrderId.current = null; // payment complete — don't cancel on unmount
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
      // Cancel the pending order if the user closes before completing payment
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
  }, [provider, product.id, currency, chargeAmount]);

  const handleMomoSubmit = async () => {
    const cleanPhone = phone.replace(/[\s\-]/g, "");
    if (cleanPhone.length < 9) {
      setErrorMsg("Enter a valid MTN phone number");
      return;
    }
    setErrorMsg("");
    setMomoAttempt(0);
    setStep("processing");
    momoAbort.current = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const orderRes = await fetch("/api/orders", {
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

      const res = await fetch("/api/payments/mtn-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: momoOrderId, phoneNumber: cleanPhone }),
      });
      const result = await res.json();
      if (result.success) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 5000));
          if (momoAbort.current) return;
          setMomoAttempt(i + 1);
          const s = await fetch(`/api/payments/mtn-momo?orderId=${momoOrderId}&referenceId=${result.referenceId}`);
          const d = await s.json();
          if (momoAbort.current) return;
          if (d.status === "completed") { setStep("success"); return; }
          if (d.status === "failed") { setStep("error"); setErrorMsg(d.reason || "Payment declined"); return; }
        }
        if (!momoAbort.current) { setStep("error"); setErrorMsg("Payment timed out — please try again"); }
      } else { setStep("error"); setErrorMsg(result.error || "MoMo request failed"); }
    } catch { if (!momoAbort.current) { setStep("error"); setErrorMsg("Something went wrong"); } }
  };

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

          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: DURATION.loopBase, repeat: Infinity, ease: EASE.linear }}
                className="w-16 h-16 mx-auto mb-4 text-4xl">⏳</motion.div>
              <p className="font-baloo font-black text-ds-text text-[18px]">
                {provider === "mtn_momo" ? "Waiting for MoMo confirmation..." : "Processing payment..."}
              </p>
              {provider === "mtn_momo" && (
                <>
                  <p className="text-gray-500 text-[13px] mt-2">Check your phone and enter your PIN</p>
                  <p className="text-gray-400 text-[11px] mt-3 font-mono">
                    Check {momoAttempt}/{30} · {momoElapsed}s elapsed
                  </p>
                </>
              )}
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
                Your {product.name} is now active.
              </motion.p>
              <motion.a href="/stories" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="inline-flex items-center gap-2 mt-6 px-8 py-3.5 leaf bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[15px] shadow-xl">
                📖 Go to Stories
                <span className="bg-white/30 rounded-full text-[11px] font-black px-2 py-0.5">{countdown}s</span>
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
                {provider === "mtn_momo"
                  ? <button onClick={() => { setErrorMsg(""); setStep("momo"); }} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Try Again</button>
                  : <button onClick={onClose} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Close & Reopen to Retry</button>
                }
                {provider === "cybersource" && (
                  <p className="text-gray-400 text-[10px] mt-2 text-center w-full">Card sessions can't be resumed — close this dialog and click Subscribe again.</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
