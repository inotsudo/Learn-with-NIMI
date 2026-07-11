"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, Check } from "lucide-react";

interface Props {
  code: string | null;
  referralCount: number;
  rewardsEarned: number;
}

export default function ReferralCard({ code, referralCount, rewardsEarned }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://nimipiko.com/signup?ref=${code ?? ""}`;
  const shareText = `Join me on NIMIPIKO — the kids' language learning app! Use my code ${code ?? ""} and we both get a free month. 🌿`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) { handleCopy(); return; }
    try {
      await navigator.share({ title: "Join NIMIPIKO!", text: shareText, url: shareUrl });
    } catch { /* user cancelled */ }
  };

  return (
    <div className="bg-white border border-ds-border p-5 mb-5 shadow-ds-card overflow-hidden relative" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
      {/* Decorative gradient blob */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/20 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🎁</span>
          <h2 className="font-black text-ds-text text-[18px]">Refer a Friend</h2>
          <span className="ml-auto text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            +1 free month each
          </span>
        </div>

        <p className="font-nunito text-ds-muted text-[13px] mb-4">
          Share your code with a friend. When they subscribe to NIMIPIKO Club, you both get <strong>1 free month</strong>.
        </p>

        {/* Code display */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-4 py-3 mb-4" style={{ borderRadius: 'var(--leaf-r)' }}>
          <div className="flex-1 min-w-0">
            <p className="font-nunito text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Your code</p>
            <p className="font-baloo font-black text-emerald-800 text-[28px] tracking-[0.12em] leading-none">
              {code ?? "———"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-nunito font-black text-[12px] transition ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--nimi-green)] text-white font-nunito font-black text-[12px] hover:opacity-90 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </motion.button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-ds-border px-4 py-3 text-center" style={{ borderRadius: 'var(--leaf-r)' }}>
            <p className="font-baloo font-black text-ds-text text-[24px] leading-none">{referralCount}</p>
            <p className="font-nunito text-ds-muted text-[11px] mt-0.5">
              {referralCount === 1 ? "Friend joined" : "Friends joined"}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 text-center" style={{ borderRadius: 'var(--leaf-r)' }}>
            <p className="font-baloo font-black text-emerald-700 text-[24px] leading-none">{rewardsEarned}</p>
            <p className="font-nunito text-emerald-500 text-[11px] mt-0.5">
              Free {rewardsEarned === 1 ? "month" : "months"} earned
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
