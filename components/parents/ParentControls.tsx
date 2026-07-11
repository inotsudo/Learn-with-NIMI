"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PREFS_KEY = "nimipiko-parent-prefs";

function loadPrefs(): Record<string, number | boolean> {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") } catch { return {} }
}

function savePrefs(p: Record<string, number | boolean>) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

interface Props {
  childName: string;
  childLanguage: string;
}

export default function ParentControls({ childName, childLanguage }: Props) {
  const [prefs, setPrefs] = useState<Record<string, number | boolean>>({
    dailyGoal: 2, reminders: true, screenTime: 30, sharing: true,
  });
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = loadPrefs();
    setPrefs(prev => ({ ...prev, ...stored }));
  }, []);

  const flashSaved = () => {
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1600);
  };

  const toggle = (key: string) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      savePrefs(next);
      flashSaved();
      return next;
    });
  };

  const setNum = (key: string, val: number) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: val };
      savePrefs(next);
      flashSaved();
      return next;
    });
  };

  const dailyGoal = (prefs.dailyGoal as number) || 2;
  const screenTime = (prefs.screenTime as number) || 30;
  const langLabel = childLanguage === "en" ? "English" : childLanguage === "fr" ? "Français" : "Kinyarwanda";

  return (
    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚙️</span>
        <h2 className="font-black text-ds-text text-[18px]">Controls</h2>
        <AnimatePresence>
          {saved && (
            <motion.span
              key="saved"
              initial={{ opacity: 0, scale: 0.8, x: -4 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="ml-auto flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"
            >
              ✓ Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="space-y-2.5">
        {/* Daily Goal */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: 'var(--leaf-r)' }}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">📖</div>
          <div className="flex-1 min-w-0">
            <p className="text-ds-text text-[13px] font-black">Daily Goal</p>
            <p className="text-gray-500 text-[10px]">{dailyGoal} missions per day</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setNum("dailyGoal", Math.max(1, dailyGoal - 1))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[16px] flex items-center justify-center hover:bg-gray-300 transition">−</button>
            <span className="text-ds-text font-black text-[18px] w-6 text-center">{dailyGoal}</span>
            <button onClick={() => setNum("dailyGoal", Math.min(10, dailyGoal + 1))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[16px] flex items-center justify-center hover:bg-gray-300 transition">+</button>
          </div>
        </div>

        {/* Screen Time */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: 'var(--leaf-r)' }}>
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">⏰</div>
          <div className="flex-1 min-w-0">
            <p className="text-ds-text text-[13px] font-black">Screen Time</p>
            <p className="text-gray-500 text-[10px]">Daily limit</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setNum("screenTime", Math.max(10, screenTime - 10))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[14px] flex items-center justify-center hover:bg-gray-300 transition">−</button>
            <span className="text-ds-text font-black text-[14px] w-10 text-center">{screenTime}m</span>
            <button onClick={() => setNum("screenTime", Math.min(120, screenTime + 10))}
              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-[14px] flex items-center justify-center hover:bg-gray-300 transition">+</button>
          </div>
        </div>

        {/* Sharing */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: 'var(--leaf-r)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0" style={{ backgroundColor: 'var(--nimi-green)' }}>👁️</div>
          <div className="flex-1 min-w-0">
            <p className="text-ds-text text-[13px] font-black">Community Sharing</p>
            <p className="text-gray-500 text-[10px]">Allow sharing achievements</p>
          </div>
          <button onClick={() => toggle("sharing")}
            className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors ${prefs.sharing ? "bg-[var(--nimi-green)]" : "bg-gray-300"}`}>
            <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${prefs.sharing ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {/* Language */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-ds-border" style={{ borderRadius: 'var(--leaf-r)' }}>
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">🌐</div>
          <div className="flex-1 min-w-0">
            <p className="text-ds-text text-[13px] font-black">Language</p>
            <p className="text-gray-500 text-[10px]">{childName}&apos;s learning language</p>
          </div>
          <span className="text-gray-600 font-black text-[12px] bg-gray-100 border border-ds-border px-3 py-1.5 rounded-full">{langLabel}</span>
        </div>
      </div>
    </div>
  );
}
