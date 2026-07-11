"use client";

import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStorageUrl } from "@/lib/queries";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getThemeAssets } from "@/lib/design-system/assetRegistry";

interface Props {
  imageUrl: string;
  side: "left" | "right";
  text?: string;
  showText?: boolean;
}

const IllustrationPage = forwardRef<HTMLDivElement, Props>(({ imageUrl, side, text, showText = true }, ref) => {
  const [loaded, setLoaded] = useState(false);
  const { themeId } = useAppTheme();
  const assets = getThemeAssets(themeId);
  const url = getStorageUrl(imageUrl);

  return (
    <div ref={ref} className="w-full h-full relative overflow-hidden select-none leaf-lg border border-amber-100/70" style={{ background: "#faf6ee" }}>
      {/* World page texture — parchment hatching (HP) / sea-glass waves (Ocean) */}
      <img src={assets.reader.pageBackground} alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-[0.05]"  loading="lazy" />

      {/* Story illustration */}
      <img
        src={url}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        draggable={false}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />

      {!loaded && (
        <div className="absolute inset-0 bg-[#faf6ee] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* World page frame — burned edges (HP) / coral wave border (Ocean) */}
      <img src={assets.reader.pageFrame} alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-[0.09]"  loading="lazy" />

      {/* Story text overlay */}
      <AnimatePresence>
        {showText && text && loaded && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.48) 60%, transparent 100%)",
              padding: "36px 16px 16px",
            }}>
            <p className="text-white text-center font-nunito font-bold leading-snug drop-shadow-lg"
              style={{ fontSize: "clamp(11px, 2.5vw, 16px)" }}>
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gutter shadow */}
      {side === "left" && (
        <div className="absolute top-0 bottom-0 right-0 w-6 pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, rgba(0,0,0,0.06))" }} />
      )}
      {side === "right" && (
        <div className="absolute top-0 bottom-0 left-0 w-6 pointer-events-none"
          style={{ background: "linear-gradient(to left, transparent, rgba(0,0,0,0.06))" }} />
      )}
    </div>
  );
});

IllustrationPage.displayName = "IllustrationPage";
export default IllustrationPage;
