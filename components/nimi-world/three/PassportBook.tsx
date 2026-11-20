"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { brandFont, roundRect, useCanvasTexture, useFontsReady } from "./stage";

export interface PassportStamp { slug: string; emoji: string; color: string }

interface PassportProps {
  open: boolean;
  childName: string;
  stamps: PassportStamp[];
  /** Empty stamp slots drawn on the page. */
  slots?: number;
  lang: "fr" | "en";
}

const NAVY = "#0F2347";
const W = 1.0;
const H = 1.4;

/** Gold emblem (globe + wings) drawn twice: colour pass and metalness pass. */
function drawCover(g: CanvasRenderingContext2D, w: number, h: number, metal: boolean, lang: "fr" | "en") {
  g.fillStyle = metal ? "#000" : NAVY;
  g.fillRect(0, 0, w, h);
  if (!metal) {
    // leather grain
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.025})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  }
  const gold = metal ? "#fff" : "#E3C46A";
  g.strokeStyle = gold;
  g.fillStyle = gold;
  g.lineWidth = 7;
  roundRect(g, 26, 26, w - 52, h - 52, 18);
  g.stroke();
  g.lineWidth = 2;
  roundRect(g, 40, 40, w - 80, h - 80, 12);
  g.stroke();
  g.textAlign = "center";
  g.font = brandFont(800, 46);
  g.fillText(lang === "fr" ? "PASSEPORT" : "PASSPORT", w / 2, 150);
  g.font = brandFont(700, 30);
  g.fillText(lang === "fr" ? "VOYAGE" : "TRAVEL", w / 2, 192);
  // globe
  const cx = w / 2, cy = h / 2 + 20, r = 120;
  g.lineWidth = 7;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.stroke();
  g.beginPath(); g.ellipse(cx, cy - r * 0.5, r * 0.86, r * 0.12, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(cx, cy + r * 0.5, r * 0.86, r * 0.12, 0, 0, Math.PI * 2); g.stroke();
  // wings
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.ellipse(cx + s * (r + 30 + k * 16), cy - 30 + k * 18, 46 - k * 8, 10, s * -0.35, 0, Math.PI * 2);
      g.fill();
    }
  }
  // star
  g.font = brandFont(800, 44);
  g.fillText("★", cx, cy - r - 18);
  g.font = brandFont(800, 52);
  g.fillText("NIMIPIKO", w / 2, h - 110);
  g.font = brandFont(600, 22);
  g.fillText("✈  AIRWAYS  ✈", w / 2, h - 72);
}

