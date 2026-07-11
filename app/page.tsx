"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play, CheckCircle2 } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import { getStorageUrl } from "@/lib/queries";

/* ─────────────────────────────────────────────────────────────
   DECORATION COMPONENTS
───────────────────────────────────────────────────────────── */

const DEMO_VIDEO_ID = "70pXI1F2HEs"; // YouTube Shorts demo

const CONFETTI_COLORS = [
  "#F472B6","#FB923C","#FBBF24","#34D399",
  "#60A5FA","#A78BFA","#F87171","#FDE68A","#6EE7B7",
];

function FloatCloud({ className = "", w = 140, delay = 0, opacity = 0.88, speed = 7 }: {
  className?: string; w?: number; delay?: number; opacity?: number; speed?: number;
}) {
  const noMotion = useReducedMotion();
  return (
    <motion.div
      className={`absolute pointer-events-none select-none z-0 ${className}`}
      animate={noMotion ? {} : { x:[0,20,0], y:[0,-8,0] }}
      transition={{ duration: speed, repeat: Infinity, ease:"easeInOut", delay }}
      style={{ opacity }}
      aria-hidden
    >
      <svg width={w} height={Math.round(w * 0.5)} viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="74" rx="88" ry="20" fill="white" />
        <circle cx="58"  cy="56" r="28" fill="white" />
        <circle cx="100" cy="42" r="38" fill="white" />
        <circle cx="143" cy="56" r="28" fill="white" />
      </svg>
    </motion.div>
  );
}

function Butterfly({ className = "", delay = 0, size = 30, hue = 0 }: {
  className?: string; delay?: number; size?: number; hue?: number;
}) {
  const noMotion = useReducedMotion();
  return (
    <motion.div
      className={`absolute pointer-events-none select-none z-0 ${className}`}
      animate={noMotion ? {} : { y:[0,-22,6,-16,4,-10,0], x:[0,14,-8,18,-4,10,0], rotate:[-8,8,-8] }}
      transition={{ duration: 5.5, repeat: Infinity, ease:"easeInOut", delay }}
      style={{ fontSize: size, filter: hue ? `hue-rotate(${hue}deg)` : undefined }}
      aria-hidden
    >
      🦋
    </motion.div>
  );
}

function Star({ className = "", delay = 0, size = 18 }: {
  className?: string; delay?: number; size?: number;
}) {
  const noMotion = useReducedMotion();
  return (
    <motion.span
      className={`absolute pointer-events-none select-none z-0 ${className}`}
      animate={noMotion ? {} : { opacity:[0.25,1,0.25], scale:[0.6,1.3,0.6], rotate:[0,20,-20,0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease:"easeInOut", delay }}
      style={{ fontSize: size }}
      aria-hidden
    >
      ⭐
    </motion.span>
  );
}

function Sparkle({ className = "", delay = 0, w = 32 }: {
  className?: string; delay?: number; w?: number;
}) {
  return (
    <motion.img
      src="/themes/default/decorations/sparkle.png"
      alt="" aria-hidden
      className={`absolute pointer-events-none select-none z-0 ${className}`}
      style={{ width: w }}
      animate={{ opacity:[0.2,0.95,0.2], scale:[0.6,1.15,0.6], rotate:[0,60,0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease:"easeInOut", delay }}
    />
  );
}

function ConfettiRain({ count = 14, className = "" }: { count?: number; className?: string; }) {
  const noMotion = useReducedMotion();
  if (noMotion) return null;
  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-0 overflow-hidden ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const color   = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left    = `${5 + (i / count) * 90}%`;
        const delay   = (i * 0.35) % 3.2;
        const dur     = 3.2 + (i % 4) * 0.7;
        const sz      = 6 + (i % 4) * 3;
        const isRound = i % 3 === 0;
        const drift   = i % 2 === 0 ? 24 : -24;
        return (
          <motion.div key={i}
            className="absolute top-0"
            style={{ left, width: sz, height: isRound ? sz : sz * 1.6, background: color, borderRadius: isRound ? "50%" : 3 }}
            animate={{ y:["−5%","108%"], x:[0, drift], rotate:[0, 360*(i%2===0?1:-1)], opacity:[0,1,1,0] }}
            transition={{ duration: dur, repeat: Infinity, ease:"linear", delay }}
          />
        );
      })}
    </div>
  );
}

/* Flower divider — one flower per grid cell so they spread perfectly edge-to-edge */
const FLOWER_ROW = [
  { f:"🌸", sz:26, mb:6  },
  { f:"🌿", sz:20, mb:0  },
  { f:"🌼", sz:30, mb:8  },
  { f:"🌱", sz:18, mb:2  },
  { f:"🌻", sz:34, mb:10 },
  { f:"🍀", sz:22, mb:1  },
  { f:"🌺", sz:28, mb:5  },
  { f:"🌸", sz:24, mb:7  },
  { f:"🌼", sz:30, mb:3  },
  { f:"🌻", sz:32, mb:9  },
  { f:"🍀", sz:22, mb:2  },
  { f:"🌺", sz:26, mb:4  },
  { f:"🌿", sz:20, mb:0  },
  { f:"🌸", sz:28, mb:6  },
  { f:"🌼", sz:30, mb:8  },
  { f:"🌻", sz:34, mb:10 },
  { f:"🌱", sz:18, mb:1  },
  { f:"🍀", sz:22, mb:3  },
  { f:"🌺", sz:26, mb:5  },
  { f:"🌸", sz:24, mb:7  },
] as const;

