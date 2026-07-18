"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard } from "lucide-react";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { SPRING } from "@/lib/design-system/motion";
import supabase from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import type { Currency } from "@/lib/payments/types";

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "RWF") return `${Math.round(amount).toLocaleString()} RWF`;
  if (currency === "EUR") return `€${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

// Quick-picks start at the monthly plan price — gifts must cover at least 1 month
const QUICK_PICKS: Record<Currency, number[]> = {
  USD: [15, 30, 60],
  EUR: [14, 28, 60],
  RWF: [10000, 20000, 50000],
};

const QUICK_LABELS: Record<Currency, [string, string, string]> = {
  USD: ["1 month ✨", "2 months 🌟", "4 months 🚀"],
  EUR: ["1 month ✨", "2 months 🌟", "4 months 🚀"],
  RWF: ["1 month ✨", "2 months 🌟", "6 months 🚀"],
};

// Must match monthly Club price — server validates against the live DB value
const MINIMUMS: Record<Currency, number> = { USD: 14.99, EUR: 13.99, RWF: 9900 };

const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", EUR: "€", RWF: "" };

type GiftStep = "form" | "choose" | "pay-loading" | "pay-card" | "pay-momo" | "processing" | "success" | "error";
type ActiveProvider = "cybersource" | "mtn_momo";

interface Props {
  currency: Currency;
  onClose: () => void;
}

export default function PricingGiftModal({ currency, onClose }: Props) {
  const m = useThemeMotion();
  const isRwanda = currency === "RWF";

  const [step, setStep] = useState<GiftStep>("form");
  const [activeProvider, setActiveProvider] = useState<ActiveProvider | null>(null);

  // Amount state
  const [customAmount, setCustomAmount] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [sendDate, setSendDate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const giftIdRef = useRef<string>("");
  const orderIdRef = useRef<string>("");
  const codeRef = useRef<string>("");
  const momoAbort = useRef(false);

  useEffect(() => () => { momoAbort.current = true; }, []);

  const giftAmount: number | null = isCustom
    ? (parseFloat(customAmount) || null)
    : selectedQuick;

  const giftAmountFormatted = giftAmount != null ? formatAmount(giftAmount, currency) : null;

  // Creates the gift order and returns true or sets error step
  const createGiftOrder = async (paymentProvider: ActiveProvider): Promise<boolean> => {
    const res = await authedFetch("/api/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: giftAmount,
        currency,
        paymentProvider,
        recipientEmail,
        recipientName: recipientName.trim() || null,
        message: message.trim() || null,
        sendAt: sendNow ? null : (sendDate || null),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.orderId) {
      setStep("error"); setErrorMsg(data.error ?? "Failed to create gift order");
      return false;
    }
    giftIdRef.current = data.giftId;
    orderIdRef.current = data.orderId;
    codeRef.current = data.code ?? "";
    return true;
  };

  // MoMo: just navigate — order created in handleMomoPay to avoid double-creation on back-navigate
  const handleGiftPay = async (paymentProvider: ActiveProvider) => {
    setActiveProvider(paymentProvider);
    setErrorMsg("");

    if (paymentProvider === "mtn_momo") {
      setStep("pay-momo");
      return;
    }

    setStep("pay-loading");
    const ok = await createGiftOrder("cybersource");
    if (!ok) return;

    // CyberSource card flow
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/loginpage"; return; }

      const ctxRes = await authedFetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderIdRef.current }),
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

      const accept = await (window as any).Accept(captureContext);
      const up = await accept.unifiedPayments(false);

      setStep("pay-card");
      await new Promise(r => setTimeout(r, 50));

      const transientToken = await up.show({
        containers: { paymentSelection: "#cs-gift-list", paymentScreen: "#cs-gift-form" },
      });
      if (!transientToken) return;

      sessionStorage.setItem("nimipiko_pending_payment", JSON.stringify({ orderId: orderIdRef.current }));
      const completionJwt = await up.complete(transientToken);
      setStep("processing");

      const confirmRes = await authedFetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: completionJwt, orderId: orderIdRef.current }),
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
    const minimum = MINIMUMS[currency];
    if (!giftAmount || giftAmount < minimum) {
      setErrorMsg(`Minimum gift is ${formatAmount(minimum, currency)}`);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (recipientEmail.trim() && !emailRegex.test(recipientEmail)) { setErrorMsg("Enter a valid email address"); return; }
    if (!sendNow && !sendDate) { setErrorMsg("Pick a delivery date"); return; }
    setErrorMsg("");
    if (isRwanda) {
      setStep("choose");
    } else {
      handleGiftPay("cybersource");
    }
  };

  const handleMomoPay = async () => {
    const cleanPhone = phone.replace(/[\s\-]/g, "");
    if (cleanPhone.length < 9) { setErrorMsg("Enter a valid MTN phone number"); return; }
    setErrorMsg("");
    momoAbort.current = false;

    const ok = await createGiftOrder("mtn_momo");
    if (!ok) return;

    setStep("processing");
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
                <motion.div
                  initial={{ scale: 0.7, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="text-5xl mb-2"
                >🎁</motion.div>
                <h3 className="font-baloo font-black text-ds-text text-[22px]">Spread some joy 🌟</h3>
                <p className="text-gray-500 text-[13px] mt-1">A gift of stories, songs & adventures — any amount, any reason!</p>
              </div>

              {/* Amount picker */}
              <div className="mb-4">
                <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Choose your gift amount</p>
                <div className="flex gap-2 mb-2">
                  {QUICK_PICKS[currency].map((amt, i) => (
                    <button
                      key={amt}
                      onClick={() => { setSelectedQuick(amt); setIsCustom(false); setCustomAmount(""); setErrorMsg(""); }}
                      className={`flex-1 py-2 leaf border-2 transition-all flex flex-col items-center gap-0.5 ${
                        !isCustom && selectedQuick === amt
                          ? "border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                          : "border-ds-border bg-ds-input text-ds-text hover:border-rose-200"
                      }`}
                    >
                      <span className="font-baloo font-black text-[13px]">{formatAmount(amt, currency)}</span>
                      <span className="text-[9px] opacity-70">{QUICK_LABELS[currency][i]}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => { setIsCustom(true); setSelectedQuick(null); setErrorMsg(""); }}
                    className={`flex-1 py-2 leaf border-2 transition-all flex flex-col items-center gap-0.5 ${
                      isCustom
                        ? "border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                        : "border-ds-border bg-ds-input text-ds-text hover:border-rose-200"
                    }`}
                  >
                    <span className="font-baloo font-black text-[13px]">Other</span>
                    <span className="text-[9px] opacity-70">your pick 💝</span>
                  </button>
                </div>
                {isCustom && (
                  <div className="flex items-center gap-2 border border-ds-border bg-ds-input leaf px-3 py-2.5 focus-within:ring-2 focus-within:ring-[var(--ds-state-focus)] transition">
                    {CURRENCY_SYMBOL[currency] && (
                      <span className="text-gray-400 font-bold text-[14px]">{CURRENCY_SYMBOL[currency]}</span>
                    )}
                    <input
                      type="number"
                      min={MINIMUMS[currency]}
                      step={currency === "RWF" ? 1000 : 1}
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder={`Minimum ${formatAmount(MINIMUMS[currency], currency)}`}
                      className="flex-1 bg-transparent text-ds-text text-[14px] focus:outline-none placeholder:text-gray-400"
                    />
                    {currency === "RWF" && (
                      <span className="text-gray-400 font-bold text-[12px]">RWF</span>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1.5">
                  From {formatAmount(MINIMUMS[currency], currency)} — covers at least a full month of stories & songs 🎶
                </p>
                {giftAmount != null && giftAmount >= MINIMUMS[currency] && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-bold text-rose-500 mt-1.5 text-center"
                  >
                    🎉 You&apos;re gifting {giftAmountFormatted} — wonderful!
                  </motion.p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                    Their email address
                    <span className="ml-1 font-normal text-gray-400">(optional)</span>
                  </label>
                  <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="their@email.com"
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Don&apos;t have it? No worries! 💬 We&apos;ll give you a secret code to share on WhatsApp.
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">Who&apos;s this for? <span className="font-normal text-gray-400">(optional)</span></label>
                  <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    placeholder="Emma, Amara, Little Champ..."
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">Add a personal note 💌 <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Hey! I got you something special — your little one is going to LOVE these stories 🌟"
                    rows={3}
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400 resize-none" />
                </div>

              {/* Send timing */}
              <div className="mt-3">
                <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">When should it arrive? 📬</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSendNow(true)}
                    className={`flex-1 py-2 leaf font-bold text-[12px] border-2 transition-all ${
                      sendNow
                        ? "border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                        : "border-ds-border bg-ds-input text-ds-text hover:border-rose-200"
                    }`}
                  >
                    🎁 Right now!
                  </button>
                  <button
                    onClick={() => setSendNow(false)}
                    className={`flex-1 py-2 leaf font-bold text-[12px] border-2 transition-all ${
                      !sendNow
                        ? "border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                        : "border-ds-border bg-ds-input text-ds-text hover:border-rose-200"
                    }`}
                  >
                    📅 Pick a date
                  </button>
                </div>
                {!sendNow && (
                  <input
                    type="date"
                    value={sendDate}
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    max={new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)}
                    onChange={e => setSendDate(e.target.value)}
                    className="mt-2 w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition"
                  />
                )}
              </div>
              </div>
              {errorMsg && <p className="text-red-500 text-[12px] mt-2 font-semibold">⚠️ {errorMsg}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={onClose} className="flex-1 py-3 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
                <motion.button whileTap={m.buttonPress} onClick={handleFormContinue}
                  disabled={!giftAmount}
                  className="flex-1 py-3 leaf bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-[14px] shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {isRwanda
                    ? (giftAmountFormatted ? `Continue → ${giftAmountFormatted}` : "Continue →")
                    : giftAmountFormatted
                      ? sendNow ? `💝 Send ${giftAmountFormatted}` : `📅 Schedule ${giftAmountFormatted}`
                      : "Send Gift 🎁"}
                </motion.button>
              </div>
            </>
          )}

          {/* ── Method picker (Rwanda only) ───────────────────────────── */}
          {step === "choose" && (
            <>
              <div className="mb-4">
                <button onClick={() => setStep("form")}
                  className="text-gray-400 hover:text-ds-text transition text-[12px] font-bold mb-3 block">← Back</button>
                <div className="text-center">
                  <div className="text-3xl mb-1">🎁</div>
                  <h3 className="font-baloo font-black text-ds-text text-[20px]">Almost there!</h3>
                  <p className="text-gray-500 text-[13px] mt-0.5">
                    Your <strong className="text-ds-text">{giftAmountFormatted}</strong> gift is ready to go — pick how to pay
                  </p>
                </div>
              </div>
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
                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">Visa, Mastercard, Amex</span>
                </motion.button>
              </div>
              <button onClick={onClose} className="w-full py-2.5 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
            </>
          )}

          {/* ── CS loading ────────────────────────────────────────────── */}
          {step === "pay-loading" && (
            <div className="text-center py-8">
              <motion.div animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 1.4, repeat: Infinity }}
                className="text-5xl mb-4">🎁</motion.div>
              <p className="font-baloo font-black text-ds-text text-[16px]">Setting up your gift... ✨</p>
              <p className="text-gray-400 text-[12px] mt-1">Just a moment!</p>
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
                <h3 className="font-baloo font-black text-ds-text text-[20px]">🎁 Gift · {giftAmountFormatted}</h3>
              </div>
              <p className="text-gray-400 text-[12px] mb-3">
                {recipientEmail.trim() ? <>Will be sent to <strong>{recipientEmail}</strong></> : "Code ready to share after payment"}
              </p>
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
                <h3 className="font-baloo font-black text-ds-text text-[20px]">📱 Pay with MoMo</h3>
              </div>
              <p className="text-gray-400 text-[12px] mb-4">
                🎁 Gifting <strong className="text-ds-text">{giftAmountFormatted}</strong>
                {recipientName ? ` for ${recipientName}` : ""}
              </p>
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1 block">Your MTN number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="078 XXX XXXX"
                  className="w-full border border-ds-border bg-ds-input leaf px-4 py-3 text-ds-text text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
                <p className="text-[10px] text-gray-400 mt-1">You&apos;ll get a prompt on your phone to approve the payment</p>
              </div>
              {errorMsg && <p className="text-red-500 text-[11px] mt-2 font-semibold">⚠️ {errorMsg}</p>}
              <div className="flex gap-3 mt-4">
                <button onClick={onClose} className="flex-1 py-3 leaf border border-ds-border text-gray-400 font-bold text-[13px] hover:bg-gray-50 transition">Cancel</button>
                <motion.button whileTap={m.buttonPress} onClick={handleMomoPay}
                  className="flex-1 py-3 leaf bg-[var(--nimi-green)] text-white font-black text-[14px] shadow-md">
                  Send Gift 🎁
                </motion.button>
              </div>
            </>
          )}

          {/* ── Processing ────────────────────────────────────────────── */}
          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div
                animate={activeProvider === "mtn_momo"
                  ? { scale: [1, 1.15, 1] }
                  : { rotate: 360 }}
                transition={activeProvider === "mtn_momo"
                  ? { duration: 1.2, repeat: Infinity }
                  : { duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="text-4xl mx-auto mb-4 w-fit"
              >
                {activeProvider === "mtn_momo" ? "📱" : "🎁"}
              </motion.div>
              <p className="font-baloo font-black text-ds-text text-[18px]">
                {activeProvider === "mtn_momo" ? "Check your phone! 📲" : "Wrapping up your gift..."}
              </p>
              <p className="text-gray-500 text-[13px] mt-2">
                {activeProvider === "mtn_momo"
                  ? "Tap 'Approve' on the MoMo prompt and enter your PIN"
                  : "Almost done — hang tight! ✨"}
              </p>
            </div>
          )}

          {/* ── Success: gift card moment ─────────────────────────────── */}
          {step === "success" && (() => {
            const redeemUrl = `${typeof window !== "undefined" ? window.location.origin : "https://nimipiko.com"}/gift/redeem?code=${codeRef.current}`;
            const waText = encodeURIComponent(
              `🎁 I got you a little something!\n\nI just sent you a Nimipiko gift — stories, songs, and adventures for your little one 🌟\n\nYour gift code: *${codeRef.current}*\n\nRedeem it here 👉 ${redeemUrl}\n\nEnjoy! 💝`
            );

            return (
              <div>
                {/* Header */}
                <div className="text-center mb-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="text-5xl mb-2"
                  >🎉</motion.div>
                  <h3 className="font-baloo font-black text-ds-text text-[22px]">You just made someone&apos;s day!</h3>
                  <p className="text-gray-400 text-[12px] mt-0.5">
                    {recipientEmail.trim()
                      ? sendNow
                        ? `✉️ A surprise email is headed to ${recipientEmail}`
                        : `📅 Delivering on ${new Date(sendDate).toLocaleDateString(undefined, { month: "long", day: "numeric" })} to ${recipientEmail}`
                      : "Share the code below — however you like 💬"
                    }
                  </p>
                </div>

                {/* Gift card visual */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 20 }}
                  className="relative overflow-hidden rounded-3xl mb-4"
                  style={{ background: "linear-gradient(135deg, #f43f5e 0%, #ec4899 45%, #fb923c 100%)" }}
                >
                  {/* Decorative circles */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10" />

                  <div className="relative z-10 p-5">
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-baloo font-black text-white/90 text-[13px] tracking-widest uppercase">Nimipiko Gift</span>
                      <span className="text-2xl">🎁</span>
                    </div>

                    {/* Amount */}
                    <p className="font-baloo font-black text-white text-[38px] leading-none mb-1">
                      {giftAmountFormatted}
                    </p>
                    {recipientName && (
                      <p className="text-white/80 text-[13px] font-bold mb-3">For {recipientName}</p>
                    )}

                    {/* Message */}
                    {message.trim() && (
                      <div className="bg-white/15 rounded-2xl px-3 py-2.5 mb-4">
                        <p className="text-white text-[12px] italic leading-relaxed">"{message.trim()}"</p>
                      </div>
                    )}

                    {/* Code */}
                    <div className="bg-white/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest">Redemption code</p>
                        <p className="font-baloo font-black text-white text-[20px] tracking-widest">{codeRef.current}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(codeRef.current).catch(() => {});
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="bg-white/25 hover:bg-white/35 text-white font-black text-[11px] px-3 py-1.5 rounded-full transition"
                      >
                        {copied ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  {/* WhatsApp share */}
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 leaf bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-[14px] transition"
                  >
                    <span className="text-lg">💬</span>
                    Send via WhatsApp
                  </a>

                  {/* Copy link */}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${typeof window !== "undefined" ? window.location.origin : "https://nimipiko.com"}/gift/redeem?code=${codeRef.current}`).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 leaf border border-ds-border bg-ds-input text-ds-text font-bold text-[13px] hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    🔗 {copied ? "✓ Link copied!" : "Copy gift link"}
                  </button>

                  <button onClick={onClose}
                    className="w-full py-2.5 text-gray-400 font-bold text-[13px] hover:text-ds-text transition">
                    All done! 🌟
                  </button>
                </motion.div>
              </div>
            );
          })()}

          {/* ── Error ─────────────────────────────────────────────────── */}
          {step === "error" && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">😕</div>
              <h3 className="font-baloo font-black text-ds-text text-[18px]">Hmm, something went wrong</h3>
              <p className="text-red-500 text-[13px] mt-2 max-w-[280px] mx-auto leading-relaxed">{errorMsg}</p>
              <p className="text-gray-400 text-[12px] mt-1">Your card has not been charged.</p>
              <div className="flex gap-3 mt-5 justify-center">
                <button onClick={onClose} className="px-6 py-3 leaf border border-ds-border text-gray-500 font-bold text-[13px] hover:bg-gray-50 transition">Close</button>
                {isRwanda
                  ? <button onClick={() => { setErrorMsg(""); setStep("choose"); }} className="px-6 py-3 leaf bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold text-[13px] hover:bg-rose-100 transition">Try a different method</button>
                  : <button onClick={() => { setErrorMsg(""); setStep("form"); }} className="px-6 py-3 leaf bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold text-[13px] hover:bg-rose-100 transition">Let&apos;s try again 💪</button>
                }
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </>
  );
}
