"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown } from "lucide-react";
import supabase from "@/lib/supabaseClient";

type Language = "en" | "fr" | "rw";

interface Props {
  childId: string;
  parentId: string;
  childName: string;
  childLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

interface DBSettings {
  daily_limit_minutes: number;
  notifications_enabled: boolean;
}

const DEFAULT_DB: DBSettings = { daily_limit_minutes: 60, notifications_enabled: true };

const LANG_LABELS: Record<Language, string> = {
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  rw: "🇷🇼 Kinyarwanda",
};

function localKey(childId: string) { return `nimipiko-prefs-${childId}`; }

function loadLocal(childId: string): { dailyGoal: number; sharing: boolean } {
  try { return { dailyGoal: 2, sharing: true, ...JSON.parse(localStorage.getItem(localKey(childId)) ?? "{}") }; }
  catch { return { dailyGoal: 2, sharing: true }; }
}

function saveLocal(childId: string, patch: Partial<{ dailyGoal: number; sharing: boolean }>) {
  const current = loadLocal(childId);
  localStorage.setItem(localKey(childId), JSON.stringify({ ...current, ...patch }));
}

export default function ParentControls({ childId, parentId, childName, childLanguage, onLanguageChange }: Props) {
  const [dbSettings, setDbSettings] = useState<DBSettings>(DEFAULT_DB);
  const [dailyGoal, setDailyGoal]   = useState(2);
  const [sharing, setSharing]       = useState(true);
  const [language, setLanguage]     = useState<Language>(childLanguage);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);
  const [langOpen, setLangOpen]     = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLanguage(childLanguage); }, [childLanguage]);

  useEffect(() => {
    setLoading(true);
    const local = loadLocal(childId);
    setDailyGoal(local.dailyGoal);
    setSharing(local.sharing);

    void (async () => {
      const { data } = await supabase
        .from("parental_settings")
        .select("daily_limit_minutes, notifications_enabled")
        .eq("parent_id", parentId)
        .eq("child_id", childId)
        .maybeSingle();
      if (data) setDbSettings({ daily_limit_minutes: data.daily_limit_minutes ?? 60, notifications_enabled: data.notifications_enabled ?? true });
      setLoading(false);
    })();
  }, [childId, parentId]);

  const flashSaved = useCallback(() => {
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1800);
  }, []);

  const saveDb = useCallback((patch: Partial<DBSettings>) => {
    const updated = { ...dbSettings, ...patch };
    setDbSettings(updated);
    if (dbTimer.current) clearTimeout(dbTimer.current);
    dbTimer.current = setTimeout(async () => {
      setSaving("db");
      await supabase.from("parental_settings").upsert(
        { parent_id: parentId, child_id: childId, ...updated },
        { onConflict: "parent_id,child_id" }
      );
      setSaving(null);
      flashSaved();
    }, 600);
  }, [childId, parentId, dbSettings, flashSaved]);

  const setScreenTime = (val: number) => saveDb({ daily_limit_minutes: val });

  const setDailyGoalVal = (val: number) => {
    setDailyGoal(val);
    saveLocal(childId, { dailyGoal: val });
    flashSaved();
  };

  const toggleSharing = () => {
    const next = !sharing;
    setSharing(next);
    saveLocal(childId, { sharing: next });
    flashSaved();
  };

  const handleLangChange = async (lang: Language) => {
    if (lang === language) { setLangOpen(false); return; }
    const prev = language;
    setLanguage(lang);
    setLangOpen(false);
    setSaving("lang");
    const { error } = await supabase.from("children").update({ language: lang }).eq("id", childId);
    if (error) { setLanguage(prev); }
    else { onLanguageChange(lang); flashSaved(); }
    setSaving(null);
  };

  const screenTime = dbSettings.daily_limit_minutes;

  if (loading) {
    return (
      <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">⚙️</span>
          <h2 className="font-black text-ds-text text-[18px]">Controls</h2>
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[58px] bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚙️</span>
        <h2 className="font-black text-ds-text text-[18px]">Controls</h2>
        <AnimatePresence>
          {saved && (
            <motion.span key="saved"
              initial={{ opacity: 0, scale: 0.8, x: -4 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              className="ml-auto flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              ✓ Saved
            </motion.span>
          )}
          {saving === "db" && !saved && (
            <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2.5">
        {/* Daily Goal */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: "var(--leaf-r)" }}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">📖</div>
          <div className="flex-1 min-w-0">
            <p className="text-ds-text text-[13px] font-black">Daily Goal</p>
            <p className="text-gray-500 text-[10px]">{dailyGoal} {dailyGoal === 1 ? "mission" : "missions"} per day</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setDailyGoalVal(Math.max(1, dailyGoal - 1))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[16px] flex items-center justify-center hover:bg-gray-300 active:scale-95 transition">−</button>
            <span className="text-ds-text font-black text-[18px] w-6 text-center tabular-nums">{dailyGoal}</span>
            <button onClick={() => setDailyGoalVal(Math.min(10, dailyGoal + 1))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[16px] flex items-center justify-center hover:bg-gray-300 active:scale-95 transition">+</button>
          </div>
        </div>

        {/* Screen Time */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: "var(--leaf-r)" }}>
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">⏰</div>
          <div className="flex-1 min-w-0">
            <p className="text-ds-text text-[13px] font-black">Daily Time Limit</p>
            <p className="text-gray-500 text-[10px]">{screenTime} minutes of screen time</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setScreenTime(Math.max(10, screenTime - 10))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[14px] flex items-center justify-center hover:bg-gray-300 active:scale-95 transition">−</button>
            <span className="text-ds-text font-black text-[14px] w-12 text-center tabular-nums">{screenTime}m</span>
            <button onClick={() => setScreenTime(Math.min(180, screenTime + 10))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[14px] flex items-center justify-center hover:bg-gray-300 active:scale-95 transition">+</button>
          </div>
        </div>

        {/* Language */}
        <div className="relative">
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: "var(--leaf-r)" }}>
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">🌐</div>
            <div className="flex-1 min-w-0">
              <p className="text-ds-text text-[13px] font-black">Learning Language</p>
              <p className="text-gray-500 text-[10px]">{childName}&apos;s language</p>
            </div>
            <button
              onClick={() => setLangOpen(o => !o)}
              disabled={saving === "lang"}
              className="flex items-center gap-1.5 text-gray-700 font-black text-[12px] bg-white border border-ds-border px-3 py-1.5 rounded-full hover:bg-gray-50 active:scale-95 transition disabled:opacity-50">
              {saving === "lang" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {LANG_LABELS[language]}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <AnimatePresence>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-white border border-ds-border shadow-lg rounded-2xl overflow-hidden min-w-[180px]">
                  {(["en", "fr", "rw"] as Language[]).map(lang => (
                    <button key={lang} onClick={() => handleLangChange(lang)}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-semibold transition hover:bg-gray-50 flex items-center gap-2 ${language === lang ? "text-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)]" : "text-ds-text"}`}>
                      {LANG_LABELS[lang]}
                      {language === lang && <span className="ml-auto text-[10px] font-black text-[var(--ds-brand-primary)]">✓</span>}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Community Sharing */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: "var(--leaf-r)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0" style={{ backgroundColor: "var(--nimi-green)" }}>👁️</div>
          <div className="flex-1 min-w-0">
            <p className="text-ds-text text-[13px] font-black">Community Sharing</p>
            <p className="text-gray-500 text-[10px]">Share {childName}&apos;s achievements publicly</p>
          </div>
          <button onClick={toggleSharing}
            className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors ${sharing ? "bg-[var(--nimi-green)]" : "bg-gray-300"}`}>
            <motion.div animate={{ x: sharing ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-6 h-6 bg-white rounded-full shadow" />
          </button>
        </div>
      </div>
    </div>
  );
}
