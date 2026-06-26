"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Maximize, Volume2, VolumeX } from "lucide-react";
import { getStorageUrl } from "@/lib/queries";

interface Props {
  url: string | null | undefined;
  title?: string;
  poster?: string;
  onEnded?: () => void;
}

export default function StoryVideoPlayer({ url, title, poster, onEnded }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!url) {
    return (
      <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.08] aspect-video flex flex-col items-center justify-center gap-2">
        <span className="text-4xl">🎬</span>
        <p className="text-white/30 text-sm font-bold">Coming Soon</p>
        {title && <p className="theme-text-faint text-[10px]">{title}</p>}
      </div>
    );
  }

  const src = url.startsWith("http") ? url : getStorageUrl(url);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play().catch(() => {}); setPlaying(true); }
  };

  const toggleMute = () => {
    if (!ref.current) return;
    ref.current.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    ref.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="rounded-[20px] overflow-hidden bg-black/40 border border-white/[0.08] shadow-xl relative group">
      <video
        ref={ref}
        src={src}
        poster={poster ? getStorageUrl(poster) : undefined}
        className="w-full aspect-video object-contain bg-black"
        playsInline
        preload="metadata"
        onTimeUpdate={() => {
          if (ref.current && ref.current.duration) {
            setProgress((ref.current.currentTime / ref.current.duration) * 100);
          }
        }}
        onEnded={() => { setPlaying(false); setProgress(100); onEnded?.(); }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {/* Overlay controls */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
        <motion.button whileTap={{ scale: 0.9 }} onClick={toggle}
          className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white shadow-xl">
          {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
        </motion.button>
      </div>

      {/* Big play button when not playing */}
      {!playing && progress < 1 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggle}
            animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-purple-500/30 border-2 border-white/20">
            <Play className="w-9 h-9 ml-1" />
          </motion.button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 flex items-center gap-3">
        <button onClick={toggle} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 bg-white/15 rounded-full h-[6px] overflow-hidden">
          <div className="bg-gradient-to-r from-purple-400 to-indigo-500 h-full rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }} />
        </div>
        <button onClick={toggleMute} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 shrink-0">
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <button onClick={toggleFullscreen} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 shrink-0">
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
