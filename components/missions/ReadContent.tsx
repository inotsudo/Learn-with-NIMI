"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Check, ChevronRight, Download, FileText, Lock } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import type { Mission } from "@/lib/queries";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";
import { useMotion } from "@/hooks/useMotion";
import MissionCompleteBanner from "./MissionCompleteBanner";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false });

interface ReadContentProps {
  mission: Mission;
  onComplete: () => void;
  completed: boolean;
  saving: boolean;
  storySlug?: string;
}

export default function ReadContent({ mission, onComplete, completed, saving, storySlug }: ReadContentProps) {
  const { t } = useLanguage();
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const m = useMotion();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [reachedLastPage, setReachedLastPage] = useState(false);
  const pdfUrl = mission.media_url ? getStorageUrl(mission.media_url) : null;
  const canComplete = !pdfUrl || reachedLastPage;

  return (
    <div className="space-y-4">
      {pdfUrl ? (
        <div className="leaf-lg border border-amber-200/60 bg-gradient-to-b from-[#fffdf8] to-[#fdf5e4] shadow-[0_12px_32px_rgba(15,23,42,0.08)] p-5 overflow-hidden">

          {/* Nimi + speech bubble */}
          <div className="flex items-start gap-3 mb-5">
            <motion.img
              src={assets.nimiHappy}
              alt="NIMI"
              animate={m.floatLg.animate}
              transition={m.floatLg.transition}
              className="w-14 h-14 rounded-full object-cover border-[3px] border-yellow-300 shadow-md flex-shrink-0 mt-1"
            />
            <div className="relative bg-white border border-amber-200/70 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex-1">
              {/* Triangle tail */}
              <div className="absolute left-[-6px] top-[14px] w-3 h-3 rotate-45 bg-white border-l border-b border-amber-200/70" />
              <p className="font-baloo font-black text-ds-text text-[15px] leading-snug">{t("readyToReadLabel")}</p>
              <p className="font-nunito text-gray-400 text-[12px] mt-0.5">{t("storyBookWaiting")}</p>
            </div>
          </div>

          {/* Open book illustration */}
          <div className="flex items-end justify-center mb-5"
            style={{ filter: "drop-shadow(0 8px 20px rgba(15,23,42,0.13))" }}>

            {/* Left page */}
            <div className="relative w-[130px] h-[164px] bg-gradient-to-br from-[#fefbf2] to-[#f9f0d8]
              border border-amber-200/70 rounded-l-xl overflow-hidden">
              <div className="absolute inset-0 flex flex-col justify-center gap-[9px] px-5 py-6">
                {[100, 80, 100, 72, 100, 84, 60].map((w, i) => (
                  <div key={i} className="h-[2px] rounded-full bg-amber-300/40" style={{ width: `${w}%` }} />
                ))}
              </div>
              <p className="absolute bottom-2 left-0 right-0 text-center font-nunito text-[9px] font-semibold text-amber-400/50 tracking-widest">— 1 —</p>
              {/* Gutter shadow */}
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/8 to-transparent" />
            </div>

            {/* Spine */}
            <div className="w-3 h-[164px] bg-gradient-to-b from-amber-400/40 via-amber-500/55 to-amber-400/40
              shadow-[inset_2px_0_3px_rgba(255,255,255,0.25),inset_-2px_0_3px_rgba(0,0,0,0.08)]" />

            {/* Right page */}
            <div className="relative w-[130px] h-[164px] bg-gradient-to-bl from-[#f9f0d8] to-[#fefbf2]
              border border-amber-200/70 rounded-r-xl overflow-hidden">
              {/* Illustration area */}
              <div className="absolute top-5 left-5 right-5 h-[72px] rounded-lg
                bg-gradient-to-br from-amber-100/70 to-yellow-100/50
                border border-amber-200/50 flex items-center justify-center">
                <span className="text-[32px] leading-none select-none">🌟</span>
              </div>
              {/* Lines below */}
              <div className="absolute bottom-9 left-5 right-5 flex flex-col gap-[9px]">
                <div className="h-[2px] rounded-full bg-amber-300/40 w-full" />
                <div className="h-[2px] rounded-full bg-amber-300/40 w-[72%]" />
              </div>
              <p className="absolute bottom-2 left-0 right-0 text-center font-nunito text-[9px] font-semibold text-amber-400/50 tracking-widest">— 2 —</p>
              {/* Gutter shadow */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/8 to-transparent" />
            </div>
          </div>

          {/* CTA — opens in-app viewer */}
          <motion.button
            onClick={() => { setViewerOpen(true); setHasOpened(true); }}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center justify-between w-full
              bg-gradient-to-r from-amber-500 to-orange-500
              text-white rounded-2xl px-4 py-3.5
              shadow-[0_8px_22px_rgba(245,158,11,0.28)] transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-baloo font-black text-[17px] leading-tight">{t("openStorybookBtn")}</p>
                <p className="font-nunito text-[11px] text-white/75 leading-tight">{t("readInsideApp")}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </motion.button>

          {/* Download — subtle */}
          <div className="mt-3 text-center">
            <a href={pdfUrl} download
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700/40 hover:text-amber-700 transition">
              <Download className="w-3 h-3" /> {t("saveToDevice")}
            </a>
          </div>
        </div>
      ) : (
        /* No PDF yet */
        <div className="bg-white border border-ds-border leaf p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-[var(--ds-brand-subtle)] rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-baloo font-black text-ds-text text-[18px]">{t("pdfComingSoon")}</p>
          <p className="font-nunito text-gray-500 text-[13px] mt-1">{t("comingSoonTeacher")}</p>
          <p className="font-nunito text-gray-500 text-[12px] mt-2">{t("comingSoonComplete")}</p>
        </div>
      )}

      {!completed ? (
        <div className="space-y-2">
          <AnimatePresence>
            {pdfUrl && !reachedLastPage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="leaf border border-amber-200/60 bg-amber-50/60 px-4 py-3 flex items-center gap-3"
              >
                <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="font-nunito font-bold text-[12px] text-amber-700">{t("readToUnlock")}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {canComplete ? (
            <motion.button
              onClick={onComplete}
              disabled={saving}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
              whileTap={{ scale: 0.96 }}
              className="w-full font-baloo font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[18px] rounded-full py-4 shadow-[0_10px_24px_rgba(245,158,11,0.28)] flex items-center justify-center gap-2 disabled:opacity-50 transition">
              {saving ? t("saving") : <><Check className="w-5 h-5" /> {t("iReadItBtn")}</>}
            </motion.button>
          ) : (
            <button disabled
              className="w-full font-baloo font-black bg-gray-100 text-gray-400 text-[18px] rounded-full py-4 flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200">
              <Lock className="w-5 h-5" /> {t("readToUnlock")}
            </button>
          )}
        </div>
      ) : (
        <MissionCompleteBanner storySlug={storySlug} />
      )}

      {/* In-app PDF viewer overlay */}
      <AnimatePresence>
        {viewerOpen && pdfUrl && (
          <PdfViewer
            url={pdfUrl}
            title={mission.title}
            onClose={() => setViewerOpen(false)}
            onLastPage={() => setReachedLastPage(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
