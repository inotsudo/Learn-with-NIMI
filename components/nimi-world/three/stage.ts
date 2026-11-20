"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";

/** Re-render once web fonts finish loading so canvas-drawn labels use Baloo, not a fallback. */
function subscribeFonts(cb: () => void) {
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts) return () => {};
  fonts.addEventListener("loadingdone", cb);
  void fonts.ready.then(cb);
  return () => fonts.removeEventListener("loadingdone", cb);
}
export function useFontsReady(): boolean {
  return useSyncExternalStore(subscribeFonts, () => !document.fonts || document.fonts.status === "loaded", () => false);
}

export function brandFont(weight = 800, px = 48): string {
  if (typeof document === "undefined") return `${weight} ${px}px system-ui, sans-serif`;
  const fam = getComputedStyle(document.body).getPropertyValue("--font-baloo").trim();
  return `${weight} ${px}px ${fam ? `${fam}, ` : ""}"Baloo 2", system-ui, sans-serif`;
}

/**
 * Build a CanvasTexture from a draw callback. `cacheKey` must change whenever
 * the drawing would (the callback itself is a fresh closure every render).
 */
export function useCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  cacheKey: string,
): THREE.CanvasTexture | null {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    draw(ctx, width, height);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `draw` is keyed by cacheKey on purpose
  }, [width, height, cacheKey]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
