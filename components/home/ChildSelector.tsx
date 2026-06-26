"use client";

import { motion } from "framer-motion";
import type { Child } from "@/lib/queries";

interface Props {
  children: Child[];
  activeChild: Child;
  onSelect: (child: Child) => void;
}

export default function ChildSelector({ children, activeChild, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2 mb-4 theme-card/80 backdrop-blur rounded-2xl px-3 py-2 border theme-border overflow-x-auto">
      <span className="text-[11px] font-bold theme-text-muted uppercase tracking-wide flex-shrink-0">
        Playing as:
      </span>
      <div className="flex items-center gap-2 flex-1">
        {children.map(child => (
          <motion.button
            key={child.id}
            onClick={() => onSelect(child)}
            whileTap={{ scale: 0.93 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all flex-shrink-0 ${
              child.id === activeChild.id
                ? "theme-accent text-white shadow-lg border theme-border-strong/30"
                : "theme-darker theme-text hover:theme-card-active border theme-border"
            }`}
          >
            {child.avatar_url && child.avatar_url.startsWith("http") ? (
              <img src={child.avatar_url} alt={child.name} className="w-5 h-5 rounded-full object-cover" />
            ) : child.avatar_url ? (
              <span className="text-base leading-none">{child.avatar_url}</span>
            ) : (
              <span className="w-5 h-5 rounded-full theme-accent-muted flex items-center justify-center text-[10px] font-black theme-text">
                {child.name[0].toUpperCase()}
              </span>
            )}
            {child.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
