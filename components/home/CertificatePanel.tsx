"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Download, Share2, Star } from "lucide-react";
import Link from "next/link";
import { ACTIVITIES } from "@/app/_activityData";
import { useLanguage } from "@/contexts/LanguageContext";

const CERT_CONFETTI = [
  { color: "#FFD700", top: "18%", left: "5%"  },
  { color: "#FF6B6B", top: "55%", left: "3%"  },
  { color: "#4ECDC4", top: "80%", left: "8%"  },
  { color: "#45B7D1", top: "10%", left: "18%" },
  { color: "#96CEB4", top: "70%", left: "20%" },
  { color: "#FFEAA7", top: "30%", left: "88%" },
  { color: "#DDA0DD", top: "15%", left: "75%" },
  { color: "#FF9800", top: "60%", left: "92%" },
  { color: "#4CAF50", top: "85%", left: "80%" },
  { color: "#E91E63", top: "40%", left: "95%" },
  { color: "#FFD700", top: "5%",  left: "50%" },
  { color: "#9C27B0", top: "90%", left: "50%" },
];

const STEP_ICONS = ACTIVITIES.map(a => ({
  step: a.number,
  icon: a.emoji,
  bg: a.numBgGlass,
  href: a.href,
}));

const TOTAL_STEPS = ACTIVITIES.length;

interface Props {
  completedSteps: number[];
  level: number;
}

