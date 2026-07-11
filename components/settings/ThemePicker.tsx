"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, Zap, ChevronRight } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getAllThemes } from "@/lib/design-system/themeMetadata";
import { SPRING, DURATION } from "@/lib/design-system/motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import type { AppThemeId } from "@/lib/design-system/theme";

const INSTALLED_THEMES = getAllThemes().filter(t => t.isInstalled);

export default function ThemePicker() {
  const { themeId, setThemeId } = useAppTheme();
  const m = useThemeMotion();

  const currentTheme = INSTALLED_THEMES.find(t => t.id === themeId) ?? INSTALLED_THEMES[0];

  return (
    <div className="leaf border border-[var(--ds-border-primary)]/60 bg-gradient-to-br from-white via-[var(--ds-brand-soft)]/40 to-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-baloo font-black text-ds-text text-[17px] leading-tight">Pick Your Theme!</h3>
            <p className="text-gray-400 text-[11px] font-nunito">Choose how NIMIPIKO looks for you</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 border border-[var(--ds-border-brand)]/20 rounded-full px-2.5 py-1 shadow-sm">
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }} />
          <span className="text-[var(--ds-brand-primary)] font-baloo font-bold text-[11px]">{currentTheme.name}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {INSTALLED_THEMES.map((t, i) => {
          const active = t.id === themeId;
          return (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.card, delay: i * 0.07 }}
              className={`relative overflow-hidden transition-all ${
                active
                  ? "ring-2 ring-[var(--ds-brand-primary)]/50 shadow-[0_12px_28px_rgba(15,23,42,0.10)]"
                  : "ring-1 ring-gray-200 hover:ring-[var(--ds-brand-primary)]/30 hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
              }`}
              style={{ borderRadius: 'var(--leaf-r)' }}>

              {/* Preview area */}
              <div
                className="h-32 relative overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(16,185,129,0.24), rgba(6,95,70,0.32)), url('${t.previewImage}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-white/10" />

                {/* Mini UI mockup */}
                <div className="absolute inset-2.5 flex flex-col gap-1.5">
                  <div className="bg-white/25 backdrop-blur-sm rounded-lg h-5 flex items-center gap-1.5 px-2">
                    <div className="w-2 h-2 rounded-full bg-white/70" />
                    <div className="h-1.5 w-10 rounded-full bg-white/55" />
                    <div className="flex-1" />
                    <div className="h-1.5 w-4 rounded-full bg-white/40" />
                    <div className="h-1.5 w-4 rounded-full bg-white/40" />
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg flex-1 flex items-center gap-2 px-2">
                    <div className="w-6 h-6 rounded-full bg-white/50 flex-shrink-0" />
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="h-1.5 w-full rounded-full bg-white/65" />
                      <div className="h-1 w-2/3 rounded-full bg-white/40" />
                    </div>
                    <div className="bg-white/40 rounded-md h-4 w-8 flex-shrink-0" />
                  </div>
                </div>

                <motion.span
                  className="absolute bottom-2 right-2.5 text-[22px] drop-shadow-lg select-none"
                  animate={active
                    ? { scale: [1, 1.18, 1], rotate: [0, 10, -10, 0] }
                    : { scale: [1, 1.06, 1] }
                  }
                  transition={{ duration: active ? DURATION.loopBase : 3, repeat: Infinity }}>
                  {t.accentIcon}
                </motion.span>

                <AnimatePresence>
                  {active && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={SPRING.modal}
                      className="absolute top-2 left-2 flex items-center gap-1 bg-white rounded-full px-2 py-0.5 shadow-md">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-[var(--ds-brand-primary)] font-baloo font-bold text-[10px]">Active</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Info + CTA */}
              <div className="bg-white/90 px-3 py-2.5">
                <p className="font-baloo font-bold text-[13px] text-ds-text">{t.name}</p>
                <p className="text-gray-400 text-[10px] font-nunito leading-tight mt-0.5 line-clamp-2">{t.description}</p>
                <div className="mt-2.5">
                  {active ? (
                    <div className="w-full h-8 leaf bg-[var(--ds-brand-soft)] border border-[var(--ds-border-brand)]/20 text-[var(--ds-brand-primary)] font-baloo font-bold text-[12px] flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Currently Active
                    </div>
                  ) : (
                    <motion.button
                      whileTap={m.buttonPress}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setThemeId(t.id as AppThemeId)}
                      className="w-full h-8 leaf bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)] text-white font-baloo font-bold text-[12px] shadow-[0_6px_18px_rgba(22,163,74,0.22)] flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <Zap className="w-3.5 h-3.5" />
                      Apply Theme
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Browse gallery CTA */}
      <div className="mt-4 pt-3 border-t border-[var(--ds-border-primary)]/40 flex items-center justify-between">
        <p className="text-gray-400 text-[11px] font-nunito">More themes available in the gallery</p>
        <Link href="/themes">
          <motion.span
            whileTap={m.buttonPress}
            className="flex items-center gap-1 text-[var(--ds-brand-primary)] font-baloo font-bold text-[12px] hover:underline cursor-pointer">
            Browse all themes
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.span>
        </Link>
      </div>
    </div>
  );
}