function FlowerDivider({ bgColor = "transparent" }: { bgColor?: string }) {
  return (
    <div
      className="w-full overflow-hidden pointer-events-none select-none"
      style={{ height: 72, background: bgColor }}
      aria-hidden
    >
      {/* CSS grid gives each flower an equal slot — no grouping, no gaps */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${FLOWER_ROW.length}, 1fr)`,
          alignItems: "end",
          height: "100%",
        }}
      >
        {FLOWER_ROW.map(({ f, sz, mb }, i) => {
          const dur   = 1.7 + (i % 7) * 0.22;
          const delay = (i * 0.18) % 2.8;
          const angle = 10 + (i % 4) * 3;
          return (
            <motion.span
              key={i}
              className="leading-none flex items-end justify-center"
              style={{ fontSize: sz, paddingBottom: mb }}
              animate={{ rotate: [-angle, angle, -angle], y: [0, -4, 0] }}
              transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
            >
              {f}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   APP PREVIEW — phone mockup screens
───────────────────────────────────────────────────────────── */

function AppMockup({ screen }: { screen: number }) {
  // Screen 0: Real app screenshot — the actual NIMIPIKO home world
  if (screen === 0) return (
    <img
      src="/home-hero-mobile.png"
      alt="NIMIPIKO home screen"
      className="absolute inset-0 w-full h-full object-cover object-top select-none"
      draggable={false}
    />
  );

  // Screen 1: Story reader — uses the real in-app parchment page frame
  if (screen === 1) return (
    <div className="absolute inset-0 overflow-hidden flex flex-col" style={{ background: "#1b3d27" }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2 shrink-0">
        <span className="text-[8px] font-bold text-green-200">9:41</span>
        <div className="flex items-center gap-1.5">
          <img loading="lazy" src="/nimi-logo.png" alt="" className="w-4 h-4 object-contain" draggable={false} />
          <span className="text-[8px] font-black text-yellow-300">⭐ 245</span>
        </div>
      </div>
      {/* Story header */}
      <div className="flex items-center gap-2 px-3 pb-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-base shrink-0 shadow-md">🦁</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-[9.5px] leading-tight truncate">The Brave Lion</p>
          <p className="text-green-300 text-[7px]">Chapter 2 · Page 4 of 12</p>
        </div>
        <img loading="lazy" src="/current-story.png" alt="" className="h-4 object-contain shrink-0" draggable={false} />
      </div>
      {/* Parchment page — uses real reader asset */}
      <div className="flex-1 min-h-0 px-2 pb-1 flex flex-col">
        <div className="relative flex-1">
          <img loading="lazy" src="/themes/default/reader/page-background.png" alt=""
            className="absolute inset-0 w-full h-full object-fill" draggable={false} />
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-7 py-6">
            <p className="font-baloo font-black text-amber-900 text-[8.5px] leading-relaxed text-center">
              &ldquo;Be brave, little lion,&rdquo;<br />said the old tree.<br />&ldquo;Your roar will shake<br />the whole forest someday.&rdquo;
            </p>
            <div className="flex justify-center gap-1 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-700" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
            </div>
          </div>
        </div>
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 py-2.5 shrink-0">
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-[11px]">◀</button>
          <button className="w-11 h-11 rounded-full bg-amber-400 flex items-center justify-center text-white text-[16px] shadow-lg">▶</button>
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-[11px]">▶▶</button>
        </div>
      </div>
    </div>
  );

  // Screen 2: Rewards — uses real certificate-frame and trophy assets
  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col items-center" style={{ background: "var(--parchment, #fdf3e0)" }}>
      <div className="flex items-center justify-between w-full px-4 pt-10 pb-1 shrink-0">
        <span className="text-[8px] font-bold text-gray-600">9:41</span>
        <span className="text-[8px] font-black text-amber-500">⭐ 260</span>
      </div>
      <img loading="lazy" src="/themes/default/rewards/trophy.png" alt="" className="w-14 h-14 object-contain drop-shadow-xl mt-1" draggable={false} />
      <p className="font-baloo font-black text-gray-900 text-[12px] mt-1.5">Story Complete! 🎉</p>
      <div className="flex gap-0.5 mt-1">
        {Array.from({length:5}).map((_,i) => <span key={i} className="text-yellow-400 text-[15px]">★</span>)}
      </div>
      <p className="text-[7.5px] text-gray-500 mt-0.5 mb-3">+15 stars · Lion Champion badge unlocked</p>
      {/* Real certificate frame asset */}
      <div className="relative px-4 w-full">
        <img loading="lazy" src="/themes/default/rewards/certificate-frame.png" alt="Certificate of Achievement"
          className="w-full object-contain" draggable={false} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
          <p className="font-baloo font-black text-amber-800 text-[7px] uppercase tracking-widest leading-tight">Certificate of</p>
          <p className="font-baloo font-black text-amber-900 text-[10px] leading-tight">Achievement</p>
          <p className="font-nunito text-amber-700 text-[7px] text-center mt-0.5 leading-tight">
            Amara completed<br /><span className="font-bold">The Brave Lion</span>
          </p>
          <img loading="lazy" src="/themes/default/rewards/ribbon.png" alt="" className="w-5 h-5 object-contain mt-1.5" draggable={false} />
        </div>
      </div>
      <div className="mx-4 mt-2 w-[calc(100%-32px)] bg-[#15803d] text-white text-[8.5px] font-black text-center py-2 rounded-xl shadow-md shrink-0">
        📥 Download Certificate
      </div>
    </div>
  );
}

const PREVIEW_SCREENS = [
  { label: "Home World",    icon: "🏠", desc: "A magical world Nimi, Piko and Zilo built just for your child — READ, CREATE, SING, EXPLORE and more." },
  { label: "Story Reader",  icon: "📖", desc: "Beautifully illustrated stories read aloud in 3 languages, with vocabulary and page-turn narration."   },
  { label: "Certificates",  icon: "🏆", desc: "Every completed story earns a real, printable certificate your child can hang on the wall."             },
] as const;

function DemoVideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="relative bg-white px-5 sm:px-10 lg:px-14 py-16 sm:py-24 border-t border-gray-100 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #15803d 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* ── Copy side ─────────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="flex-1 text-center lg:text-left">
            <span className="eyebrow inline-block text-green-800 mb-5 bg-green-200 px-4 py-1.5 rounded-full">
              🎬 See it in action
            </span>
            <h2 className="font-baloo font-black text-gray-900 text-[30px] sm:text-[42px] leading-tight mb-5">
              One minute.<br />
              <span className="text-nimi-green">A world of learning.</span>
            </h2>
            <p className="font-nunito text-gray-500 text-[15px] leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Watch how NIMIPIKO turns screen time into story time — with hands-on missions, songs, drawing and certificates your child can print and keep.
            </p>
            <ul className="flex flex-col gap-3 mb-8 max-w-sm mx-auto lg:mx-0">
              {[
                { icon: "📚", text: "Stories read aloud in 3 languages" },
                { icon: "🎨", text: "6 creative missions per story" },
                { icon: "🏆", text: "Certificates for every completion" },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-3 font-nunito text-[14px] text-gray-600">
                  <span className="text-[18px] shrink-0">{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <span className="flex items-center gap-1.5 font-nunito text-gray-400 text-[12px]">
                <span>⏱️</span>60-second tour
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5 font-nunito text-gray-400 text-[12px]">
                <span>🔒</span>No ads, no distractions
              </span>
            </div>
          </motion.div>

          {/* ── Portrait video (9:16 Short) ────────────────────────── */}
          <motion.div variants={fadeUp} className="shrink-0 w-full max-w-[280px] sm:max-w-[300px]">
            <div className="relative">
              <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-green-100 to-emerald-200 opacity-80 blur-2xl" />
              {/* Phone-style frame */}
              <div className="relative overflow-hidden shadow-2xl"
                style={{ borderRadius: "28px", aspectRatio: "9/16", background: "#000" }}>
                {playing ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    title="NIMIPIKO demo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full border-0"
                  />
                ) : (
                  <button onClick={() => setPlaying(true)}
                    className="absolute inset-0 w-full h-full group cursor-pointer"
                    aria-label="Play NIMIPIKO demo">
                    <img loading="lazy" src="/home-hero-mobile.png" alt="NIMIPIKO app"
                      className="absolute inset-0 w-full h-full object-cover object-top" draggable={false} />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <div className="absolute w-24 h-24 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "2.2s" }} />
                        <div className="relative w-16 h-16 rounded-full bg-white shadow-2xl flex items-center justify-center">
                          <Play className="w-6 h-6 fill-[#15803d] text-[#15803d] ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

function AppPreviewSection({ authed }: { authed: boolean }) {
  const [active, setActive] = useState(0);

  return (
    <section className="py-20 sm:py-28 px-5 sm:px-10 lg:px-14 bg-white overflow-visible">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>

          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4"
              style={{ color:"var(--ds-brand-primary)", background:"var(--ds-brand-subtle)" }}>
              📱 Explore The App
            </span>
            <h2 className="font-baloo font-black text-gray-900 text-[30px] sm:text-[46px] leading-tight">
              Built to enchant<br className="hidden sm:block" /> curious minds
            </h2>
            <p className="font-nunito text-gray-500 mt-4 text-[15px] max-w-md mx-auto leading-relaxed">
              From the first story to the final badge — every screen designed to delight children and reassure parents.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* ── Feature tabs ── */}
            <motion.div variants={fadeUp} className="flex flex-col gap-3 order-2 lg:order-1">
              {PREVIEW_SCREENS.map((s, i) => (
                <button key={s.label} onClick={() => setActive(i)}
                  className={`flex items-start gap-4 p-5 rounded-2xl text-left transition-all duration-200 group ${
                    active === i ? "bg-green-50 border-2 border-green-200 shadow-sm" : "border-2 border-transparent hover:bg-gray-50"
                  }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[20px] shrink-0 transition-colors ${
                    active === i ? "bg-green-600" : "bg-gray-100 group-hover:bg-gray-200"
                  }`}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-baloo font-black text-[16px] leading-snug transition-colors ${
                      active === i ? "text-green-700" : "text-gray-700"
                    }`}>{s.label}</p>
                    <p className="font-nunito text-gray-500 text-[13px] leading-relaxed mt-0.5">{s.desc}</p>
                  </div>
                  {active === i && <div className="w-1 self-stretch rounded-full bg-green-400 shrink-0" />}
                </button>
              ))}

              <div className="flex gap-3 mt-2">
                <Link href={authed ? "/home" : "/signuppage"}
                  className="flex-1 text-center text-white font-baloo font-black text-[14px] py-3.5 rounded-2xl transition-all hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, var(--nimi-green) 0%, #166534 100%)", boxShadow: "0 4px 16px rgba(21,128,61,0.35)" }}>
                  Try It Free →
                </Link>
                <Link href="/stories"
                  className="flex-1 text-center text-gray-600 font-baloo font-black text-[14px] py-3.5 rounded-2xl border-2 border-gray-200 hover:border-green-300 hover:text-green-700 transition-all">
                  Browse Stories
                </Link>
              </div>
            </motion.div>

            {/* ── Phone mockup ── */}
            <motion.div variants={fadeUp} className="flex justify-center order-1 lg:order-2">
              <div className="relative">
                <div className="absolute inset-[-20%] blur-3xl opacity-15 rounded-full"
                  style={{ background: "radial-gradient(ellipse, var(--nimi-green) 0%, transparent 70%)" }} />

                {/* Phone shell */}
                <div className="relative w-[240px] h-[490px] rounded-[3rem] overflow-hidden"
                  style={{ background: "#111827", boxShadow: "0 0 0 6px #1f2937, 0 0 0 7px #374151, 0 40px 80px rgba(0,0,0,0.40)" }}>
                  {/* Notch */}
                  <div className="absolute top-0 inset-x-0 flex justify-center z-20 pt-2">
                    <div className="w-16 h-4 bg-gray-900 rounded-b-xl" />
                  </div>
                  {/* Home indicator */}
                  <div className="absolute bottom-1.5 inset-x-0 flex justify-center z-20">
                    <div className="w-12 h-1 bg-gray-700 rounded-full" />
                  </div>
                  {/* Screen */}
                  <AnimatePresence mode="wait">
                    <motion.div key={active}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3, ease: [0.22,1,0.36,1] }}
                      className="absolute inset-0">
                      <AppMockup screen={active} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Floating notification pills */}
                <motion.div
                  animate={{ y: [0,-6,0] }} transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
                  className="absolute -left-10 top-[28%] bg-white border border-gray-100 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="font-baloo font-black text-gray-900 text-[12px] leading-none">+15 Stars!</p>
                    <p className="font-nunito text-gray-400 text-[9px]">Mission complete</p>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0,6,0] }} transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut", delay:0.8 }}
                  className="absolute -right-10 top-[52%] bg-white border border-gray-100 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2">
                  <span className="text-xl">🏅</span>
                  <div>
                    <p className="font-baloo font-black text-gray-900 text-[12px] leading-none">New Badge!</p>
                    <p className="font-nunito text-gray-400 text-[9px]">Lion Champion</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FAQ