function drawStampPage(g: CanvasRenderingContext2D, w: number, h: number, stamps: PassportStamp[], slots: number, name: string, lang: "fr" | "en") {
  const paper = g.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, "#FBF6EA");
  paper.addColorStop(1, "#F1E6CC");
  g.fillStyle = paper;
  g.fillRect(0, 0, w, h);
  // guilloche lines
  g.strokeStyle = "rgba(201,168,76,0.18)";
  g.lineWidth = 2;
  for (let y = 30; y < h; y += 26) {
    g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x / 30) * 6);
    g.stroke();
  }
  g.fillStyle = "#1A3558";
  g.textAlign = "left";
  g.font = brandFont(800, 30);
  g.fillText(lang === "fr" ? "TAMPONS · VISAS" : "STAMPS · VISAS", 34, 58);
  g.font = brandFont(700, 24);
  g.fillStyle = "#7C6A3A";
  g.fillText(name.toUpperCase(), 34, 92);

  const cols = 3, rows = Math.ceil(slots / cols);
  const cw = (w - 60) / cols, ch = (h - 130) / rows;
  for (let i = 0; i < slots; i++) {
    const cx = 30 + cw * (i % cols) + cw / 2;
    const cy = 120 + ch * Math.floor(i / cols) + ch / 2;
    const r = Math.min(cw, ch) * 0.38;
    const st = stamps[i];
    g.save();
    g.translate(cx, cy);
    g.rotate(((i * 37) % 23 - 11) * 0.02);
    if (st) {
      g.globalAlpha = 0.9;
      g.strokeStyle = st.color;
      g.fillStyle = st.color;
      g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, r - 10, 0, Math.PI * 2); g.stroke();
      g.font = brandFont(800, 13);
      g.textAlign = "center";
      g.fillText("NIMIPIKO", 0, -r + 26);
      g.globalAlpha = 1;
      g.font = `${Math.round(r * 0.9)}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      g.textBaseline = "middle";
      g.fillText(st.emoji, 0, 6);
    } else {
      g.strokeStyle = "rgba(26,53,88,0.25)";
      g.setLineDash([8, 8]);
      g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }
}

function drawIdPage(g: CanvasRenderingContext2D, w: number, h: number, name: string, stamps: number, lang: "fr" | "en") {
  const paper = g.createLinearGradient(0, 0, w, h);
  paper.addColorStop(0, "#F7EFD9");
  paper.addColorStop(1, "#EADCB8");
  g.fillStyle = paper;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(201,168,76,0.22)";
  g.lineWidth = 2;
  for (let y = 24; y < h; y += 22) {
    g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.cos(x / 26) * 5);
    g.stroke();
  }
  g.fillStyle = "#1A3558";
  g.textAlign = "left";
  g.font = brandFont(800, 30);
  g.fillText(lang === "fr" ? "PASSAGER · PASSENGER" : "PASSENGER · PASSAGER", 34, 64);
  // portrait frame with the Nimipiko wings seal
  g.strokeStyle = "#C9A84C";
  g.lineWidth = 6;
  roundRect(g, 34, 96, 190, 230, 18);
  g.stroke();
  g.fillStyle = "rgba(26,53,88,0.08)";
  roundRect(g, 40, 102, 178, 218, 14);
  g.fill();
  g.fillStyle = "#C9A84C";
  g.font = brandFont(800, 120);
  g.textAlign = "center";
  g.fillText(name.slice(0, 1).toUpperCase(), 129, 252);
  g.textAlign = "left";
  const row = (label: string, value: string, y: number) => {
    g.fillStyle = "#7C6A3A";
    g.font = brandFont(700, 20);
    g.fillText(label, 248, y);
    g.fillStyle = "#0F2347";
    g.font = brandFont(800, 34);
    g.fillText(value, 248, y + 36);
  };
  row(lang === "fr" ? "NOM" : "NAME", name.length > 11 ? `${name.slice(0, 10)}…` : name, 128);
  row(lang === "fr" ? "VOL" : "FLIGHT", "NP-001", 212);
  row(lang === "fr" ? "TAMPONS" : "STAMPS", String(stamps), 296);
  // machine-readable strip
  g.fillStyle = "#0F2347";
  g.font = "600 22px monospace";
  const mrz = `P<NIM${name.toUpperCase().replace(/[^A-Z]/g, "")}<<<<<<<<<<<<<<<<<<<<`.slice(0, 30);
  g.fillText(mrz, 34, h - 96);
  g.fillText("NIMIPIKO<<AIRWAYS<<<<<<<<<<<<<", 34, h - 60);
  // gold embossed seal
  g.strokeStyle = "#C9A84C";
  g.lineWidth = 4;
  g.beginPath(); g.arc(w - 110, h - 230, 70, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(w - 110, h - 230, 56, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#C9A84C";
  g.textAlign = "center";
  g.font = brandFont(800, 18);
  g.fillText("NIMIPIKO", w - 110, h - 236);
  g.font = brandFont(700, 14);
  g.fillText("★ AIRWAYS ★", w - 110, h - 212);
}

/** Passeport Voyage Nimipiko — navy cover with real gold foil (metalness map). */
export default function PassportBook({ open, childName, stamps, slots = 9, lang }: PassportProps) {
  const cover = useRef<THREE.Group>(null);
  const fonts = useFontsReady();
  const coverMap = useCanvasTexture(512, 716, (g, w, h) => drawCover(g, w, h, false, lang), `c|${fonts}|${lang}`);
  const coverMetal = useCanvasTexture(512, 716, (g, w, h) => drawCover(g, w, h, true, lang), `m|${fonts}|${lang}`);
  const page = useCanvasTexture(512, 716, (g, w, h) => drawStampPage(g, w, h, stamps, slots, childName, lang),
    `${fonts}|${lang}|${childName}|${slots}|${stamps.map((s) => s.slug).join(",")}`);
  const idPage = useCanvasTexture(512, 716, (g, w, h) => drawIdPage(g, w, h, childName, stamps.length, lang), `id|${fonts}|${lang}|${childName}|${stamps.length}`);

  useFrame((_, dt) => {
    if (!cover.current) return;
    const want = open ? -Math.PI * 0.92 : 0;
    cover.current.rotation.y = THREE.MathUtils.lerp(cover.current.rotation.y, want, 1 - Math.pow(0.001, Math.min(dt, 1 / 30)));
  });

  return (
    <group>
      {/* back cover */}
      <RoundedBox args={[W, H, 0.03]} radius={0.012} smoothness={2} position={[0, 0, -0.06]}>
        <meshStandardMaterial color={NAVY} roughness={0.55} metalness={0.15} />
      </RoundedBox>
      {/* page block */}
      <mesh position={[0.005, 0, -0.015]}>
        <boxGeometry args={[W - 0.05, H - 0.05, 0.07]} />
        <meshStandardMaterial color="#F4EBD6" roughness={0.9} />
      </mesh>
      {page && (
        <mesh position={[0.005, 0, 0.021]}>
          <planeGeometry args={[W - 0.06, H - 0.06]} />
          <meshStandardMaterial map={page} roughness={0.85} />
        </mesh>
      )}
      {/* front cover hinged at the spine (left edge) */}
      <group ref={cover} position={[-W / 2, 0, 0.035]}>
        <group position={[W / 2, 0, 0]}>
          <RoundedBox args={[W, H, 0.03]} radius={0.012} smoothness={2}>
            <meshStandardMaterial color={NAVY} roughness={0.55} metalness={0.15} />
          </RoundedBox>
          {coverMap && coverMetal && (
            <mesh position={[0, 0, 0.0161]}>
              <planeGeometry args={[W - 0.01, H - 0.01]} />
              <meshStandardMaterial map={coverMap} metalnessMap={coverMetal} metalness={1} roughness={0.38} />
            </mesh>
          )}
          {/* inside of the cover */}
          <mesh position={[0, 0, -0.0161]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[W - 0.02, H - 0.02]} />
            {idPage ? <meshStandardMaterial map={idPage} roughness={0.85} /> : <meshStandardMaterial color="#E9DDBF" roughness={0.9} />}
          </mesh>
        </group>
      </group>
      {/* gold spine */}
      <mesh position={[-W / 2, 0, -0.012]}>
        <boxGeometry args={[0.03, H, 0.1]} />
        <meshStandardMaterial color="#C9A84C" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}
