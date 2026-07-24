"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, Check, Mail, MessageCircle, Link, RefreshCw } from "lucide-react";

interface Props {
  code: string | null;
  referralCount: number;
  rewardsEarned: number;
  codeError?: boolean;
  onRetry?: () => void;
}

const MILESTONES = [
  { count: 1,  label: "First friend",    reward: "1 free month",   emoji: "🌱" },
  { count: 3,  label: "Growing circle",  reward: "3 free months",  emoji: "🌿" },
  { count: 5,  label: "Super sharer",    reward: "5 free months",  emoji: "🌳" },
  { count: 10, label: "Ambassador",      reward: "10 free months", emoji: "⭐" },
];

function getNextMilestone(count: number) {
  return MILESTONES.find(m => m.count > count) ?? null;
}

type CopiedKey = "link" | "code" | null;

export default function ReferralCard({ code, referralCount, rewardsEarned, codeError, onRetry }: Props) {
  const [copied, setCopied] = useState<CopiedKey>(null);
  const [retrying, setRetrying] = useState(false);

  const origin    = typeof window !== "undefined" ? window.location.origin : "https://nimipiko.com";
  const shareUrl  = `${origin}/invite/${code ?? ""}`;
  const shareText = `Join me on NIMIPIKO — the kids' language learning app! My friend invited me and we both get 1 free month. 🌿`;

  const copy = async (text: string, key: CopiedKey) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2200);
    } catch { /* clipboard denied — fail silently */ }
  };

  const nativeShare = async () => {
    if (!navigator.share) { await copy(shareUrl, "link"); return; }
    try { await navigator.share({ title: "Join NIMIPIKO!", text: shareText, url: shareUrl }); }
    catch { /* cancelled */ }
  };

  const whatsappShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, "_blank", "noopener");
  };

  const emailShare = () => {
    const subject = encodeURIComponent("Join me on NIMIPIKO 🌿");
    const body    = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const nextMilestone = getNextMilestone(referralCount);
  const progressPct   = nextMilestone
    ? Math.min(100, (referralCount / nextMilestone.count) * 100)
    : 100;

  return (
    <div className="bg-white border border-ds-border p-5 shadow-ds-card overflow-hidden relative" style={{ borderRadius: "var(--leaf-r-lg)" }}>
      {/* Decorative blob */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/20 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🎁</span>
          <h2 className="font-black text-ds-text text-[18px]">Invite Friends</h2>
          <span className="ml-auto text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            +1 free month each
          </span>
        </div>

        <p className="font-nunito text-ds-muted text-[13px]">
          Share your link with a friend. When they subscribe to NIMIPIKO Club, you both get <strong>1 free month</strong> added automatically.
        </p>

        {/* Error state */}
        {codeError && !code && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
            <p className="font-nunito text-red-600 text-[13px]">Could not load your referral code.</p>
            <button
              onClick={async () => {
                if (!onRetry) return;
                setRetrying(true);
                await onRetry();
                setRetrying(false);
              }}
              disabled={retrying}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-red-600 font-black text-[12px] hover:bg-red-50 transition disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}

        {/* Referral code + link */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-4 py-3 space-y-2.5" style={{ borderRadius: "var(--leaf-r)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-nunito text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Your code</p>
              <p className="font-baloo font-black text-emerald-800 text-[26px] tracking-[0.12em] leading-none">
                {code ?? "———"}
              </p>
            </div>
            <button onClick={() => copy(code ?? "", "code")} disabled={!code}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-nunito font-black text-[12px] transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${copied === "code" ? "bg-emerald-500 text-white" : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
              {copied === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === "code" ? "Copied!" : "Copy code"}
            </button>
          </div>

          {/* Invite link row */}
          <div className="flex items-center gap-2 bg-white/70 border border-emerald-100 rounded-xl px-3 py-2">
            <Link className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="flex-1 min-w-0 text-[11px] text-emerald-700 font-mono truncate">
              {typeof window !== "undefined" ? window.location.hostname : "nimipiko.com"}/invite/{code ?? ""}
            </p>
            <button onClick={() => copy(shareUrl, "link")}
              className={`text-[11px] font-black shrink-0 transition ${copied === "link" ? "text-emerald-600" : "text-emerald-500 hover:text-emerald-700"}`}>
              {copied === "link" ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={whatsappShare} disabled={!code}
            className="flex flex-col items-center gap-1.5 py-3 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="text-[11px] font-black text-green-700">WhatsApp</span>
          </button>
          <button onClick={emailShare} disabled={!code}
            className="flex flex-col items-center gap-1.5 py-3 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="text-[11px] font-black text-blue-700">Email</span>
          </button>
          <button onClick={nativeShare} disabled={!code}
            className="flex flex-col items-center gap-1.5 py-3 bg-gray-50 border border-ds-border rounded-2xl hover:bg-gray-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <Share2 className="w-5 h-5 text-gray-500" />
            <span className="text-[11px] font-black text-gray-600">Share</span>
          </button>
        </div>

        {/* Progress toward next milestone */}
        {nextMilestone && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-gray-500">
                Progress to <span className="text-emerald-600">{nextMilestone.emoji} {nextMilestone.label}</span>
              </p>
              <p className="text-[11px] font-black text-gray-400">{referralCount} / {nextMilestone.count}</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-gray-400 font-nunito">
              Invite {nextMilestone.count - referralCount} more {nextMilestone.count - referralCount === 1 ? "friend" : "friends"} to unlock {nextMilestone.reward}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-ds-border px-4 py-3 text-center" style={{ borderRadius: "var(--leaf-r)" }}>
            <p className="font-baloo font-black text-ds-text text-[24px] leading-none">{referralCount}</p>
            <p className="font-nunito text-ds-muted text-[11px] mt-0.5">{referralCount === 1 ? "Friend joined" : "Friends joined"}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 text-center" style={{ borderRadius: "var(--leaf-r)" }}>
            {rewardsEarned > 0 ? (
              <>
                <p className="font-baloo font-black text-emerald-700 text-[24px] leading-none">{rewardsEarned}</p>
                <p className="font-nunito text-emerald-500 text-[11px] mt-0.5">Free {rewardsEarned === 1 ? "month" : "months"} earned</p>
              </>
            ) : (
              <p className="font-nunito text-emerald-400 text-[12px] leading-snug">No rewards<br />yet</p>
            )}
          </div>
        </div>

        {/* Milestone badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {MILESTONES.map(m => {
            const reached = referralCount >= m.count;
            return (
              <div key={m.count}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border shrink-0 transition ${reached ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-ds-border opacity-50"}`}>
                <span className="text-lg">{m.emoji}</span>
                <span className={`text-[10px] font-black ${reached ? "text-emerald-700" : "text-gray-400"}`}>{m.count} {m.count === 1 ? "friend" : "friends"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
