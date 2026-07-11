"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/contexts/AppThemeProvider";
import { getComponentVariant } from "@/lib/design-system/componentVariants";

const QUICK_REPLY_KEYS = [
  "quickReplySong",
  "quickReplyJoke",
  "quickReplyDraw",
  "quickReplyAnimal",
  "quickReplyColor",
  "quickReplyDay",
] as const;

interface Props {
  onSelect: (text: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function QuickReplyChips({ onSelect, disabled, size = "sm" }: Props) {
  const { t } = useLanguage();
  const m = useThemeMotion();
  const { themeId } = useAppTheme();
  const cv = getComponentVariant(themeId);
  const sizeCls = size === "md" ? "text-sm px-4 py-2" : "text-[10.5px] px-2.5 py-1.5";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  const chipCls = `flex-shrink-0 ${cv.chipStyle.background} ${cv.chipStyle.border} ${cv.chipStyle.text} ${cv.chipStyle.radius} font-bold transition disabled:opacity-50 whitespace-nowrap`;

  const updateScrollPct = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollPct(max <= 0 ? 0 : el.scrollLeft / max);
  };

  const scrollByAmount = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  if (size !== "md") {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {QUICK_REPLY_KEYS.map(key => (
          <motion.button key={key} whileTap={m.buttonPress}
            onClick={() => onSelect(t(key))}
            disabled={disabled}
            className={`${chipCls} ${sizeCls}`}>
            {t(key)}
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => scrollByAmount(-1)} aria-label={t("scrollLeftLabel")}
          className={`flex-shrink-0 w-7 h-7 ${cv.chipStyle.radius} ${cv.chipStyle.background} ${cv.chipStyle.border} ${cv.chipStyle.text} flex items-center justify-center transition`}>
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div ref={scrollRef} onScroll={updateScrollPct}
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scroll-smooth">
          {QUICK_REPLY_KEYS.map(key => (
            <motion.button key={key} whileTap={m.buttonPress}
              onClick={() => onSelect(t(key))}
              disabled={disabled}
              className={`${chipCls} ${sizeCls}`}>
              {t(key)}
            </motion.button>
          ))}
        </div>

        <button onClick={() => scrollByAmount(1)} aria-label={t("scrollRightLabel")}
          className={`flex-shrink-0 w-7 h-7 ${cv.chipStyle.radius} ${cv.chipStyle.background} ${cv.chipStyle.border} ${cv.chipStyle.text} flex items-center justify-center transition`}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className={`h-1 ${cv.chipStyle.scrollTrack} rounded-full mt-1.5 mx-9 overflow-hidden`}>
        <div className={`h-full w-1/3 ${cv.progressStyle.fill} rounded-full transition-transform`}
          style={{ transform: `translateX(${scrollPct * 200}%)` }} />
      </div>
    </div>
  );
}
