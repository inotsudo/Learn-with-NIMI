"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gift, CheckCircle, AlertCircle } from "lucide-react";
import { Bone } from "@/components/ui/Bone";
import supabase from "@/lib/supabaseClient";

type GiftPreview = {
  valid: boolean;
  redeemed: boolean;
  recipientEmail: string;
  recipientName: string | null;
  giverName: string;
  productName: string;
};

function RedeemContent() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code") ?? "";

  const [preview, setPreview] = useState<GiftPreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<"loading" | "preview" | "redeeming" | "success" | "error">("loading");
  const [redeemError, setRedeemError] = useState("");

  useEffect(() => {
    if (!code) { setLoadError("No redemption code provided."); setStep("error"); return; }
    void (async () => {
      const res = await fetch(`/api/gift/redeem?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) { setLoadError(data.error ?? "Invalid code"); setStep("error"); return; }
      setPreview(data);
      setStep("preview");
    })();
  }, [code]);

  const handleRedeem = async () => {
    setStep("redeeming");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect to login with return URL
      router.push(`/loginpage?next=${encodeURIComponent(`/gift/redeem?code=${code}`)}`);
      return;
    }
    try {
      const res = await fetch("/api/gift/redeem", {
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
          <Bone className="h-32 leaf-lg" />
          <Bone className="h-14 leaf-lg" />
          <Bone className="h-14 leaf-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-6 content-enter">
      <div className="w-full max-w-md">

        {step === "preview" && preview && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-ds-border shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-8 text-center">
              <motion.div animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-7xl mb-3">🎁</motion.div>
              <h1 className="font-baloo font-black text-white text-[28px] leading-tight">You've got a gift!</h1>
              <p className="text-white/90 text-[14px] mt-1">{preview.giverName} sent you something special</p>
            </div>

            {/* Body */}
            <div className="p-8">
              {preview.redeemed ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="font-baloo font-black text-ds-text text-[20px]">Already redeemed</h2>
                  <p className="text-gray-500 text-[14px] mt-2">This gift has already been claimed. Each gift link can only be used once.</p>
                  <a href="/" className="inline-block mt-6 px-8 py-3 rounded-2xl bg-[var(--nimi-green)] text-white font-black text-[15px]">
                    Go to Nimipiko
                  </a>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 mb-6 text-center">
                    <div className="text-2xl mb-1">👑</div>
                    <p className="font-baloo font-black text-ds-text text-[20px]">{preview.productName}</p>
                    <p className="text-gray-500 text-[13px] mt-1">Full access to all stories, songs, Nimi AI & more</p>
                  </div>

                  {preview.recipientName && (
                    <p className="text-center text-ds-text font-bold text-[15px] mb-2">Hi {preview.recipientName}! 👋</p>
                  )}
                  <p className="text-center text-gray-500 text-[13px] mb-6">
                    Claim your gift to unlock NIMIPIKO for your child. Create an account if you don't have one yet — it's free.
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleRedeem}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-[16px] shadow-xl shadow-orange-200">
                    🚀 Claim My Gift
                  </motion.button>
                  <p className="text-center text-gray-400 text-[11px] mt-3">You'll be asked to sign in or create a free account</p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {step === "redeeming" && (
          <div className="text-center">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="text-7xl mb-6">🎁</motion.div>
            <p className="font-baloo font-black text-ds-text text-[20px]">Activating your gift...</p>
          </div>
        )}

        {step === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-ds-border shadow-2xl p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="text-7xl mb-4">🎉</motion.div>
            <h2 className="font-baloo font-black text-ds-text text-[26px]">Welcome to the Universe!</h2>
            <p className="text-gray-500 text-[14px] mt-2 mb-6">
              Your Nimipiko Club is now active. Let the learning adventures begin!
            </p>
            <a href="/stories"
              className="inline-block px-10 py-4 rounded-2xl bg-[var(--nimi-green)] text-white font-black text-[16px] shadow-lg">
              📖 Start Exploring
            </a>
            <p className="text-gray-400 text-[11px] mt-4">Your subscription will not auto-renew. Enjoy the gift!</p>
          </motion.div>
        )}

        {step === "error" && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-ds-border shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-baloo font-black text-ds-text text-[20px]">Oops!</h2>
            <p className="text-red-500 text-[14px] mt-2">{redeemError || loadError}</p>
            <a href="/" className="inline-block mt-6 px-8 py-3 rounded-2xl bg-gray-100 text-ds-text font-black text-[14px] hover:bg-gray-200 transition">
              Go home
            </a>
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
          <Bone className="h-32 leaf-lg" />
          <Bone className="h-14 leaf-lg" />
          <Bone className="h-14 leaf-lg" />
        </div>
      </div>
    }>
      <RedeemContent />
    </Suspense>
  );
}
