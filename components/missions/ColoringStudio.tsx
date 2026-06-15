"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Palette, X, Brush, Eraser, Undo, Redo, Trash2, Save } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";
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

const PALETTE_COLORS = [
  // Reds
  "#FF0000","#FF4444","#FF8888","#FFBBBB","#FFDDDD",
  // Oranges
  "#FF6600","#FF8C00","#FFA040","#FFCC88","#FFE4C4",
  // Yellows
  "#FFD700","#FFEE00","#FFFF66","#FFFFAA","#FFFFF0",
  // Greens
  "#00AA00","#22CC22","#55EE55","#99EE99","#CCFFCC",
  // Teals
  "#00BBBB","#11DDDD","#55EEEE","#AAFFFF","#DFFFFF",
  // Blues
  "#0044FF","#3377FF","#66AAFF","#99CCFF","#CCE5FF",
  // Purples
  "#8800CC","#AA33DD","#CC88EE","#DDAAFF","#EDD5FF",
  // Pinks
  "#FF0066","#FF4499","#FF88BB","#FFAAD5","#FFD5EC",
  // Browns / earth
  "#553300","#885522","#BB8855","#DDAA88","#F5DEB3",
  // Grays + Black + White
  "#000000","#444444","#888888","#CCCCCC","#FFFFFF",
];

interface ColoringStudioProps {
  pages: Page[];
  onClose: () => void;
  t: (key: string) => string;
}

