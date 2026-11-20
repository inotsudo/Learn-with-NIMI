"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, PresentationControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { WorldLights, useNimiTheme } from "./NimiThemeProvider";
import KitSuitcase from "./three/KitSuitcase";
import PassportBook from "./three/PassportBook";
import FlightGlobe from "./three/FlightGlobe";
import { OverlayHost } from "./three/overlay";
import type { IslandModel } from "./three/FlightGlobe";
import RunwayTiles, { type RunwayTile } from "./RunwayTiles";
import type { WorldData } from "./worldData";

export type StudioItem = "kit" | "passport" | "globe";
const SPRING = { type: "spring", stiffness: 380, damping: 26 } as const;

/** Glides a group's x so the opened passport stays centred. */
function Glide({ x, children }: { x: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.position.x += (x - g.current.position.x) * Math.min(1, dt * 6); });
  return <group ref={g}>{children}</group>;
}

/** A tap that wasn't really a drag of the PresentationControls. */
const isTap = (e: ThreeEvent<MouseEvent>) => e.delta < 8;

function GlassButton({ children, onClick, label, gold = false, big = false }: { children: ReactNode; onClick: () => void; label: string; gold?: boolean; big?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.93 }}
      transition={SPRING}
      className="nw-toy-btn flex items-center gap-2 rounded-full font-baloo font-extrabold"
      style={{
        minHeight: big ? 64 : 52,
        padding: big ? "0 28px" : "0 18px",
        fontSize: big ? 18 : 15,
        color: gold ? "#06101F" : "#FFF7E0",
        background: gold ? "linear-gradient(135deg, #FDE68A, #D4A830 60%, #C09428)" : "rgba(255, 247, 224, 0.1)",
        border: `1.5px solid ${gold ? "#FFF7E0" : "rgba(227, 196, 106, 0.6)"}`,
        boxShadow: gold ? "0 8px 0 rgba(120,82,18,0.55), 0 0 28px rgba(253,230,138,0.45)" : "0 6px 18px rgba(0,0,0,0.25)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {children}
    </motion.button>
  );
}

