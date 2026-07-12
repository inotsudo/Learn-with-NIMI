"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { SPRING } from "@/lib/design-system/motion";
import supabase from "@/lib/supabaseClient";
import { getPrice, getProviderForCurrency } from "@/lib/payments/types";
import type { Product, Currency } from "@/lib/payments/types";

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "RWF") return `${Math.round(amount).toLocaleString()} RWF`;
  return `$${amount.toFixed(2)}`;
}

function isAnnualProduct(product: Product) {
  return product.billing_interval === "year";
}

interface Props {
  product: Product;
  currency: Currency;
  onClose: () => void;
}

export default function PricingGiftModal({ product, currency, onClose }: Props) {
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

    if (provider === "mtn_momo") return;

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

      const accept = await window.Accept!(captureContext);
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
