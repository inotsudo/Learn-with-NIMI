"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Smile, Star, Award, GraduationCap, BookOpen, ShieldCheck, Gift, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createChild } from "@/lib/queries";
import type { Child, FavoriteCategory } from "@/lib/queries";
import { AVATARS } from "./CreateChildModal";
import AuthBackground from "@/components/auth/AuthBackground";

const AGE_GROUPS: { value: number; key: string }[] = [
  { value: 4, key: "ageGroup3to5" },
  { value: 7, key: "ageGroup6to8" },
  { value: 10, key: "ageGroup9to12" },
];

const FAVORITE_CATEGORIES: { value: FavoriteCategory; key: string }[] = [
  { value: "animals", key: "favAnimalsNature" },
  { value: "space", key: "favSpaceScience" },
  { value: "music", key: "favMusicDance" },
  { value: "art", key: "favArtColors" },
  { value: "stories", key: "favStoriesMagic" },
  { value: "adventure", key: "favAdventureExploration" },
];

const REWARD_ITEMS: {
  icon: typeof Star;
  titleKey: string;
  descKey: string;
  bg: string;
  iconBg: string;
  iconColor: string;
}[] = [
  { icon: Star, titleKey: "earnStarsTitle", descKey: "earnStarsDesc", bg: "bg-yellow-400/20", iconBg: "bg-yellow-400/20", iconColor: "text-yellow-200" },
  { icon: Award, titleKey: "collectBadgesTitle", descKey: "collectBadgesDesc", bg: "theme-accent-muted", iconBg: "theme-accent-muted", iconColor: "theme-text" },
  { icon: GraduationCap, titleKey: "getCertificatesTitle", descKey: "getCertificatesDesc", bg: "bg-blue-400/20", iconBg: "bg-blue-400/20", iconColor: "text-blue-200" },
  { icon: BookOpen, titleKey: "readStoriesTitle", descKey: "readStoriesDesc", bg: "bg-pink-400/20", iconBg: "bg-pink-400/20", iconColor: "text-pink-200" },
];

interface Props {
  onCreated: (child: Child) => void;
}

