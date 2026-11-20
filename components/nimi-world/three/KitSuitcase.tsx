"use client";

import { useEffect, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { brandFont, roundRect, useCanvasTexture, useFontsReady } from "./stage";
import { TARMAC_TILES } from "../themes";
import { Overlay } from "./overlay";

export const PARENT_HOLD_SECONDS = 2;

interface KitProps {
  open: boolean;
  childName: string;
  stars: number;
  /** Shown on the screen for Sky Navigators. */
  level?: number | null;
  /** Completion per tarmac tile (same order as TARMAC_TILES) → lights the 6 buttons. */
  missionsDone: boolean[];
  accent: string;
  title: string;
  /** Optional child-safe parent gate on the gold lock (long-press). */
  holdLabel?: string;
  onParentUnlock?: () => void;
}

const BLUE = { color: "#1D4ED8", roughness: 0.4, metalness: 0.25 } as const;
const BLUE_LIGHT = { color: "#2563EB", roughness: 0.4, metalness: 0.25 } as const;
const GOLD = { color: "#D4AF4F", roughness: 0.28, metalness: 0.85 } as const;

/**
 * Kit des Champions Nimipiko — the interactive toy suitcase. Tap anywhere
 * toggles it (handled by the parent <Toy>); the gold lock emblem is the
 * child-safe parent gate: hold it for PARENT_HOLD_SECONDS while the ring of
 * gold dots fills up.
 */
export default function KitSuitcase({ open, childName, stars, level, missionsDone, accent, title, holdLabel, onParentUnlock }: KitProps) {
  const door = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const holdStart = useRef<number | null>(null);
  const fired = useRef(false);
  const dots = useRef<THREE.MeshBasicMaterial[]>([]);
  const clockRef = useRef(0);
  const fonts = useFontsReady();

  const screen = useCanvasTexture(512, 340, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0B1A33");
    bg.addColorStop(1, "#1A3558");
    g.fillStyle = bg;
    roundRect(g, 0, 0, w, h, 28);
    g.fill();
    g.strokeStyle = "rgba(201,168,76,0.8)";
    g.lineWidth = 6;
    roundRect(g, 8, 8, w - 16, h - 16, 22);
    g.stroke();
    g.textAlign = "center";
    g.fillStyle = "#E3C46A";
    g.font = brandFont(800, 34);
    g.fillText(title.toUpperCase(), w / 2, 62);
    g.fillStyle = "#FFFFFF";
    g.font = brandFont(800, 78);
    const name = childName.length > 12 ? `${childName.slice(0, 11)}…` : childName;
    g.fillText(name, w / 2, 170);
    g.font = brandFont(800, 54);
    g.fillStyle = "#FDE68A";
    g.fillText(`★ ${stars}`, level ? w * 0.3 : w / 2, 270);
    if (level) {
      g.fillStyle = "#7DD3FC";
      g.fillText(`LV ${level}`, w * 0.7, 270);
    }
  }, `${childName}|${stars}|${level}|${title}|${fonts}`);

  // padded velvet compartment with a glowing core and gold stars
  const interior = useCanvasTexture(256, 288, (g, w, h) => {
    const bg = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h / 2, w * 0.75);
    bg.addColorStop(0, accent);
    bg.addColorStop(0.45, "#1A3558");
    bg.addColorStop(1, "#06101F");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.08)";
    g.lineWidth = 2;
    for (let i = -h; i < w + h; i += 28) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke();
    }
    g.fillStyle = "#FDE68A";
    g.font = "bold 34px sans-serif";
    g.textAlign = "center";
    [[0.22, 0.2], [0.78, 0.26], [0.3, 0.8], [0.74, 0.78], [0.5, 0.5]].forEach(([x, y], i) => g.fillText(i === 4 ? "★" : "✦", x * w, y * h));
  }, accent);

  useFrame((st, dt) => {
    clockRef.current = st.clock.elapsedTime;
    const d = Math.min(dt, 1 / 30);
    if (door.current) {
      const want = open ? -1.95 : 0;
      door.current.rotation.y = THREE.MathUtils.lerp(door.current.rotation.y, want, 1 - Math.pow(0.0005, d));
    }
    const openness = door.current ? Math.min(1, Math.abs(door.current.rotation.y) / 1.95) : 0;
    if (glow.current) glow.current.emissiveIntensity = 0.1 + openness * 0.75;
    if (light.current) light.current.intensity = openness * 2.5;

    // long-press progress ring
    const p = holdStart.current === null ? 0 : (st.clock.elapsedTime - holdStart.current) / PARENT_HOLD_SECONDS;
    dots.current.forEach((m, i) => { if (m) m.opacity = p > 0 && i / dots.current.length < p ? 1 : p > 0 ? 0.25 : 0; });
    if (p >= 1 && !fired.current) {
      fired.current = true;
      holdStart.current = null;
      onParentUnlock?.();
    }
  });

  // The hold starts on the lock, then is tracked on the window: the Kit's own
  // hover/press springs move the lock a few px under a still finger, so mesh
  // pointerleave would cancel parents' holds at random. Cancel only on release
  // or a real drag (> 28 px).
  const cancelHold = useRef<(() => void) | null>(null);
  const startHold = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    cancelHold.current?.();
    fired.current = false;
    holdStart.current = clockRef.current;
    const x0 = e.nativeEvent.clientX, y0 = e.nativeEvent.clientY;
    const stop = () => {
      holdStart.current = null;
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("pointermove", move);
      cancelHold.current = null;
    };
    const move = (ev: PointerEvent) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 28) stop(); };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("pointermove", move);
    cancelHold.current = stop;
  };
  useEffect(() => () => cancelHold.current?.(), []);

  return (
    <group>
      {/* back shell */}
      <RoundedBox args={[1.5, 2.0, 0.5]} radius={0.12} smoothness={4} position={[0, 1.1, -0.06]}>
        <meshStandardMaterial {...BLUE} />
      </RoundedBox>
      {/* glowing interior revealed when the door swings open */}
      <mesh position={[0, 0.9, 0.2]}>
        <planeGeometry args={[1.3, 1.45]} />
        <meshStandardMaterial ref={glow} color="#0B1A33" map={interior ?? undefined} emissiveMap={interior ?? undefined} emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>
      <pointLight ref={light} position={[0, 0.9, 0.7]} color={accent} intensity={0} distance={4} decay={0} />
      {open && <Sparkles count={26} scale={[1.4, 1.6, 0.6]} position={[0, 1.0, 0.45]} size={5} speed={0.6} color={accent} />}

      {/* door (hinged on the left edge) */}
      <group ref={door} position={[-0.75, 0.9, 0.25]}>
        <group position={[0.75, 0, 0]}>
          <RoundedBox args={[1.5, 1.6, 0.12]} radius={0.06} smoothness={4}>
            <meshStandardMaterial {...BLUE_LIGHT} />
          </RoundedBox>
          {/* gold trim */}
          {[0.77, -0.77].map((y) => (
            <mesh key={y} position={[0, y, 0.065]}><boxGeometry args={[1.42, 0.045, 0.02]} /><meshStandardMaterial {...GOLD} /></mesh>
          ))}
          {[0.72, -0.72].map((x) => (
            <mesh key={x} position={[x, 0, 0.065]}><boxGeometry args={[0.045, 1.58, 0.02]} /><meshStandardMaterial {...GOLD} /></mesh>
          ))}
          {/* screen */}
          <RoundedBox args={[1.22, 0.84, 0.03]} radius={0.04} smoothness={3} position={[0, 0.26, 0.06]}>
            <meshStandardMaterial color="#0B1A33" roughness={0.5} />
          </RoundedBox>
          {screen && (
            <mesh position={[0, 0.26, 0.078]}>
              <planeGeometry args={[1.12, 0.744]} />
              <meshStandardMaterial map={screen} emissiveMap={screen} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.25} />
            </mesh>
          )}
          {/* the 6 mission buttons light up as missions are completed */}
          {TARMAC_TILES.map((tile, i) => (
            <mesh key={tile.slotKey} position={[-0.5 + i * 0.2, -0.36, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.072, 0.08, 0.05, 24]} />
              <meshStandardMaterial
                color={tile.color}
                emissive={tile.color}
                emissiveIntensity={missionsDone[i] ? 0.9 : 0.08}
                roughness={0.35}
                metalness={0.1}
              />
            </mesh>
          ))}
          {/* NIMIPIKO plate */}
          <mesh position={[0, -0.6, 0.07]}><boxGeometry args={[0.66, 0.12, 0.025]} /><meshStandardMaterial {...GOLD} /></mesh>
        </group>
      </group>

      {/* gold lock emblem — long-press = parent portal */}
      {/* handlers on the whole emblem group: disc, keyhole and progress dots all start the hold */}
      <group
        position={[0, 1.9, 0.21]}
        onPointerDown={onParentUnlock ? startHold : undefined}
        onPointerUp={onParentUnlock ? (e) => e.stopPropagation() : undefined}
        onClick={onParentUnlock ? (e) => e.stopPropagation() : undefined}
      >
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.06, 32]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        <mesh position={[0, 0.025, 0.035]}><circleGeometry args={[0.035, 16]} /><meshBasicMaterial color="#0B1A33" /></mesh>
        <mesh position={[0, -0.025, 0.035]}><planeGeometry args={[0.03, 0.07]} /><meshBasicMaterial color="#0B1A33" /></mesh>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2 + Math.PI / 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.04]}>
              <circleGeometry args={[0.022, 10]} />
              <meshBasicMaterial ref={(m) => { if (m) dots.current[i] = m; }} color="#FDE68A" transparent opacity={0} depthWrite={false} />
            </mesh>
          );
        })}
        {onParentUnlock && holdLabel && (
          <Overlay>
            <ParentHoldHotspot label={holdLabel} onUnlock={onParentUnlock} />
          </Overlay>
        )}
      </group>

      {/* telescopic handle */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 2.3, -0.06]}><cylinderGeometry args={[0.035, 0.035, 0.42, 12]} /><meshStandardMaterial color="#B8C2D6" metalness={0.85} roughness={0.25} /></mesh>
      ))}
      <mesh position={[0, 2.52, -0.06]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.065, 0.86, 8, 16]} />
        <meshStandardMaterial color="#0B1A33" roughness={0.5} />
      </mesh>

      {/* gold corner caps */}
      {[[-0.7, 0.16], [0.7, 0.16], [-0.7, 2.04], [0.7, 2.04]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.16]}><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial {...GOLD} /></mesh>
      ))}

      {/* wheels */}
      {[[-0.58, 0.14], [0.58, 0.14], [-0.58, -0.24], [0.58, -0.24]].map(([x, z], i) => (
        <group key={i} position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh><cylinderGeometry args={[0.1, 0.1, 0.08, 20]} /><meshStandardMaterial color="#111827" roughness={0.8} /></mesh>
          <mesh><cylinderGeometry args={[0.045, 0.045, 0.09, 12]} /><meshStandardMaterial color="#D4AF4F" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Keyboard twin of the lock: hold Enter/Space for the same duration. */
function ParentHoldHotspot({ label, onUnlock }: { label: string; onUnlock: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    if (timer.current) return;
    timer.current = setTimeout(() => { timer.current = null; onUnlock(); }, PARENT_HOLD_SECONDS * 1000);
  };
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  return (
    <button
      type="button"
      className="nw-a11y-hotspot"
      aria-label={label}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } }}
      onKeyUp={cancel}
      onBlur={cancel}
    >
      {label}
    </button>
  );
}