───────────────────────────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    q: "What age is NIMIPIKO designed for?",
    a: "Stories and missions are crafted for children aged 3–10. Each story is tagged by age range so you always pick the perfect fit — and content grows with your child.",
  },
  {
    q: "Is it safe? No ads, no strangers?",
    a: "Completely. NIMIPIKO is ad-free, has no social chat features, and children cannot make in-app purchases. Every story is reviewed by certified child development educators. Your child's data is never shared or sold — ever.",
  },
  {
    q: "Can my child switch between languages?",
    a: "Yes! Switch between English, French, and Kinyarwanda anytime from settings. Progress in each language is saved separately — nothing is lost when you switch.",
  },
  {
    q: "How many children can share one account?",
    a: "A single family account supports multiple children, each with their own profile, adventure map, badge collection, and progress dashboard.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel anytime from your account settings in one tap. You keep full access until the end of your current billing period. No penalties, no awkward calls, no hidden fees.",
  },
  {
    q: "Does it work on slow or mobile internet?",
    a: "NIMIPIKO is optimised for lower-bandwidth connections and loads quickly on mobile data. We're also building offline-first features — coming soon.",
  },
  {
    q: "Do I need to be there while my child uses it?",
    a: "That's entirely up to you. NIMIPIKO is safe for independent use, but learning together makes it even more magical. The parent dashboard keeps you fully informed either way.",
  },
] as const;

/* Slowly fluctuates ±8 every few seconds to look live */
function EarlyAccessPill() {
  return (
    <span className="inline-flex items-center gap-1.5 font-nunito font-semibold text-[12px] text-gray-700 bg-white/85 backdrop-blur-sm border border-green-100 px-3 py-1 rounded-full shadow-sm">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
      <span>🌱 Now in early access — founding families only</span>
    </span>
  );
}

function StickyMobileCTA({ href, visible }: { href: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 88 }}
          animate={{ y: 0 }}
          exit={{ y: 88 }}
          transition={{ type: "spring", damping: 30, stiffness: 320 }}
          className="fixed bottom-0 inset-x-0 z-[55] lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-2xl px-4 pt-2 pb-4">
            <p className="text-center font-nunito text-gray-400 text-[10px] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1 animate-pulse" />
              🏅 Founding family price — locks in forever
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={href}
                className="flex-1 flex items-center justify-center gap-2 text-white font-baloo font-black text-[15px] py-3.5 rounded-2xl"
                style={{ background: "linear-gradient(135deg, var(--nimi-green) 0%, #166534 100%)", boxShadow: "0 4px 16px rgba(21,128,61,0.40)" }}
              >
                🚀 Start Free Today
              </Link>
              <div className="shrink-0 text-center">
                <p className="font-nunito text-gray-400 text-[10px] leading-tight">No credit card</p>
                <p className="font-nunito text-gray-400 text-[10px] leading-tight">Cancel anytime</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="relative px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white">
      <div className="max-w-3xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="eyebrow inline-block text-gray-700 mb-4 bg-gray-100 px-4 py-1.5 rounded-full">
              💬 Quick Answers
            </span>
            <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
              Questions parents ask
            </h2>
            <p className="font-nunito text-gray-500 mt-3 text-[15px] max-w-lg mx-auto">
              Everything you need to know before getting started.
            </p>
          </motion.div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between text-left px-6 py-5 hover:bg-gray-50 transition-colors gap-4"
                >
                  <span className="font-baloo font-black text-gray-900 text-[15px] sm:text-[17px] leading-snug">
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[18px] font-light shrink-0 transition-colors"
                    style={{
                      background: open === i ? "var(--nimi-green)" : "var(--ds-brand-subtle)",
                      color: open === i ? "white" : "var(--ds-brand-primary)",
                    }}
                  >
                    +
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="font-nunito text-gray-500 text-[14px] sm:text-[15px] leading-relaxed px-6 pb-6 pt-1">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <p className="font-nunito text-gray-400 text-[14px]">
              Still have questions?{" "}
              <Link href="/help" className="font-bold hover:underline transition-colors" style={{ color: "var(--ds-brand-primary)" }}>
                Visit our Help Center →
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE DATA
───────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label:"Home",       href:"/",          img:"/themes/default/navs/home.png"       },
  { label:"Stories",    href:"/stories",   img:"/themes/default/navs/Stories.png"    },
  { label:"Activities", href:"/missions",  img:"/themes/default/navs/activities.png" },
  { label:"Community",  href:"/community", img:"/themes/default/navs/community.png"  },
  { label:"Parents",    href:"/parents",   img:"/themes/default/navs/parent.png"     },
  { label:"Help",       href:"/help",      img:"/themes/default/navs/about.png"      },
] as const;

