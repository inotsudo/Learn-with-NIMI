"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";

const fadeUp = {
  hidden:  { opacity:0, y:30 },
  visible: { opacity:1, y:0, transition:{ duration:0.55, ease:[0.22,1,0.36,1] as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition:{ staggerChildren:0.11 } },
};

const PREVIEW_SCREENS = [
  { label: "Home World",    icon: "🏠", desc: "A magical world Nimi, Piko and Zilo built just for your child — READ, CREATE, SING, EXPLORE and more." },
  { label: "Story Reader",  icon: "📖", desc: "Beautifully illustrated stories read aloud in 3 languages, with vocabulary and page-turn narration."   },
  { label: "Certificates",  icon: "🏆", desc: "Every completed story earns a real, printable certificate your child can hang on the wall."             },
] as const;

function AppMockup({ screen }: { screen: number }) {
  if (screen === 0) return (
    <img src="/home-hero-mobile.png" alt="NIMIPIKO home screen"
      className="absolute inset-0 w-full h-full object-cover object-top select-none"
      draggable={false} loading="lazy" />
  );

  if (screen === 1) return (
    <div className="absolute inset-0 overflow-hidden flex flex-col" style={{ background: "#1b3d27" }}>
      <div className="flex items-center justify-between px-4 pt-10 pb-2 shrink-0">
        <span className="text-[8px] font-bold text-green-200">9:41</span>
        <div className="flex items-center gap-1.5">
          <img loading="lazy" src="/nimi-logo.png" alt="" className="w-4 h-4 object-contain" draggable={false} />
          <span className="text-[8px] font-black text-yellow-300">⭐ 245</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 pb-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-base shrink-0 shadow-md">🦁</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-[9.5px] leading-tight truncate">The Brave Lion</p>
          <p className="text-green-300 text-[7px]">Chapter 2 · Page 4 of 12</p>
        </div>
        <img loading="lazy" src="/current-story.png" alt="" className="h-4 object-contain shrink-0" draggable={false} />
      </div>
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
        <div className="flex items-center justify-center gap-4 py-2.5 shrink-0">
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-[11px]">◀</button>
          <button className="w-11 h-11 rounded-full bg-amber-400 flex items-center justify-center text-white text-[16px] shadow-lg">▶</button>
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-[11px]">▶▶</button>
        </div>
      </div>
    </div>
  );

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

export default function LandingAppPreviewSection({ authed }: { authed: boolean }) {
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

            <motion.div variants={fadeUp} className="flex justify-center order-1 lg:order-2">
              <div className="relative">
                <div className="absolute inset-[-20%] blur-3xl opacity-15 rounded-full"
                  style={{ background: "radial-gradient(ellipse, var(--nimi-green) 0%, transparent 70%)" }} />

                <div className="relative w-[240px] h-[490px] rounded-[3rem] overflow-hidden"
                  style={{ background: "#111827", boxShadow: "0 0 0 6px #1f2937, 0 0 0 7px #374151, 0 40px 80px rgba(0,0,0,0.40)" }}>
                  <div className="absolute top-0 inset-x-0 flex justify-center z-20 pt-2">
                    <div className="w-16 h-4 bg-gray-900 rounded-b-xl" />
                  </div>
                  <div className="absolute bottom-1.5 inset-x-0 flex justify-center z-20">
                    <div className="w-12 h-1 bg-gray-700 rounded-full" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={active}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.3, ease: [0.22,1,0.36,1] }}
                      className="absolute inset-0">
                      <AppMockup screen={active} />
                    </motion.div>
                  </AnimatePresence>
                </div>

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
