"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import supabase from "@/lib/supabaseClient";
import type { UniversalRecommendation } from "@/lib/ai/types";

interface Props {
  childId: string;
  language?: string;
}

const REASON_LABEL: Record<string, string> = {
  in_progress:       "Continue where you left off",
  level_up:          "Level up!",
  interest_match:    "You'll love this",
  review_needed:     "Time to review",
  streak_builder:    "Keep your streak",
  achievement_unlock:"Unlock an achievement",
  new_adventure:     "New adventure",
};

export default function NimiRecommendationsPanel({ childId, language = "en" }: Props) {
  const [recs, setRecs]       = useState<UniversalRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    void fetchRecs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, language]);

  const fetchRecs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setLoading(false); return; }

      const res = await fetch(`/api/nimi/recommendations?childId=${childId}&lang=${language}&limit=5`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setLoading(false); return; }

      const data = await res.json() as { recommendations?: UniversalRecommendation[] };
      setRecs(data.recommendations ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (recs.length === 0) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
        border: "1.5px solid #a7f3d0",
        borderRadius: "var(--leaf-r-lg, 18px)",
        padding: "14px 14px 10px",
      }}
    >
      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">
        ✨ Nimi recommends
      </p>
      <ul className="space-y-2">
        {recs.map((rec, i) => (
          <motion.li
            key={rec.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link
              href={rec.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 hover:bg-white border border-transparent hover:border-emerald-200 transition group"
            >
              <span className="text-xl leading-none shrink-0">{rec.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate leading-snug group-hover:text-emerald-700 transition">{rec.title}</p>
                <p className="text-xs text-gray-400 truncate">{REASON_LABEL[rec.reason] ?? rec.reasonLabel}</p>
              </div>
              <span className="text-gray-300 group-hover:text-emerald-400 transition text-sm">›</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
