"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "@/lib/supabaseClient";
import type { ProactiveSuggestion } from "@/lib/ai/types";

interface Props {
  childId: string;
  language?: string;
}

const TYPE_EMOJI: Record<string, string> = {
  achievement_congrats: "🏆",
  story_followup:       "📖",
  mission_recommend:    "🎯",
  vocab_review:         "🔤",
  certificate_nudge:    "🎓",
  community_invite:     "🌍",
  streak_celebrate:     "🔥",
  daily_checkin:        "👋",
};

const TYPE_HREF: Record<string, string> = {
  achievement_congrats: "/certificates",
  story_followup:       "/talk-to-nimi",
  mission_recommend:    "/missions",
  vocab_review:         "/talk-to-nimi",
  certificate_nudge:    "/certificates",
  community_invite:     "/community",
  streak_celebrate:     "/missions",
  daily_checkin:        "/talk-to-nimi",
};

function isDismissed(childId: string, suggestionId: string): boolean {
  try {
    const key = `nimi_banner_dismissed_${childId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return ids.includes(suggestionId);
  } catch {
    return false;
  }
}

function markDismissed(childId: string, suggestionId: string): void {
  try {
    const key = `nimi_banner_dismissed_${childId}`;
    const raw = localStorage.getItem(key);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(suggestionId)) {
      // keep at most 20 dismissed IDs to avoid unbounded growth
      ids.push(suggestionId);
      localStorage.setItem(key, JSON.stringify(ids.slice(-20)));
    }
  } catch {
    // localStorage not available — dismiss is ephemeral this session
  }
}

export default function NimiProactiveBanner({ childId, language = "en" }: Props) {
  const [suggestion, setSuggestion] = useState<ProactiveSuggestion | null>(null);
  const [dismissed, setDismissed]   = useState(false);

  useEffect(() => {
    if (!childId) return;
    void fetchSuggestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  const fetchSuggestion = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/nimi/proactive?childId=${childId}&language=${language}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const data = await res.json() as { suggestions?: ProactiveSuggestion[] };
      const top = data.suggestions?.[0];
      if (top && !isDismissed(childId, top.id ?? top.type)) {
        setSuggestion(top);
      }
    } catch {
      // silently fail — proactive banner is non-essential
    }
  };

  const handleDismiss = () => {
    if (suggestion) markDismissed(childId, suggestion.id ?? suggestion.type);
    setDismissed(true);
  };

  if (dismissed || !suggestion) return null;

  const emoji = TYPE_EMOJI[suggestion.type] ?? "✨";
  const href  = TYPE_HREF[suggestion.type] ?? "/home";

  return (
    <AnimatePresence>
      <motion.div
        key={suggestion.id ?? suggestion.type}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
          border: "1.5px solid #6ee7b7",
          borderRadius: "var(--leaf-r-lg, 18px)",
          padding: "14px 16px",
        }}
      >
        {/* dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-black/5 transition"
          aria-label="Dismiss"
        >
          ×
        </button>

        <div className="flex gap-3 items-start pr-6">
          <span className="text-2xl leading-none shrink-0 mt-0.5">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-800 leading-snug">{suggestion.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{suggestion.message}</p>
            <Link
              href={href}
              className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full text-white transition hover:opacity-90"
              style={{ background: "var(--nimi-green, #10b981)" }}
            >
              Let&apos;s go →
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
