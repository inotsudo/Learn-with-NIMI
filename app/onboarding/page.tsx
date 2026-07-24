"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Star } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { createChild } from "@/lib/queries";
import type { Child } from "@/lib/queries";
import { SPRING } from "@/lib/design-system/motion";
import AvatarBuilder from "@/components/avatar/AvatarBuilder";
import AvatarSvg from "@/components/avatar/AvatarSvg";
import { serializeAvatar, DEFAULT_AVATAR, type AvatarConfig } from "@/lib/avatarConfig";

const LANGUAGES: { code: Child["language"]; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English",     native: "English",      flag: "🇬🇧" },
  { code: "fr", label: "Français",    native: "Français",     flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", native: "Ikinyarwanda", flag: "🇷🇼" },
];

const AGE_GROUPS = [
  { label: "2–4", emoji: "🍼", desc: "Little Explorer",  min: 2, max: 4  },
  { label: "5–6", emoji: "🌟", desc: "Story Starter",    min: 5, max: 6  },
  { label: "7–9", emoji: "🚀", desc: "Adventure Seeker", min: 7, max: 9  },
  { label: "10+", emoji: "🏆", desc: "Champion Reader",  min: 10, max: 12 },
];

const STEPS = ["Welcome", "Design", "Profile", "Launch"];

const fadeSlide = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ...SPRING.gentle } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.16 } },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]             = useState(0);
  const [parentName, setParentName] = useState("there");
  const [avatarCfg, setAvatarCfg]  = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [childName, setChildName]   = useState("");
  const [ageGroup, setAgeGroup]     = useState(1);
  const [language, setLanguage]     = useState<Child["language"]>("en");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/loginpage"); return; }
      const { data: p } = await supabase.from("parents").select("name").eq("id", user.id).maybeSingle();
      if (p?.name) setParentName(p.name.split(" ")[0]);
      const { data: kids } = await supabase.from("children").select("id").eq("parent_id", user.id).limit(1);
      if (kids && kids.length > 0) { router.replace("/home"); return; }

      // Apply pending referral code from signup (handles email-verification flow)
      const pendingRef = sessionStorage.getItem("nimipiko_pending_ref");
      if (pendingRef) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          void fetch("/api/referral", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ code: pendingRef }),
          });
          sessionStorage.removeItem("nimipiko_pending_ref");
        }
      }
    })();
  }, [router]);

  const handleCreate = useCallback(async () => {
    if (!childName.trim()) { setError("Please enter your child's name!"); return; }
    setSaving(true);
    setError("");
    const age = AGE_GROUPS[ageGroup].min + 1;
    const { data: child, error: err } = await createChild({
      name: childName.trim(),
      age,
      language,
      avatar_url: serializeAvatar(avatarCfg),
    });
    if (err || !child) {
      setError(err ?? "Something went wrong. Please try again.");
      setSaving(false);
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("nimipiko_active_child", child.id);
    }

    // Pre-generate referral code so ReferralCard loads instantly on first visit
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      void fetch("/api/referral", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    }

    setDone(true);
    setTimeout(() => router.replace("/stories"), 2000);
  }, [childName, ageGroup, language, avatarCfg, router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#d1fae5 0%,#ecfdf5 40%,#f0fdf4 70%,#dcfce7 100%)" }}
    >
      {/* Ambient sparkles */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
        {[
          { top:"8%",  left:"5%",  emoji:"⭐", size:28, delay:0   },
          { top:"15%", left:"88%", emoji:"✨", size:22, delay:0.5 },
          { top:"75%", left:"4%",  emoji:"🌟", size:24, delay:1   },
          { top:"82%", left:"90%", emoji:"⭐", size:20, delay:0.7 },
          { top:"45%", left:"2%",  emoji:"💫", size:18, delay:1.4 },
          { top:"35%", left:"94%", emoji:"✨", size:16, delay:0.3 },
        ].map((d, i) => (
          <motion.span key={i} className="absolute"
            style={{ top: d.top, left: d.left, fontSize: d.size }}
            animate={{ opacity:[0.3,1,0.3], scale:[0.7,1.2,0.7], rotate:[0,15,-15,0] }}
            transition={{ duration:2.5+i*0.4, repeat:Infinity, delay:d.delay }}>
            {d.emoji}
          </motion.span>
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 w-full max-w-xl px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-[22px]">📚</span>
            <span className="font-baloo font-black text-emerald-700 text-[18px]">NIMIPIKO</span>
          </div>
          {!done && (
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < step ? "bg-emerald-500 w-5" : i === step ? "bg-emerald-400 w-10" : "bg-emerald-100 w-5"
                }`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card area */}
      <div className="relative z-10 w-full max-w-xl px-4 flex-1 flex items-start pb-8">
        <AnimatePresence mode="wait">

          {/* ── STEP 0: Welcome ─────────────────────────────────────────── */}
          {step === 0 && !done && (
            <motion.div key="s0" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
              className="w-full bg-white/90 backdrop-blur-sm border border-emerald-100 shadow-[0_24px_60px_rgba(5,150,105,0.12)] overflow-hidden"
              style={{ borderRadius: "28px" }}>

              <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden"
                style={{ background:"linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)" }}>
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
                <motion.div
                  animate={{ y:[0,-10,0], rotate:[0,3,-3,0] }}
                  transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut" }}
                  className="text-[80px] mb-3 select-none" aria-hidden>📚</motion.div>
                <h1 className="font-baloo font-black text-white text-[28px] sm:text-[32px] leading-tight">
                  Welcome, {parentName}! 👋
                </h1>
                <p className="text-white/80 font-nunito text-[14px] mt-2">
                  You&apos;re about to give your child the most magical learning experience.
                </p>
              </div>

              <div className="px-6 py-6 space-y-4">
                {[
                  { emoji:"📖", title:"Interactive Stories", desc:"Personalized adventures in 3 languages" },
                  { emoji:"🤖", title:"Nimi AI Companion",   desc:"A friendly guide who knows your child" },
                  { emoji:"🏆", title:"Achievement System",  desc:"Certificates, stars & champion rewards" },
                ].map(f => (
                  <div key={f.title} className="flex items-center gap-4 p-3.5 bg-emerald-50/80 border border-emerald-100"
                    style={{ borderRadius:"14px" }}>
                    <div className="w-10 h-10 bg-white border border-emerald-100 flex items-center justify-center text-[20px] shrink-0 shadow-sm"
                      style={{ borderRadius:"10px" }}>{f.emoji}</div>
                    <div className="flex-1">
                      <p className="font-baloo font-black text-emerald-800 text-[14px]">{f.title}</p>
                      <p className="font-nunito text-emerald-600 text-[12px]">{f.desc}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                ))}

                <motion.button
                  whileTap={{ scale:0.97 }} onClick={() => setStep(1)}
                  className="w-full text-white font-baloo font-black text-[17px] py-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition hover:opacity-90 mt-2"
                  style={{ background:"linear-gradient(to right,#059669,#10b981)", borderRadius:"14px" }}>
                  <Sparkles className="w-5 h-5" />
                  Let&apos;s Create Your Explorer!
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Avatar designer ─────────────────────────────────── */}
          {step === 1 && !done && (
            <motion.div key="s1" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
              className="w-full bg-white/90 backdrop-blur-sm border border-emerald-100 shadow-[0_24px_60px_rgba(5,150,105,0.12)] overflow-hidden"
              style={{ borderRadius:"28px" }}>

              <div className="relative px-6 pt-6 pb-5 text-center overflow-hidden"
                style={{ background:"linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)" }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                <p className="text-white/70 text-[11px] font-nunito font-bold uppercase tracking-[0.18em] mb-1">Step 1 of 3</p>
                <h2 className="font-baloo font-black text-white text-[24px] leading-tight">Design your Explorer! 🎨</h2>
                <p className="text-white/75 text-[12px] font-nunito mt-1">Make your child&apos;s character completely unique</p>
              </div>

              <div className="p-4">
                <AvatarBuilder initial={avatarCfg} onChange={setAvatarCfg} />
              </div>

              <div className="px-4 pb-4 flex gap-3">
                <button onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <motion.button whileTap={{ scale:0.97 }} onClick={() => setStep(2)}
                  className="flex-1 text-white font-baloo font-black text-[16px] py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition hover:opacity-90"
                  style={{ background:"linear-gradient(to right,#059669,#10b981)", borderRadius:"14px" }}>
                  Next: Name your Explorer
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Name + age + language ───────────────────────────── */}
          {step === 2 && !done && (
            <motion.div key="s2" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
              className="w-full bg-white/90 backdrop-blur-sm border border-emerald-100 shadow-[0_24px_60px_rgba(5,150,105,0.12)] overflow-hidden"
              style={{ borderRadius:"28px" }}>

              <div className="relative px-6 pt-6 pb-5 text-center overflow-hidden"
                style={{ background:"linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)" }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                {/* mini avatar preview in header */}
                <div className="flex justify-center mb-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                    <AvatarSvg config={avatarCfg} size={64} />
                  </div>
                </div>
                <p className="text-white/70 text-[11px] font-nunito font-bold uppercase tracking-[0.18em] mb-1">Step 2 of 3</p>
                <h2 className="font-baloo font-black text-white text-[24px] leading-tight">Who&apos;s the hero? 🌟</h2>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 block mb-2">
                    Child&apos;s name
                  </label>
                  <input type="text" value={childName} onChange={e => { setChildName(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && childName.trim() && setStep(3)}
                    placeholder="Enter name…" maxLength={30} autoFocus
                    className="w-full border-2 border-gray-200 focus:border-emerald-400 bg-gray-50 px-4 py-3 text-[15px] font-semibold text-gray-800 focus:outline-none transition placeholder:text-gray-400"
                    style={{ borderRadius:"12px" }} />
                </div>

                {/* Age group */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 mb-2">Age group</p>
                  <div className="grid grid-cols-2 gap-2">
                    {AGE_GROUPS.map((g, i) => (
                      <motion.button key={g.label} whileTap={{ scale:0.95 }} onClick={() => setAgeGroup(i)}
                        className={`py-3 px-3 flex items-center gap-2.5 border-2 transition text-left ${
                          ageGroup === i ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`} style={{ borderRadius:"12px" }}>
                        <span className="text-[22px]">{g.emoji}</span>
                        <div>
                          <p className="font-baloo font-black text-gray-800 text-[13px] leading-none">{g.label} yrs</p>
                          <p className="font-nunito text-gray-500 text-[10px]">{g.desc}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 mb-2">Learning language</p>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGES.map(l => (
                      <motion.button key={l.code} whileTap={{ scale:0.95 }} onClick={() => setLanguage(l.code)}
                        className={`py-3 flex flex-col items-center gap-1 border-2 transition ${
                          language === l.code ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`} style={{ borderRadius:"12px" }}>
                        <span className="text-[24px]">{l.flag}</span>
                        <span className="font-baloo font-black text-gray-700 text-[11px]">{l.native}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-red-500 text-[12px] font-semibold text-center">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <motion.button whileTap={{ scale:0.97 }}
                    onClick={() => childName.trim() ? setStep(3) : setError("Please enter a name!")}
                    disabled={!childName.trim()}
                    className="flex-1 text-white font-baloo font-black text-[16px] py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-40 transition hover:opacity-90"
                    style={{ background:"linear-gradient(to right,#059669,#10b981)", borderRadius:"14px" }}>
                    Preview Adventure <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Launch ──────────────────────────────────────────── */}
          {step === 3 && !done && (
            <motion.div key="s3" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
              className="w-full bg-white/90 backdrop-blur-sm border border-emerald-100 shadow-[0_24px_60px_rgba(5,150,105,0.12)] overflow-hidden"
              style={{ borderRadius:"28px" }}>

              <div className="relative px-6 pt-6 pb-5 text-center overflow-hidden"
                style={{ background:"linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)" }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                <p className="text-white/70 text-[11px] font-nunito font-bold uppercase tracking-[0.18em] mb-1">Step 3 of 3</p>
                <h2 className="font-baloo font-black text-white text-[24px] leading-tight">
                  {childName}&apos;s adventure awaits! 🚀
                </h2>
              </div>

              <div className="px-6 py-6 space-y-5">
                {/* Profile preview card */}
                <div className="flex items-center gap-5 p-5 bg-emerald-50 border border-emerald-100"
                  style={{ borderRadius:"20px" }}>
                  {/* Avatar */}
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-emerald-200 shadow-md shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `#${avatarCfg.bg}` }}>
                    <AvatarSvg config={avatarCfg} size={96} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-baloo font-black text-emerald-800 text-[22px] leading-tight truncate">{childName}</p>
                    <p className="font-nunito text-emerald-600 text-[12px] mt-0.5">
                      {AGE_GROUPS[ageGroup].emoji} {AGE_GROUPS[ageGroup].desc} · {LANGUAGES.find(l => l.code === language)?.native}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <motion.div key={i} initial={{ scale:0 }} animate={{ scale:1 }}
                          transition={{ delay:i*0.08, ...SPRING.card }}>
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </motion.div>
                      ))}
                      <span className="font-nunito text-amber-600 text-[11px] font-bold ml-1">Ready to earn stars!</span>
                    </div>
                  </div>
                </div>

                {/* 7-day trial callout */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-ds-club bg-ds-club-subtle">
                  <span className="text-[24px] shrink-0">👑</span>
                  <div>
                    <p className="font-baloo font-black text-ds-club-text text-[13px] leading-tight">7-day free trial — all of Club is yours</p>
                    <p className="font-nunito text-ds-club text-[11px]">Every story, unlimited Nimi AI & certificates. No credit card needed.</p>
                  </div>
                </div>

                {/* What they'll get */}
                <div className="space-y-2.5">
                  {[
                    { emoji:"📖", text:`Interactive stories in ${LANGUAGES.find(l => l.code === language)?.label}` },
                    { emoji:"🤖", text:"Nimi AI will guide every step" },
                    { emoji:"⭐", text:"Earn stars, badges & certificates" },
                    { emoji:"🎨", text:"Sing, color, read & explore" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-3 text-[13px] font-nunito font-semibold text-gray-700">
                      <span className="text-[18px]">{item.emoji}</span>
                      {item.text}
                    </div>
                  ))}
                </div>

                {error && <p className="text-red-500 text-[12px] font-semibold text-center">{error}</p>}

                <motion.button whileTap={{ scale:0.97 }} onClick={handleCreate} disabled={saving}
                  className="w-full text-white font-baloo font-black text-[18px] py-4 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 disabled:opacity-60 transition"
                  style={{ background:"linear-gradient(to right,#059669,#10b981)", borderRadius:"14px" }}>
                  {saving ? (
                    <motion.span animate={{ rotate:[0,360] }} transition={{ duration:1, repeat:Infinity, ease:"linear" }}>⭐</motion.span>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Begin {childName}&apos;s Adventure!</>
                  )}
                </motion.button>

                <button onClick={() => setStep(2)}
                  className="w-full text-emerald-600 font-nunito font-bold text-[13px] py-2 hover:underline">
                  ← Edit profile
                </button>
              </div>
            </motion.div>
          )}

          {/* ── DONE: Celebration ───────────────────────────────────────── */}
          {done && (
            <motion.div key="done" variants={fadeSlide} initial="hidden" animate="visible"
              className="w-full bg-white/90 backdrop-blur-sm border border-emerald-100 shadow-[0_24px_60px_rgba(5,150,105,0.12)] overflow-hidden text-center"
              style={{ borderRadius:"28px" }}>
              <div className="p-10 flex flex-col items-center">
                <motion.div
                  animate={{ scale:[1,1.12,1], rotate:[0,5,-5,0] }}
                  transition={{ duration:0.7, repeat:2 }}
                  className="text-[72px] mb-3 select-none" aria-hidden>🎉</motion.div>
                {/* Big avatar in the celebration */}
                <motion.div
                  initial={{ scale:0.7, opacity:0 }}
                  animate={{ scale:1, opacity:1 }}
                  transition={{ delay:0.3, type:"spring", stiffness:260, damping:18 }}
                  className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-300 shadow-2xl mb-4"
                  style={{ backgroundColor: `#${avatarCfg.bg}` }}>
                  <AvatarSvg config={avatarCfg} size={128} />
                </motion.div>
                <h2 className="font-baloo font-black text-emerald-700 text-[28px] leading-tight mb-2">
                  {childName} is ready!
                </h2>
                <p className="font-nunito text-gray-500 text-[14px]">
                  Your 7-day free trial is active — enjoy everything! 🎉
                </p>
                <p className="font-nunito text-gray-400 text-[12px] mt-1">
                  Taking you to the Story Library…
                </p>
                <motion.div className="mt-6 h-1.5 bg-emerald-100 rounded-full overflow-hidden w-48">
                  <motion.div className="h-full bg-emerald-500 rounded-full"
                    initial={{ width:"0%" }} animate={{ width:"100%" }}
                    transition={{ duration:1.8, ease:"easeInOut" }} />
                </motion.div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div className="relative z-10 py-4 text-center">
        <p className="text-emerald-600/60 font-nunito text-[11px]">
          © {new Date().getFullYear()} Nimipiko Studio LTD · Secure & Kid-Safe
        </p>
      </div>
    </div>
  );
}
