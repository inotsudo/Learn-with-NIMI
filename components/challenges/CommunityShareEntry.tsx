"use client";

import { motion } from "framer-motion";
import { Share2, Lock } from "lucide-react";

interface Props {
  onShare?: () => void;
  parentOnly?: boolean;
}

export default function CommunityShareEntry({ onShare, parentOnly = true }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-ds-border shadow-ds-card leaf p-3.5 flex items-center gap-3"
    >
      <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
        <Share2 className="w-5 h-5 text-pink-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-ds-text text-[12px]">Share to Nimi Community</p>
        <p className="text-gray-500 text-[10px] mt-0.5">Share your child&apos;s achievement with other families</p>
      </div>
      {parentOnly && (
        <div className="flex items-center gap-1 text-gray-500 text-[9px] font-bold shrink-0">
          <Lock className="w-3 h-3" /> Parents Only
        </div>
      )}
      <button
        onClick={onShare}
        className="bg-[var(--nimi-green)] hover:bg-[var(--ds-brand-hover)] text-white font-black text-[10px] rounded-full px-3 py-1.5 shrink-0 transition"
      >
        Share
      </button>
    </motion.div>
  );
}
