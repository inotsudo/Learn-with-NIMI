"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// @ts-ignore
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { Palette, X, Brush, Eraser, Undo, Redo, Trash2, Save } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
import { playColorPick, playStamp, playPop, playSuccess } from "@/lib/sounds";
import supabase from "@/lib/supabaseClient";
import type { Page } from "./types";

// ── Flood fill (paint bucket) ────────────────────────────────
function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillR: number, fillG: number, fillB: number,
  tolerance = 40
) {
  const { data, width, height } = imageData;
  const idx = (x: number, y: number) => (y * width + x) * 4;
  const si = idx(startX, startY);
  const tR = data[si], tG = data[si + 1], tB = data[si + 2];

  // Bail if target is already the fill colour
  if (tR === fillR && tG === fillG && tB === fillB) return;

  const match = (i: number) =>
    Math.abs(data[i]     - tR) <= tolerance &&
    Math.abs(data[i + 1] - tG) <= tolerance &&
    Math.abs(data[i + 2] - tB) <= tolerance;

  const visited = new Uint8Array(width * height);
  const stack   = [startY * width + startX];

  while (stack.length) {
    const pos = stack.pop()!;
    if (visited[pos]) continue;
    const x = pos % width;
    const y = (pos - x) / width;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const i = pos * 4;
    if (!match(i)) continue;
    visited[pos] = 1;
    data[i] = fillR; data[i + 1] = fillG; data[i + 2] = fillB; data[i + 3] = 255;
    stack.push(pos - 1, pos + 1, pos - width, pos + width);
  }
}

// Kid-friendly primary palette — 12 big bright colors
const KID_COLORS = [
  "#FF0000", "#FF6600", "#FFD700", "#00CC00",
  "#00BBFF", "#0044FF", "#8800CC", "#FF0088",
  "#885522", "#FF88BB", "#000000", "#FFFFFF",
];

// Full advanced palette for older kids
const ADVANCED_COLORS = [
  "#FF0000","#FF4444","#FF8888","#FFBBBB",
  "#FF6600","#FF8C00","#FFA040","#FFCC88",
  "#FFD700","#FFEE00","#FFFF66","#FFFFAA",
  "#00AA00","#22CC22","#55EE55","#99EE99",
  "#00BBBB","#11DDDD","#55EEEE","#AAFFFF",
  "#0044FF","#3377FF","#66AAFF","#99CCFF",
  "#8800CC","#AA33DD","#CC88EE","#DDAAFF",
  "#FF0066","#FF4499","#FF88BB","#FFAAD5",
  "#553300","#885522","#BB8855","#DDAA88",
  "#000000","#444444","#888888","#CCCCCC","#FFFFFF",
];

interface ColoringStudioProps {
  pages: Page[];
  childId?: string | null;
  onClose: () => void;
  t: (key: string) => string;
}