export default function CreateExplorerProfile({ onCreated }: Props) {
  const { t, language } = useLanguage();
  const [name, setName] = useState("");
  const [age, setAge] = useState(AGE_GROUPS[1].value);
  const [favorite, setFavorite] = useState<FavoriteCategory>(FAVORITE_CATEGORIES[0].value);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const [showFavDropdown, setShowFavDropdown] = useState(false);
  const ageRef = useRef<HTMLDivElement>(null);
  const favRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ageRef.current && !ageRef.current.contains(e.target as Node)) setShowAgeDropdown(false);
      if (favRef.current && !favRef.current.contains(e.target as Node)) setShowFavDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t("pleaseEnterNameError")); return; }
    setSaving(true);
    setError("");
    const { data: child, error: err } = await createChild({
      name: name.trim(),
      age,
      language,
      avatar_url: avatar,
      favorite_category: favorite,
    });
    setSaving(false);
    if (err || !child) { setError(err ?? t("chatErrorMsg")); return; }
    onCreated(child);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2a1660] via-[#33186e] to-[#1c0f3d] relative overflow-hidden">
      <AuthBackground />
      {/* Decorative floating emoji */}
      <div className="hidden sm:block pointer-events-none select-none">
        {[
          { emoji: "⭐", className: "top-10 left-[8%] text-3xl" },
          { emoji: "💫", className: "top-28 right-[12%] text-2xl" },
          { emoji: "📖", className: "top-36 left-[18%] text-3xl" },
          { emoji: "🏅", className: "top-12 right-[22%] text-2xl" },
          { emoji: "✨", className: "top-44 right-[6%] text-xl" },
        ].map((item, i) => (
          <motion.span
            key={i}
            className={`absolute ${item.className}`}
            animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {item.emoji}
          </motion.span>
        ))}
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-black text-2xl sm:text-4xl text-white">
            ✨ {t("welcomeFutureExplorer")} ✨
          </h1>
          <p className="theme-text mt-2 max-w-xl mx-auto">{t("createProfileSubtitle")}</p>
        </div>

        <div className="lg:grid lg:grid-cols-[180px_1fr_280px] lg:gap-6 lg:items-start">
          {/* Left mascot + speech bubble */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3">
            <div className="bg-white/15 backdrop-blur border border-white/20 rounded-2xl rounded-bl-sm shadow-md px-4 py-3 text-center">
              <p className="text-sm font-bold text-white leading-snug">{t("nimiOnboardingBubble")}</p>
            </div>
            <motion.img
              src="/nimi-logo-circle.png" alt="NIMI"
              className="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          </div>

          {/* Center form card */}
          <div className="bg-white/10 backdrop-blur rounded-3xl shadow-xl border-2 border-white/15 p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 theme-accent-muted rounded-full flex items-center justify-center flex-shrink-0">
                <Smile className="w-5 h-5 theme-text" />
              </div>
              <h2 className="font-black text-lg text-white flex-1">{t("createProfileCardTitle")}</h2>
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>

            <div className="space-y-5">
              {/* Step 1: name */}
              <div>
                <label className="flex items-center gap-2 font-bold theme-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full theme-accent text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
                  {t("whatShouldWeCallYou")}
                </label>
                <input
                  type="text" value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder={t("explorerNamePlaceholder")}
                  maxLength={30}
                  className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:theme-border-strong transition placeholder:text-white/40" />
              </div>

              {/* Step 2: age group */}
              <div className="pt-5 border-t border-white/15">
                <label className="flex items-center gap-2 font-bold theme-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full theme-accent text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
                  {t("chooseAgeGroup")}
                </label>
                <div ref={ageRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowAgeDropdown(v => !v); setShowFavDropdown(false); }}
                    className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:theme-border-strong transition flex items-center justify-between"
                  >
                    <span>{t(AGE_GROUPS.find(g => g.value === age)?.key ?? AGE_GROUPS[0].key)}</span>
                    <ChevronDown className={`w-4 h-4 theme-text-muted transition-transform ${showAgeDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showAgeDropdown && (
                    <div className="absolute left-0 right-0 mt-1 theme-darker backdrop-blur-md border-2 border-white/15 rounded-xl shadow-xl overflow-hidden z-50">
                      {AGE_GROUPS.map(g => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => { setAge(g.value); setShowAgeDropdown(false); }}
                          className={`flex items-center px-4 py-2.5 w-full text-sm font-medium transition ${
                            age === g.value ? "theme-accent/30 text-white" : "theme-text hover:bg-white/10"
                          }`}
                        >
                          {t(g.key)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: favorite adventure */}
              <div className="pt-5 border-t border-white/15">
                <label className="flex items-center gap-2 font-bold theme-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full theme-accent text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
                  {t("pickFavoriteAdventure")}
                </label>
                <div ref={favRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowFavDropdown(v => !v); setShowAgeDropdown(false); }}
                    className="w-full border-2 border-white/20 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:theme-border-strong transition flex items-center justify-between"
                  >
                    <span>{t(FAVORITE_CATEGORIES.find(c => c.value === favorite)?.key ?? FAVORITE_CATEGORIES[0].key)}</span>
                    <ChevronDown className={`w-4 h-4 theme-text-muted transition-transform ${showFavDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showFavDropdown && (
                    <div className="absolute left-0 right-0 mt-1 theme-darker backdrop-blur-md border-2 border-white/15 rounded-xl shadow-xl overflow-hidden z-50">
                      {FAVORITE_CATEGORIES.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => { setFavorite(c.value); setShowFavDropdown(false); }}
                          className={`flex items-center px-4 py-2.5 w-full text-sm font-medium transition ${
                            favorite === c.value ? "theme-accent/30 text-white" : "theme-text hover:bg-white/10"
                          }`}
                        >
                          {t(c.key)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: avatar */}
              <div className="pt-5 border-t border-white/15">
                <label className="flex items-center gap-2 font-bold theme-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full theme-accent text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
                  {t("chooseYourAvatar")}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`w-11 h-11 rounded-full text-2xl flex items-center justify-center transition border-2 ${
                        avatar === a
                          ? "theme-border-strong theme-accent-muted scale-110 shadow"
                          : "border-transparent bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-semibold text-center mt-4">{error}</p>
            )}

            <motion.button
              onClick={handleSubmit}
              disabled={saving}
              whileTap={{ scale: 0.97 }}
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl py-3.5 flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-60"
            >
              {saving ? (
                <span>{t("creatingProfileLabel")}</span>
              ) : (
                <span>🚀 {t("startMyAdventure")}</span>
              )}
            </motion.button>
          </div>

          {/* Right sidebar */}
          <div className="mt-6 lg:mt-0 space-y-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl border-2 border-white/15 shadow-md p-4">
              <p className="font-black text-white mb-3 flex items-center gap-1.5">
                🏆 {t("adventureAwaitsTitle")}
              </p>
              <div className="space-y-2.5">
                {REWARD_ITEMS.map(item => (
                  <div key={item.titleKey} className={`rounded-xl p-3 flex items-start gap-3 backdrop-blur border border-white/10 ${item.bg}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur border border-white/20 ${item.iconBg}`}>
                      <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{t(item.titleKey)}</p>
                      <p className="text-xs theme-text-muted">{t(item.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl border-2 border-white/15 p-4">
              <p className="font-black text-white mb-1 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-pink-300" /> {t("welcomeGiftTitle")}
              </p>
              <p className="text-sm theme-text-muted">{t("welcomeGiftDesc")}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs theme-text-muted mt-8 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> {t("infoSafetyNote")}
        </p>
      </main>
    </div>
  );
}
