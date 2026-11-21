"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Star } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { createChild } from "@/lib/queries";
import { PENDING_REF_KEY } from "@/lib/referralConstants";
import type { Child } from "@/lib/queries";
import { SPRING } from "@/lib/design-system/motion";
import AvatarBuilder from "@/components/avatar/AvatarBuilder";
import AvatarSvg from "@/components/avatar/AvatarSvg";
import { serializeAvatar, DEFAULT_AVATAR, type AvatarConfig } from "@/lib/avatarConfig";
import { WorldBackdrop, WorldBrand, WorldNotice, GoldButton, GlassField } from "@/components/world-ui";
import "@/components/world-ui/world-ui.css";
import { WORLD } from "@/lib/design-system/world";

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

// 2 steps: Design avatar → Set up profile + launch
const STEPS = ["Design", "Profile"];

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
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/loginpage"); return; }
      const { data: p } = await supabase.from("parents").select("name").eq("id", user.id).maybeSingle();
      if (p?.name) setParentName(p.name.split(" ")[0]);
      const { data: kids } = await supabase.from("children").select("id").eq("parent_id", user.id).limit(1);
      if (kids && kids.length > 0) { router.replace("/home"); return; }

      // Apply pending referral code from signup (handles email-verification flow)
      const pendingRef = sessionStorage.getItem(PENDING_REF_KEY);
      if (pendingRef) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          try {
            await fetch("/api/referral", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ code: pendingRef }),
            });
          } catch (refErr) {
            console.warn("[onboarding] referral apply failed (non-blocking):", refErr);
          } finally {
            sessionStorage.removeItem(PENDING_REF_KEY);
          }
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

    setCreatedChildId(child.id);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Pre-generate referral code so ReferralCard loads instantly on first visit
      void fetch("/api/referral", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    }

    setDone(true);
    setTimeout(() => router.replace("/home"), 3000);
  }, [childName, ageGroup, language, avatarCfg, router]);

  const scene = done ? WORLD.scene(9) : step === 0 ? WORLD.scene(6) : WORLD.scene(8);

  return (
    <MotionConfig reducedMotion="user">
    <div className="wui-screen">
      {/* each check-in step has its own cabin scene, cross-faded */}
      <AnimatePresence>
        <motion.div key={scene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <WorldBackdrop src={scene} focus={{ x: 0.5, y: 0.4 }} shade="full" dim={0.2} />
        </motion.div>
      </AnimatePresence>

      <main id="main-content" className="wui-safe relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
        <div className="flex items-center justify-between gap-3">
          <WorldBrand subtitle="Check-in · New explorer" />
          {!done && (
            <ol className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-2">
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center whitespace-nowrap rounded-full px-2.5 font-baloo text-[13px] font-extrabold transition ${
                    i <= step ? "text-[#06101F]" : "text-[#FFF7E0]/55"}`}
                    style={i <= step
                      ? { background: "linear-gradient(120deg,#FDE68A,#E8BC56)", boxShadow: "0 3px 0 #8A6A1E" }
                      : { background: "rgba(255,247,224,0.08)", border: "1.5px solid rgba(253,230,138,0.25)" }}
                    aria-current={i === step ? "step" : undefined}>
                    {i + 1}<span className="ml-1 hidden sm:inline">· {label}</span>
                  </span>
                  {i < STEPS.length - 1 && <span className="h-0.5 w-5 rounded bg-[#FDE68A]/30" aria-hidden="true" />}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-6">
          <AnimatePresence mode="wait">

            {/* ── STEP 0: Avatar designer ─────────────────────────────────── */}
            {step === 0 && !done && (
              <motion.section key="s0" variants={fadeSlide} initial="hidden" animate="visible" exit="exit" aria-labelledby="s0-title"
                className="wui-glass w-full max-w-3xl rounded-[28px] p-4 sm:p-6">
                <p className="font-baloo text-[10px] font-extrabold tracking-[0.26em] text-[#E8BC56]">CHECK-IN · STEP 1 OF 2</p>
                <h1 id="s0-title" className="mt-1 font-baloo text-[22px] font-extrabold leading-tight text-[#FFF7E0] sm:text-[26px]">
                  Hi {parentName}! Design your <span className="whitespace-nowrap">explorer <span aria-hidden="true">🎨</span></span>
                </h1>
                <p className="mb-4 font-nunito text-sm font-bold text-[#FFF7E0]/65">Make your child&apos;s character completely unique</p>

                <AvatarBuilder initial={avatarCfg} onChange={setAvatarCfg} />

                <GoldButton full className="mt-5" onClick={() => setStep(1)} icon={<ArrowRight className="h-5 w-5" />}>
                  Next: name your explorer
                </GoldButton>
              </motion.section>
            )}

            {/* ── STEP 1: Name + age + language + create ──────────────────── */}
            {step === 1 && !done && (
              <motion.section key="s1" variants={fadeSlide} initial="hidden" animate="visible" exit="exit" aria-labelledby="s1-title"
                className="wui-glass w-full max-w-xl rounded-[28px] p-5 sm:p-7">
                <div className="flex items-center gap-4">
                  <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full" style={{ background: `#${avatarCfg.bg}`, boxShadow: "0 0 0 3px #06101F, 0 0 0 5px #E8BC56, 0 10px 24px rgba(0,0,0,0.45)" }}>
                    <AvatarSvg config={avatarCfg} size={72} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-baloo text-[10px] font-extrabold tracking-[0.26em] text-[#E8BC56]">CHECK-IN · STEP 2 OF 2</p>
                    <h1 id="s1-title" className="font-baloo text-[24px] font-extrabold leading-tight text-[#FFF7E0]">Who&apos;s the hero? <span aria-hidden="true">🌟</span></h1>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5">
                  <GlassField label="Child's name" icon={<Star className="h-5 w-5" />} type="text" maxLength={30} autoFocus autoComplete="off"
                    value={childName} onChange={e => { setChildName(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && childName.trim() && handleCreate()} placeholder="Enter name…" />

                  <fieldset>
                    <legend className="wui-label">Age group</legend>
                    <div className="grid grid-cols-2 gap-2.5">
                      {AGE_GROUPS.map((g, i) => (
                        <motion.button key={g.label} type="button" whileTap={{ scale: 0.95 }} onClick={() => setAgeGroup(i)} aria-pressed={ageGroup === i}
                          className="wui-option !flex-row !items-center !gap-3 !p-3 text-left">
                          <span className="text-2xl" aria-hidden="true">{g.emoji}</span>
                          <span className="min-w-0">
                            <span className="block text-[16px] leading-none">{g.label} yrs</span>
                            <span className="mt-1 block font-nunito text-[12px] font-bold opacity-75">{g.desc}</span>
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="wui-label">Learning language</legend>
                    <div className="grid grid-cols-3 gap-2.5">
                      {LANGUAGES.map(l => (
                        <motion.button key={l.code} type="button" whileTap={{ scale: 0.95 }} onClick={() => setLanguage(l.code)} aria-pressed={language === l.code}
                          className="wui-option !gap-1.5 !py-3">
                          <span className="text-[26px] leading-none" aria-hidden="true">{l.flag}</span>
                          <span className="text-[13px]">{l.native}</span>
                        </motion.button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="wui-row wui-row--gold">
                    <span className="text-xl" aria-hidden="true">👑</span>
                    <p className="font-nunito text-[13px] font-bold text-[#FFF7E0]/85">7-day free trial — all of Club unlocked. No credit card needed.</p>
                  </div>

                  <WorldNotice error={error} />

                  <div className="flex gap-3">
                    <GoldButton variant="glass" onClick={() => setStep(0)} icon={<ArrowLeft className="h-5 w-5" />} className="shrink-0 !px-5">Back</GoldButton>
                    <GoldButton className="min-w-0 flex-1" onClick={handleCreate} disabled={!childName.trim()} loading={saving} icon={<Sparkles className="h-5 w-5" />}>
                      Begin {childName || "the"} adventure!
                    </GoldButton>
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── DONE: Ready for departure — the paper boarding pass ─────── */}
            {done && (
              <motion.section key="done" aria-labelledby="done-title" role="status"
                initial={{ opacity: 0, rotateY: -70, y: 30 }} animate={{ opacity: 1, rotateY: 0, y: 0 }} transition={{ ...WORLD.spring.pop }}
                className="w-full max-w-md" style={{ perspective: 1200 }}>
                <div className="wui-paper p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="wui-paper__label">NIMIPIKO AIRWAYS</p>
                      <h1 id="done-title" className="font-baloo text-[22px] font-extrabold leading-tight">Boarding gate open <span aria-hidden="true">✈️</span></h1>
                    </div>
                    <motion.span animate={{ x: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} className="select-none text-4xl" aria-hidden="true">✈️</motion.span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="wui-paper__label">PASSENGER</p>
                      <p className="truncate font-baloo text-[22px] font-extrabold leading-tight">{childName.toUpperCase()}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="wui-paper__label">FLIGHT</p>
                      <p className="font-baloo text-lg font-extrabold text-[#1A3558]">NMP101</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-baloo text-2xl font-extrabold">NMP</p>
                      <p className="wui-paper__label !tracking-[0.12em]">NIMI ACADEMY</p>
                    </div>
                    <div className="flex flex-1 items-center gap-1 text-[#C9A84C]" aria-hidden="true">
                      <span className="h-px flex-1 bg-[#C9A84C]/60" />✈<span className="h-px flex-1 bg-[#C9A84C]/60" />
                    </div>
                    <div className="text-center">
                      <p className="font-baloo text-2xl font-extrabold">ADV</p>
                      <p className="wui-paper__label !tracking-[0.12em]">ADVENTURE</p>
                    </div>
                  </div>

                  <div className="wui-paper__perf" aria-hidden="true" />

                  <div className="flex items-center gap-4">
                    <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, ...WORLD.spring.pop }}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: `#${avatarCfg.bg}`, boxShadow: "0 0 0 3px #C9A84C, 0 8px 18px rgba(0,0,0,0.25)" }}>
                      <AvatarSvg config={avatarCfg} size={64} />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="font-baloo text-base font-extrabold leading-tight">{childName}&apos;s passport is ready!</p>
                      <p className="mt-0.5 font-nunito text-xs font-bold text-[#0B1A33]/60">7-day free trial active · All Club doors open 🎉</p>
                      <div className="mt-1.5 flex items-center gap-0.5" aria-hidden="true">
                        {[...Array(5)].map((_, i) => (
                          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.07, ...SPRING.card }}>
                            <Star className="h-4 w-4 fill-[#E8BC56] text-[#C9A84C]" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between"><span className="wui-paper__label">BOARDING…</span><span className="wui-paper__label">GATE CLOSING</span></div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#0B1A33]/10">
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#C9A84C,#FDE68A)" }}
                        initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2.8, ease: "easeInOut" }} />
                    </div>
                  </div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.4 }}
                    className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "linear-gradient(135deg,#06101F,#1A3558)" }}>
                    <span className="text-xl" aria-hidden="true">📘</span>
                    <div>
                      <p className="font-baloo text-xs font-extrabold leading-tight text-[#E8BC56]">Passport &amp; boarding pass ready</p>
                      <p className="font-nunito text-[11px] font-bold text-[#FFF7E0]/65">Download them anytime from your parent profile → Airways ✈️</p>
                    </div>
                  </motion.div>

                  <div className="mt-4 flex items-center justify-between gap-3" aria-hidden="true">
                    <div className="flex items-end gap-0.5">
                      {Array.from({ length: 28 }).map((_, i) => (
                        <div key={i} className="rounded-[1px] bg-[#0B1A33]" style={{ width: i % 3 === 0 ? 3 : 1.5, height: 28 }} />
                      ))}
                    </div>
                    <p className="font-baloo text-[11px] font-extrabold tracking-widest text-[#0B1A33]/45">{createdChildId?.slice(0, 8).toUpperCase() ?? "NMP-0001"}</p>
                  </div>
                </div>
              </motion.section>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center font-nunito text-[11px] font-bold text-[#FFF7E0]/45">
          © {new Date().getFullYear()} Nimipiko Studio LTD · Secure &amp; Kid-Safe
        </p>
      </main>
    </div>
    </MotionConfig>
  );
}