export default function ColoringStudio({ pages, childId, onClose, t }: ColoringStudioProps) {
  const themeM = useThemeMotion();
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing    = useRef(false);
  const lastPos      = useRef<{ x: number; y: number } | null>(null);
  const pageStates   = useRef<(ImageData | null)[]>([]);
  const undoStacks   = useRef<ImageData[][]>([]);
  const redoStacks   = useRef<ImageData[][]>([]);

  const [pageIdx,  setPageIdx]  = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Tool state
  const [color,      setColor]      = useState("#FF0000");
  const [brushSize,  setBrushSize]  = useState(10);
  const [opacity,    setOpacity]    = useState(90);
  const [tool,       setTool]       = useState<'brush'|'fill'|'eraser'|'sticker'>('brush');
  const [brushType,  setBrushType]  = useState<'pencil'|'marker'|'spray'>('pencil');
  const [activeSticker, setActiveSticker] = useState("⭐");
  const [showSaved, setShowSaved] = useState(false);
  const [showAdvancedPalette, setShowAdvancedPalette] = useState(false);
  const [, setHistVer] = useState(0);

  const STICKERS = ["⭐", "🌈", "🦋", "🌸", "❤️", "🌟", "🎀", "🐸", "🦁", "🎵", "✨", "🌺"];

  const processed = useMemo(() =>
    pages.map(p => ({ ...p, image_url: getStorageUrl(p.image_url) })),
    [pages]
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Load / restore a page ──────────────────────────────────
  const DEFAULT_W = 800;
  const DEFAULT_H = 1000;

  const drawPlaceholder = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, message: string) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9CA3AF';
    ctx.font = `${Math.max(16, Math.round(w / 22))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = message.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > w * 0.85 && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const lineHeight = Math.max(20, Math.round(w / 18));
    const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lineHeight));
  }, []);

  // ── Load / restore a page ──────────────────────────────────
  const loadPage = useCallback((idx: number, restore: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setLoading(true);
    setLoadError(false);

    const url = processed[idx]?.image_url;

    const finishWithoutImage = (message: string) => {
      const saved = pageStates.current[idx];
      const w = saved?.width  || DEFAULT_W;
      const h = saved?.height || DEFAULT_H;
      canvas.width  = w;
      canvas.height = h;
      if (restore && saved && saved.width === w && saved.height === h) {
        ctx.putImageData(saved, 0, 0);
      } else {
        drawPlaceholder(ctx, w, h, message);
      }
      if (!undoStacks.current[idx]) undoStacks.current[idx] = [];
      if (!redoStacks.current[idx]) redoStacks.current[idx] = [];
      setLoading(false);
      setLoadError(true);
      setHistVer(v => v + 1);
    };

    if (!url) { finishWithoutImage(t('coloringLoadError')); return; }

    const draw = async (img: HTMLImageElement) => {
      const MAX = 1400;
      const nw = img.naturalWidth  || DEFAULT_W;
      const nh = img.naturalHeight || DEFAULT_H;
      const scale = Math.min(1, MAX / Math.max(nw, nh));
      const w = Math.round(nw * scale);
      const h = Math.round(nh * scale);

      canvas.width  = w;
      canvas.height = h;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // Restore from local state first
      const saved = pageStates.current[idx];
      if (restore && saved && saved.width === w && saved.height === h) {
        ctx.putImageData(saved, 0, 0);
      } else {
        // Try loading from database
        const dbSave = await loadFromDb(idx);
        if (dbSave) {
          const savedImg = new Image();
          savedImg.onload = () => {
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(savedImg, 0, 0, w, h);
            pageStates.current[idx] = ctx.getImageData(0, 0, w, h);
            setHistVer(v => v + 1);
          };
          savedImg.src = dbSave;
        }
      }

      if (!undoStacks.current[idx]) undoStacks.current[idx] = [];
      if (!redoStacks.current[idx]) redoStacks.current[idx] = [];

      setLoading(false);
      setLoadError(false);
      setHistVer(v => v + 1);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => draw(img);
    img.onerror = () => {
      // Retry without CORS — some storage hosts don't send the headers
      // needed for crossOrigin="anonymous". The template will still
      // display and brush/eraser still work; only flood-fill, undo and
      // save may be unavailable on the resulting tainted canvas.
      const retry = new Image();
      retry.onload = () => draw(retry);
      retry.onerror = () => finishWithoutImage(t('coloringLoadError'));
      retry.src = url;
    };
    img.src = url;
  }, [processed, t, drawPlaceholder]);

  useEffect(() => { if (processed.length > 0) loadPage(0, true); }, []);

  // ── DB persistence ──────────────────────────────────────────
  // Get the coloring page UUID from the original pages prop (before processing)
  const getPageId = useCallback((idx: number): string | null => {
    return pages[idx]?.id ?? null;
  }, [pages]);

  const saveToDb = useCallback(async (idx: number) => {
    const canvas = canvasRef.current;
    const pageId = getPageId(idx);
    if (!canvas || !childId || !pageId) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      await supabase.from("coloring_saves").upsert({
        child_id: childId,
        coloring_page_id: pageId,
        canvas_data: { dataUrl },
        saved_at: new Date().toISOString(),
      }, { onConflict: "child_id,coloring_page_id" });
    } catch (e) {
      console.error("[ColoringSave]", e);
    }
  }, [childId, getPageId]);

  const loadFromDb = useCallback(async (idx: number) => {
    const pageId = getPageId(idx);
    if (!childId || !pageId) return null;
    try {
      const { data } = await supabase.from("coloring_saves")
        .select("canvas_data")
        .eq("child_id", childId)
        .eq("coloring_page_id", pageId)
        .maybeSingle();
      return (data?.canvas_data as Record<string, unknown>)?.dataUrl as string | null ?? null;
    } catch { return null; }
  }, [childId, getPageId]);

  const savePage = useCallback(() => {
    saveToDb(pageIdx);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const a = document.createElement("a");
      a.download = `coloring-page-${pageIdx + 1}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch {}
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [pageIdx, saveToDb]);

  const shareToNimi = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !childId) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `coloring-${Date.now()}.png`, { type: "image/png" });
      const path = `community/coloring-${childId}-${Date.now()}.png`;
      const { error } = await supabase.storage.from("creations").upload(path, file, { upsert: true });
      if (error) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const children = await supabase.from("children").select("name").eq("id", childId).maybeSingle();
      await supabase.from("creations").insert({
        parent_id: user.id,
        child_id: childId,
        child_name: children.data?.name ?? "Artist",
        description: `${children.data?.name ?? "A kid"} colored a beautiful picture! 🎨`,
        type: "coloring",
        status: "approved",
        is_public: true,
        image_url: `creations/${path}`,
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch {}
  }, [childId]);

  // ── Navigation ──────────────────────────────────────────────
  const goTo = useCallback((next: number) => {
    // save current page state before switching
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      try {
        pageStates.current[pageIdx] = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        // tainted canvas (image loaded without CORS) — can't read pixels back
      }
    }
    // Auto-save current page to DB before switching
    saveToDb(pageIdx);
    setPageIdx(next);
    requestAnimationFrame(() => loadPage(next, true));
  }, [pageIdx, loadPage, saveToDb]);

  // ── Pointer helpers ─────────────────────────────────────────
  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width  / rect.width;
    const sy = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    const m = e as React.MouseEvent;
    return { x: (m.clientX - rect.left) * sx, y: (m.clientY - rect.top) * sy };
  }, []);

  // ── Undo/Redo ───────────────────────────────────────────────
  const saveSnap = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStacks.current[pageIdx] = [...(undoStacks.current[pageIdx] || []).slice(-25), snap];
      redoStacks.current[pageIdx] = [];
      pageStates.current[pageIdx] = snap;
      setHistVer(v => v + 1);
    } catch {
      // tainted canvas (image loaded without CORS) — undo/redo unavailable
    }
  }, [pageIdx]);

  const undo = useCallback(() => {
    const stack = undoStacks.current[pageIdx] || [];
    if (stack.length < 2) return;
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const prev = stack[stack.length - 2];
    ctx.putImageData(prev, 0, 0);
    redoStacks.current[pageIdx] = [...(redoStacks.current[pageIdx] || []), stack[stack.length - 1]];
    undoStacks.current[pageIdx] = stack.slice(0, -1);
    pageStates.current[pageIdx] = prev;
    setHistVer(v => v + 1);
  }, [pageIdx]);

  const redo = useCallback(() => {
    const rstack = redoStacks.current[pageIdx] || [];
    if (rstack.length === 0) return;
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const next = rstack[rstack.length - 1];
    ctx.putImageData(next, 0, 0);
    undoStacks.current[pageIdx] = [...(undoStacks.current[pageIdx] || []), next];
    redoStacks.current[pageIdx] = rstack.slice(0, -1);
    pageStates.current[pageIdx] = next;
    setHistVer(v => v + 1);
  }, [pageIdx]);

  const clearPage = useCallback(() => {
    pageStates.current[pageIdx] = null;
    undoStacks.current[pageIdx] = [];
    redoStacks.current[pageIdx] = [];
    loadPage(pageIdx, false);
  }, [pageIdx, loadPage, saveToDb]);

  // ── Drawing ─────────────────────────────────────────────────
  const spray = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const r = brushSize * 3;
    const n = Math.max(20, brushSize * 4);
    ctx.save();
    ctx.globalAlpha = (opacity / 100) * 0.25;
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, [brushSize, opacity, color]);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pos = getPos(e);

    if (tool === 'fill') {
      try {
        const before = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStacks.current[pageIdx] = [...(undoStacks.current[pageIdx] || []).slice(-25), before];
        redoStacks.current[pageIdx] = [];
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hex = color.replace('#', '');
        floodFill(imgData, Math.round(pos.x), Math.round(pos.y),
          parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
        ctx.putImageData(imgData, 0, 0);
        saveSnap();
      } catch {
        // tainted canvas (image loaded without CORS) — fill bucket unavailable
        window.alert(t('coloringLoadError'));
      }
      return;
    }

    if (tool === 'sticker') {
      try {
        const before = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStacks.current[pageIdx] = [...(undoStacks.current[pageIdx] || []).slice(-25), before];
        redoStacks.current[pageIdx] = [];
        const size = brushSize * 4;
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeSticker, pos.x, pos.y);
        playStamp();
        saveSnap();
      } catch {}
      return;
    }

    isDrawing.current = true;
    lastPos.current = pos;

    if (brushType === 'spray') { spray(ctx, pos.x, pos.y); return; }

    const w = tool === 'eraser' ? brushSize * 2 : (brushType === 'marker' ? brushSize * 2 : brushSize);
    ctx.save();
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.globalAlpha = tool === 'eraser' ? 1 : (brushType === 'marker' ? Math.min(opacity / 100, 0.65) : opacity / 100);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }, [tool, color, brushSize, opacity, brushType, pageIdx, getPos, saveSnap, spray, t]);

  const continueDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pos = getPos(e);

    if (brushType === 'spray') { spray(ctx, pos.x, pos.y); lastPos.current = pos; return; }

    const lw = tool === 'eraser' ? brushSize * 2 : (brushType === 'marker' ? brushSize * 2 : brushSize);
    ctx.save();
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.globalAlpha = tool === 'eraser' ? 1 : (brushType === 'marker' ? Math.min(opacity / 100, 0.65) : opacity / 100);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    ctx.restore();
    lastPos.current = pos;
  }, [tool, color, brushSize, opacity, brushType, getPos, spray]);

  const stopDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    saveSnap();
  }, [saveSnap]);

  const canUndo = (undoStacks.current[pageIdx]?.length || 0) > 1;
  const canRedo = (redoStacks.current[pageIdx]?.length || 0) > 0;

  // Cursor
  const cursor = useMemo(() => {
    if (tool === 'sticker') return 'crosshair';
    if (tool === 'fill') return 'crosshair';
    const s = tool === 'eraser' ? brushSize * 2 : (brushType === 'marker' ? brushSize * 2 : brushSize);
    const c = tool === 'eraser' ? 'white' : color;
    const dim = Math.max(16, s * 2);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${dim}' height='${dim}' viewBox='0 0 ${dim} ${dim}'><circle cx='${dim/2}' cy='${dim/2}' r='${s/2}' fill='${c.replace('#','%23')}' stroke='%23000' stroke-width='1.5' fill-opacity='0.85'/></svg>`;
    return `url('data:image/svg+xml;utf8,${svg}') ${dim/2} ${dim/2}, crosshair`;
  }, [tool, brushSize, brushType, color]);

  // ── Render ───────────────────────────────────────────────────
  if (typeof window === "undefined") return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 flex flex-col sm:flex-row"
      style={{ background: '#150b35', zIndex: 9999 }}
    >

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      {!isMobile && (
        <div className="w-[240px] flex-shrink-0 bg-white border-r border-ds-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[var(--nimi-green)] flex-shrink-0">
            <span className="text-[18px]">🎨</span>
            <span className="text-white font-baloo font-bold text-[14px] flex-1">Coloring Studio</span>
            <motion.button whileTap={themeM.buttonPress} onClick={() => { saveToDb(pageIdx); onClose(); }}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
              <X className="h-4 w-4" />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Kid-friendly color palette — big chunky circles */}
            <div className={`grid gap-2 ${showAdvancedPalette ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {(showAdvancedPalette ? ADVANCED_COLORS : KID_COLORS).map(c => (
                <button key={c} onClick={() => { setColor(c); setTool('brush'); playColorPick(); }}
                  className={`rounded-full transition-all hover:scale-110 border-3 ${
                    color === c && tool !== 'eraser' ? 'border-white scale-110 shadow-lg ring-2 ring-yellow-400' : 'border-transparent'
                  }`}
                  style={{
                    backgroundColor: c,
                    width: showAdvancedPalette ? 32 : 44,
                    height: showAdvancedPalette ? 32 : 44,
                    boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 2px rgba(0,0,0,0.15)' : undefined,
                  }}
                />
              ))}
            </div>
            <button onClick={() => setShowAdvancedPalette(v => !v)}
              className="w-full text-[11px] font-bold text-gray-400 hover:text-gray-700 py-1 transition">
              {showAdvancedPalette ? '◀ Simple colors' : '▶ More colors'}
            </button>

            {/* Tools — big chunky buttons */}
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: 'brush' as const,   icon: <Brush className="h-5 w-5" />, label: '✏️' },
                { id: 'fill' as const,    icon: <span className="text-xl">🪣</span>, label: '🪣' },
                { id: 'eraser' as const,  icon: <Eraser className="h-5 w-5" />, label: '🧹' },
                { id: 'sticker' as const, icon: <span className="text-xl">⭐</span>, label: '⭐' },
              ]).map(({ id, icon }) => (
                <button key={id} onClick={() => setTool(id)}
                  className={`flex items-center justify-center py-3 rounded-2xl border-2 transition-all ${
                    tool === id
                      ? 'border-yellow-400 bg-yellow-400/15 text-gray-800 shadow-lg'
                      : 'border-ds-border text-gray-400 hover:border-[var(--ds-border-brand)]'
                  }`}>
                  {icon}
                </button>
              ))}
            </div>

            {/* Sticker picker */}
            {tool === 'sticker' && (
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map(s => (
                  <button key={s} onClick={() => setActiveSticker(s)}
                    className={`text-2xl py-2 rounded-2xl border-2 transition-all hover:scale-110 ${
                      activeSticker === s ? 'border-yellow-400 bg-yellow-400/10 scale-110' : 'border-ds-border'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Brush size — 3 big chunky options instead of slider */}
            <div className="flex gap-2 justify-center">
              {[
                { size: 4,  label: 'S',  w: 20 },
                { size: 14, label: 'M',  w: 28 },
                { size: 28, label: 'L',  w: 36 },
                { size: 44, label: 'XL', w: 44 },
              ].map(({ size, label, w }) => (
                <button key={size} onClick={() => setBrushSize(size)}
                  className={`rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                    brushSize === size ? 'border-yellow-400 bg-yellow-400/10' : 'border-ds-border hover:border-[var(--ds-border-brand)]'
                  }`}
                  style={{ width: w + 12, height: w + 12 }}>
                  <div className="rounded-full bg-white" style={{ width: Math.max(3, size / 3), height: Math.max(3, size / 3) }} />
                  <span className="text-[9px] font-bold text-gray-400">{label}</span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-ds-border">
              <button onClick={undo} disabled={!canUndo}
                className="flex items-center justify-center gap-1.5 py-2.5 leaf bg-gray-100 text-gray-500 text-[12px] font-bold disabled:opacity-20 hover:bg-gray-200 transition">
                <Undo className="h-4 w-4" /> Undo
              </button>
              <button onClick={redo} disabled={!canRedo}
                className="flex items-center justify-center gap-1.5 py-2.5 leaf bg-gray-100 text-gray-500 text-[12px] font-bold disabled:opacity-20 hover:bg-gray-200 transition">
                <Redo className="h-4 w-4" /> Redo
              </button>
              <button onClick={clearPage}
                className="flex items-center justify-center gap-1.5 py-2.5 leaf bg-red-500/10 text-red-400 text-[12px] font-bold hover:bg-red-500/20 transition">
                <Trash2 className="h-4 w-4" /> Clear
              </button>
              <button onClick={() => { savePage(); playSuccess(); }}
                className="flex items-center justify-center gap-1.5 py-2.5 leaf bg-green-500/10 text-green-400 text-[12px] font-bold hover:bg-green-500/20 transition">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>

            {/* Share to Nimi */}
            <button onClick={shareToNimi}
              className="w-full flex items-center justify-center gap-2 py-3 leaf bg-pink-50 border border-pink-200 text-pink-600 text-[12px] font-bold hover:bg-pink-100 transition">
              {t("storyColorShare")}
            </button>

            {/* Saved feedback */}
            {showSaved && (
              <div className="text-center py-2 leaf bg-[var(--ds-brand-subtle)] border border-[var(--ds-border-brand)]/20 text-[var(--ds-brand-primary)] text-[12px] font-bold">
                {t("storyColorSaved")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-ds-border flex-shrink-0">
          {isMobile && (
            <motion.button whileTap={themeM.buttonPress} onClick={() => { saveToDb(pageIdx); onClose(); }}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition flex-shrink-0">
              <X className="h-4 w-4" />
            </motion.button>
          )}
          <span className="hidden md:block text-[13px] font-baloo font-bold text-ds-text flex-shrink-0">🎨 {t("coloringBookTitle")}</span>
          <div className="flex items-center gap-2 mx-auto">
            <motion.button whileTap={themeM.buttonPress}
              onClick={() => pageIdx > 0 && goTo(pageIdx - 1)} disabled={pageIdx === 0}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 disabled:opacity-20 transition flex-shrink-0">◀</motion.button>
            <span className="text-[13px] font-baloo font-bold text-ds-text whitespace-nowrap">
              {pageIdx + 1} / {processed.length}
            </span>
            <motion.button whileTap={themeM.buttonPress}
              onClick={() => pageIdx < processed.length - 1 && goTo(pageIdx + 1)} disabled={pageIdx >= processed.length - 1}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 disabled:opacity-20 transition flex-shrink-0">▶</motion.button>
          </div>
          {isMobile && (
            <button onClick={() => { savePage(); playSuccess(); }} className="w-9 h-9 rounded-xl bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] hover:opacity-80 flex items-center justify-center flex-shrink-0">
              <Save className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="relative flex-1 flex flex-col items-center justify-center overflow-hidden p-3 sm:p-4 gap-3"
          style={{ background: '#0f0830' }}>
          {/* Canvas is always mounted so canvasRef is available before the first image loads */}
          {loadError && !loading && (
            <div className="flex items-center gap-2 px-3 py-2 leaf bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium max-w-md text-center">
              ⚠️ {t('coloringLoadError')}
            </div>
          )}
          <canvas ref={canvasRef}
            className="shadow-2xl rounded-lg select-none"
            style={{ maxWidth: '100%', maxHeight: '100%', touchAction: 'none', display: loading ? 'none' : 'block', cursor }}
            onMouseDown={startDraw} onMouseMove={continueDraw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={continueDraw} onTouchEnd={stopDraw}
          />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <motion.span className="text-4xl" animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>🎨</motion.span>
              <p className="text-gray-500 font-nunito font-bold text-sm">{t("storyColorPreparing")}</p>
            </div>
          )}
        </div>

        {/* Mobile toolbar — kid-friendly chunky buttons */}
        {isMobile && (
          <div className="bg-white border-t border-ds-border flex-shrink-0 pb-safe">
            {/* Color swatches — big circles, horizontally scrollable */}
            <div className="flex gap-2 overflow-x-auto px-3 pt-3 pb-1.5" style={{ scrollbarWidth: 'none' }}>
              {KID_COLORS.map(c => (
                <button key={c} onClick={() => { setColor(c); setTool('brush'); playColorPick(); }}
                  className={`flex-shrink-0 rounded-full transition-all border-3 ${
                    color === c && tool !== 'eraser' ? 'border-white scale-110 shadow-lg ring-2 ring-yellow-400' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, width: 40, height: 40, boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 2px rgba(0,0,0,0.15)' : undefined }}
                />
              ))}
            </div>
            {/* Tools + size row — chunky */}
            <div className="flex items-center justify-center gap-2 px-3 pb-3 pt-1.5">
              <button onClick={() => setTool('brush')} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 text-xl transition-all ${tool === 'brush' ? 'border-yellow-400 bg-yellow-400/15 shadow-lg' : 'border-ds-border'}`}>✏️</button>
              <button onClick={() => setTool('fill')} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 text-xl transition-all ${tool === 'fill' ? 'border-yellow-400 bg-yellow-400/15 shadow-lg' : 'border-ds-border'}`}>🪣</button>
              <button onClick={() => setTool('sticker')} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 text-xl transition-all ${tool === 'sticker' ? 'border-yellow-400 bg-yellow-400/15 shadow-lg' : 'border-ds-border'}`}>⭐</button>
              <button onClick={() => setTool('eraser')} className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 text-xl transition-all ${tool === 'eraser' ? 'border-red-400 bg-red-500/15 shadow-lg' : 'border-ds-border'}`}>🧹</button>
              {/* Size buttons instead of slider */}
              <div className="w-px h-8 bg-gray-200 mx-1" />
              {[{ s: 6, l: 'S' }, { s: 16, l: 'M' }, { s: 32, l: 'L' }].map(({ s, l }) => (
                <button key={s} onClick={() => setBrushSize(s)}
                  className={`w-10 h-12 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                    brushSize === s ? 'border-sky-400 bg-sky-400/10' : 'border-ds-border'
                  }`}>
                  <div className="rounded-full bg-gray-600" style={{ width: Math.max(4, s / 3), height: Math.max(4, s / 3) }} />
                  <span className="text-[8px] font-bold text-gray-400 mt-0.5">{l}</span>
                </button>
              ))}
              <div className="w-px h-8 bg-gray-200 mx-1" />
              <button onClick={undo} disabled={!canUndo} className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center disabled:opacity-20"><Undo className="h-5 w-5 text-gray-400" /></button>
            </div>
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
}
