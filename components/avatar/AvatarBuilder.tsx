"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarSvg from "./AvatarSvg";
import "@/components/world-ui/world-ui.css";
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
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
      {/* ── Live preview: the explorer on a lit gold pedestal ─────────────────── */}
      <div className="wui-stage h-[230px] shrink-0 rounded-[22px] sm:h-auto sm:min-h-[360px] sm:w-[250px]"
        style={{ background: `radial-gradient(90% 80% at 50% 30%, #${cfg.bg} 0%, color-mix(in srgb, #${cfg.bg} 55%, #06101F) 70%, #06101F 100%)`,
          boxShadow: "inset 0 0 0 1px rgba(253,230,138,0.3), inset 0 -40px 60px rgba(6,16,31,0.45)" }}>
        <motion.div
          key={bounce}
          className="relative mb-[34px] w-[190px] sm:mb-[46px] sm:w-[210px]"
          animate={{ scale: [1, 1.05, 1], y: [0, -6, 0] }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 18px 18px rgba(0,0,0,0.45))" }}
        >
          <AvatarSvg config={cfg} size={210} />
        </motion.div>
        <span className="wui-stage__pedestal" aria-hidden="true" />
      </div>

      {/* ── Editor ───────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="wui-chiprow" role="tablist" aria-label="Avatar parts">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="wui-chip"
            >
              <span className="wui-chip__icon" aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="min-h-[200px] flex-1 pt-3" role="tabpanel">
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
                <div className="grid grid-cols-4 gap-2.5">
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
                  <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5">
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
                  <p className="wui-label">Eye color</p>
                  <ColorGrid
                    colors={EYE_COLORS}
                    selected={cfg.ec}
                    onSelect={hex => update("ec", hex)}
                  />
                </>
              )}

              {/* ── MOUTH ── */}
              {activeCategory === "mouth" && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5">
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5">
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
                  <div className="mb-4 grid grid-cols-3 gap-2.5">
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
                      <p className="wui-label">Accessory color</p>
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
    <div className={`wui-beads ${large ? "wui-beads--large" : ""}`}>
      {colors.map(c => {
        const isSelected = c.hex.toUpperCase() === selected.toUpperCase();
        return (
          <motion.button
            key={c.hex}
            type="button"
            onClick={() => onSelect(c.hex)}
            whileTap={{ scale: 0.88 }}
            title={c.label}
            aria-label={c.label}
            aria-pressed={isSelected}
            className="wui-bead"
            style={{ ["--bead" as string]: `#${c.hex}` }}
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
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      aria-pressed={active}
      className="wui-option"
    >
      <span className="wui-option__art">
        {previewEl ?? <span className="text-2xl">{emoji}</span>}
      </span>
      <span>{label}</span>
    </motion.button>
  );
}
