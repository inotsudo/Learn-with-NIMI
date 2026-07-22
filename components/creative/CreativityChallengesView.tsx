"use client";

/**
 * CreativityChallengesView — Phase 7.4 + 7.5
 *
 * Three daily creative challenges (drawing, coloring, writing).
 * Challenges are AI-generated from the child's story theme,
 * persisted via DB RPCs, and refreshed daily.
 *
 * Completing all 3 in one day awards 20 bonus stars + "Creative Explorer" badge.
 * Each individual challenge awards 5 stars.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authedFetch } from "@/lib/authedFetch";
import { claimChallengeReward, awardBadge } from "@/lib/queries";
import supabase from "@/lib/supabaseClient";

const G = "var(--nimi-green,#15803D)";
const BONUS_STARS = 20;
const BONUS_BADGE = "creative-explorer";

const TYPE_CONFIG = {
  drawing:  { emoji: "✏️", label: "Drawing",  color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  coloring: { emoji: "🎨", label: "Coloring",  color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
  writing:  { emoji: "📝", label: "Writing",   color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE" },
} as const;

interface Challenge {
  id:           string;
  type:         keyof typeof TYPE_CONFIG;
  prompt:       string;
  completed:    boolean;
  stars:        number;
  completed_at: string | null;
}

interface Props {
  childId:       string;
  childName:     string;
  childAge:      number | null;
  childLanguage: "en" | "fr" | "rw";
  storyTitle?:   string | null;
  onStarsEarned?: (n: number) => void;
}

export default function CreativityChallengesView({
  childId, childName, childAge, childLanguage, storyTitle, onStarsEarned,
}: Props) {
  const [challenges,    setChallenges]    = useState<Challenge[] | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [generating,    setGenerating]    = useState(false);
  const [completing,    setCompleting]    = useState<string | null>(null);
  const [bonusEarned,   setBonusEarned]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [starsFlash,    setStarsFlash]    = useState<number | null>(null);

  const ageRange: "5-7" | "8-10" | "11+" =
    childAge == null ? "8-10" :
    childAge <= 7    ? "5-7"  :
    childAge <= 10   ? "8-10" : "11+";

  const today = new Date().toISOString().slice(0, 10);

  // ── Load today's challenges (or generate if none) ─────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data } = await supabase.rpc("get_daily_creative_challenges", {
      p_child_id: childId,
      p_language: childLanguage,
    });

    const rows = (data ?? []) as Challenge[];

    if (rows.length >= 3) {
      setChallenges(rows);
      setLoading(false);
      return;
    }

    // Generate new challenges
    setGenerating(true);
    try {
      const res = await authedFetch("/api/creativity-challenges", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language:   childLanguage,
          ageRange,
          storyTitle: storyTitle ?? "nature and adventure",
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const { challenges: generated } = await res.json() as { challenges: { type: string; prompt: string; stars: number }[] };

      // Seed into DB
      await supabase.rpc("seed_daily_creative_challenges", {
        p_child_id:    childId,
        p_language:    childLanguage,
        p_challenges:  generated,
      });

      // Re-fetch
      const { data: fresh } = await supabase.rpc("get_daily_creative_challenges", {
        p_child_id: childId,
        p_language: childLanguage,
      });
      setChallenges((fresh ?? []) as Challenge[]);
    } catch {
      setError("Couldn't load today's challenges. Try refreshing.");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [childId, childLanguage, ageRange, storyTitle]);

  useEffect(() => { void load(); }, [load]);

  // ── Complete a challenge ──────────────────────────────────────────────────

  const handleComplete = useCallback(async (challenge: Challenge) => {
    if (challenge.completed || completing) return;
    setCompleting(challenge.id);
    setError(null);

    try {
      const { data } = await supabase.rpc("complete_creative_challenge", {
        p_challenge_id: challenge.id,
      }) as { data: { stars: number; slug: string } | null };

      const starsEarned = data?.stars ?? challenge.stars;

      setChallenges(prev =>
        (prev ?? []).map(c => c.id === challenge.id
          ? { ...c, completed: true, completed_at: new Date().toISOString() }
          : c
        )
      );

      setStarsFlash(starsEarned);
      onStarsEarned?.(starsEarned);
      setTimeout(() => setStarsFlash(null), 2000);

      // Check if all 3 are now done → bonus
      const updatedList = (challenges ?? []).map(c =>
        c.id === challenge.id ? { ...c, completed: true } : c
      );
      const allDone = updatedList.length >= 3 && updatedList.every(c => c.completed);

      if (allDone && !bonusEarned) {
        await Promise.all([
          claimChallengeReward(
            childId, childLanguage,
            `creative-all-${today}`,
            BONUS_STARS,
          ),
          awardBadge(childId, childLanguage, BONUS_BADGE),
        ]);
        setBonusEarned(true);
        onStarsEarned?.(BONUS_STARS);
      }
    } catch {
      setError("Couldn't save completion. Try again.");
    } finally {
      setCompleting(null);
    }
  }, [completing, challenges, bonusEarned, childId, childLanguage, today, onStarsEarned]);

  const completedCount = (challenges ?? []).filter(c => c.completed).length;
  const allDone        = completedCount >= 3;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[20px]" style={{ color: "var(--ds-text-primary,#111827)" }}>
            🌟 Daily Challenges
          </p>
          <p className="text-[12px] font-nunito" style={{ color: "#6B7280" }}>
            Complete all 3 today to earn a bonus!
          </p>
        </div>
        {/* Date chip */}
        <span className="shrink-0 font-bold text-[10px] px-2.5 py-1 rounded-full"
          style={{ background: "#F0FDF4", color: G, border: `1px solid #BBF7D0` }}>
          {new Date().toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
        </span>
      </div>

      {/* Progress bar */}
      {challenges && (
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="font-bold text-[11px]" style={{ color: "#6B7280" }}>
              Progress
            </span>
            <span className="font-black text-[11px]" style={{ color: G }}>
              {completedCount}/3
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / 3) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: G }} />
          </div>
        </div>
      )}

      {/* Stars flash */}
      <AnimatePresence>
        {starsFlash !== null && (
          <motion.div
            key="flash"
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl"
            style={{ background: "#FEF9C3", border: "1px solid #FDE047" }}>
            <span className="text-[22px]">⭐</span>
            <p className="font-black text-[16px]" style={{ color: "#713F12" }}>
              +{starsFlash} stars!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading / generating */}
      {(loading || generating) && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${G} transparent transparent transparent` }} />
          <p className="font-bold text-[13px]" style={{ color: G }}>
            {generating ? "Nimi is creating today's challenges…" : "Loading…"}
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 rounded-2xl text-center" style={{ background: "#FFF1F2", border: "1px solid #FECDD3" }}>
          <p className="text-[13px] font-bold text-red-600">{error}</p>
          <button onClick={() => void load()}
            className="mt-3 px-4 py-1.5 rounded-full text-[12px] font-black text-white"
            style={{ background: G }}>
            Try again
          </button>
        </div>
      )}

      {/* Challenge cards */}
      {!loading && challenges && (
        <div className="flex flex-col gap-3">
          {challenges.map(challenge => {
            const cfg = TYPE_CONFIG[challenge.type] ?? TYPE_CONFIG.writing;
            const isDone = challenge.completed;
            const isBusy = completing === challenge.id;

            return (
              <motion.div key={challenge.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-5 rounded-3xl border-2 transition-colors"
                style={{
                  background:   isDone ? cfg.bg       : "white",
                  borderColor:  isDone ? cfg.color    : "#E5E7EB",
                }}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[22px] shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {isDone ? "✅" : cfg.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-[10px] uppercase tracking-widest"
                        style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="font-bold text-[10px]" style={{ color: "#9CA3AF" }}>
                        +{challenge.stars} ⭐
                      </span>
                    </div>
                    <p className="font-nunito text-[13px] sm:text-[14px] leading-relaxed"
                      style={{ color: isDone ? cfg.color : "#374151",
                               textDecoration: isDone ? "line-through" : "none",
                               opacity: isDone ? 0.7 : 1 }}>
                      {challenge.prompt}
                    </p>
                    {isDone && (
                      <p className="text-[10px] font-bold mt-1" style={{ color: cfg.color }}>
                        ✓ Completed! Well done {childName}!
                      </p>
                    )}
                  </div>

                  {/* Action button */}
                  {!isDone && (
                    <button
                      onClick={() => void handleComplete(challenge)}
                      disabled={isBusy}
                      className="shrink-0 px-4 py-2 rounded-xl font-black text-[12px] text-white transition hover:opacity-90 disabled:opacity-40"
                      style={{ background: cfg.color }}>
                      {isBusy ? "…" : "Done! ✓"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* All done banner */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            key="bonus"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-3xl text-center"
            style={{ background: G }}>
            <p className="text-[36px] mb-2">🏆</p>
            <p className="font-black text-white text-[18px] mb-1">
              All challenges complete!
            </p>
            <p className="text-green-200 text-[13px] font-nunito">
              {bonusEarned
                ? `+${BONUS_STARS} bonus stars earned! Creative Explorer badge unlocked! 🎖️`
                : "Amazing work today, " + childName + "!"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint when nothing loaded */}
      {!loading && !generating && !challenges && !error && (
        <div className="py-12 text-center">
          <p className="text-[14px] font-nunito" style={{ color: "#9CA3AF" }}>
            No challenges yet. Tap refresh.
          </p>
          <button onClick={() => void load()}
            className="mt-4 px-5 py-2 rounded-full font-black text-[13px] text-white"
            style={{ background: G }}>
            Load Challenges
          </button>
        </div>
      )}
    </div>
  );
}
