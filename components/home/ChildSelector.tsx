"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Child } from "@/lib/queries";

interface Props {
  children: Child[];
  activeChild: Child;
  onSelect: (child: Child) => void;
  onAddChild: () => void;
}

export default function ChildSelector({ children, activeChild, onSelect, onAddChild }: Props) {
  return (
    <div className="flex items-center gap-2 mb-4 bg-white/80 backdrop-blur rounded-2xl px-3 py-2 shadow-sm border border-purple-100 overflow-x-auto">
      <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide flex-shrink-0">
        Playing as:
      </span>

      <div className="flex items-center gap-2 flex-1">
        {children.map(child => (
          <motion.button
            key={child.id}
            onClick={() => onSelect(child)}
            whileTap={{ scale: 0.93 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex-shrink-0 ${
              child.id === activeChild.id
                ? "bg-purple-600 text-white shadow-md"
                : "bg-purple-50 text-purple-600 hover:bg-purple-100"
            }`}
          >
            {child.avatar_url && child.avatar_url.startsWith("http") ? (
              <img src={child.avatar_url} alt={child.name}
                className="w-5 h-5 rounded-full object-cover" />
            ) : child.avatar_url ? (
              <span className="text-base leading-none">{child.avatar_url}</span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[10px] font-black text-purple-700">
                {child.name[0].toUpperCase()}
              </span>
            )}
            {child.name}
          </motion.button>
        ))}
      </div>

      <motion.button
        onClick={onAddChild}
        whileTap={{ scale: 0.9 }}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-bold flex-shrink-0 transition"
      >
        <Plus className="w-3 h-3" />
        Add
      </motion.button>
    </div>
  );
}
