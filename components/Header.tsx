"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage, Language } from "@/contexts/LanguageContext";

interface HeaderProps {
  simple?: boolean;
}

const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

export default function Header({ simple }: HeaderProps) {
  const { language, setLanguage } = useLanguage();
  const [showPicker, setShowPicker] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  return (
    <header
      className={`${
        simple ? "bg-transparent border-none" : "bg-white/95 border-b-2 border-purple-200"
      } sticky top-0 z-40 shadow-sm`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 sm:h-18">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex-shrink-0">
              {isClient && (
                <img
                  src="/nimi-logo-circle.png"
                  alt="NIMIPIKO"
                  className="w-10 h-10 rounded-full object-cover border-2 border-yellow-400 shadow group-hover:scale-105 transition-transform"
                />
              )}
            </div>
            <div>
              <h1
                className="font-black leading-none"
                style={{
                  fontSize: "clamp(1.1rem, 3vw, 1.5rem)",
                  background:
                    "linear-gradient(90deg,#e53e3e,#dd6b20,#d69e2e,#38a169,#3182ce,#805ad5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                NIMIPIKO
              </h1>
              <p className="text-gray-400 text-[9px] font-semibold hidden sm:block">
                Learn • Play • Create • Grow
              </p>
            </div>
          </Link>

          {/* Language picker */}
          {isClient && (
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="w-10 h-10 bg-purple-100 hover:bg-purple-200 rounded-full flex items-center justify-center text-xl transition"
                aria-label="Change language"
              >
                {LANGS.find(l => l.code === language)?.flag ?? "🌐"}
              </button>

              {showPicker && (
                <div className="absolute right-0 mt-2 bg-purple-900/90 backdrop-blur-md border-2 border-white/15 rounded-xl shadow-xl overflow-hidden z-50 w-36">
                  {LANGS.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setShowPicker(false); }}
                      className="flex items-center px-3 py-2.5 w-full hover:bg-white/10 transition text-sm"
                    >
                      <span className="text-lg mr-2">{lang.flag}</span>
                      <span className="font-medium text-purple-100">{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
