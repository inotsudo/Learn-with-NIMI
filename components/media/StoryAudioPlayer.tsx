"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import { DURATION } from "@/lib/design-system/motion";
import { Play, Pause, Volume2, RotateCcw, Sparkles } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";

interface Props {
  url: string | null | undefined;
  title?: string;
  subtitle?: string;
  color?: string;
  onEnded?: () => void;
}

export default function StoryAudioPlayer({ url, title, subtitle, color = "bg-[var(--nimi-green)]", onEnded }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<number>(0);
  const m = useThemeMotion();

  useEffect(() => {
    return () => { clearInterval(intervalRef.current); ref.current?.pause(); };
  }, []);

  if (!url) {
    return (
      <div className="leaf border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-amber-50/60 p-6 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center leaf bg-white shadow-sm text-2xl shrink-0">
            <Sparkles className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-gray-700 text-sm font-black">Coming Soon</p>
            {title && <p className="text-gray-500 text-[10px] mt-0.5">{title}</p>}
          </div>
        </div>
      </div>
    );
  }

  const src = url.startsWith("http") ? url : getStorageUrl(url);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = () => {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      setPlaying(false);
      clearInterval(intervalRef.current);
    } else {
      ref.current.play().catch(() => {});
      setPlaying(true);
      intervalRef.current = window.setInterval(() => {
        if (ref.current) {
          setProgress(ref.current.currentTime);
          setDuration(ref.current.duration || 0);
        }
      }, 200);
    }
  };

  const restart = () => {
    if (!ref.current) return;
    ref.current.currentTime = 0;
    setProgress(0);
    if (!playing) toggle();
  };

  return (
    <div className="leaf border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-amber-50/60 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => { if (ref.current) setDuration(ref.current.duration); }}
        onEnded={() => { setPlaying(false); clearInterval(intervalRef.current); onEnded?.(); }}
      />

      <div className="flex items-center gap-4">
        {/* Play button */}
        <motion.button whileTap={m.dangerPress} onClick={toggle}
          className={`w-14 h-14 ${color} flex items-center justify-center text-white shadow-lg shrink-0 ring-4 ring-white/60`}
          style={{ borderRadius: 'var(--leaf-r)' }}>
          {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </motion.button>

        <div className="flex-1 min-w-0">
          {title && <p className="font-black text-ds-text text-[13px] truncate">{title}</p>}
          {subtitle && <p className="text-gray-500 text-[10px] truncate">{subtitle}</p>}

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-white/80 rounded-full h-[6px] overflow-hidden border border-emerald-100">
              <motion.div
                className={`${color} h-full rounded-full`}
                style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-gray-500 text-[9px] font-bold tabular-nums shrink-0">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Restart */}
        <button onClick={restart}
          className="w-10 h-10 rounded-full bg-white/80 border border-emerald-100 flex items-center justify-center text-gray-500 hover:text-emerald-700 transition shrink-0 shadow-sm">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Waveform decoration */}
      {playing && (
        <div className="flex items-end justify-center gap-[2px] mt-3 h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div key={i}
              className={`w-[3px] rounded-full ${color} opacity-40`}
              animate={{ height: [4, 12 + Math.random() * 12, 4] }}
              transition={{ duration: DURATION.slow + Math.random() * DURATION.moderate, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
