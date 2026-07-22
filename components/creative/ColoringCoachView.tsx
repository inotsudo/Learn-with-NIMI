"use client";

/**
 * ColoringCoachView — Phase 7.1
 *
 * Loads coloring pages from the child's active story, shows the template,
 * gives AI colour suggestions, and collects the child's colour description
 * for warm feedback. Awards 5 stars on completion.
 *
 * Flow: pick → coaching → done
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { authedFetch } from "@/lib/authedFetch";
import { claimChallengeReward } from "@/lib/queries";
import { getStorageUrl } from "@/lib/queries";
import type { ColoringCoachResponse, ColoringFeedbackResponse } from "@/lib/coloringCoach";
import supabase from "@/lib/supabaseClient";

const G = "var(--nimi-green,#15803D)";
const STARS_AWARD = 5;

interface ColoringPage {
  id: string;
  page_number: number;
  template_image_url: string | null;
  story_title: string;
  story_emoji: string | null;
}

interface Props {
  childId:       string;
  childName:     string;
  childAge:      number | null;
  childLanguage: "en" | "fr" | "rw";
  storyId?:      string | null;
  storyTitle?:   string | null;
  storyEmoji?:   string | null;
  onStarsEarned?: (n: number) => void;
}

type Step = "pick" | "coaching" | "describing" | "done";

// Colour swatch chip
function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border"
      style={{ background: hex + "22", borderColor: hex, color: "#111827" }}>
      <span className="w-3 h-3 rounded-full shrink-0 border border-white/50"
        style={{ background: hex }} />
      {label}
    </span>
  );
}

export default function ColoringCoachView({
  childId, childName, childAge, childLanguage,
  storyId, storyTitle, storyEmoji, onStarsEarned,
}: Props) {
  const [pages,    setPages]    = useState<ColoringPage[]>([]);
  const [selected, setSelected] = useState<ColoringPage | null>(null);
  const [step,     setStep]     = useState<Step>("pick");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const [coaching,    setCoaching]    = useState<ColoringCoachResponse | null>(null);
  const [feedback,    setFeedback]    = useState<ColoringFeedbackResponse | null>(null);
  const [childColors, setChildColors] = useState("");

  const ageRange: "5-7" | "8-10" | "11+" =
    childAge == null ? "8-10" :
    childAge <= 7    ? "5-7"  :
    childAge <= 10   ? "8-10" : "11+";

  // Load coloring pages for this story (or all available)
  useEffect(() => {
    void loadPages();
  }, [storyId]);

  async function loadPages() {
    const query = supabase
      .from("coloring_pages")
      .select("id, page_number, template_image_url, stories!inner(id, title, theme_emoji)")
      .order("page_number");

    const { data } = storyId
      ? await query.eq("stories.id", storyId)
      : await query.limit(12);

    if (!data) return;

    const mapped: ColoringPage[] = (data as unknown[]).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      const story = r.stories as Record<string, unknown> | null;
      return {
        id:                 r.id as string,
        page_number:        r.page_number as number,
        template_image_url: r.template_image_url as string | null,
        story_title:        story ? (story.title as string) : (storyTitle ?? "My Story"),
        story_emoji:        story ? (story.theme_emoji as string | null) : (storyEmoji ?? null),
      };
    });

    setPages(mapped);
    if (mapped.length === 1) setSelected(mapped[0]);
  }

  const handleSelect = useCallback(async (page: ColoringPage) => {
    setSelected(page);
    setStep("coaching");
    setLoading(true);
    setError(null);
    setCoaching(null);

    try {
      const res = await authedFetch("/api/coloring-coach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:     "suggest",
          storyTitle: page.story_title,
          storyEmoji: page.story_emoji,
          pageNumber: page.page_number,
          language:   childLanguage,
          ageRange,
          childName,
        }),
      });
      if (!res.ok) throw new Error("Coach unavailable");
      setCoaching(await res.json() as ColoringCoachResponse);
    } catch {
      setError("Couldn't load colour suggestions. Try again.");
    } finally {
      setLoading(false);
    }
  }, [childLanguage, ageRange, childName]);

  const handleSubmitColors = useCallback(async () => {
    if (!selected || !childColors.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await authedFetch("/api/coloring-coach", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:      "feedback",
          storyTitle:  selected.story_title,
          pageNumber:  selected.page_number,
          childColors: childColors.trim(),
          language:    childLanguage,
          ageRange,
          childName,
        }),
      });
      if (!res.ok) throw new Error("Feedback unavailable");
      const fb = await res.json() as ColoringFeedbackResponse;
      setFeedback(fb);

      // Award stars
      await claimChallengeReward(
        childId, childLanguage,
        `coloring-${selected.id}-${new Date().toISOString().slice(0, 10)}`,
        STARS_AWARD,
      );
      onStarsEarned?.(STARS_AWARD);
      setStep("done");
    } catch {
      setError("Couldn't get feedback. Try again.");
    } finally {
      setLoading(false);
    }
  }, [selected, childColors, childLanguage, ageRange, childName, childId, onStarsEarned]);

  const handleReset = () => {
    setStep("pick");
    setSelected(null);
    setCoaching(null);
    setFeedback(null);
    setChildColors("");
    setError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <p className="font-black text-[20px]" style={{ color: "var(--ds-text-primary,#111827)" }}>
          🎨 Coloring Coach
        </p>
        <p className="text-[12px] font-nunito" style={{ color: "#6B7280" }}>
          Pick a page, get colour ideas, then share what you used!
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── PICK step ── */}
        {step === "pick" && (
          <motion.div key="pick" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {pages.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] font-nunito" style={{ color: "#9CA3AF" }}>
                  No coloring pages found for this story yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pages.map(page => (
                  <motion.button key={page.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => void handleSelect(page)}
                    className="rounded-2xl overflow-hidden bg-white border-2 hover:border-green-400 transition-colors text-left shadow-sm"
                    style={{ borderColor: "#E5E7EB" }}>
                    <div className="relative aspect-[3/4] w-full bg-gray-50">
                      {page.template_image_url ? (
                        <Image
                          src={getStorageUrl(page.template_image_url)}
                          alt={`Page ${page.page_number}`}
                          fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">
                          {page.story_emoji ?? "🎨"}
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="font-baloo font-black text-[11px]" style={{ color: "#111827" }}>
                        Page {page.page_number}
                      </p>
                      <p className="font-nunito text-[10px] truncate" style={{ color: "#6B7280" }}>
                        {page.story_title}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── COACHING step ── */}
        {step === "coaching" && selected && (
          <motion.div key="coaching" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex flex-col gap-4">

            {/* Page preview + back */}
            <div className="flex items-center gap-3">
              <button onClick={handleReset}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-[16px]"
                style={{ color: "#6B7280" }}>
                ←
              </button>
              <p className="font-bold text-[14px]" style={{ color: "#374151" }}>
                {selected.story_emoji} {selected.story_title} — Page {selected.page_number}
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${G} transparent transparent transparent` }} />
                <p className="font-bold text-[14px]" style={{ color: G }}>Nimi is choosing colours…</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl text-center" style={{ background: "#FFF1F2", border: "1px solid #FECDD3" }}>
                <p className="text-[13px] font-bold text-red-600">{error}</p>
                <button onClick={() => void handleSelect(selected)} className="mt-3 px-4 py-1.5 rounded-full text-[12px] font-black text-white" style={{ background: G }}>
                  Try again
                </button>
              </div>
            ) : coaching ? (
              <>
                {/* Encouragement */}
                <div className="p-4 rounded-2xl" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <p className="text-[14px] font-nunito leading-relaxed" style={{ color: "#166534" }}>
                    ✨ {coaching.encouragement}
                  </p>
                  {coaching.palette_story && (
                    <p className="text-[11px] font-bold mt-2 italic" style={{ color: "#15803D" }}>
                      {coaching.palette_story}
                    </p>
                  )}
                </div>

                {/* Colour suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coaching.suggestions.map((s, i) => (
                    <div key={i} className="p-3.5 rounded-2xl border"
                      style={{ background: s.hex + "11", borderColor: s.hex + "55" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-full border-2 border-white shadow shrink-0"
                          style={{ background: s.hex }} />
                        <p className="font-black text-[12px]" style={{ color: "#111827" }}>
                          {s.area}
                        </p>
                      </div>
                      <p className="font-nunito text-[11px]" style={{ color: "#374151" }}>
                        Use <strong>{s.color}</strong> — {s.reason}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Colour palette row */}
                <div className="flex flex-wrap gap-1.5">
                  {coaching.suggestions.map(s => (
                    <Swatch key={s.hex} hex={s.hex} label={s.color} />
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => setStep("describing")}
                  className="w-full py-3 rounded-2xl font-black text-[14px] text-white hover:opacity-90 transition"
                  style={{ background: G }}>
                  🖍️ I finished coloring! Tell Nimi what I used
                </button>
              </>
            ) : null}
          </motion.div>
        )}

        {/* ── DESCRIBING step ── */}
        {step === "describing" && selected && (
          <motion.div key="describing" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
              <p className="font-black text-[14px]" style={{ color: "#92400E" }}>
                🖍️ Tell Nimi about your colours!
              </p>
              <p className="text-[12px] font-nunito mt-1" style={{ color: "#B45309" }}>
                Which colours did you use? What did you colour first?
              </p>
            </div>
            <textarea
              value={childColors}
              onChange={e => setChildColors(e.target.value)}
              placeholder="I used blue for the sky and green for the trees…"
              rows={3}
              className="w-full text-[14px] font-nunito p-3 rounded-2xl border focus:outline-none resize-none"
              style={{ borderColor: "#D1D5DB", color: "#111827", background: "#FAFAFA" }} />
            {error && (
              <p className="text-[12px] font-bold text-red-500">{error}</p>
            )}
            <button
              onClick={() => void handleSubmitColors()}
              disabled={loading || !childColors.trim()}
              className="w-full py-3 rounded-2xl font-black text-[14px] text-white hover:opacity-90 transition disabled:opacity-30"
              style={{ background: G }}>
              {loading ? "Checking…" : "✓ See Nimi's feedback"}
            </button>
          </motion.div>
        )}

        {/* ── DONE step ── */}
        {step === "done" && feedback && (
          <motion.div key="done" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="flex flex-col gap-4">

            {/* Stars earned */}
            <div className="p-5 rounded-3xl text-center" style={{ background: G }}>
              <p className="text-green-200 text-[10px] font-black uppercase tracking-widest mb-2">Stars Earned</p>
              <p className="font-baloo font-black text-[52px] text-white leading-none">+{STARS_AWARD}</p>
              <div className="flex justify-center gap-1 mt-2">
                {Array.from({ length: STARS_AWARD }).map((_, i) => (
                  <motion.span key={i} className="text-[22px]"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 300 }}>
                    ⭐
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Nimi feedback */}
            <div className="p-4 rounded-2xl" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
              <p className="text-[14px] font-nunito leading-relaxed" style={{ color: "#166534" }}>
                💬 {feedback.praise}
              </p>
              {feedback.color_fact && (
                <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                  <p className="text-[12px] font-nunito" style={{ color: "#78350F" }}>
                    🎨 <strong>Colour fact:</strong> {feedback.color_fact}
                  </p>
                </div>
              )}
              <p className="text-[12px] font-bold mt-2" style={{ color: "#15803D" }}>
                {feedback.invite_more}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleReset}
                className="flex-1 py-3 rounded-2xl font-black text-[14px] text-white hover:opacity-90 transition"
                style={{ background: G }}>
                🎨 Color Another Page
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
