"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";

let webglOk: boolean | null = null;
function detectWebGL(): boolean {
  if (webglOk === null) {
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
      webglOk = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext(); // free the probe context
    } catch {
      webglOk = false;
    }
  }
  return webglOk;
}
const noSubscribe = () => () => {};

/** Real WebGL check: without it the world stays full-bleed art + CSS light, never a fallback toy panel. */
export function useWebGL(): boolean {
  return useSyncExternalStore(noSubscribe, detectWebGL, () => false);
}

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
/** "w×h" of the viewport (string snapshot so useSyncExternalStore stays stable). */
export function useViewport(): { w: number; h: number } {
  const snap = useSyncExternalStore(subscribeResize, () => `${window.innerWidth}x${window.innerHeight}`, () => "1440x900");
  const [w, h] = snap.split("x").map(Number);
  return { w, h };
}

/**
 * Pointer parallax in [-1, 1] (springy). Fine pointers follow the mouse;
 * touch screens get a slow autonomous drift so the scene still breathes.
 */
export function useParallax(enabled: boolean): { x: MotionValue<number>; y: MotionValue<number> } {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 55, damping: 18, mass: 0.7 });
  const y = useSpring(rawY, { stiffness: 55, damping: 18, mass: 0.7 });

  useEffect(() => {
    if (!enabled) { rawX.set(0); rawY.set(0); return; }
    if (window.matchMedia("(pointer: fine)").matches) {
      const move = (e: PointerEvent) => {
        rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
        rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
      };
      window.addEventListener("pointermove", move);
      return () => window.removeEventListener("pointermove", move);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const s = (t - t0) / 1000;
      rawX.set(Math.sin(s * 0.23) * 0.35);
      rawY.set(Math.cos(s * 0.17) * 0.25);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, rawX, rawY]);

  return { x, y };
}
