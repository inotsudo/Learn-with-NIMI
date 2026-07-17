"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { SPRING } from "@/lib/design-system/motion";
import supabase from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { getPrice } from "@/lib/payments/types";
import type { Product, Currency } from "@/lib/payments/types";

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "RWF") return `${Math.round(amount).toLocaleString()} RWF`;
  if (currency === "EUR") return `€${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

function isAnnualProduct(product: Product) {
  return product.billing_interval === "year";
}

type GiftStep = "form" | "choose" | "pay-loading" | "pay-card" | "pay-momo" | "processing" | "success" | "error";
type ActiveProvider = "cybersource" | "mtn_momo";

interface Props {
  product: Product;
  currency: Currency;
  onClose: () => void;
}

export default function PricingGiftModal({ product, currency, onClose }: Props) {
  const m = useThemeMotion();
  const price = getPrice(product, currency);
  const isRwanda = currency === "RWF";

  const [step, setStep] = useState<GiftStep>("form");
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const giftIdRef = useRef<string>("");
  const orderIdRef = useRef<string>("");
  const momoAbort = useRef(false);

  useEffect(() => () => { momoAbort.current = true; }, []);

  // Called after form validation; provider is chosen by user (Rwanda) or auto-selected (USD)
  const handleGiftPay = async (paymentProvider: ActiveProvider) => {
    setActiveProvider(paymentProvider);
    setErrorMsg("");
    setStep(paymentProvider === "cybersource" ? "pay-loading" : "pay-momo");

    // Send currency as-is (RWF for Rwanda); the server converts to USD for CyberSource.
    const res = await authedFetch("/api/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        currency,
        paymentProvider,
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
    giftIdRef.current = data.giftId;
    orderIdRef.current = data.orderId;

    if (paymentProvider === "mtn_momo") return; // phone step handles the rest

    // CyberSource card flow
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const ctxRes = await authedFetch("/api/checkout", {
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
        script.id = scriptId; script.src = sdkUrl; script.async = true;
        document.head.appendChild(script);
        await new Promise<void>((resolve, reject) => { script.onload = () => resolve(); script.onerror = () => reject(); });
      }

      for (let i = 0; i < 30; i++) {
        if (typeof (window as any).Accept === "function") break;
        await new Promise(r => setTimeout(r, 100));
      }
      if (typeof (window as any).Accept !== "function") {
        setStep("error"); setErrorMsg("Payment SDK failed to initialize — please reload and try again");
        return;
      }

      // Initialize before switching to "pay-card" so the containers exist when show() runs.
      const accept = await (window as any).Accept(captureContext);
      const up = await accept.unifiedPayments(false);

      setStep("pay-card");
      await new Promise(r => setTimeout(r, 50));

      const transientToken = await up.show({
        containers: { paymentSelection: "#cs-gift-list", paymentScreen: "#cs-gift-form" },
      });
      if (!transientToken) return;

      sessionStorage.setItem("nimipiko_pending_payment", JSON.stringify({ orderId: data.orderId }));
      const completionJwt = await up.complete(transientToken);
      setStep("processing");

      const confirmRes = await authedFetch("/api/confirm-payment", {
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

  const handleFormContinue = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(recipientEmail)) { setErrorMsg("Enter a valid recipient email"); return; }
    setErrorMsg("");
    if (isRwanda) {
      setStep("choose"); // Rwanda: pick method first
    } else {
      handleGiftPay("cybersource"); // USD: straight to card
    }
  };

  const handleMomoPay = async () => {
    const cleanPhone = phone.replace(/[\s\-]/g, "");
    if (cleanPhone.length < 9) { setErrorMsg("Enter a valid MTN phone number"); return; }
    setErrorMsg("");
    setStep("processing");
    momoAbort.current = false;
    try {
      const res = await authedFetch("/api/payments/mtn-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderIdRef.current, phoneNumber: cleanPhone }),
      });
      const result = await res.json();
      if (result.success) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 5000));
          if (momoAbort.current) return;
          const s = await authedFetch(`/api/payments/mtn-momo?orderId=${orderIdRef.current}&referenceId=${result.referenceId}`);
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

          {/* ── Recipient form ────────────────────────────────────────── */}
          {step === "form" && (
            <>
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">🎁</div>
                <h3 className="font-baloo font-black text-ds-text text-[22px]">Gift Nimipiko Club</h3>
                <p className="text-gray-500 text-[13px] mt-1">{price.formatted}/{isAnnualProduct(product) ? "year" : "month"} · sent to someone you love</p>
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
                <motion.button whileTap={m.buttonPress} onClick={handleFormContinue}
                  className="flex-1 py-3 leaf bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[14px] shadow-md">
                  {isRwanda ? "Choose Payment" : `Pay ${price.formatted}`}
                </motion.button>
              </div>
            </>
          )}

          {/* ── Method picker (Rwanda only) ───────────────────────────── */}
          {step === "choose" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep("form")}
                  className="text-gray-400 hover:text-ds-text transition text-[12px] font-bold">← Back</button>
                <div>
                  <h3 className="font-baloo font-black text-ds-text text-[18px]">Gift · {product.name}</h3>
                  <p className="text-gray-400 text-[11px]">🎁 To <strong>{recipientEmail}</strong></p>
                </div>
              </div>
              <p className="font-baloo font-black text-yellow-600 text-[24px] mb-1">{price.formatted}</p>
              <p className="text-[11px] font-bold text-gray-500 text-center mb-3 uppercase tracking-wide">Choose payment method</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.button whileTap={m.buttonPress} onClick={() => handleGiftPay("mtn_momo")}
                  className="flex flex-col items-center gap-2 p-4 leaf border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition text-center">
                  <span className="text-3xl">📱</span>
                  <span className="font-baloo font-black text-ds-text text-[14px]">MTN MoMo</span>
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">Pay with mobile money</span>
                </motion.button>
                <motion.button whileTap={m.buttonPress} onClick={() => handleGiftPay("cybersource")}
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

          {/* ── CS loading ────────────────────────────────────────────── */}
          {step === "pay-loading" && (
            <div className="text-center py-8">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                className="text-5xl mb-4">🎁</motion.div>
              <p className="font-baloo font-black text-ds-text text-[16px]">Preparing gift checkout...</p>
            </div>
          )}

          {/* ── Card form ─────────────────────────────────────────────── */}
          {step === "pay-card" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                {isRwanda && (
                  <button onClick={() => setStep("choose")}
                    className="text-gray-400 hover:text-ds-text transition text-[12px] font-bold">← Back</button>
                )}
                <h3 className="font-baloo font-black text-ds-text text-[20px]">Gift · {product.name}</h3>
              </div>
              <p className="font-baloo font-black text-yellow-600 text-[28px] mb-2">{price.formatted}</p>
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

          {/* ── MoMo phone entry ──────────────────────────────────────── */}
          {step === "pay-momo" && (
            <>
              <div className="flex items-center gap-2 mb-1">
                {isRwanda && (
                  <button onClick={() => setStep("choose")}
                    className="text-gray-400 hover:text-ds-text transition text-[12px] font-bold">← Back</button>
                )}
                <h3 className="font-baloo font-black text-ds-text text-[20px]">Gift · {product.name}</h3>
              </div>
              <p className="font-baloo font-black text-yellow-600 text-[28px] mb-2">{price.formatted}</p>
              <p className="text-gray-400 text-[12px] mb-4">🎁 Will be sent to <strong>{recipientEmail}</strong></p>
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">Your MTN Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="078 XXX XXXX"
                  className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
              </div>
              {errorMsg && <p className="text-red-500 text-[11px] mt-2 font-semibold">{errorMsg}</p>}
              <div className="flex gap-3 mt-4">
                <button onClick={onClose} className="flex-1 py-3 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
                <motion.button whileTap={m.buttonPress} onClick={handleMomoPay}
                  className="flex-1 py-3 leaf bg-[var(--nimi-green)] text-white font-black text-[14px] shadow-md">
                  Pay Now
                </motion.button>
              </div>
            </>
          )}

          {/* ── Processing ────────────────────────────────────────────── */}
          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="text-4xl mx-auto mb-4 w-fit">⏳</motion.div>
              <p className="font-baloo font-black text-ds-text text-[18px]">
                {activeProvider === "mtn_momo" ? "Waiting for MoMo confirmation..." : "Processing payment..."}
              </p>
              {activeProvider === "mtn_momo" && (
                <p className="text-gray-500 text-[13px] mt-2">Check your phone and enter your PIN</p>
              )}
            </div>
          )}

          {/* ── Success ───────────────────────────────────────────────── */}
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

          {/* ── Error ─────────────────────────────────────────────────── */}
          {step === "error" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <h3 className="font-baloo font-black text-ds-text text-[18px]">Payment Failed</h3>
              <p className="text-red-500 text-[13px] mt-2">{errorMsg}</p>
              <div className="flex gap-3 mt-5 justify-center">
                <button onClick={onClose} className="px-6 py-3 leaf border border-ds-border text-gray-500 font-bold text-[13px] hover:bg-gray-50 transition">Close</button>
                {isRwanda
                  ? <button onClick={() => { setErrorMsg(""); setStep("choose"); }} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Try Different Method</button>
                  : <button onClick={() => { setErrorMsg(""); setStep("form"); }} className="px-6 py-3 leaf bg-gray-100 text-ds-text font-bold text-[13px] hover:bg-gray-200 transition">Try Again</button>
                }
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </>
  );
}