const fadeUp = {
  hidden:  { opacity:0, y:30 },
  visible: { opacity:1, y:0, transition:{ duration:0.55, ease:[0.22,1,0.36,1] as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition:{ staggerChildren:0.11 } },
};

interface Story { id:string; slug:string; title:string; cover_url?:string; theme_emoji?:string; }

/* ─────────────────────────────────────────────────────────────
   APP STORE BADGES
   Set NEXT_PUBLIC_IOS_URL / NEXT_PUBLIC_ANDROID_URL in .env
   to activate. Shows "coming soon" state when empty.
───────────────────────────────────────────────────────────── */

const IOS_URL     = process.env.NEXT_PUBLIC_IOS_URL     ?? ""; // App Store / TestFlight
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL ?? ""; // Google Play Store
const APK_URL     = process.env.NEXT_PUBLIC_APK_URL     ?? ""; // Direct APK download

function AppStoreBadges({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-9" : "h-11";
  const textSm = size === "sm" ? "text-[10px]" : "text-[11px]";
  const textLg = size === "sm" ? "text-[12px]" : "text-[13px]";

  // Android: prefer Play Store, fall back to direct APK, fall back to signup
  const androidUrl  = ANDROID_URL || APK_URL || "/signuppage";
  const androidDirect = !ANDROID_URL && !!APK_URL; // true = direct APK download

  // iOS: App Store / TestFlight, fall back to signup
  const iosUrl = IOS_URL || "/signuppage";

  const isExternal = (u: string) => u.startsWith("http");

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>

      {/* ── App Store (iOS) ── */}
      <a href={iosUrl}
        target={isExternal(iosUrl) ? "_blank" : undefined}
        rel={isExternal(iosUrl) ? "noopener noreferrer" : undefined}
        aria-label="Download on the App Store"
        className={`${h} inline-flex items-center hover:opacity-85 active:scale-95 transition-all duration-150 rounded-[7px] overflow-hidden`}>
        <svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" className={`${h} w-auto`} aria-hidden>
          <rect width="120" height="40" rx="7" fill="black"/>
          <text x="38" y="14" fontFamily="system-ui,sans-serif" fontSize="7" fill="white" fontWeight="400">Download on the</text>
          <text x="38" y="27" fontFamily="system-ui,sans-serif" fontSize="13" fill="white" fontWeight="600">App Store</text>
          <path d="M16 10.5c1.8-2.2 4.6-2 4.6-2s.4 2.6-1.4 4.2c-1.9 1.7-4 1.4-4 1.4s-.5-2.2.8-3.6zm-1.2 4.8c.9 0 2.5-1.2 4.6-1.2 3.6 0 5 2.6 5 2.6s-2.8 1.4-2.8 4.8c0 3.8 3.4 5.2 3.4 5.2s-2.4 6.7-5.6 6.7c-1.5 0-2.6-.9-4-.9-1.5 0-3 1-4 1C8 33.5 5 27 5 22c0-4.6 2.9-7 5.6-7 1.6 0 2.8 1.3 4.2 1.3z" fill="white"/>
        </svg>
      </a>

      {/* ── Google Play or Direct APK ── */}
      {androidDirect ? (
        /* Direct APK download badge */
        <a href={androidUrl} download aria-label="Download APK for Android"
          className={`${h} inline-flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#16213e] active:scale-95 transition-all duration-150 rounded-[7px] px-3`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            {/* Android robot */}
            <path d="M7 18h10V9H7v9zm4-1H9v-2h2v2zm4 0h-2v-2h2v2zm-6-4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" fill="#3DDC84"/>
            <path d="M5 20h14a1 1 0 001-1V8a1 1 0 00-1-1H5a1 1 0 00-1 1v11a1 1 0 001 1z" stroke="#3DDC84" strokeWidth="1.5" fill="none"/>
            <path d="M8.5 7L7 4.5M15.5 7L17 4.5" stroke="#3DDC84" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9.5" cy="6" r="0.75" fill="#3DDC84"/>
            <circle cx="14.5" cy="6" r="0.75" fill="#3DDC84"/>
          </svg>
          <div className="flex flex-col leading-tight">
            <span className={`${textSm} text-gray-400 font-medium`}>Download</span>
            <span className={`${textLg} text-white font-bold`}>Android APK</span>
          </div>
        </a>
      ) : (
        /* Google Play Store badge */
        <a href={androidUrl}
          target={isExternal(androidUrl) ? "_blank" : undefined}
          rel={isExternal(androidUrl) ? "noopener noreferrer" : undefined}
          aria-label="Get it on Google Play"
          className={`${h} inline-flex items-center hover:opacity-85 active:scale-95 transition-all duration-150 rounded-[7px] overflow-hidden`}>
          <svg viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg" className={`${h} w-auto`} aria-hidden>
            <rect width="135" height="40" rx="7" fill="black"/>
            <text x="42" y="14" fontFamily="system-ui,sans-serif" fontSize="7" fill="white" fontWeight="400">GET IT ON</text>
            <text x="42" y="27" fontFamily="system-ui,sans-serif" fontSize="13" fill="white" fontWeight="600">Google Play</text>
            <path d="M12 8l16 12-16 12V8z" fill="#00C853"/>
            <path d="M12 8l8.5 8.5L12 25V8z" fill="#00BCD4"/>
            <path d="M20.5 16.5L28 20l-7.5 3.5-8.5-7 8-7 8 7z" fill="#FFD600"/>
            <path d="M12 25l8.5-8.5L28 20l-8 7.5-8-2.5z" fill="#FF3D00"/>
          </svg>
        </a>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NEWSLETTER SECTION
───────────────────────────────────────────────────────────── */

const NL_BENEFITS = [
  { icon: "📖", text: "New story drops every month" },
  { icon: "🏆", text: "Learning tips & child milestones" },
  { icon: "🎁", text: "Members-only activities & printables" },
];

function NewsletterSection() {
  const [email, setEmail]   = useState("");
  const [name,  setName]    = useState("");
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

      {/* dot-grid texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
      {/* ambient glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)" }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── Left: copy + benefits ── */}
          <div>
            {/* live pill */}
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

          {/* ── Right: form card ── */}
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

/* ─────────────────────────────────────────────────────────────
   PAGE COMPONENT
───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const noMotion = useReducedMotion();
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [stories,        setStories]        = useState<Story[]>([]);
  const [authed,         setAuthed]         = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  const [ctaVisible,     setCtaVisible]     = useState(false);
  const [testimonials,   setTestimonials]   = useState<{
    id: string; name: string; role: string; location: string | null;
    quote: string; rating: number; avatar_url: string | null;
  }[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user } }) => { if (user) setAuthed(true); });
  }, []);
  useEffect(() => {
    fetch("/api/featured-stories?limit=4")
      .then(r => r.json())
      .then((d: unknown) => { if (Array.isArray(d)) setStories((d as Story[]).slice(0,4)); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    supabase
      .from('testimonials')
      .select('id, name, role, location, quote, rating, avatar_url')
      .eq('approved', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setTestimonials(data); });
  }, []);
  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 60);
      setCtaVisible(window.scrollY > 480);
    };
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "NIMIPIKO",
    "applicationCategory": "EducationApplication",
    "operatingSystem": "Web, iOS, Android",
    "inLanguage": ["en", "fr", "rw"],
    "description": "Interactive stories, AI companion Nimi and achievement certificates for children ages 2–12 in English, French and Kinyarwanda.",
    "url": "https://nimipiko.com",
    "image": "https://nimipiko.com/nimipiko.png",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "author": { "@type": "Organization", "name": "NIMIPIKO", "url": "https://nimipiko.com" },
    "audience": { "@type": "EducationalAudience", "educationalRole": "student", "audienceType": "Children ages 2–12" },
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="min-h-screen font-nunito overflow-x-clip w-full" style={{ backgroundColor: 'var(--parchment)' }}>

      {/* ══ NAV ══════════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-2xl border-b-2 border-gray-300 shadow-[0_8px_40px_rgba(0,0,0,0.14)]" : ""
      }`}>
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 w-full">

          <Link href="/" className={`shrink-0 transition-opacity duration-200 ${
            menuOpen ? "opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto" : "opacity-100"
          }`}>
            <img loading="lazy" src="/nimi-logo.png" alt="NIMIPIKO"
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-md" />
          </Link>

          <ul className="hidden lg:flex items-center gap-3 xl:gap-4">
            {NAV_LINKS.map(n => (
              <motion.li key={n.label}
                whileHover={{ scale:1.08, y:-2 }} whileTap={{ scale:0.94 }}
                transition={{ type:"spring", stiffness:400, damping:20 }}>
                <Link href={n.href}>
                  <img loading="lazy" src={n.img} alt={n.label} draggable={false}
                    className="h-9 xl:h-10 w-auto object-contain select-none drop-shadow-sm" />
                </Link>
              </motion.li>
            ))}
          </ul>

          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {authed ? (
              <Link href="/home" className="font-baloo font-bold text-[13px] xl:text-[14px] text-white px-4 xl:px-5 py-2 rounded-full shadow-sm transition-colors whitespace-nowrap" style={{backgroundColor:'var(--nimi-green)'}}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/loginpage" className="font-baloo font-bold text-[13px] xl:text-[14px] text-gray-700 px-4 xl:px-5 py-2 rounded-full border border-gray-200/80 hover:bg-gray-50/80 transition-all whitespace-nowrap backdrop-blur-sm">
                  Log In
                </Link>
                <Link href="/signuppage" className="font-baloo font-bold text-[13px] xl:text-[14px] text-white px-4 xl:px-5 py-2 rounded-full shadow-sm transition-all hover:-translate-y-px whitespace-nowrap" style={{backgroundColor:'var(--nimi-green)', boxShadow:'0 2px 12px rgba(21,128,61,0.30)'}}>
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}
            className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-full hover:bg-gray-100/70 transition-colors shrink-0">
            {(["a","b","c"] as const).map((k,i) => (
              <motion.span key={k}
                className="block w-[22px] h-[2px] rounded-full bg-gray-700"
                animate={i===0?(menuOpen?{rotate:45,y:7}:{rotate:0,y:0}):i===1?(menuOpen?{opacity:0,scaleX:0}:{opacity:1,scaleX:1}):(menuOpen?{rotate:-45,y:-7}:{rotate:0,y:0})}
                transition={{ duration:i===1?0.15:0.25, ease:"easeInOut" }} />
            ))}
          </button>
        </div>
      </nav>

      {/* ══ DRAWER ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
              className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20" onClick={() => setMenuOpen(false)} />
            <motion.div initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}}
              transition={{type:"spring", damping:26, stiffness:280}}
              className="fixed left-0 top-0 h-[100dvh] w-72 z-50 shadow-2xl flex flex-col overflow-hidden"
              style={{background:"#f2ead8"}}>
              <div className="flex flex-col items-center pt-6 pb-2 px-5 shrink-0">
                <img loading="lazy" src="/nimi-logo.png" alt="NIMIPIKO" className="w-40 h-40 object-contain drop-shadow-sm" />
              </div>
              <nav className="flex flex-col px-4 flex-1 justify-center gap-0.5 overflow-y-auto">
                {NAV_LINKS.map(({label,href,img}) => (
                  <motion.div key={label} whileHover={{scale:1.05,y:-2}} whileTap={{scale:0.96}}
                    transition={{type:"spring",stiffness:400,damping:20}}>
                    <Link href={href} onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-2">
                      <img loading="lazy" src={img} alt={label} draggable={false} className="h-10 w-auto object-contain select-none" />
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mx-6 border-t border-black/8 shrink-0" />
              <div className="px-6 py-4 shrink-0 flex flex-col gap-2.5">
                {authed ? (
                  <Link href="/home" onClick={() => setMenuOpen(false)}
                    className="w-full text-center font-baloo font-bold text-white py-2.5 rounded-full text-[14px] shadow-md transition-colors"
                    style={{backgroundColor:'var(--nimi-green)'}}>
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/loginpage" onClick={() => setMenuOpen(false)}
                      className="w-full text-center font-baloo font-bold text-gray-700 border border-gray-300 py-2.5 rounded-full text-[14px] hover:bg-black/5 transition-colors">
                      Log In
                    </Link>
                    <Link href="/signuppage" onClick={() => setMenuOpen(false)}
                      className="w-full text-center font-baloo font-bold text-white py-2.5 rounded-full text-[14px] shadow-md transition-colors"
                      style={{backgroundColor:'var(--nimi-green)'}}>
                      Get Started
                    </Link>
                  </>
                )}
              </div>
              <div className="shrink-0">
                <FlowerDivider bgColor="rgba(242,234,216,0.8)" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ HERO MOBILE ══════════════════════════════════════════════ */}
      <section className="sm:hidden relative overflow-hidden" style={{minHeight:"100svh"}}>
        <img loading="eager" fetchPriority="high" src="/themes/default/hero/hero-background.png" alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
          style={{willChange:"transform",transform:"translateZ(0)"}} />
        <div className="absolute inset-x-0 top-0 h-[45%] pointer-events-none"
          style={{background:"linear-gradient(to bottom,rgba(255,255,255,0.92) 0%,rgba(255,255,255,0.85) 55%,transparent 100%)"}} />
        <FloatCloud className="top-20 -left-6" w={110} delay={0} opacity={0.55} speed={8} />

        <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center text-center px-6" style={{paddingTop:"clamp(92px,14dvh,112px)"}}>
          <span className="inline-flex items-center gap-1.5 font-nunito font-bold text-[10px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-2 shadow-sm">
            🇷🇼 Kinyarwanda · 🇫🇷 Français · 🇬🇧 English
          </span>
          <h1 className="font-baloo font-black leading-tight mb-1.5" style={{fontSize:"clamp(1.65rem,7.5vw,2.1rem)"}}>
            <span className="text-gray-900 block">The first app that speaks</span>
            <span className="text-[var(--ds-brand-primary)] block">your child&rsquo;s language.</span>
          </h1>
          <p className="font-nunito font-semibold text-gray-600 leading-snug mb-0" style={{fontSize:"clamp(0.72rem,3vw,0.82rem)",maxWidth:"30ch"}}>
            Stories, missions and printable certificates — crafted for Rwandan families and curious children worldwide.
          </p>
          <div className="flex justify-center mt-1.5">
            <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.93}} transition={{type:"spring",stiffness:420,damping:22}}>
              <Link href={authed ? "/home" : "/signuppage"}>
                <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                  className="h-auto object-contain drop-shadow-lg select-none" style={{width:"clamp(118px,34vw,150px)"}} />
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[70px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>
      {/* EarlyAccessPill — sits below the hero on mobile */}
      <div className="sm:hidden flex justify-center bg-white pb-4 -mt-1">
        <EarlyAccessPill />
      </div>

      {/* ══ HERO TABLET ══════════════════════════════════════════════ */}
      <section className="hidden sm:block xl:hidden relative overflow-hidden" style={{minHeight:"100svh"}}>
        <img loading="eager" fetchPriority="high" src="/themes/default/hero/tablet-background.png" alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
          style={{willChange:"transform",transform:"translateZ(0)"}} />
        <div className="absolute inset-x-0 top-0 h-[52%] pointer-events-none"
          style={{background:"linear-gradient(to bottom,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0.65) 55%,transparent 100%)"}} />
        <FloatCloud className="top-24 -left-8" w={150} delay={0} opacity={0.50} speed={9} />

        {([
          {href:"/stories",   top:"32.69vw",label:"Lire"},
          {href:"/missions",  top:"39.60vw",label:"Créer"},
          {href:"/missions",  top:"46.60vw",label:"Explorer"},
          {href:"/missions",  top:"53.60vw",label:"Bouger"},
          {href:"/missions",  top:"60.60vw",label:"Chanter"},
          {href:"/community", top:"67.61vw",label:"Grandir"},
        ] as const).map(({href,top,label}) => (
          <Link key={label} href={href} aria-label={label} className="absolute z-20 cursor-pointer"
            style={{top,right:"6.54vw",width:"39.59vw",height:"6.45vw"}} />
        ))}
        <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center text-center px-10 lg:px-16" style={{paddingTop:"clamp(90px,16dvh,140px)"}}>
          <span className="inline-flex items-center gap-1.5 font-nunito font-bold text-[11px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-3 shadow-sm">
            🇷🇼 Kinyarwanda · 🇫🇷 Français · 🇬🇧 English
          </span>
          <h1 className="font-baloo font-black leading-tight mb-3" style={{fontSize:"clamp(2rem,3.8vw,3rem)"}}>
            <span className="text-gray-900 block">The first app that speaks</span>
            <span className="text-[var(--ds-brand-primary)] block">your child&rsquo;s language.</span>
          </h1>
          <p className="font-nunito font-semibold text-gray-700 leading-relaxed mb-1" style={{fontSize:"clamp(0.85rem,1.6vw,1rem)",maxWidth:"38ch"}}>
            Stories, missions and printable certificates — crafted for Rwandan families and curious children worldwide.
          </p>
          <div className="flex justify-center -mt-3">
            <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.93}} transition={{type:"spring",stiffness:420,damping:22}}>
              <Link href={authed ? "/home" : "/signuppage"}>
                <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                  className="w-auto h-auto object-contain drop-shadow-lg select-none" style={{width:"clamp(210px,27vw,270px)"}} />
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[80px] lg:h-[100px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══ HERO DESKTOP ═════════════════════════════════════════════ */}
      <section className="hidden xl:block relative overflow-hidden" style={{minHeight:"100svh"}}>
        <img loading="eager" fetchPriority="high" src="/themes/default/hero/new-background.png" alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none" />
        <div className="absolute inset-y-0 left-0 w-[46%] pointer-events-none"
          style={{background:"linear-gradient(to right,rgba(255,255,255,0.96) 0%,rgba(255,255,255,0.9) 42%,rgba(255,255,255,0.4) 73%,transparent 100%)"}} />
        <FloatCloud className="top-20 left-[44%]" w={180} delay={0} opacity={0.45} speed={10} />

        {([
          {href:"/stories",   top:"10.91vw",label:"Read"},
          {href:"/missions",  top:"16.62vw",label:"Create"},
          {href:"/missions",  top:"21.81vw",label:"Explore"},
          {href:"/missions",  top:"26.98vw",label:"Move"},
          {href:"/missions",  top:"32.15vw",label:"Sing"},
          {href:"/community", top:"37.31vw",label:"Grow"},
        ] as const).map(({href,top,label}) => (
          <Link key={label} href={href} aria-label={label} className="absolute z-20 cursor-pointer"
            style={{top,right:"7.01vw",width:"23.99vw",height:"5.14vw"}} />
        ))}
        <div className="absolute top-0 left-0 z-10 flex flex-col w-[40%] px-12 xl:px-16 2xl:px-20" style={{paddingTop:"clamp(100px,18dvh,180px)"}}>
          <span className="inline-flex items-center gap-1.5 font-nunito font-bold text-[11px] tracking-wide text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full mb-4 shadow-sm self-start">
            🇷🇼 Kinyarwanda · 🇫🇷 Français · 🇬🇧 English
          </span>
          <h1 className="font-baloo font-black leading-tight mb-4" style={{fontSize:"clamp(2.2rem,3.6vw,4.2rem)"}}>
            <span className="text-gray-900 block">The first app</span>
            <span className="text-gray-900 block">that speaks</span>
            <span className="text-[var(--ds-brand-primary)] block">your child&rsquo;s language.</span>
          </h1>
          <p className="font-nunito font-semibold text-gray-700 leading-relaxed mb-1" style={{fontSize:"clamp(0.875rem,1.15vw,1.1rem)",maxWidth:"34ch"}}>
            Stories, missions and printable certificates — crafted for Rwandan families and curious children worldwide.
          </p>
          <div className="flex gap-3 flex-wrap items-center -mt-3">
            <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.93}} transition={{type:"spring",stiffness:420,damping:22}}>
              <Link href={authed ? "/home" : "/signuppage"}>
                <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                  className="w-auto h-auto object-contain drop-shadow-lg select-none" style={{width:"clamp(230px,16vw,310px)"}} />
              </Link>
            </motion.div>
            <Link href="/stories" className="font-baloo font-bold text-gray-600 hover:text-[var(--ds-brand-primary)] text-[14px] flex items-center gap-1.5 transition-colors">
              Browse Stories <span className="text-[16px]">→</span>
            </Link>
          </div>
          <div className="mt-4">
            <EarlyAccessPill />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
          <svg viewBox="0 0 1440 110" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-[110px] block">
            <path d="M0,85 C120,30 240,100 400,55 C560,10 680,95 840,48 C1000,5 1140,88 1280,50 C1360,28 1410,60 1440,45 L1440,110 L0,110 Z" fill="white" />
          </svg>
        </div>
      </section>


      {/* ══ WHY NIMIPIKO ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-gray-50">

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-green-800 mb-4 bg-green-200 px-4 py-1.5 rounded-full">
                🏰 Why families choose us
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                More than an app —<br /><span className="text-nimi-green">a world they love coming back to</span>
              </h2>
              <p className="font-nunito text-gray-600 mt-4 text-[15px] max-w-xl mx-auto leading-relaxed">
                Every story, mission and challenge is crafted by educators to build real skills while kids genuinely have fun.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
              {/* Stories card */}
              <motion.div variants={fadeUp}>
                <motion.div whileHover={{y:-8,rotate:-0.5}} transition={{type:"spring",stiffness:260,damping:20}}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{background:"linear-gradient(145deg,#FDF2F8,#FCE7F3)", borderRadius:'var(--leaf-r-lg)'}}>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <img loading="lazy" src="/themes/default/quick-actions/btn-read.png" alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-pink-400 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Stories</h3>
                      </div>
                    </div>
                    <img loading="lazy" src="/themes/default/characters/nimi.png" alt="Nimi" className="w-28 h-28 object-contain self-center mb-4 drop-shadow" />
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Beautifully illustrated stories that build reading, vocabulary and imagination — in 3 languages.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Read-along narration","Vocabulary highlights","Comprehension activities"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>

              {/* Missions card */}
              <motion.div variants={fadeUp}>
                <motion.div whileHover={{y:-8,rotate:0.5}} transition={{type:"spring",stiffness:260,damping:20}}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{background:"linear-gradient(145deg,#FFF7ED,#FFEDD5)", borderRadius:'var(--leaf-r-lg)'}}>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <img loading="lazy" src="/themes/default/quick-actions/btn-create.png" alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-orange-400 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Missions</h3>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 mb-4">
                      <img loading="lazy" src="/themes/default/quick-actions/btn-move.png" alt="" className="w-12 h-12 object-contain" />
                      <img loading="lazy" src="/themes/default/characters/piko.png" alt="Piko" className="w-24 h-24 object-contain drop-shadow -mt-2" />
                      <img loading="lazy" src="/themes/default/quick-actions/btn-sing.png" alt="" className="w-12 h-12 object-contain" />
                    </div>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Hands-on activities: drawing, singing, moving and exploring. Learning through play, not passive screens.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Drawing & colouring","Songs & karaoke","Movement activities"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>

              {/* Progress card */}
              <motion.div variants={fadeUp}>
                <motion.div whileHover={{y:-8,rotate:-0.5}} transition={{type:"spring",stiffness:260,damping:20}}
                  className="relative overflow-hidden shadow-lg flex flex-col h-full"
                  style={{background:"linear-gradient(145deg,#EFF6FF,#DBEAFE)", borderRadius:'var(--leaf-r-lg)'}}>
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <img loading="lazy" src="/themes/default/rewards/trophy.png" alt="" className="w-14 h-14 object-contain drop-shadow-sm" />
                      <div>
                        <div className="w-8 h-1.5 rounded-full bg-blue-500 mb-1" />
                        <h3 className="font-baloo font-black text-gray-900 text-[20px]">Progress</h3>
                      </div>
                    </div>
                    <div className="flex justify-center items-end gap-2 mb-4">
                      <img loading="lazy" src="/themes/default/characters/zilo.png" alt="Zilo" className="w-24 h-24 object-contain drop-shadow" />
                      <img loading="lazy" src="/themes/default/rewards/ribbon.png" alt="" className="w-14 h-14 object-contain" />
                    </div>
                    <p className="font-nunito text-gray-600 text-[14px] leading-relaxed mb-5">
                      Every milestone is celebrated. Parents track achievements while kids earn badges and certificates.
                    </p>
                    <ul className="flex flex-col gap-2 mt-auto">
                      {["Stars & badges","Achievement certificates","Parent dashboard"].map(b => (
                        <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ DEMO VIDEO ═══════════════════════════════════════════════ */}
      <DemoVideoSection />

      {/* ══ APP PREVIEW ══════════════════════════════════════════════ */}
      <AppPreviewSection authed={authed} />

      {/* ══ HOW IT WORKS ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-gray-50 border-y border-gray-100">

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="eyebrow inline-block text-amber-800 mb-4 bg-amber-200 px-4 py-1.5 rounded-full">
                🗺️ Your Journey Begins Here
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Ready in <span className="text-nimi-green">3 simple steps</span>
              </h2>
              <p className="font-nunito text-gray-600 mt-4 text-[15px]">
                Setup takes under 2 minutes. Your child starts their first story today.
              </p>
            </motion.div>

            <div className="relative grid sm:grid-cols-3 gap-8 sm:gap-6">
              <div className="hidden sm:block absolute top-14 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-0.5 bg-gradient-to-r from-amber-400 via-green-400 to-amber-400" />
              {([
                {step:"1",char:"/themes/default/characters/nimi.png",alt:"Nimi",
                 title:"Create your child's profile",
                 desc:"Add your child's name and age. Manage multiple children under one family account."},
                {step:"2",char:"/themes/default/characters/piko.png",alt:"Piko",
                 title:"Pick a language & start a story",
                 desc:"Choose English, French or Kinyarwanda — then dive into the first adventure together."},
                {step:"3",char:"/themes/default/characters/zilo.png",alt:"Zilo",
                 title:"Watch them learn & grow",
                 desc:"Kids earn stars, badges and certificates. You follow every milestone from your dashboard."},
              ] as const).map(({step,char,alt,title,desc}) => (
                <motion.div key={step} variants={fadeUp} className="flex flex-col items-center text-center gap-3">
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-full text-white font-baloo font-black text-[26px] flex items-center justify-center shadow-lg shadow-green-300/50 border-4 border-[#FEF9C3]" style={{backgroundColor:'var(--nimi-green)'}}>
                      {step}
                    </div>
                  </div>
                  <motion.img src={char} alt={alt} className="w-24 h-24 object-contain drop-shadow-md"
                    animate={{y:[0,-8,0]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut",delay:Number(step)*0.5}} />
                  <h3 className="font-baloo font-black text-gray-900 text-[17px] leading-snug">{title}</h3>
                  <p className="font-nunito text-gray-600 text-[13px] sm:text-[14px] leading-relaxed max-w-[230px] mx-auto">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

      </section>

      {/* ══ LANGUAGES ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white border-t border-gray-100">

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-purple-700 mb-4 bg-purple-100 px-4 py-1.5 rounded-full">
                🌍 Three Languages, One Campus
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Your child learns in <span className="text-nimi-green">3 languages</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px] max-w-lg mx-auto leading-relaxed">
                Switch languages anytime — progress in each is saved. Give your child the gift of being truly multilingual.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6">
              {([
                {flag:"🇬🇧",lang:"English",     grad:"from-blue-500 to-sky-400",    border:"border-blue-200",  bg:"bg-blue-50",  tick:"text-blue-600",
                 desc:"Build reading, vocabulary and storytelling from day one.",
                 bullets:["Phonics & reading","Story comprehension","Creative prompts"]},
                {flag:"🇫🇷",lang:"French",      grad:"from-red-500 to-rose-400",    border:"border-red-200",   bg:"bg-red-50",   tick:"text-red-500",
                 desc:"Explore magical stories and missions en français.",
                 bullets:["French vocabulary","Listening & speaking","Cultural stories"]},
                {flag:"🇷🇼",lang:"Kinyarwanda", grad:"from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)]",border:"border-[var(--ds-border-brand)]/30", bg:"bg-[var(--ds-brand-subtle)]", tick:"text-[var(--ds-brand-primary)]",
                 desc:"Stay rooted in culture and mother tongue while learning.",
                 bullets:["Cultural heritage","Mother tongue pride","Community stories"]},
              ] as const).map(({flag,lang,grad,border,bg,tick,desc,bullets}) => (
                <motion.div key={lang} variants={fadeUp}>
                  <motion.div whileHover={{y:-7}} transition={{type:"spring",stiffness:280,damping:20}}
                    className={`border-2 ${border} ${bg} overflow-hidden shadow-md flex flex-col h-full`}
                    style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                    <div className={`bg-gradient-to-r ${grad} px-6 py-5 flex items-center gap-4`}>
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-[36px] shadow-inner">
                        {flag}
                      </div>
                      <h3 className="font-baloo font-black text-white text-[22px] drop-shadow">{lang}</h3>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <p className="font-nunito text-gray-500 text-[14px] leading-relaxed mb-5">{desc}</p>
                      <ul className="flex flex-col gap-2.5 mt-auto">
                        {bullets.map(b => (
                          <li key={b} className="flex items-center gap-2 font-nunito text-[13px] text-gray-600">
                            <CheckCircle2 className={`w-4 h-4 shrink-0 ${tick}`} />{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURED STORIES ═════════════════════════════════════════ */}
      <section className="relative px-5 sm:px-10 lg:px-14 py-16 sm:py-20 overflow-hidden bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-60px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-8">
              <div>
                <span className="eyebrow text-nimi-green mb-1 block">📚 The Library</span>
                <h2 className="font-baloo font-black text-gray-900 text-[20px] sm:text-[28px]">
                  Stories your child will love
                </h2>
              </div>
              <Link href="/stories" className="font-nunito font-bold text-nimi-green hover:underline text-sm transition-colors whitespace-nowrap">
                View all ›
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {stories.length > 0
                ? stories.map(story => (
                    <motion.div key={story.id} variants={fadeUp}>
                      <motion.div whileHover={{y:-6,scale:1.03}} whileTap={{scale:0.97}}
                        transition={{type:"spring",stiffness:380,damping:22}}>
                        <Link href={`/stories/${story.slug}`} className="group block">
                          <div className="relative overflow-hidden aspect-[4/3] bg-gray-100 mb-2.5 shadow-sm group-hover:shadow-xl transition-shadow duration-300" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                            {story.cover_url ? (
                              <img loading="lazy" src={getStorageUrl(story.cover_url)} alt={story.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                                <span className="text-5xl">{story.theme_emoji ?? "📖"}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                              <div className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center shadow-xl">
                                <Play className="w-5 h-5 fill-[var(--nimi-green)] text-[var(--nimi-green)] ml-0.5" strokeWidth={0} />
                              </div>
                            </div>
                          </div>
                          <p className="font-baloo font-black text-gray-800 text-[13px] sm:text-[15px] leading-snug group-hover:text-[var(--ds-brand-primary)] transition-colors">
                            {story.title}
                          </p>
                        </Link>
                      </motion.div>
                    </motion.div>
                  ))
                : [...Array(4)].map((_,i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-100 aspect-[4/3] mb-2.5" style={{ borderRadius: 'var(--leaf-r)' }} />
                      <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                    </div>
                  ))
              }
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ SAFE FOR KIDS ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white border-t border-gray-100">

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-[var(--ds-brand-primary)] mb-4 bg-[var(--ds-brand-subtle)] px-4 py-1.5 rounded-full">
                🛡️ Built for Families
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Built for kids.<br /><span className="text-nimi-green">Trusted by parents.</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
                Every decision we make puts your child&apos;s safety and wellbeing first — no exceptions.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {([
                {emoji:"🚫",title:"Zero Ads",       desc:"No ads. No distractions. Ever.",         grad:"from-red-400 to-rose-500"},
                {emoji:"🔒",title:"100% Private",    desc:"We never share your child's data.",       grad:"from-blue-400 to-indigo-500"},
                {emoji:"👨‍👩‍👧",title:"Parent Control", desc:"You manage your child's whole account.", grad:"from-purple-400 to-violet-500"},
                {emoji:"✅",title:"Safe Content",    desc:"Every story reviewed by educators.",       grad:"from-green-400 to-emerald-500"},
              ] as const).map(({emoji,title,desc,grad}) => (
                <motion.div key={title} variants={fadeUp}>
                  <motion.div whileHover={{y:-6,scale:1.03}} transition={{type:"spring",stiffness:300,damping:20}}
                    className="overflow-hidden shadow-md flex flex-col h-full"
                    style={{ borderRadius: 'var(--leaf-r)' }}>
                    <div className={`bg-gradient-to-br ${grad} p-5 flex items-center justify-center`}>
                      <span className="text-[44px]">{emoji}</span>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 flex flex-col gap-1 flex-1">
                      <p className="font-baloo font-black text-gray-900 text-[15px]">{title}</p>
                      <p className="font-nunito text-gray-500 text-[12px] leading-snug">{desc}</p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ TESTIMONIALS — hidden until approved rows exist in DB ══ */}
      {testimonials.length > 0 && (
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28"
        style={{background:"linear-gradient(135deg,#15803d 0%,#0f6b32 50%,#0a5228 100%)"}}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)", backgroundSize:"28px 28px"}} />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <span className="eyebrow inline-block text-green-200 mb-4 bg-white/10 px-4 py-1.5 rounded-full">
                ❤️ Families Love NIMIPIKO
              </span>
              <h2 className="font-baloo font-black text-white text-[28px] sm:text-[42px] leading-tight">
                What parents are saying
              </h2>
            </motion.div>

            <div className={`grid gap-6 ${testimonials.length === 1 ? '' : testimonials.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {testimonials.map(t => {
                const initials = t.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                const colors = ['bg-pink-500','bg-sky-500','bg-amber-500','bg-violet-500','bg-emerald-500','bg-rose-500'];
                const color  = colors[t.name.charCodeAt(0) % colors.length];
                return (
                  <motion.div key={t.id} variants={fadeUp}>
                    <div className="bg-white/10 border border-white/20 p-7 flex flex-col gap-5 h-full backdrop-blur-sm" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                      <div className="flex gap-0.5">
                        {Array.from({length:5}).map((_,i) => (
                          <span key={i} className={`text-[18px] ${i < t.rating ? 'text-yellow-300' : 'text-white/20'}`}>★</span>
                        ))}
                      </div>
                      <p className="font-nunito text-white text-[14px] sm:text-[15px] leading-relaxed italic flex-1">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <div className="flex items-center gap-3">
                        {t.avatar_url ? (
                          <img loading="lazy" src={t.avatar_url} alt={t.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0 shadow-md ring-2 ring-white/20" />
                        ) : (
                          <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0 shadow-md`}>
                            <span className="font-baloo font-black text-white text-[14px]">{initials}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-baloo font-black text-white text-[14px]">{t.name}</p>
                          <p className="font-nunito text-white/60 text-[11px]">
                            {t.role}{t.location ? ` · ${t.location}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* ══ PRICING ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-20 sm:py-28 bg-white border-t border-gray-100">

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="eyebrow inline-block text-[var(--ds-brand-primary)] mb-4 bg-[var(--ds-brand-subtle)] px-4 py-1.5 rounded-full">
                💫 Choose Your Adventure
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[28px] sm:text-[42px] leading-tight">
                Simple, honest <span className="text-nimi-green">pricing</span>
              </h2>
              <p className="font-nunito text-gray-500 mt-4 text-[15px]">
                One subscription. Unlimited learning. Cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                  <span className="text-green-600 text-[14px]">🎉</span>
                  <span className="font-baloo font-black text-green-700 text-[13px]">Start exploring free — no credit card required</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
                  <span className="text-amber-500 text-[14px]">🏅</span>
                  <span className="font-baloo font-black text-amber-700 text-[13px]">Founding family price — locks in forever</span>
                </div>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <motion.div variants={fadeUp}>
                <div className="relative pt-5 flex flex-col h-full">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <motion.span
                      animate={{ boxShadow: ["0 0 0 0 rgba(21,128,61,0.5)", "0 0 0 8px rgba(21,128,61,0)", "0 0 0 0 rgba(21,128,61,0)"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                      className="flex items-center gap-1.5 bg-[var(--nimi-green)] text-white font-baloo font-black text-[11px] px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap tracking-wide"
                      style={{ display: "inline-flex" }}
                    >
                      ★ MOST POPULAR
                    </motion.span>
                  </div>
                <div className="relative overflow-hidden shadow-xl flex flex-col flex-1 border-2 border-[var(--ds-border-brand)]/40" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="bg-cta-gradient px-7 pt-8 pb-5 flex items-center gap-4">
                    <span className="text-[44px]">🌟</span>
                    <div>
                      <h3 className="font-baloo font-black text-white text-[22px] leading-tight">NIMIPIKO Club</h3>
                      <p className="font-nunito text-green-100 text-[12px]">Unlimited learning, every month</p>
                    </div>
                  </div>
                  <div className="bg-white p-7 flex flex-col gap-5 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-baloo font-black text-gray-900 text-[38px] leading-none">$14.99</span>
                      <span className="font-nunito text-gray-400 text-[14px]">/ month</span>
                    </div>
                    <p className="font-nunito text-gray-400 text-[11px] -mt-3">or 9,900 RWF/month · Cancel anytime</p>
                    <ul className="flex flex-col gap-3">
                      {["All Interactive Stories","3 Languages (EN / FR / RW)","Creative Missions & Songs","Achievement Certificates","Parent Progress Dashboard","Nimi AI Learning Companion"].map(f => (
                        <li key={f} className="flex items-center gap-2.5 font-nunito text-[13px] text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-[var(--ds-brand-primary)] shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 mt-1">
                      <span className="text-[22px] shrink-0">🛡️</span>
                      <div>
                        <p className="font-baloo font-black text-green-800 text-[13px] leading-tight">30-day money-back guarantee</p>
                        <p className="font-nunito text-green-600 text-[11px]">Not happy? Full refund, no questions asked.</p>
                      </div>
                    </div>
                    <Link href={authed ? "/pricing" : "/signuppage"} className="mt-auto w-full text-center text-white font-baloo font-black py-3.5 shadow-md transition-all hover:-translate-y-0.5 active:scale-95 text-[15px]" style={{backgroundColor:'var(--nimi-green)', borderRadius:'var(--leaf-r)', boxShadow:'0 6px 20px rgba(5,150,105,0.35)'}}>
                      Start Free → Get Full Access
                    </Link>
                    <p className="text-center font-nunito text-gray-400 text-[11px] -mt-2">No credit card needed to explore</p>
                  </div>
                </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <div className="relative overflow-hidden shadow-lg flex flex-col h-full border border-gray-200" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-400 px-7 pt-7 pb-5 flex items-center gap-4">
                    <span className="text-[44px]">🎨</span>
                    <div>
                      <h3 className="font-baloo font-black text-white text-[22px] leading-tight">Masterpiece</h3>
                      <p className="font-nunito text-purple-100 text-[12px]">A keepsake for life</p>
                    </div>
                  </div>
                  <div className="bg-white p-7 flex flex-col gap-5 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-baloo font-black text-gray-900 text-[38px] leading-none">$9.99</span>
                      <span className="font-nunito text-gray-400 text-[14px]">one-time</span>
                    </div>
                    <p className="font-nunito text-gray-400 text-[11px] -mt-3">A gift your child keeps forever</p>
                    <ul className="flex flex-col gap-3">
                      {["Personalised Hero Story","Child's Photo in the Book","Downloadable PDF Keepsake","Champion Certificate","A Memory That Lasts Forever"].map(f => (
                        <li key={f} className="flex items-center gap-2.5 font-nunito text-[13px] text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/pricing" className="mt-auto w-full text-center border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-700 font-baloo font-black py-3.5 transition-all text-[15px]" style={{ borderRadius: 'var(--leaf-r)' }}>
                      Create Their Story →
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ PARENT PROMISE ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 py-16 sm:py-20 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}>
            <motion.div variants={fadeUp} className="text-center mb-10">
              <span className="eyebrow inline-block text-gray-700 mb-3 bg-gray-100 px-4 py-1.5 rounded-full">
                🤝 Our Promise to Parents
              </span>
              <h2 className="font-baloo font-black text-gray-900 text-[24px] sm:text-[36px] leading-tight">
                Screen time they&apos;ll <span className="text-nimi-green">actually grow from</span>
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {([
                { icon: "🎓", title: "Educator-Designed", desc: "Every story and mission built with child development experts." },
                { icon: "⏱️", title: "15-Min Sessions",   desc: "Perfect learning bursts — no endless scrolling or autoplay traps." },
                { icon: "📊", title: "You See Everything", desc: "Real-time progress reports, time-on-app, and achievement milestones." },
                { icon: "🔄", title: "Cancel Anytime",    desc: "No lock-in, no hidden fees. Your trust is more valuable than your payment." },
              ] as const).map(({ icon, title, desc }) => (
                <motion.div key={title} variants={fadeUp}
                  className="flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-200 transition-all group">
                  <span className="text-[32px] leading-none">{icon}</span>
                  <p className="font-baloo font-black text-gray-900 text-[16px] group-hover:text-[var(--ds-brand-primary)] transition-colors">{title}</p>
                  <p className="font-nunito text-gray-500 text-[13px] leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-10 lg:px-14 pt-20 sm:pt-28 pb-0"
        style={{background:"linear-gradient(180deg,#f0fdf4 0%,#dcfce7 60%,#bbf7d0 100%)"}}>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{backgroundImage:"radial-gradient(circle, #15803d 1px, transparent 1px)", backgroundSize:"32px 32px"}} />

        <motion.div initial="hidden" whileInView="visible" viewport={{once:true,margin:"-80px"}} variants={stagger}
          className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6 relative z-10">

          <motion.div variants={fadeUp} className="flex items-center gap-2 bg-green-900/40 border border-green-700/50 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="font-baloo font-bold text-green-200 text-[12px] sm:text-[13px]">
              🌱 Early access — be a founding family
            </span>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-end justify-center">
            <motion.img loading="lazy" src="/themes/default/characters/nimi.png" alt="Nimi"
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-lg -mr-4 z-10"
              animate={noMotion ? {} : {y:[0,-9,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut",delay:0}} />
            <motion.img loading="lazy" src="/themes/default/characters/piko.png" alt="Piko"
              className="w-28 h-28 sm:w-40 sm:h-40 object-contain drop-shadow-xl z-20"
              animate={noMotion ? {} : {y:[0,-13,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut",delay:0.45}} />
            <motion.img loading="lazy" src="/themes/default/characters/zilo.png" alt="Zilo"
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-lg -ml-4 z-10"
              animate={noMotion ? {} : {y:[0,-9,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut",delay:0.9}} />
          </motion.div>

          <motion.h2 variants={fadeUp} className="font-baloo font-black text-gray-900 text-[32px] sm:text-[52px] leading-tight">
            Start your child&apos;s<br /><span className="text-nimi-green">adventure today! 🚀</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="font-nunito text-gray-600 text-[15px] sm:text-[16px] max-w-md leading-relaxed">
            Be among the first to give your child the gift of stories, language and creativity — at a founding family price that locks in forever.
          </motion.p>

          <motion.div variants={fadeUp} whileHover={{scale:1.06}} whileTap={{scale:0.95}}
            transition={{type:"spring",stiffness:400,damping:20}}>
            <Link href={authed ? "/home" : "/signuppage"}>
              <img loading="lazy" src="/themes/default/navs/start-learning.png" alt="Start Learning" draggable={false}
                className="h-auto object-contain drop-shadow-xl select-none" style={{width:"clamp(200px,35vw,280px)"}} />
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="font-nunito text-gray-500 text-[12px]">
            No credit card required to explore. Cancel anytime.
          </motion.p>

          <motion.div variants={fadeUp}>
            <AppStoreBadges className="justify-center" />
          </motion.div>
        </motion.div>

        {/* World horizon — brand illustration strip */}
        <div className="relative mt-12 pointer-events-none select-none overflow-hidden" style={{ height: "clamp(80px,14vw,160px)" }} aria-hidden>
          {/* top-fade so assets blend smoothly into the green gradient above */}
          <div className="absolute inset-x-0 top-0 h-10 z-10"
            style={{ background: "linear-gradient(to bottom, #bbf7d0, transparent)" }} />
          <div className="absolute bottom-0 inset-x-0 max-w-4xl mx-auto flex items-end justify-center gap-3 sm:gap-6 px-4">
            <img loading="lazy" src="/themes/default/world/tree-3.png"     alt="" className="h-[55%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/birdhouse.png"  alt="" className="h-[40%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/greenhouse.png" alt="" className="h-[75%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/tree-1.png"     alt="" className="h-[65%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/greenhouse.png" alt="" className="h-[70%] w-auto object-contain object-bottom opacity-80" />
            <img loading="lazy" src="/themes/default/world/tree-2.png"     alt="" className="h-[60%] w-auto object-contain object-bottom" />
            <img loading="lazy" src="/themes/default/world/tree-4.png"     alt="" className="h-[50%] w-auto object-contain object-bottom" />
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════ */}
      <FAQSection />

      {/* ══ NEWSLETTER ═══════════════════════════════════════════════ */}
      <NewsletterSection />

      {/* ══ STICKY MOBILE CTA ════════════════════════════════════════ */}
      <StickyMobileCTA href={authed ? "/home" : "/signuppage"} visible={ctaVisible} />

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 px-5 sm:px-10 lg:px-14 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-10 mb-10">
            <div className="flex flex-col items-center sm:items-start gap-3">
              <img loading="lazy" src="/nimi-logo.png" alt="NIMIPIKO" className="w-14 h-14 object-contain" />
              <p className="font-baloo font-black text-white text-[17px]">NIMIPIKO</p>
              <p className="font-nunito text-gray-400 text-[12px] max-w-[190px] text-center sm:text-left leading-relaxed">
                Where every child becomes the hero of their own story.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3 mt-1">
                {[
                  { href: "https://www.facebook.com/nimipiko", title: "Facebook", d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
                  { href: "https://www.instagram.com/nimipiko", title: "Instagram", d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zm1.5-4.87h.01M17.5 6.5h.01M6.5 6.5A5 5 0 0 0 2 11.5v5A5 5 0 0 0 7 21.5h10a5 5 0 0 0 5-5v-5a5 5 0 0 0-5-5z" },
                  { href: "https://www.tiktok.com/@nimipiko", title: "TikTok", d: "M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" },
                  { href: "https://wa.me/250780000000", title: "WhatsApp", d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
                ].map(({ href, title, d }) => (
                  <a key={title} href={href} title={title} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={d} />
                    </svg>
                  </a>
                ))}
              </div>
              <div className="mt-4">
                <p className="font-nunito text-gray-500 text-[10px] uppercase tracking-widest mb-2.5">Download the app</p>
                <AppStoreBadges size="sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-10 text-center sm:text-left">
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Learn</p>
                {([["Stories","/stories"],["Activities","/missions"],["Community","/community"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Family</p>
                {([["For Parents","/parents"],["Pricing","/pricing"],["Help","/help"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
              <div>
                <p className="font-baloo font-black text-white text-[13px] mb-4">Legal</p>
                {([["Privacy Policy","/privacy"],["Terms of Use","/terms"]] as const).map(([l,h]) => (
                  <Link key={l} href={h} className="block font-nunito text-gray-400 hover:text-white text-[13px] mb-2 transition-colors">{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-nunito text-gray-500 text-[12px]">
              © {new Date().getFullYear()} Nimipiko Studio LTD. Made with ❤️ for curious kids everywhere.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-nunito text-gray-500 text-[11px]">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
    </>
  );
}
