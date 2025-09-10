"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Languages, Smile } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";

interface HeaderProps {
  simple?: boolean; // <-- optional prop
}

export default function Header({ simple }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const languages = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
    { code: "sw", label: "Swahili", flag: "🇰🇪" }
  ];

  return (
    <header className={`${simple ? "bg-transparent border-none" : "bg-white/95 border-b-2 border-pink-200"} sticky top-0 z-40`}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center group">
            <div className="relative w-16 h-16 bg-gradient-to-br from-orange-300 to-pink-400 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              {isClient && (
                <img 
                  src="/nimi-logo.jpg" 
                  alt="NIMI" 
                  className="w-14 h-14 rounded-full object-cover border-2 border-white"
                />
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-300 rounded-full flex items-center justify-center animate-pulse">
                <Smile className="w-4 h-4 text-white" />
              </div>
            </div>
            <h1 className="ml-3 text-2xl font-bold text-pink-600">NIMI</h1>
          </Link>

          {isClient && !simple && ( // Hide language picker if simple
            <div className="relative">
              <button
                onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center shadow-md hover:bg-pink-200 transition-colors"
                aria-label={t('changeLanguage') || "Change language"}
              >
                <span className="text-2xl">
                  {languages.find(l => l.code === language)?.flag || "🌐"}
                </span>
              </button>

              {showLanguagePicker && (
                <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border-2 border-pink-200 overflow-hidden z-50 w-40">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as Language);
                        setShowLanguagePicker(false);
                      }}
                      
                      
                      className="flex items-center px-4 py-3 w-full hover:bg-pink-50 transition-colors text-lg"
                    >
                      <span className="text-2xl mr-3">{lang.flag}</span>
                      <span>{lang.label}</span>
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
