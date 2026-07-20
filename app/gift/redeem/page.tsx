"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Bone } from "@/components/ui/Bone";
import supabase from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import confetti from "canvas-confetti";

type GiftPreview = {
  valid: boolean;
  redeemed: boolean;
  recipientEmail: string | null;
  recipientName: string | null;
  giverName: string;
  productName: string;
  giftAmount: number | null;
  giftCurrency: string | null;
  message: string | null;
};

function formatAmount(amount: number, currency: string): string {
  if (currency === "RWF") return `${Math.round(amount).toLocaleString()} RWF`;
  if (currency === "EUR") return `€${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

function RedeemContent() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code") ?? "";

  const [preview, setPreview] = useState<GiftPreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<"loading" | "preview" | "redeeming" | "success" | "error">("loading");
  const [redeemError, setRedeemError] = useState("");

  useEffect(() => {
    if (!code) { setLoadError("No redemption code found — double-check your link!"); setStep("error"); return; }
    void (async () => {
      const res = await fetch(`/api/gift/redeem?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) { setLoadError(data.error ?? "Invalid code"); setStep("error"); return; }
      setPreview(data);
      setStep("preview");
    })();
  }, [code]);

  useEffect(() => {
    if (step !== "success") return;
    const burst = () => confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#f43f5e", "#ec4899", "#fb923c", "#fbbf24", "#a78bfa", "#34d399"],
    });
    burst();
    const t = setTimeout(burst, 600);
    return () => clearTimeout(t);
  }, [step]);

  const handleRedeem = async () => {
    setStep("redeeming");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/loginpage?next=${encodeURIComponent(`/gift/redeem?code=${code}`)}`);
      return;
    }
    try {
      const res = await authedFetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) setStep("success");
      else { setRedeemError(data.error ?? "Redemption failed"); setStep("error"); }
    } catch {
      setRedeemError("Something went wrong. Please try again.");
      setStep("error");
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Bone className="h-48 rounded-3xl" />
          <Bone className="h-14 rounded-2xl" />
          <Bone className="h-14 rounded-2xl" />
        </div>
      </div>
    );
  }

  const giftLabel = preview?.giftAmount && preview?.giftCurrency
    ? formatAmount(preview.giftAmount, preview.giftCurrency)
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 content-enter"
      style={{ background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #fef3c7 100%)" }}>
      <div className="w-full max-w-md">

        {/* ── Preview ───────────────────────────────────────────── */}
        {step === "preview" && preview && (
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Gift card header */}
            <div className="relative overflow-hidden text-center px-6 py-8"
              style={{ background: "linear-gradient(135deg, #f43f5e 0%, #ec4899 45%, #fb923c 100%)" }}>
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10" />
              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: [-8, 8, -8] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-6xl sm:text-7xl mb-3"
                >🎁</motion.div>
                {giftLabel ? (
                  <>
                    <p className="text-white/80 text-[12px] font-bold uppercase tracking-widest mb-1">Nimipiko Gift</p>
                    <p className="font-baloo font-black text-white text-[36px] sm:text-[42px] leading-none mb-1">{giftLabel}</p>
                  </>
                ) : (
                  <h1 className="font-baloo font-black text-white text-[26px] sm:text-[28px] leading-tight mb-1">You&apos;ve got a gift!</h1>
                )}
                <p className="text-white/90 text-[14px]">
                  A surprise from <strong>{preview.giverName}</strong> 💝
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-7">
              {preview.redeemed ? (
                <div className="text-center">
                  <div className="text-5xl mb-4">🔓</div>
                  <h2 className="font-baloo font-black text-ds-text text-[20px]">Already opened!</h2>
                  <p className="text-gray-500 text-[14px] mt-2 leading-relaxed">This gift has already been claimed. Each gift link can only be used once — lucky recipient!</p>
                  <a href="/" className="inline-block mt-6 px-8 py-3 rounded-2xl bg-[var(--nimi-green)] text-white font-black text-[15px] shadow-md">
                    Visit Nimipiko
                  </a>
                </div>
              ) : (
                <>
                  {/* Recipient greeting */}
                  {preview.recipientName && (
                    <p className="text-center font-baloo font-black text-ds-text text-[18px] mb-3">
                      Hi {preview.recipientName}! 👋
                    </p>
                  )}

                  {/* Personal message */}
                  {preview.message && (
                    <div className="bg-fuchsia-50 border-l-4 border-fuchsia-400 rounded-r-2xl px-4 py-3 mb-5">
                      <p className="text-[13px] italic text-fuchsia-800 leading-relaxed">&ldquo;{preview.message}&rdquo;</p>
                      <p className="text-[11px] text-fuchsia-500 mt-1 font-bold">— {preview.giverName}</p>
                    </div>
                  )}

                  {/* What they unlock */}
                  <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-5 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🌟</span>
                      <p className="font-baloo font-black text-ds-text text-[17px]">What&apos;s waiting inside</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[["📖", "Stories"], ["🎵", "Songs"], ["🎨", "Coloring books"], ["🤖", "Nimi AI"]].map(([icon, label]) => (
                        <div key={label} className="flex items-center gap-2 text-[13px] text-gray-700">
                          <span>{icon}</span><span>{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-3">In English, French &amp; Kinyarwanda</p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleRedeem}
                    className="w-full py-4 rounded-2xl text-white font-black text-[16px] shadow-xl"
                    style={{ background: "linear-gradient(135deg, #f43f5e 0%, #ec4899 45%, #fb923c 100%)", boxShadow: "0 8px 24px rgba(244,63,94,0.3)" }}
                  >
                    🎁 Open My Gift
                  </motion.button>
                  <p className="text-center text-gray-400 text-[11px] mt-3">You&apos;ll be asked to sign in or create a free account</p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Redeeming ─────────────────────────────────────────── */}
        {step === "redeeming" && (
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-7xl mb-6"
            >🎁</motion.div>
            <p className="font-baloo font-black text-ds-text text-[22px]">Opening your gift...</p>
            <p className="text-gray-500 text-[14px] mt-2">Just a moment ✨</p>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────── */}
        {step === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden text-center">
            <div className="px-6 py-8 pb-6" style={{ background: "linear-gradient(135deg, #f43f5e 0%, #ec4899 45%, #fb923c 100%)" }}>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
                className="text-6xl sm:text-7xl mb-3"
              >🎉</motion.div>
              <h2 className="font-baloo font-black text-white text-[26px] sm:text-[28px]">It&apos;s yours!</h2>
              <p className="text-white/90 text-[14px] mt-1">Your Nimipiko adventure starts right now</p>
            </div>
            <div className="p-5 sm:p-7">
              {preview?.giverName && (
                <p className="text-gray-500 text-[14px] mb-5 leading-relaxed">
                  A gift from <strong className="text-ds-text">{preview.giverName}</strong> is now active on your account. Go explore! 🌍
                </p>
              )}
              <a href="/stories"
                className="inline-block w-full py-4 rounded-2xl bg-[var(--nimi-green)] text-white font-black text-[16px] shadow-lg hover:opacity-90 transition">
                📖 Start Exploring
              </a>
              <p className="text-gray-400 text-[11px] mt-4">This subscription won&apos;t auto-renew — enjoy every moment of it!</p>
            </div>
          </motion.div>
        )}

        {/* ── Error ─────────────────────────────────────────────── */}
        {step === "error" && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="font-baloo font-black text-ds-text text-[22px]">Hmm, something&apos;s off</h2>
            <p className="text-red-500 text-[14px] mt-3 leading-relaxed max-w-[280px] mx-auto">{redeemError || loadError}</p>
            <div className="flex gap-3 mt-6 justify-center">
              <a href="/" className="px-6 py-3 rounded-2xl bg-gray-100 text-ds-text font-bold text-[14px] hover:bg-gray-200 transition">
                Go home
              </a>
              {redeemError && (
                <button onClick={() => { setRedeemError(""); setStep("preview"); }}
                  className="px-6 py-3 rounded-2xl bg-rose-50 text-rose-600 font-bold text-[14px] hover:bg-rose-100 transition">
                  Try again 💪
                </button>
              )}
            </div>
            <p className="text-gray-400 text-[12px] mt-5">Need help? <a href="mailto:support@nimipiko.com" className="text-rose-400 hover:underline">support@nimipiko.com</a></p>
          </motion.div>
        )}

      </div>
    </div>
  );
}

export default function GiftRedeemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Bone className="h-48 rounded-3xl" />
          <Bone className="h-14 rounded-2xl" />
          <Bone className="h-14 rounded-2xl" />
        </div>
      </div>
    }>
      <RedeemContent />
    </Suspense>
  );
}
