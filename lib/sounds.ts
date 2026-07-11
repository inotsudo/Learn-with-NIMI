"use client";

import { isSoundEffectsEnabled } from "./soundEffects";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.15) {
  if (!isSoundEffectsEnabled()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playChord(freqs: number[], duration: number, type: OscillatorType = "sine", vol = 0.08) {
  freqs.forEach(f => playTone(f, duration, type, vol));
}

// ── Sound effects ────────────────────────────────────────

export function playTap() {
  playTone(800, 0.08, "sine", 0.1);
}

export function playClick() {
  playTone(600, 0.05, "square", 0.06);
  setTimeout(() => playTone(900, 0.05, "square", 0.04), 30);
}

export function playPageTurn() {
  if (!isSoundEffectsEnabled()) return;
  try {
    const audio = new Audio("/sounds/page-turn.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {
    playTone(200, 0.15, "triangle", 0.06);
  }
}

export function playSuccess() {
  playTone(523, 0.12, "sine", 0.12);
  setTimeout(() => playTone(659, 0.12, "sine", 0.12), 100);
  setTimeout(() => playTone(784, 0.2, "sine", 0.15), 200);
}

export function playStar() {
  playTone(1047, 0.08, "sine", 0.1);
  setTimeout(() => playTone(1319, 0.08, "sine", 0.1), 60);
  setTimeout(() => playTone(1568, 0.15, "sine", 0.12), 120);
}

export function playCelebration() {
  // Rising arpeggio
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.15, "sine", 0.1), i * 80);
  });
  // Sparkle at the end
  setTimeout(() => {
    playTone(2093, 0.1, "sine", 0.06);
    playTone(2637, 0.1, "sine", 0.04);
  }, 450);
}

export function playBadge() {
  playChord([523, 659, 784], 0.3, "sine", 0.08);
  setTimeout(() => playChord([659, 784, 1047], 0.4, "sine", 0.1), 250);
}

export function playUnlock() {
  playTone(330, 0.1, "triangle", 0.1);
  setTimeout(() => playTone(440, 0.1, "triangle", 0.1), 80);
  setTimeout(() => playTone(660, 0.2, "triangle", 0.12), 160);
}

export function playPop() {
  playTone(400, 0.06, "sine", 0.12);
  setTimeout(() => playTone(600, 0.04, "sine", 0.08), 40);
}

export function playStamp() {
  playTone(200, 0.08, "square", 0.08);
  setTimeout(() => playTone(350, 0.06, "sine", 0.06), 50);
}

export function playColorPick() {
  playTone(500 + Math.random() * 300, 0.06, "sine", 0.06);
}

export function playError() {
  playTone(200, 0.15, "sawtooth", 0.08);
  setTimeout(() => playTone(150, 0.2, "sawtooth", 0.06), 120);
}

export function playWhoosh() {
  if (!isSoundEffectsEnabled()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}