export default function ColoringStudio({ pages, onClose, t }: ColoringStudioProps) {
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
  const [tool,       setTool]       = useState<'brush'|'fill'|'eraser'>('brush');
  const [brushType,  setBrushType]  = useState<'pencil'|'marker'|'spray'>('pencil');
  const [, setHistVer] = useState(0);

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

    const draw = (img: HTMLImageElement) => {
      // Cap at 1400px on longest side — keeps drawing fast and flood fill snappy
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

      // restore saved coloring if exists
      const saved = pageStates.current[idx];
      if (restore && saved && saved.width === w && saved.height === h) {
        ctx.putImageData(saved, 0, 0);
      }

      // initialise stacks — don't call getImageData here, first draw will seed undo
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
    setPageIdx(next);
    // defer load one frame so React can update state first
    requestAnimationFrame(() => loadPage(next, true));
  }, [pageIdx, loadPage]);

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
  }, [pageIdx, loadPage]);

  const savePage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const a = document.createElement('a');
      a.download = `coloring-page-${pageIdx + 1}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch {
      // tainted canvas (image loaded without CORS) — can't export
      window.alert(t('coloringLoadError'));
    }
  }, [pageIdx, t]);

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
    if (tool === 'fill') return 'crosshair';
    const s = tool === 'eraser' ? brushSize * 2 : (brushType === 'marker' ? brushSize * 2 : brushSize);
    const c = tool === 'eraser' ? 'white' : color;
    const dim = Math.max(16, s * 2);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${dim}' height='${dim}' viewBox='0 0 ${dim} ${dim}'><circle cx='${dim/2}' cy='${dim/2}' r='${s/2}' fill='${c.replace('#','%23')}' stroke='%23000' stroke-width='1.5' fill-opacity='0.85'/></svg>`;
    return `url('data:image/svg+xml;utf8,${svg}') ${dim/2} ${dim/2}, crosshair`;
  }, [tool, brushSize, brushType, color]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex"
      style={{ background: '#f5f5f5' }}
    >

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      {!isMobile && (
        <div className="w-[280px] flex-shrink-0 bg-white border-r border-gray-200 shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 flex-shrink-0">
            <Palette className="h-5 w-5 text-white" />
            <span className="text-white font-bold text-sm flex-1">🎨 Coloring Studio</span>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Active color + picker */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-14 h-14 rounded-2xl shadow-inner border-2 border-gray-300 flex-shrink-0 transition-all"
                style={{ backgroundColor: tool === 'eraser' ? '#fff' : color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{t("coloringActiveColor")}</p>
                <input type="color" value={color}
                  onChange={e => { setColor(e.target.value); setTool('brush'); }}
                  className="w-full h-9 rounded-xl border border-gray-200 cursor-pointer block" />
              </div>
            </div>

            {/* Palette */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{t("coloringPalette")}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {PALETTE_COLORS.map(c => (
                  <button key={c} onClick={() => { setColor(c); setTool('brush'); }}
                    className={`aspect-square rounded-xl transition-all duration-100 hover:scale-110 border-2 ${
                      color === c && tool !== 'eraser' && tool !== 'fill'
                        ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: c, boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px #e5e7eb' : undefined }}
                  />
                ))}
              </div>
            </div>

            {/* Tools */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{t("coloringTools")}</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'brush',  icon: <Brush className="h-5 w-5" />, label: t("coloringToolDraw") },
                  { id: 'fill',   icon: <span className="text-xl leading-none">🪣</span>, label: t("coloringToolFill") },
                  { id: 'eraser', icon: <Eraser className="h-5 w-5" />, label: t("coloringToolErase") },
                ] as const).map(({ id, icon, label }) => (
                  <button key={id} onClick={() => setTool(id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-xs font-semibold transition-all ${
                      tool === id
                        ? 'border-purple-400 bg-purple-50 text-purple-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    {icon}<span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brush style */}
            {tool === 'brush' && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{t("coloringBrushStyle")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'pencil', emoji: '✏️', label: t("coloringBrushPencil") },
                    { id: 'marker', emoji: '🖊️', label: t("coloringBrushMarker") },
                    { id: 'spray',  emoji: '💨', label: t("coloringBrushSpray") },
                  ] as const).map(({ id, emoji, label }) => (
                    <button key={id} onClick={() => setBrushType(id)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-2xl border-2 text-xs font-semibold transition-all ${
                        brushType === id
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      <span className="text-xl leading-none">{emoji}</span><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            <div>
              <div className="flex justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("coloringSize")}</p>
                <span className="text-xs font-bold text-purple-600">{brushSize}px</span>
              </div>
              <input type="range" min={2} max={50} value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                className="w-full accent-purple-500" />
              <div className="flex justify-between mt-2">
                {[4, 12, 24, 40].map(s => (
                  <button key={s} onClick={() => setBrushSize(s)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      brushSize === s ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}>
                    <div className="rounded-full bg-gray-600" style={{ width: s/4+1, height: s/4+1 }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity */}
            {tool !== 'eraser' && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{t("coloringOpacity")}</p>
                  <span className="text-xs font-bold text-purple-600">{opacity}%</span>
                </div>
                <input type="range" min={10} max={100} value={opacity}
                  onChange={e => setOpacity(Number(e.target.value))}
                  className="w-full accent-purple-500" />
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
              {([
                { icon: <Undo className="h-4 w-4" />, label: t("coloringUndo"), fn: undo, off: !canUndo, cls: 'text-gray-600' },
                { icon: <Redo className="h-4 w-4" />, label: t("coloringRedo"), fn: redo, off: !canRedo, cls: 'text-gray-600' },
                { icon: <Trash2 className="h-4 w-4" />, label: t("coloringClear"), fn: clearPage, off: false, cls: 'text-red-500' },
                { icon: <Save className="h-4 w-4" />, label: t("coloringSave"), fn: savePage, off: false, cls: 'text-green-600' },
              ] as const).map(({ icon, label, fn, off, cls }) => (
                <button key={label} onClick={fn} disabled={off}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold transition-all ${cls} ${off ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                  {icon}<span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          {isMobile && (
            <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
              onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0">
              <X className="h-4 w-4" />
            </motion.button>
          )}
          <span className="hidden md:block text-sm font-bold text-gray-700 flex-shrink-0">{t("coloringBookTitle")}</span>
          <div className="flex items-center gap-2 mx-auto">
            <motion.button whileHover={pageIdx === 0 ? {} : { scale: 1.06 }} whileTap={pageIdx === 0 ? {} : { scale: 0.94 }}
              onClick={() => pageIdx > 0 && goTo(pageIdx - 1)} disabled={pageIdx === 0}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 transition-colors flex-shrink-0">◀</motion.button>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {t("pageOfLabel").replace("{current}", String(pageIdx + 1)).replace("{total}", String(processed.length))}
            </span>
            <motion.button whileHover={pageIdx >= processed.length - 1 ? {} : { scale: 1.06 }} whileTap={pageIdx >= processed.length - 1 ? {} : { scale: 0.94 }}
              onClick={() => pageIdx < processed.length - 1 && goTo(pageIdx + 1)} disabled={pageIdx >= processed.length - 1}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-30 transition-colors flex-shrink-0">▶</motion.button>
          </div>
          {!isMobile && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={onClose} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors flex-shrink-0">
              <X className="h-4 w-4" />Close
            </motion.button>
          )}
          {isMobile && (
            <button onClick={savePage} className="w-9 h-9 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center flex-shrink-0">
              <Save className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="relative flex-1 flex flex-col items-center justify-center overflow-hidden p-4 gap-3"
          style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 0 0 / 20px 20px' }}>
          {/* Canvas is always mounted so canvasRef is available before the first image loads */}
          {loadError && !loading && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium max-w-md text-center">
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
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 font-medium text-sm">Loading page…</p>
            </div>
          )}
        </div>

        {/* Mobile toolbar */}
        {isMobile && (
          <div className="bg-white border-t border-gray-200 flex-shrink-0">
            {/* Color swatches row */}
            <div className="flex gap-1.5 overflow-x-auto px-3 pt-2.5 pb-1" style={{ scrollbarWidth: 'none' }}>
              {PALETTE_COLORS.map(c => (
                <button key={c} onClick={() => { setColor(c); setTool('brush'); }}
                  className={`flex-shrink-0 w-9 h-9 rounded-full transition-all border-2 ${
                    color === c && tool === 'brush' ? 'border-gray-900 scale-110 shadow' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1.5px #ccc' : undefined }}
                />
              ))}
            </div>
            {/* Tools row */}
            <div className="flex items-center gap-2 px-3 pb-3 pt-1.5">
              <input type="color" value={color} onChange={e => { setColor(e.target.value); setTool('brush'); }}
                className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer flex-shrink-0" />
              <button onClick={() => setTool('brush')} className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all flex-shrink-0 ${tool === 'brush' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-transparent bg-gray-100 text-gray-500'}`}><Brush className="h-4 w-4" /></button>
              <button onClick={() => setTool('fill')} className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 text-lg transition-all flex-shrink-0 ${tool === 'fill' ? 'border-purple-500 bg-purple-50' : 'border-transparent bg-gray-100'}`}>🪣</button>
              <button onClick={() => setTool('eraser')} className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all flex-shrink-0 ${tool === 'eraser' ? 'border-red-400 bg-red-50 text-red-600' : 'border-transparent bg-gray-100 text-gray-500'}`}><Eraser className="h-4 w-4" /></button>
              <div className="flex-1 mx-1">
                <input type="range" min={2} max={50} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full accent-purple-500" />
              </div>
              <button onClick={undo} disabled={!canUndo} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center disabled:opacity-30 flex-shrink-0"><Undo className="h-4 w-4" /></button>
              <button onClick={redo} disabled={!canRedo} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center disabled:opacity-30 flex-shrink-0"><Redo className="h-4 w-4" /></button>
              <button onClick={clearPage} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
