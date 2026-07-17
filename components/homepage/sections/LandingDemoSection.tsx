"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

const DEMO_VIDEO_ID = "70pXI1F2HEs";

const fadeUp = {
  hidden:  { opacity:0, y:30 },
  visible: { opacity:1, y:0, transition:{ duration:0.55, ease:[0.22,1,0.36,1] as const } },
};
const stagger = {
  hidden:  {},
  visible: { transition:{ staggerChildren:0.11 } },
};

export default function LandingDemoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="relative bg-white px-5 sm:px-10 lg:px-14 py-16 sm:py-24 border-t border-gray-100 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #15803d 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

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

          <motion.div variants={fadeUp} className="shrink-0 w-full max-w-[280px] sm:max-w-[300px]">
            <div className="relative">
              <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-green-100 to-emerald-200 opacity-80 blur-2xl" />
              <div className="relative overflow-hidden shadow-2xl"
                style={{ borderRadius: "28px", aspectRatio: "9/16", background: "#000" }}>
                {playing ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
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
