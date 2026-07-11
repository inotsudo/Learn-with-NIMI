"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarSvg from "./AvatarSvg";
import {
  type AvatarConfig,
  type HairStyle, type EyeShape, type MouthStyle, type OutfitStyle, type AccessoryStyle,
  DEFAULT_AVATAR, SKIN_TONES, HAIR_COLORS, EYE_COLORS, OUTFIT_COLORS, ACCESSORY_COLORS, BG_COLORS,
  HAIR_STYLES, EYE_SHAPES, MOUTH_STYLES, OUTFIT_STYLES, ACCESSORY_STYLES,
} from "@/lib/avatarConfig";

type CategoryId = "skin" | "hair" | "haircolor" | "eyes" | "mouth" | "outfit" | "outfitcolor" | "accessory" | "bg";

const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: "skin",        label: "Skin",     icon: "✋" },
  { id: "hair",        label: "Hair",     icon: "💇" },
  { id: "haircolor",   label: "Color",    icon: "🎨" },
  { id: "eyes",        label: "Eyes",     icon: "👁️" },
  { id: "mouth",       label: "Mouth",    icon: "😊" },
  { id: "outfit",      label: "Outfit",   icon: "👕" },
  { id: "outfitcolor", label: "Color",    icon: "🌈" },
  { id: "accessory",   label: "Extra",    icon: "💎" },
  { id: "bg",          label: "Scene",    icon: "🌅" },
];

interface Props {
  initial?: AvatarConfig;
  onChange: (cfg: AvatarConfig) => void;
}

