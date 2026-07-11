"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const NL_BENEFITS = [
  { icon: "📖", text: "New story drops every month" },
  { icon: "🏆", text: "Learning tips & child milestones" },
  { icon: "🎁", text: "Members-only activities & printables" },
];

export default function LandingNewsletterSection() {
  const [email,  setEmail]  = useState("");
  const [name,   setName]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), source: "landing_footer" }),
      });
      setStatus(res.ok ? "ok" : "err");
    } catch { setStatus("err"); }
  }

  return (
    <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 border-t border-green-900/40"
      style={{ background: "linear-gradient(135deg, #052e16 0%, #14532d 45%, #15803d 100%)" }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)" }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          <div>
            <div className="inline-flex items-center gap-2 border px-4 py-1.5 rounded-full mb-7"
              style={{ background: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.28)" }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="font-nunito font-bold text-green-300 text-[12px] tracking-wide">
                Early access — founding families only
              </span>
            </div>

            <h3 className="font-baloo font-black text-white text-[28px] sm:text-[36px] leading-[1.15] mb-4">
              New stories every month —{" "}
              <span className="text-green-300">be the first to know.</span>
            </h3>
            <p className="font-nunito text-green-100/65 text-[15px] leading-relaxed mb-8 max-w-md">
              Be among the first families on NIMIPIKO. Get new story alerts, learning tips and founding-member updates — straight to your inbox.
            </p>

            <div className="space-y-3.5">
              {NL_BENEFITS.map(b => (
                <div key={b.text} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[17px] shrink-0"
                    style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.22)" }}>
                    {b.icon}
                  </div>
                  <span className="font-nunito text-green-100/75 text-[14px]">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-3xl p-7 sm:p-9 shadow-2xl"
            style={{ background: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.14)" }}>
            {status === "ok" ? (
              <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-center py-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
                  style={{ background: "rgba(74,222,128,0.18)", border: "1px solid rgba(74,222,128,0.30)" }}>
                  🎉
                </div>
                <p className="font-baloo font-black text-white text-[22px] mb-2">You&apos;re on the list!</p>
                <p className="font-nunito text-green-200/65 text-[14px] leading-relaxed">
                  Watch your inbox for NIMIPIKO updates.<br />No spam, ever. Unsubscribe any time.
                </p>
              </motion.div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="font-baloo font-black text-white text-[20px] leading-tight mb-1">Subscribe — it&apos;s free</p>
                  <p className="font-nunito text-green-200/55 text-[13px]">No spam. Unsubscribe any time.</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block font-nunito font-bold text-green-200/75 text-[11px] tracking-widest uppercase mb-1.5">
                      Your name <span className="text-green-400/45 font-normal normal-case tracking-normal">— optional</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amina"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full text-white rounded-xl px-4 py-3 text-[14px] font-nunito focus:outline-none transition-all placeholder-white/40"
                      style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.16)" }}
                    />
                  </div>

                  <div>
                    <label className="block font-nunito font-bold text-green-200/75 text-[11px] tracking-widest uppercase mb-1.5">
                      Email address <span className="text-red-400/60">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (status === "err") setStatus("idle"); }}
                      required
                      className="w-full text-white rounded-xl px-4 py-3 text-[14px] font-nunito focus:outline-none transition-all placeholder-white/40"
                      style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.16)" }}
                    />
                  </div>

                  {status === "err" && (
                    <p className="font-nunito text-red-300/90 text-[12px] flex items-center gap-1.5">
                      <span>⚠</span> Something went wrong — please try again.
                    </p>
                  )}

                  <button type="submit" disabled={status === "loading"}
                    className="w-full bg-white hover:bg-green-50 active:scale-[0.98] disabled:opacity-60 text-[var(--nimi-green)] font-baloo font-black text-[15px] py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mt-2">
                    {status === "loading" ? (
                      <>
                        <span className="w-4 h-4 border-2 border-green-700/25 border-t-green-700 rounded-full animate-spin shrink-0" />
                        Subscribing…
                      </>
                    ) : "Subscribe for free →"}
                  </button>

                  <div className="flex items-center gap-1.5 justify-center pt-0.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400/50 shrink-0" aria-hidden>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span className="font-nunito text-green-300/45 text-[11px]">Your data is safe &amp; never shared.</span>
                  </div>
                </form>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
