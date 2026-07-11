"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Smile, Star, Award, GraduationCap, BookOpen, ShieldCheck, Gift, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useThemeMotion } from "@/hooks/useThemeMotion";
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
  { icon: Star,          titleKey: "earnStarsTitle",       descKey: "earnStarsDesc",       bg: "bg-yellow-50", iconBg: "bg-yellow-100", iconColor: "text-yellow-600" },
  { icon: Award,         titleKey: "collectBadgesTitle",   descKey: "collectBadgesDesc",   bg: "bg-[var(--ds-brand-subtle)]",  iconBg: "bg-[var(--ds-brand-subtle)]",  iconColor: "text-[var(--ds-brand-primary)]" },
  { icon: GraduationCap, titleKey: "getCertificatesTitle", descKey: "getCertificatesDesc", bg: "bg-blue-50",   iconBg: "bg-blue-100",   iconColor: "text-blue-600" },
  { icon: BookOpen,      titleKey: "readStoriesTitle",     descKey: "readStoriesDesc",     bg: "bg-pink-50",   iconBg: "bg-pink-100",   iconColor: "text-pink-600" },
];

interface Props {
  onCreated: (child: Child) => void;
}

export default function CreateExplorerProfile({ onCreated }: Props) {
  const { t, language } = useLanguage();
  const m = useThemeMotion();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
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
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
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
          <h1 className="font-black text-2xl sm:text-4xl text-ds-text">
            ✨ {t("welcomeFutureExplorer")} ✨
          </h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">{t("createProfileSubtitle")}</p>
        </div>

        <div className="lg:grid lg:grid-cols-[180px_1fr_280px] lg:gap-6 lg:items-start">
          {/* Left mascot + speech bubble */}
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3">
            <div className="bg-white border border-ds-border rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 text-center">
              <p className="text-sm font-bold text-ds-text leading-snug">{t("nimiOnboardingBubble")}</p>
            </div>
            <motion.img
              src={assets.nimiCircle} alt="NIMI"
              className="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
          </div>

          {/* Center form card */}
          <div className="bg-white border border-ds-border shadow-ds-card p-5 sm:p-8" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 bg-[var(--ds-brand-subtle)] rounded-full flex items-center justify-center flex-shrink-0">
                <Smile className="w-5 h-5 text-[var(--ds-brand-primary)]" />
              </div>
              <h2 className="font-black text-lg text-ds-text flex-1">{t("createProfileCardTitle")}</h2>
              <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
            </div>

            <div className="space-y-5">
              {/* Step 1: name */}
              <div>
                <label className="flex items-center gap-2 font-bold text-ds-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--nimi-green)] text-white text-xs flex items-center justify-center flex-shrink-0">1</span>
                  {t("whatShouldWeCallYou")}
                </label>
                <input
                  type="text" value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder={t("explorerNamePlaceholder")}
                  maxLength={30}
                  className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition placeholder:text-gray-400" />
              </div>

              {/* Step 2: age group */}
              <div className="pt-5 border-t border-ds-border">
                <label className="flex items-center gap-2 font-bold text-ds-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--nimi-green)] text-white text-xs flex items-center justify-center flex-shrink-0">2</span>
                  {t("chooseAgeGroup")}
                </label>
                <div ref={ageRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowAgeDropdown(v => !v); setShowFavDropdown(false); }}
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition flex items-center justify-between"
                  >
                    <span>{t(AGE_GROUPS.find(g => g.value === age)?.key ?? AGE_GROUPS[0].key)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAgeDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showAgeDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-ds-border rounded-xl shadow-lg overflow-hidden z-50">
                      {AGE_GROUPS.map(g => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => { setAge(g.value); setShowAgeDropdown(false); }}
                          className={`flex items-center px-4 py-2.5 w-full text-sm font-medium transition ${
                            age === g.value ? "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]" : "text-ds-text hover:bg-gray-50"
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
              <div className="pt-5 border-t border-ds-border">
                <label className="flex items-center gap-2 font-bold text-ds-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--nimi-green)] text-white text-xs flex items-center justify-center flex-shrink-0">3</span>
                  {t("pickFavoriteAdventure")}
                </label>
                <div ref={favRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setShowFavDropdown(v => !v); setShowAgeDropdown(false); }}
                    className="w-full border border-ds-border bg-ds-input leaf px-4 py-2.5 text-sm font-semibold text-ds-text focus:outline-none focus:ring-2 focus:ring-[var(--ds-state-focus)] transition flex items-center justify-between"
                  >
                    <span>{t(FAVORITE_CATEGORIES.find(c => c.value === favorite)?.key ?? FAVORITE_CATEGORIES[0].key)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFavDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showFavDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-ds-border rounded-xl shadow-lg overflow-hidden z-50">
                      {FAVORITE_CATEGORIES.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => { setFavorite(c.value); setShowFavDropdown(false); }}
                          className={`flex items-center px-4 py-2.5 w-full text-sm font-medium transition ${
                            favorite === c.value ? "bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)]" : "text-ds-text hover:bg-gray-50"
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
              <div className="pt-5 border-t border-ds-border">
                <label className="flex items-center gap-2 font-bold text-ds-text text-sm mb-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--nimi-green)] text-white text-xs flex items-center justify-center flex-shrink-0">4</span>
                  {t("chooseYourAvatar")}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`w-11 h-11 rounded-full text-2xl flex items-center justify-center transition border-2 ${
                        avatar === a
                          ? "border-[var(--ds-border-brand)] bg-[var(--ds-brand-subtle)] scale-110 shadow"
                          : "border-transparent bg-gray-100 hover:bg-gray-200"
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
              whileTap={m.buttonPress}
              className="w-full mt-6 text-white font-black py-3.5 flex items-center justify-center gap-2 shadow-md transition disabled:opacity-60"
              style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r)' }}
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
            <div className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
              <p className="font-black text-ds-text mb-3 flex items-center gap-1.5">
                🏆 {t("adventureAwaitsTitle")}
              </p>
              <div className="space-y-2.5">
                {REWARD_ITEMS.map(item => (
                  <div key={item.titleKey} className={`leaf p-3 flex items-start gap-3 ${item.bg}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                      <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-ds-text">{t(item.titleKey)}</p>
                      <p className="text-xs text-gray-500">{t(item.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-ds-border shadow-ds-card p-4" style={{ borderRadius: 'var(--leaf-r)' }}>
              <p className="font-black text-ds-text mb-1 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-pink-500" /> {t("welcomeGiftTitle")}
              </p>
              <p className="text-sm text-gray-500">{t("welcomeGiftDesc")}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> {t("infoSafetyNote")}
        </p>
      </main>
    </div>
  );
}