export default function AvatarBuilder({ initial = DEFAULT_AVATAR, onChange }: Props) {
  const [cfg, setCfg] = useState<AvatarConfig>(initial);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("skin");
  const [bounce, setBounce] = useState(0);

  const update = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    const next = { ...cfg, [key]: value };
    setCfg(next);
    onChange(next);
    setBounce(b => b + 1);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-0 overflow-hidden rounded-3xl border border-ds-border shadow-ds-card bg-ds-card" style={{ minHeight: 420 }}>
      {/* ── Left: live preview ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center sm:w-[280px] shrink-0 py-8 px-4"
        style={{ background: `#${cfg.bg}` }}>
        <motion.div
          key={bounce}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <AvatarSvg config={cfg} size={200} />
        </motion.div>
      </div>

      {/* ── Right: editor ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col border-t sm:border-t-0 sm:border-l border-ds-border min-w-0">
        {/* Category tabs — scrollable row */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-ds-border bg-ds-page shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center gap-0.5 px-3.5 py-3 shrink-0 transition-all border-b-2 text-[10px] font-black uppercase tracking-wide ${
                activeCategory === cat.id
                  ? "border-[var(--ds-brand-primary)] text-[var(--ds-brand-primary)]"
                  : "border-transparent text-ds-muted hover:text-ds-text"
              }`}
            >
              <span className="text-lg leading-none">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Options panel */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {/* ── SKIN TONES ── */}
              {activeCategory === "skin" && (
                <ColorGrid
                  colors={SKIN_TONES}
                  selected={cfg.sk}
                  onSelect={hex => update("sk", hex)}
                  large
                />
              )}

              {/* ── HAIR STYLE ── */}
              {activeCategory === "hair" && (
                <div className="grid grid-cols-4 gap-2">
                  {HAIR_STYLES.map(s => (
                    <StyleCard
                      key={s.id}
                      label={s.label}
                      emoji={s.emoji}
                      active={cfg.hr === s.id}
                      onClick={() => update("hr", s.id as HairStyle)}
                      previewEl={
                        <AvatarSvg
                          config={{ ...cfg, hr: s.id as HairStyle }}
                          size={56}
                        />
                      }
                    />
                  ))}
                </div>
              )}

              {/* ── HAIR COLOR ── */}
              {activeCategory === "haircolor" && (
                <ColorGrid
                  colors={HAIR_COLORS}
                  selected={cfg.hc}
                  onSelect={hex => update("hc", hex)}
                />
              )}

              {/* ── EYE SHAPE ── */}
              {activeCategory === "eyes" && (
                <>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {EYE_SHAPES.map(s => (
                      <StyleCard
                        key={s.id}
                        label={s.label}
                        active={cfg.ey === s.id}
                        onClick={() => update("ey", s.id as EyeShape)}
                        previewEl={
                          <AvatarSvg
                            config={{ ...cfg, ey: s.id as EyeShape }}
                            size={52}
                          />
                        }
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-ds-muted uppercase tracking-wide mb-2">Eye color</p>
                  <ColorGrid
                    colors={EYE_COLORS}
                    selected={cfg.ec}
                    onSelect={hex => update("ec", hex)}
                  />
                </>
              )}

              {/* ── MOUTH ── */}
              {activeCategory === "mouth" && (
                <div className="grid grid-cols-5 gap-2">
                  {MOUTH_STYLES.map(s => (
                    <StyleCard
                      key={s.id}
                      label={s.label}
                      active={cfg.mo === s.id}
                      onClick={() => update("mo", s.id as MouthStyle)}
                      previewEl={
                        <AvatarSvg
                          config={{ ...cfg, mo: s.id as MouthStyle }}
                          size={52}
                        />
                      }
                    />
                  ))}
                </div>
              )}

              {/* ── OUTFIT STYLE ── */}
              {activeCategory === "outfit" && (
                <div className="grid grid-cols-5 gap-2">
                  {OUTFIT_STYLES.map(s => (
                    <StyleCard
                      key={s.id}
                      label={s.label}
                      emoji={s.emoji}
                      active={cfg.ot === s.id}
                      onClick={() => update("ot", s.id as OutfitStyle)}
                      previewEl={
                        <AvatarSvg
                          config={{ ...cfg, ot: s.id as OutfitStyle }}
                          size={52}
                        />
                      }
                    />
                  ))}
                </div>
              )}

              {/* ── OUTFIT COLOR ── */}
              {activeCategory === "outfitcolor" && (
                <ColorGrid
                  colors={OUTFIT_COLORS}
                  selected={cfg.oc}
                  onSelect={hex => update("oc", hex)}
                />
              )}

              {/* ── ACCESSORY ── */}
              {activeCategory === "accessory" && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {ACCESSORY_STYLES.map(s => (
                      <StyleCard
                        key={s.id}
                        label={s.label}
                        emoji={s.id === "none" ? "✕" : s.emoji}
                        active={cfg.ac === s.id}
                        onClick={() => update("ac", s.id as AccessoryStyle)}
                        previewEl={
                          <AvatarSvg
                            config={{ ...cfg, ac: s.id as AccessoryStyle }}
                            size={52}
                          />
                        }
                      />
                    ))}
                  </div>
                  {cfg.ac !== "none" && (
                    <>
                      <p className="text-[11px] font-bold text-ds-muted uppercase tracking-wide mb-2">Accessory color</p>
                      <ColorGrid
                        colors={ACCESSORY_COLORS}
                        selected={cfg.ab}
                        onSelect={hex => update("ab", hex)}
                      />
                    </>
                  )}
                </>
              )}

              {/* ── BACKGROUND ── */}
              {activeCategory === "bg" && (
                <ColorGrid
                  colors={BG_COLORS}
                  selected={cfg.bg}
                  onSelect={hex => update("bg", hex)}
                  large
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Color grid ───────────────────────────────────────────────────────────────

function ColorGrid({
  colors,
  selected,
  onSelect,
  large = false,
}: {
  colors: { hex: string; label: string }[];
  selected: string;
  onSelect: (hex: string) => void;
  large?: boolean;
}) {
  return (
    <div className={`grid gap-2.5 ${large ? "grid-cols-5" : "grid-cols-7"}`}>
      {colors.map(c => {
        const isSelected = c.hex.toUpperCase() === selected.toUpperCase();
        return (
          <motion.button
            key={c.hex}
            onClick={() => onSelect(c.hex)}
            whileTap={{ scale: 0.88 }}
            title={c.label}
            className={`aspect-square rounded-2xl transition-all border-2 shadow-sm ${
              isSelected
                ? "border-[var(--ds-brand-primary)] scale-110 shadow-md ring-2 ring-[var(--ds-brand-primary)]/30"
                : "border-transparent hover:scale-105 hover:border-gray-300"
            }`}
            style={{ backgroundColor: `#${c.hex}` }}
          />
        );
      })}
    </div>
  );
}

// ─── Style option card (with mini avatar preview) ─────────────────────────────

function StyleCard({
  label,
  emoji,
  active,
  onClick,
  previewEl,
}: {
  label: string;
  emoji?: string;
  active: boolean;
  onClick: () => void;
  previewEl?: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl border-2 transition-all ${
        active
          ? "border-[var(--ds-brand-primary)] bg-[var(--ds-brand-subtle)] shadow-md"
          : "border-ds-border bg-ds-card hover:border-gray-300"
      }`}
    >
      <div className="w-full flex items-center justify-center overflow-hidden rounded-xl" style={{ height: 52 }}>
        {previewEl ?? <span className="text-2xl">{emoji}</span>}
      </div>
      <span className={`text-[9px] font-black leading-none ${active ? "text-[var(--ds-brand-primary)]" : "text-ds-muted"}`}>
        {label}
      </span>
    </motion.button>
  );
}
