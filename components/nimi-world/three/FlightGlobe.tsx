"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { QuadraticBezierLine, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { useCanvasTexture } from "./stage";
import type { WorldTheme } from "../themes";
export type IslandState = "current" | "done" | "open" | "locked";
export interface IslandModel { id: string; title: string; emoji: string; state: IslandState }
import { Overlay } from "./overlay";

const R = 1.55;

function latLon(lat: number, lon: number, r = R) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const th = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

function Marker({ m, pos, theme, showLabel, onSelect }: { m: IslandModel; pos: THREE.Vector3; theme: WorldTheme; showLabel: boolean; onSelect: (id: string) => void }) {
  const head = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const color = m.state === "done" ? "#FBBF24" : m.state === "current" ? theme.colors.accent : m.state === "open" ? "#FFFFFF" : "#64748B";
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize()), [pos]);
  useFrame((st) => {
    if (head.current && m.state === "current") head.current.scale.setScalar(1 + Math.sin(st.clock.elapsedTime * 4) * 0.2);
  });
  return (
    <group position={pos} quaternion={quat}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      onClick={(e) => { e.stopPropagation(); onSelect(m.id); }}
    >
      <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.012, 0.02, 0.18, 6]} /><meshStandardMaterial color="#E2E8F0" metalness={0.6} roughness={0.3} /></mesh>
      <mesh ref={head} position={[0, 0.2, 0]}>
        <sphereGeometry args={[m.state === "current" ? 0.085 : 0.065, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={m.state === "locked" ? 0.05 : 0.7} />
      </mesh>
      {(hovered || m.state === "current") && (
        <Overlay position={[0, 0.42, 0]}>
          <span className="font-baloo font-extrabold whitespace-nowrap rounded-full px-3 py-1 text-xs shadow-lg"
            style={{ background: m.state === "current" ? theme.colors.accent : "rgba(6,16,31,0.82)", color: m.state === "current" ? "#0B1A33" : "#FFF7E0" }}>
            {m.emoji} {showLabel ? m.title : ""}
          </span>
        </Overlay>
      )}
      <Overlay>
        <button type="button" className="nw-a11y-hotspot" aria-label={m.title} onClick={() => onSelect(m.id)}>{m.title}</button>
      </Overlay>
    </group>
  );
}

/** Sky Navigators: drag-to-spin flight globe with stories as route waypoints. */
export default function FlightGlobe({ islands, theme, showLabel, onSelect }: { islands: IslandModel[]; theme: WorldTheme; showLabel: boolean; onSelect: (id: string) => void }) {
  const spin = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Group>(null);
  const drag = useRef<{ active: boolean; x: number; y: number; vx: number; vy: number }>({ active: false, x: 0, y: 0, vx: 0, vy: 0 });
  const isl = theme.island;

  const map = useCanvasTexture(1024, 512, (g, w, h) => {
    const sea = g.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, theme.colors.zenith);
    sea.addColorStop(0.5, isl.water);
    sea.addColorStop(1, theme.colors.zenith);
    g.fillStyle = sea;
    g.fillRect(0, 0, w, h);
    // seeded organic continents
    let seed = 42;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let c = 0; c < 11; c++) {
      const cx = r() * w, cy = h * 0.18 + r() * h * 0.64, size = 18 + r() * 34;
      for (let k = 0; k < 22; k++) {
        const x = cx + (r() - 0.5) * size * 3, y = cy + (r() - 0.5) * size * 1.5, rr = size * (0.25 + r() * 0.45);
        g.fillStyle = k % 4 ? isl.grass : isl.foliage;
        g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
        if (x - rr < 0) { g.beginPath(); g.arc(x + w, y, rr, 0, Math.PI * 2); g.fill(); }
        if (x + rr > w) { g.beginPath(); g.arc(x - w, y, rr, 0, Math.PI * 2); g.fill(); }
      }
    }
    // polar caps
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillRect(0, 0, w, 22);
    g.fillRect(0, h - 22, w, 22);
    // gold graticule
    g.strokeStyle = "rgba(227,196,106,0.55)";
    g.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = h / 6; y < h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, theme.id);

  const points = useMemo(
    () => islands.map((m, i) => ({ m, pos: latLon(32 * Math.sin(i * 0.95), -150 + i * 47) })),
    [islands],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      d.vx = (e.clientX - d.x) * 0.008;
      d.vy = (e.clientY - d.y) * 0.006;
      d.x = e.clientX; d.y = e.clientY;
      if (spin.current) {
        spin.current.rotation.y += d.vx;
        spin.current.rotation.x = THREE.MathUtils.clamp(spin.current.rotation.x + d.vy, -0.7, 0.7);
      }
    };
    const up = () => { drag.current.active = false; document.body.style.cursor = ""; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  useFrame((st, dt) => {
    const d = drag.current;
    const g = spin.current;
    if (g && !d.active) {
      g.rotation.y += d.vx + dt * 0.12;
      g.rotation.x = THREE.MathUtils.clamp(g.rotation.x + d.vy, -0.7, 0.7);
      d.vx *= 0.94;
      d.vy *= 0.9;
    }
    if (plane.current) {
      const t = st.clock.elapsedTime * 0.5;
      plane.current.position.set(Math.cos(t) * R * 1.3, Math.sin(t * 0.7) * 0.5, Math.sin(t) * R * 1.3);
      plane.current.rotation.set(0, -t, 0.25);
    }
  });

  const startDrag = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    drag.current = { active: true, x: e.clientX, y: e.clientY, vx: 0, vy: 0 };
    document.body.style.cursor = "grabbing";
  };

  return (
    <group>
      <group ref={spin} rotation={[0.25, 0, 0]}>
        <mesh onPointerDown={startDrag}>
          <sphereGeometry args={[R, 64, 48]} />
          {map ? <meshStandardMaterial map={map} roughness={0.55} metalness={0.1} /> : <meshStandardMaterial color={isl.water} />}
        </mesh>
        {points.slice(0, -1).map((p, i) => {
          const q = points[i + 1];
          const mid = p.pos.clone().add(q.pos).normalize().multiplyScalar(R * 1.32);
          const done = p.m.state === "done";
          return (
            <QuadraticBezierLine key={`arc-${p.m.id}`} start={p.pos} end={q.pos} mid={mid}
              color={done ? "#FBBF24" : "#FFFFFF"} lineWidth={2.5} dashed={!done} dashSize={0.08} gapSize={0.06} transparent opacity={0.9} />
          );
        })}
        {points.map((p) => <Marker key={p.m.id} m={p.m} pos={p.pos} theme={theme} showLabel={showLabel} onSelect={onSelect} />)}
      </group>
      {/* atmosphere */}
      <mesh>
        <sphereGeometry args={[R * 1.1, 48, 32]} />
        <meshBasicMaterial color={theme.island.glow} transparent opacity={0.16} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* a tiny Nimipiko plane circling the globe */}
      <group ref={plane} scale={0.22}>
        <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.18, 1.0, 6, 12]} /><meshStandardMaterial color="#0F2347" metalness={0.4} roughness={0.35} /></mesh>
        <mesh><boxGeometry args={[0.35, 0.05, 1.5]} /><meshStandardMaterial color="#C9A84C" metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[-0.55, 0.22, 0]}><boxGeometry args={[0.22, 0.4, 0.05]} /><meshStandardMaterial color="#C9A84C" metalness={0.8} roughness={0.3} /></mesh>
      </group>
    </group>
  );
}