export default function CertificatePanel({ completedSteps, level }: Props) {
  const { t } = useLanguage();
  const [shareCopied, setShareCopied] = useState(false);
  const allDone = completedSteps.length >= TOTAL_STEPS;
  const done = Math.min(completedSteps.length, TOTAL_STEPS);
  const pct = Math.round((done / TOTAL_STEPS) * 100);

  // Find next step to do
  const nextStep = STEP_ICONS.find(s => !completedSteps.includes(s.step));

  const handleShare = async () => {
    const shareData = {
      title: t("levelCertificateLabel").replace("{level}", String(level)),
      text: t("shareAchievementText"),
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  if (!allDone) {
    return (
      <>
        {/* In-Progress card */}
        <div className="bg-white/10 backdrop-blur border-4 border-white/15 rounded-3xl shadow-xl overflow-hidden">
          <div className="relative overflow-hidden text-center py-4 px-4"
            style={{ background: "linear-gradient(180deg, #7c3aed 0%, #4c1d95 100%)" }}>
            <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 12" preserveAspectRatio="none" style={{ height: 12 }}>
              <path d="M0,0 Q100,12 200,6 Q300,0 400,10 L400,12 L0,12 Z" fill="white" />
            </svg>
            <motion.p
              className="relative z-10 font-black text-white tracking-widest uppercase drop-shadow-lg"
              style={{ fontSize: "clamp(1rem, 3vw, 1.3rem)" }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: Infinity }}>
              {t("levelInProgressLabel").replace("{level}", String(level))}
            </motion.p>
          </div>

          <div className="px-5 pt-5 pb-4 text-center">
            <p className="font-bold text-white text-base leading-tight">{t("keepGoingLabel")}</p>
            <p className="text-purple-300 text-sm mt-0.5 mb-4">
              {t("completeLevelStepsLabel").replace("{steps}", String(TOTAL_STEPS)).replace("{level}", String(level))}
            </p>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-bold text-purple-300 mb-1">
                <span>Progress</span>
                <span>{done}/{TOTAL_STEPS} steps</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }} />
              </div>
            </div>

            {/* Step icons */}
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {STEP_ICONS.map(item => {
                const isComplete = completedSteps.includes(item.step);
                return (
                  <Link key={item.step} href={item.href}>
                    <div className="relative">
                      <div className={`w-9 h-9 rounded-full backdrop-blur flex items-center justify-center text-lg shadow-sm border-2 transition-all ${
                        isComplete ? `${item.bg} border-white/20` : "bg-white/10 border-white/20 grayscale opacity-50"
                      }`}>
                        {item.icon}
                      </div>
                      {isComplete && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                          <Check className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* NIMI + progress medal + PIKO */}
            <div className="flex items-end justify-around mt-1">
              <div className="text-center">
                <img src="/nimi-logo-circle.png" alt="NIMI"
                  className="w-[60px] h-[60px] rounded-full object-cover mx-auto border-4 border-purple-200 shadow-xl" />
                <p className="text-[10px] mt-1.5 text-purple-300 leading-tight">
                  Cheer: <span className="font-black italic text-purple-200">Nimi</span>
                </p>
              </div>

              <div className="flex flex-col items-center mb-2">
                <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-xl border-4 border-purple-100"
                  style={{ background: "linear-gradient(145deg, #e9d5ff, #c084fc)" }}>
                  <span className="text-2xl font-black text-white drop-shadow">{pct}%</span>
                </div>
              </div>

              <div className="text-center">
                <img src="/piko-logo-circle.png.png" alt="PIKO"
                  className="w-[60px] h-[60px] rounded-full object-cover mx-auto border-4 border-blue-200 shadow-xl" />
                <p className="text-[10px] mt-1.5 text-purple-300 leading-tight">
                  Cheer: <span className="font-black italic text-purple-200">Piko</span>
                </p>
              </div>
            </div>

            {/* CTA */}
            {nextStep && (
              <Link href={nextStep.href} className="block mt-4">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black rounded-full text-xs h-9 gap-2 tracking-wide">
                  ▶ CONTINUE STORY
                </Button>
              </Link>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ── All steps complete — show certificate ── */
  return (
    <>
      {/* STORY COMPLETE card */}
      <div className="bg-white/10 backdrop-blur border-4 border-white/15 rounded-3xl shadow-2xl overflow-hidden">

        <div className="relative overflow-hidden text-center py-4 px-4"
          style={{ background: "linear-gradient(180deg, #5b21b6 0%, #4c1d95 100%)" }}>
          {CERT_CONFETTI.map((c, i) => (
            <motion.div key={i} className="absolute rounded-full pointer-events-none"
              style={{ background: c.color, top: c.top, left: c.left, width: i % 2 === 0 ? 8 : 5, height: i % 2 === 0 ? 8 : 5 }}
              animate={{ y: [-4, 4, -4], rotate: [0, 180, 360], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8 + i * 0.15, repeat: Infinity, delay: i * 0.1 }} />
          ))}
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 12" preserveAspectRatio="none" style={{ height: 12 }}>
            <path d="M0,0 Q100,12 200,6 Q300,0 400,10 L400,12 L0,12 Z" fill="white" />
          </svg>
          <motion.p
            className="relative z-10 font-black text-white tracking-widest uppercase drop-shadow-lg"
            style={{ fontSize: "clamp(1.1rem, 3vw, 1.4rem)", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity }}>
            {t("levelCompleteLabel").replace("{level}", String(level))}
          </motion.p>
        </div>

        <div className="px-5 pt-5 pb-4 text-center">
          <p className="font-bold text-white text-base leading-tight">{t("congratulationsLabel")}</p>
          <p className="text-purple-300 text-sm mt-0.5">{t("youEarnedYourLabel")}</p>

          <div className="my-3 relative">
            <span className="absolute -top-1 left-3 text-yellow-400 text-lg">★</span>
            <span className="absolute -top-1 right-3 text-yellow-400 text-lg">★</span>
            <h3 className="font-black text-purple-200 tracking-wide leading-tight"
              style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)" }}>
              {t("levelCertificateLabel").replace("{level}", String(level))}
            </h3>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-yellow-400 text-sm">✦</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {STEP_ICONS.map((item, i) => (
              <div key={i} className="relative">
                <div className={`w-10 h-10 ${item.bg} backdrop-blur border border-white/20 rounded-full flex items-center justify-center text-xl shadow-md`}>
                  {item.icon}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-around mt-1">
            <div className="text-center">
              <img src="/nimi-logo-circle.png" alt="NIMI"
                className="w-[72px] h-[72px] rounded-full object-cover mx-auto border-4 border-yellow-300 shadow-xl" />
              <p className="text-[11px] mt-2 text-purple-300 leading-tight">
                {t("signedByLabel").replace("{name}", "Nimi")}
              </p>
            </div>

            <motion.div className="flex flex-col items-center mb-2"
              animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity }}>
              <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-200"
                style={{ background: "linear-gradient(145deg, #FFE066, #FFC300, #FF9900)" }}>
                <Star className="w-9 h-9 fill-white text-white drop-shadow-lg" />
              </div>
              <div className="w-4 h-3 mt-0.5 rounded-b-sm"
                style={{ background: "linear-gradient(180deg, #c0392b, #922b21)" }} />
            </motion.div>

            <div className="text-center">
              <img src="/piko-logo-circle.png.png" alt="PIKO"
                className="w-[72px] h-[72px] rounded-full object-cover mx-auto border-4 border-blue-300 shadow-xl" />
              <p className="text-[11px] mt-2 text-purple-300 leading-tight">
                {t("signedByLabel").replace("{name}", "Piko")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download / Share card */}
      <div className="bg-white/10 backdrop-blur border-2 border-white/15 rounded-3xl shadow-md p-4">
        <h3 className="font-black text-purple-200 text-[11px] uppercase mb-3 text-center tracking-widest">
          {t("downloadShareCertTitle")}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 mb-3 sm:items-center">
          <div className="flex-shrink-0 w-full sm:w-[110px] bg-gradient-to-br from-yellow-50 to-purple-50 border-4 border-double border-purple-300 rounded-xl p-2 text-center shadow-sm">
            <p className="text-[9px] sm:text-[7px] font-black text-purple-700 uppercase leading-tight">
              🌟 {t("levelCertificateLabel").replace("{level}", String(level))}
            </p>
            <p className="text-[9px] sm:text-[7px] text-purple-600 mt-0.5 leading-tight">
              {t("levelCompleteLabel").replace("{level}", String(level))}
            </p>
            <div className="flex justify-center gap-1 mt-2 items-center">
              <img src="/nimi-logo-circle.png" alt="NIMI" className="w-7 h-7 rounded-full object-cover border border-yellow-300" />
              <div className="w-7 h-7 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center text-base shadow">⭐</div>
              <img src="/piko-logo-circle.png.png" alt="PIKO" className="w-7 h-7 rounded-full object-cover border border-blue-300" />
            </div>
          </div>
          <p className="text-[11px] text-purple-300 leading-relaxed flex-1 min-w-0">
            {t("shareAchievementText")}
          </p>
        </div>
        <div className="space-y-2">
          <Button onClick={() => window.print()}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-black rounded-full text-xs h-9 gap-2 tracking-wide">
            <Download className="w-4 h-4" /> {t("downloadPdfLabel")}
          </Button>
          <Button onClick={handleShare}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black rounded-full text-xs h-9 gap-2 tracking-wide">
            <Share2 className="w-4 h-4" /> {shareCopied ? t("linkCopiedLabel") : t("shareLabel")}
          </Button>
        </div>
      </div>
    </>
  );
}