export default function KitStudio({
  data, backdrop, kitArt, webgl, startItem = "kit", tiles, nextHref, onClose, onLaunch, onTile, onStory,
}: {
  data: WorldData;
  /** The current scene, blurred behind the studio so the child never "leaves" the world. */
  backdrop: string;
  /** Where the illustrated Kit sits in that scene (fractions) — used by the no-WebGL view. */
  kitArt: { x: number; y: number };
  webgl: boolean;
  startItem?: StudioItem;
  tiles: RunwayTile[];
  nextHref: string | null;
  onClose: () => void;
  onLaunch: (href: string | null) => void;
  onTile: (slotKey: string) => void;
  onStory: (storyId: string) => void;
}) {
  const { theme, version, copy, lang } = useNimiTheme();
  const f = version.features;
  const little = f.oneTapKit;
  const items: StudioItem[] = little ? ["kit"] : (["kit", ...(f.passportStamps ? ["passport"] : []), ...(f.flightGlobe ? ["globe"] : [])] as StudioItem[]);
  const [item, setItem] = useState<StudioItem>(items.includes(startItem) ? startItem : "kit");
  const [kitOpen, setKitOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const islands: IslandModel[] = data.stories.map((s) => ({
    id: s.id, title: s.title, emoji: s.emoji,
    state: s.id === data.currentStoryId ? "current" : s.complete ? "done" : s.unlocked ? "open" : "locked",
  }));

  const itemMeta: Record<StudioItem, { emoji: string; label: string; hint: string }> = {
    kit: { emoji: "🧳", label: copy.kit, hint: copy.tapKit },
    passport: { emoji: "🛂", label: copy.passport.split(" ")[0], hint: copy.tapPassport },
    globe: { emoji: "🌍", label: copy.globe, hint: copy.spinGlobe },
  };
  const showLabels = version.showLabels;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 45 }}
      role="dialog"
      aria-modal="true"
      aria-label={itemMeta[item].label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* the same scene, defocused — a glass studio inside the world */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image src={backdrop} alt="" fill sizes="(orientation: portrait) 100vh, 100vw" className="object-cover" style={{ filter: "blur(22px) brightness(0.42) saturate(1.25)", transform: "scale(1.12)" }} />
        <div className="absolute inset-0" style={{ background: "rgba(6,16,31,0.28)" }} />
      </div>

      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        {showLabels ? (
          <p className="rounded-full px-4 py-2 font-baloo text-base font-extrabold text-white sm:text-lg" style={{ background: "rgba(255,247,224,0.08)", border: "1px solid rgba(227,196,106,0.45)", backdropFilter: "blur(10px)" }}>
            {itemMeta[item].emoji} {itemMeta[item].label} · {data.childName}
          </p>
        ) : <span />}
        <motion.button
          ref={closeRef}
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          whileTap={{ scale: 0.9 }}
          className="nw-toy-btn grid place-items-center rounded-full text-2xl text-white"
          style={{ width: Math.max(56, version.touchTarget * 0.75), height: Math.max(56, version.touchTarget * 0.75), background: "rgba(255,247,224,0.1)", border: "1.5px solid rgba(227,196,106,0.6)", backdropFilter: "blur(10px)" }}
        >
          ✕
        </motion.button>
      </div>

      {/* the 3D inspector */}
      <div className="relative min-h-0 flex-1">
        {webgl ? (
          <>
            <Canvas camera={{ position: [0, 0.3, 6.4], fov: 34 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} style={{ position: "absolute", inset: 0, touchAction: "none" }}>
              <WorldLights theme={theme} />
              <Environment key={theme.id} resolution={64} frames={1}>
                <Lightformer form="rect" intensity={2.6} color={theme.lighting.key.color} position={[0, 5, -6]} scale={[12, 4, 1]} />
                <Lightformer form="circle" intensity={1.6} color={theme.colors.accent} position={[-6, 1, 2]} scale={4} />
                <Lightformer form="rect" intensity={1.3} color="#ffffff" position={[6, 2, 4]} scale={[4, 6, 1]} />
              </Environment>
              <Sparkles count={46} scale={[7, 4.5, 3]} size={3} speed={0.3} color={theme.dust.colorA} />
              {item !== "globe" && (
                <PresentationControls global cursor snap speed={1.3} rotation={[0.06, item === "kit" ? -0.45 : -0.25, 0]} polar={[-0.3, 0.45]} azimuth={[-1.3, 1.3]}>
                  <Float speed={1.6} floatIntensity={0.5} rotationIntensity={0.12}>
                    {item === "kit" && (
                      <group position={[0, -1.35, 0]} onClick={(e) => { if (isTap(e)) { e.stopPropagation(); setKitOpen((o) => !o); } }}>
                        <KitSuitcase
                          open={kitOpen}
                          childName={data.childName}
                          stars={data.stars}
                          level={f.xpVault ? data.level : null}
                          missionsDone={tiles.map((t) => t.done)}
                          accent={theme.colors.accent}
                          title={copy.kit}
                        />
                      </group>
                    )}
                    {item === "passport" && (
                      <Glide x={passportOpen ? 0.85 : 0}>
                        <group scale={1.7} onClick={(e) => { if (isTap(e)) { e.stopPropagation(); setPassportOpen((o) => !o); } }}>
                          <PassportBook open={passportOpen} childName={data.childName} stamps={data.stamps} lang={lang} />
                        </group>
                      </Glide>
                    )}
                  </Float>
                </PresentationControls>
              )}
              {item === "globe" && (
                <group scale={0.92}>
                  <FlightGlobe islands={islands} theme={theme} showLabel={showLabels} onSelect={onStory} />
                </group>
              )}
              {item !== "globe" && <ContactShadows position={[0, -1.45, 0]} opacity={0.5} scale={9} blur={2.6} far={3.5} />}
            </Canvas>
            <OverlayHost zIndex={3} />
          </>
        ) : (
          // No WebGL: the illustrated Kit itself, lifted out of the scene.
          <div className="absolute inset-0 grid place-items-center p-6">
            <div
              className="aspect-square w-[min(60vh,80vw)] rounded-[32px]"
              role="img"
              aria-label={copy.kit}
              style={{
                backgroundImage: `url(${backdrop})`,
                backgroundSize: "330%",
                backgroundPosition: `${kitArt.x * 100}% ${kitArt.y * 100}%`,
                boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(253,230,138,0.25)",
              }}
            />
          </div>
        )}
      </div>

      {/* dock */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-4 pb-6 pt-2">
        {item === "kit" && (kitOpen || !webgl) && (
          little ? (
            <motion.button
              type="button"
              aria-label={copy.continue}
              onClick={() => onLaunch(nextHref)}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING}
              whileTap={{ scale: 0.9 }}
              className="nw-toy-btn relative grid place-items-center rounded-full text-5xl"
              style={{ width: 120, height: 120, background: "radial-gradient(circle at 35% 30%, #FFF7E0, #FDE68A 35%, #D4A830 75%)", boxShadow: "0 0 60px rgba(253,230,138,0.85), 0 10px 0 rgba(120,82,18,0.6)", color: "#06101F" }}
            >
              <span className="nw-pulse-ring absolute inset-0 rounded-full" style={{ border: "4px solid #FDE68A" }} aria-hidden="true" />
              <span aria-hidden="true">▶</span>
            </motion.button>
          ) : (
            <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
              <RunwayTiles tiles={tiles} showLabels={showLabels} onSelect={onTile} inline ariaLabel={copy.kit} />
              <div className="flex flex-wrap justify-center gap-2">
                <GlassButton gold big label={copy.continue} onClick={() => onLaunch(nextHref)}>▶ {copy.continue}</GlassButton>
                <GlassButton label={copy.stories} onClick={() => onLaunch("/stories")}>📚 {copy.stories}</GlassButton>
                <GlassButton label={copy.create} onClick={() => onLaunch("/create")}>🎨 {copy.create}</GlassButton>
                <GlassButton label={copy.talk} onClick={() => onLaunch("/talk-to-nimi")}>💬 {copy.talk}</GlassButton>
              </div>
            </motion.div>
          )
        )}
        {item === "passport" && (
          <p className="rounded-full px-4 py-2 font-baloo font-extrabold text-white" style={{ background: "rgba(255,247,224,0.08)", border: "1px solid rgba(227,196,106,0.45)" }}>
            🛂 {copy.stamps(data.stamps.length)}
          </p>
        )}
        {webgl && !(item === "kit" && kitOpen) && !(item === "passport" && passportOpen) && showLabels && (
          <p className="font-baloo text-sm font-bold text-white/80">{itemMeta[item].hint}</p>
        )}
        {items.length > 1 && (
          <div className="flex gap-2" role="tablist" aria-label={copy.kit}>
            {items.map((it) => (
              <motion.button
                key={it}
                type="button"
                role="tab"
                aria-selected={item === it}
                aria-label={itemMeta[it].label}
                onClick={() => setItem(it)}
                whileTap={{ scale: 0.92 }}
                className="nw-toy-btn flex items-center gap-2 rounded-full px-4 font-baloo font-extrabold"
                style={{
                  minHeight: 52,
                  color: item === it ? "#06101F" : "#FFF7E0",
                  background: item === it ? "linear-gradient(135deg, #FDE68A, #D4A830)" : "rgba(255,247,224,0.08)",
                  border: "1.5px solid rgba(227,196,106,0.6)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <span aria-hidden="true" className="text-xl">{itemMeta[it].emoji}</span>
                {showLabels && <span>{itemMeta[it].label}</span>}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
