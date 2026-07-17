"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { updateChildLanguage, type Child } from "@/lib/queries";
import LanguageSwitchDialog from "@/components/LanguageSwitchDialog";

const HEADER_STARS = [
  { top: "12%", left: "7%",  color: "#FFD700", shape: "✦", size: "14px" },
  { top: "68%", left: "5%",  color: "#E91E63", shape: "★", size: "12px" },
  { top: "30%", left: "16%", color: "#9C27B0", shape: "✶", size: "11px" },
  { top: "75%", left: "24%", color: "#FF5722", shape: "✦", size: "15px" },
  { top: "10%", left: "38%", color: "#4CAF50", shape: "★", size: "12px" },
  { top: "80%", left: "44%", color: "#2196F3", shape: "✦", size: "13px" },
  { top: "18%", left: "56%", color: "#FFD700", shape: "★", size: "16px" },
  { top: "72%", left: "63%", color: "#FF9800", shape: "✶", size: "11px" },
  { top: "8%",  left: "74%", color: "#9C27B0", shape: "✦", size: "13px" },
  { top: "55%", left: "82%", color: "#E91E63", shape: "★", size: "14px" },
  { top: "25%", left: "90%", color: "#4CAF50", shape: "✦", size: "10px" },
  { top: "82%", left: "94%", color: "#2196F3", shape: "★", size: "12px" },
];

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English",     flag: "🇬🇧" },
  { code: "fr", label: "Français",    flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

interface HomeHeaderProps {
  activeChild?: Child | null;
}

export default function HomeHeader({ activeChild }: HomeHeaderProps) {
  const { language, setLanguage } = useLanguage();
  const [showPicker, setShowPicker] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [switching, setSwitching] = useState(false);
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);

  const confirmSwitch = async () => {
    if (!pendingLanguage) return;
    setSwitching(true);
    if (activeChild) await updateChildLanguage(activeChild.id, pendingLanguage);
    setLanguage(pendingLanguage);
    setSwitching(false);
    setPendingLanguage(null);
  };

  return (
    <header className="bg-white border-b border-ds-border shadow-ds-nav relative overflow-hidden">

      {/* Animated background stars */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {HEADER_STARS.map((s, i) => (
          <motion.span key={i} className="absolute font-bold leading-none"
            style={{ top: s.top, left: s.left, color: s.color, fontSize: s.size, opacity: 0.35 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}>
            {s.shape}
          </motion.span>
        ))}
      </div>

      {/* ── Desktop (sm+) ── */}
      <div className="hidden sm:flex items-center max-w-7xl mx-auto px-4 lg:px-10 py-5 lg:py-6 relative z-10 gap-4">

        {/* NIMI */}
        <motion.div className="flex-shrink-0"
          animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
          <div className="relative">
            <div className="relative w-20 h-20 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden border-4 border-yellow-400 shadow-2xl ring-4 ring-yellow-100">
              <Image src={assets.nimiCircle} alt="NIMI" fill className="object-cover" />
            </div>
            <motion.span className="absolute -top-3 -right-2 text-2xl lg:text-3xl drop-shadow"
              animate={{ rotate: [0, 30, 0, 30, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}>
              👋
            </motion.span>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[var(--nimi-green)] text-white text-xs lg:text-sm font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap border-2 border-white">
              NIMI
            </div>
          </div>
        </motion.div>

        {/* Logo + tagline */}
        <div className="flex-1 text-center px-2 lg:px-6">
          <Link href="/home">
            <motion.h1 whileHover={{ scale: 1.03 }}
              className="font-black leading-none cursor-pointer inline-block"
              style={{
                fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                background: "linear-gradient(90deg,#FF0000 0%,#FF7700 16%,#FFDD00 32%,#00BB44 50%,#0066FF 67%,#8800CC 84%,#FF0000 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
              NIMIPIKO
            </motion.h1>
          </Link>
          <p className="text-gray-500 font-semibold text-sm lg:text-base mt-1 tracking-widest">
            Learn • Play • Create • Grow
          </p>
        </div>

        {/* RIGHT group */}
        <div className="flex items-center gap-3 lg:gap-5 flex-shrink-0">

          {/* Speech bubble (lg+) */}
          <div className="hidden lg:block relative bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/30 rounded-2xl px-4 py-3 shadow-sm max-w-[185px] xl:max-w-[210px]">
            <span className="absolute top-2 right-2 text-yellow-400 text-sm leading-none">★</span>
            <span className="absolute bottom-2 left-2 text-gray-300 text-xs leading-none">✦</span>
            <p className="text-sm font-bold text-ds-text leading-snug pr-3">
              Welcome to your learning adventure!
            </p>
            <p className="text-xs font-semibold text-gray-500 mt-1.5">
              Have fun and earn your certificate!
            </p>
            <span className="absolute -right-[12px] top-1/2 -translate-y-1/2 w-0 h-0"
              style={{ borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: "12px solid #d1fae5" }} />
            <span className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-0 h-0"
              style={{ borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "9px solid #f0fdf4" }} />
          </div>

          {/* Language picker */}
          <div className="relative">
            <button onClick={() => setShowPicker(!showPicker)}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-xl transition shadow-sm"
              aria-label="Change language">
              {LANGS.find(l => l.code === language)?.flag ?? "🌐"}
            </button>
            {showPicker && (
              <div className="absolute right-0 mt-2 bg-white border border-ds-border rounded-xl shadow-lg overflow-hidden z-50 w-40">
                {LANGS.map(lang => (
                  <button key={lang.code} onClick={() => { setPendingLanguage(lang.code); setShowPicker(false); }}
                    className="flex items-center px-4 py-3 w-full hover:bg-gray-50 transition text-sm">
                    <span className="text-xl mr-2">{lang.flag}</span>
                    <span className="font-semibold text-ds-text">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PIKO */}
          <motion.div className="flex-shrink-0"
            animate={{ y: [0, -6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}>
            <div className="relative">
              <div className="relative w-20 h-20 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full overflow-hidden border-4 border-blue-300 shadow-2xl ring-4 ring-blue-100">
                <Image src={assets.pikoCircle} alt="PIKO" fill className="object-cover" />
              </div>
              <motion.span className="absolute -top-3 -left-2 text-2xl lg:text-3xl drop-shadow"
                animate={{ rotate: [0, 30, 0, 30, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3, delay: 0.7 }}>
                👋
              </motion.span>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs lg:text-sm font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap border-2 border-white">
                PIKO
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <LanguageSwitchDialog
        pendingLanguage={pendingLanguage}
        currentLanguage={language}
        childName={activeChild?.name}
        switching={switching}
        onConfirm={confirmSwitch}
        onCancel={() => setPendingLanguage(null)}
      />

      {/* ── Mobile ── */}
      <div className="sm:hidden flex items-center justify-between px-3 py-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Image src={assets.nimiCircle} alt="NIMI" width={44} height={44} className="rounded-full object-cover border-2 border-yellow-400 shadow-md" />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[var(--nimi-green)] text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-white">NIMI</span>
          </div>
          <h1 className="font-black" style={{ fontSize: "1.75rem", lineHeight: 1,
            background: "linear-gradient(90deg,#FF0000,#FF7700,#FFDD00,#00BB44,#0066FF,#8800CC)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            NIMIPIKO
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowPicker(!showPicker)}
              className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-lg transition" aria-label="Change language">
              {LANGS.find(l => l.code === language)?.flag ?? "🌐"}
            </button>
            {showPicker && (
              <div className="absolute right-0 mt-2 bg-white border border-ds-border rounded-xl shadow-lg overflow-hidden z-50 w-36">
                {LANGS.map(lang => (
                  <button key={lang.code} onClick={() => { setPendingLanguage(lang.code); setShowPicker(false); }}
                    className="flex items-center px-3 py-2.5 w-full hover:bg-gray-50 text-sm">
                    <span className="text-lg mr-2">{lang.flag}</span>
                    <span className="font-medium text-ds-text">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <Image src={assets.pikoCircle} alt="PIKO" width={36} height={36} className="rounded-full object-cover border-2 border-blue-300 shadow" />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white">PIKO</span>
          </div>
        </div>
      </div>
    </header>
  );
}
