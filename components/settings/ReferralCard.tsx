"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Share2, Gift } from "lucide-react";
import supabase from "@/lib/supabaseClient";

export default function ReferralCard() {
  const [code,    setCode]    = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const res = await fetch("/api/referral", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const j = await res.json() as { code?: string };
        setCode(j.code ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const referralUrl = code ? `https://nimipiko.com/signuppage?ref=${code}` : "";

  async function copyLink() {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareLink() {
    if (!referralUrl) return;
    const text = `🌿 Join me on NIMIPIKO — interactive stories & AI learning for kids! Use my link and we both get a free month: ${referralUrl}`;
    if (navigator.share) {
      void navigator.share({ title: "NIMIPIKO — Learn with stories", text, url: referralUrl }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  if (loading) return null;

  return (
    <div className="border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-baloo font-black text-gray-900 text-[16px] leading-tight">Invite Friends & Earn</h3>
          <p className="font-nunito text-gray-500 text-[13px] mt-0.5 leading-relaxed">
            Share your link — when a friend subscribes to Club, you <strong>both get 1 free month</strong>. 🎁
          </p>
        </div>
      </div>

      {code ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2.5 font-mono text-[12px] text-gray-700 truncate select-all">
              {referralUrl}
            </div>
            <button onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-baloo font-black text-[12px] px-3 py-2.5 rounded-xl transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <button onClick={shareLink}
            className="w-full flex items-center justify-center gap-2 bg-[var(--ds-brand-primary)] hover:bg-[var(--ds-brand-hover)] text-white font-baloo font-black text-[13px] py-2.5 rounded-xl transition-colors">
            <Share2 className="w-4 h-4" /> Share via WhatsApp
          </button>

          <p className="font-nunito text-gray-400 text-[10px] text-center mt-3">
            Your code: <span className="font-black text-gray-600 font-mono">{code}</span>
          </p>
        </>
      ) : (
        <p className="text-center text-gray-400 text-[13px] font-nunito">Could not load referral code. Try again later.</p>
      )}
    </div>
  );
}
