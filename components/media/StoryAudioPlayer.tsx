"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, RotateCcw } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";

interface Props {
  url: string | null | undefined;
  title?: string;
  subtitle?: string;
  color?: string;
  onEnded?: () => void;
}

export default function StoryAudioPlayer({ url, title, subtitle, color = "from-purple-500 to-indigo-600", onEnded }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    return () => { clearInterval(intervalRef.current); ref.current?.pause(); };
  }, []);

  if (!url) {
    return (
      <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.08] p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center text-2xl shrink-0">🎵</div>
        <div>
          <p className="text-white/30 text-sm font-bold">Coming Soon</p>
          {title && <p className="theme-text-faint text-[10px]">{title}</p>}
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
    <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.08] p-5 shadow-lg">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => { if (ref.current) setDuration(ref.current.duration); }}
        onEnded={() => { setPlaying(false); clearInterval(intervalRef.current); onEnded?.(); }}
      />

      <div className="flex items-center gap-4">
        {/* Play button */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={toggle}
          className={`w-14 h-14 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0`}>
          {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </motion.button>

        <div className="flex-1 min-w-0">
          {title && <p className="font-black text-white text-[13px] truncate">{title}</p>}
          {subtitle && <p className="theme-text-faint text-[10px] truncate">{subtitle}</p>}

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-white/[0.08] rounded-full h-[6px] overflow-hidden">
              <motion.div
                className={`bg-gradient-to-r ${color} h-full rounded-full`}
                style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
              />
            </div>
            <span className="theme-text-faint text-[9px] font-bold tabular-nums shrink-0">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Restart */}
        <button onClick={restart}
          className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition shrink-0">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Waveform decoration */}
      {playing && (
        <div className="flex items-end justify-center gap-[2px] mt-3 h-6">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div key={i}
              className={`w-[3px] rounded-full bg-gradient-to-t ${color} opacity-40`}
              animate={{ height: [4, 12 + Math.random() * 12, 4] }}
              transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
