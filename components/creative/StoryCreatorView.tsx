"use client";

/**
 * StoryCreatorView — Phase 7.3 (co-authorship update)
 *
 * Four-step wizard:
 *   configure → writing → generating → story
 *
 * The child picks a hero, setting, and problem, then writes the three
 * narrative turning points (discovery, heroic action, ending). Nimi
 * writes the connective paragraphs around the child's own words.
 * Paragraphs 2 and 4 are displayed with a "✍️ Your words" badge.
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authedFetch } from "@/lib/authedFetch";
import { claimChallengeReward, awardBadge } from "@/lib/queries";
import {
  STORY_SETTINGS, STORY_HEROES, STORY_PROBLEMS,
  type StorySetting, type StoryHero, type StoryProblem,
} from "@/lib/storyCreator";
import type { CreatedStory } from "@/lib/storyCreator";

const G = "var(--nimi-green,#15803D)";
const STARS_AWARD = 15;
const BADGE_SLUG  = "creative-story-creator";

// Indices (0-based) of paragraphs that are child-authored
const CHILD_PARA_INDICES = new Set([1, 3]);

interface Props {
  childId:       string;
  childName:     string;
  childAge:      number | null;
  childLanguage: "en" | "fr" | "rw";
  onStarsEarned?: (n: number) => void;
}

type Step = "configure" | "writing" | "generating" | "story";

// ── Option pill ────────────────────────────────────────────────────────────────
function OptionPill<T extends string>({
  value, selected, emoji, label, onClick,
}: { value: T; selected: boolean; emoji: string; label: string; onClick: (v: T) => void }) {
  return (
    <motion.button whileTap={{ scale: 0.95 }}
      onClick={() => onClick(value)}
      className="flex items-center gap-2 px-3.5 py-2 rounded-full border-2 text-[12px] font-bold transition-all"
      style={{
        borderColor: selected ? G        : "#E5E7EB",
        background:  selected ? "#F0FDF4": "white",
        color:       selected ? G        : "#374151",
      }}>
      <span>{emoji}</span> {label}
    </motion.button>
  );
}

// ── Writing prompt textarea ────────────────────────────────────────────────────
function WritingPrompt({
  index, label, hint, placeholder, value, onChange,
}: {
  index: number; label: string; hint: string; placeholder: string;
  value: string; onChange: (v: string) => void;
}) {
  const colors = ["#7C3AED","#EA580C","#0EA5E9"] as const;
  const bgs    = ["#F5F3FF","#FFF7ED","#F0F9FF"] as const;
  const color  = colors[index];
  const bg     = bgs[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex flex-col gap-2 p-4 rounded-2xl border-2"
      style={{ borderColor: value.trim().length >= 5 ? color : "#E5E7EB", background: bg }}>
      <div className="flex items-baseline gap-2">
        <span className="font-black text-[11px] uppercase tracking-widest"
          style={{ color }}>
          Your part {index + 1}
        </span>
        <span className="font-nunito text-[11px]" style={{ color: "#9CA3AF" }}>
          {hint}
        </span>
      </div>
      <p className="font-bold text-[13px]" style={{ color: "#374151" }}>
        {label}
      </p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={300}
        rows={3}
        className="w-full text-[13px] font-nunito px-3 py-2.5 rounded-xl border resize-none focus:outline-none focus:ring-2"
        style={{
          borderColor: "#D1D5DB",
          background: "white",
          color: "#111827",
          lineHeight: "1.6",
        } as React.CSSProperties}
      />
      {value.trim().length >= 5 && (
        <p className="text-[10px] font-bold" style={{ color }}>
          ✓ Great! Nimi will use your words.
        </p>
      )}
    </motion.div>
  );
}

// ── Print helper ───────────────────────────────────────────────────────────────
function printStory(story: CreatedStory, authorName: string) {
  const paragraphs = story.paragraphs.map((p, i) => {
    const isChild = CHILD_PARA_INDICES.has(i);
    return `<div class="para${isChild ? " child-para" : ""}">
      <span class="emoji">${p.emoji}</span>
      <div><p>${p.text}</p>${isChild ? `<small class="badge">✍️ Written by ${authorName}</small>` : ""}</div>
    </div>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${story.title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Georgia',serif;max-width:640px;margin:40px auto;padding:24px;color:#111827;line-height:1.7}
  h1{font-size:26px;font-weight:900;margin-bottom:6px;color:#15803D}
  .author{font-size:12px;color:#6B7280;margin-bottom:32px}
  .para{margin-bottom:24px;display:flex;gap:16px;align-items:flex-start}
  .child-para{background:#F0FDF4;border-radius:12px;padding:12px;border:1px solid #BBF7D0}
  .emoji{font-size:32px;line-height:1;margin-top:4px;flex-shrink:0}
  p{font-size:14px;line-height:1.8}
  .badge{font-size:10px;color:#166534;font-weight:700;margin-top:4px;display:block}
  .moral{margin-top:32px;padding:16px;border-radius:12px;background:#F0FDF4;border:1px solid #BBF7D0;font-size:13px;color:#166534;font-style:italic}
  .footer{margin-top:24px;font-size:11px;color:#9CA3AF;text-align:center}
  @media print{body{margin:0}}
</style></head><body>
<h1>${story.title}</h1>
<p class="author">✍️ ${story.author_note} · Written with Nimi</p>
${paragraphs}
${story.moral ? `<div class="moral">📌 <strong>Lesson:</strong> ${story.moral}</div>` : ""}
<div class="footer">Created with NIMIPIKO Creative Studio · ${new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}</div>
<script>window.onload=()=>window.print()<\/script>
</body></html>`;
  const w = window.open("", "_blank", "width=680,height=820");
  if (w) { w.document.write(html); w.document.close(); }
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StoryCreatorView({
  childId, childName, childAge, childLanguage, onStarsEarned,
}: Props) {
  const [step,     setStep]     = useState<Step>("configure");
  const [heroName, setHeroName] = useState("");
  const [heroType, setHeroType] = useState<StoryHero>("child");
  const [setting,  setSetting]  = useState<StorySetting>("forest");
  const [problem,  setProblem]  = useState<StoryProblem>("friend");
  const [moments,  setMoments]  = useState<[string, string, string]>(["", "", ""]);
  const [story,    setStory]    = useState<CreatedStory | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [reading,  setReading]  = useState(false);
  const utterRef                = useRef<SpeechSynthesisUtterance | null>(null);

  const ageRange: "5-7" | "8-10" | "11+" =
    childAge == null ? "8-10" :
    childAge <= 7    ? "5-7"  :
    childAge <= 10   ? "8-10" : "11+";

  // Personalized writing prompts built from the child's choices
  const settingLabel  = STORY_SETTINGS.find(s => s.id === setting)?.label  ?? setting;
  const problemLabel  = STORY_PROBLEMS.find(p => p.id === problem)?.label  ?? problem;

  const writingPrompts: { label: string; hint: string; placeholder: string }[] = [
    {
      label:       `What does ${heroName || "your hero"} see or find when they arrive at ${settingLabel}? 👀`,
      hint:        "discovery",
      placeholder: ageRange === "5-7"
        ? "e.g. They saw a big shiny thing…"
        : "e.g. As soon as they arrived, they noticed something glowing between the trees…",
    },
    {
      label:       `How does ${heroName || "your hero"} face the challenge of "${problemLabel}"? What do they do? 💪`,
      hint:        "heroic action",
      placeholder: ageRange === "5-7"
        ? "e.g. They were brave and they…"
        : "e.g. Without hesitating, they reached out and…",
    },
    {
      label:       `How does the story end? How does ${heroName || "your hero"} feel? 🌟`,
      hint:        "your ending",
      placeholder: ageRange === "5-7"
        ? "e.g. Everyone was happy and…"
        : "e.g. Looking back at everything that had happened, they smiled because…",
    },
  ];

  const setMoment = (i: number, val: string) =>
    setMoments(prev => { const n = [...prev] as [string, string, string]; n[i] = val; return n; });

  const allMomentsReady = moments.every(m => m.trim().length >= 5);

  const handleGenerate = useCallback(async () => {
    if (!heroName.trim() || !allMomentsReady) return;
    setStep("generating");
    setError(null);

    try {
      const res = await authedFetch("/api/story-creator", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroName: heroName.trim(),
          heroType, setting, problem,
          language:     childLanguage,
          ageRange,
          childName,
          childMoments: moments,
        }),
      });
      if (!res.ok) throw new Error("Story generation failed");
      const s = await res.json() as CreatedStory;
      setStory(s);
      setStep("story");

      await Promise.all([
        claimChallengeReward(
          childId, childLanguage,
          `story-creator-${new Date().toISOString().slice(0, 10)}`,
          STARS_AWARD,
        ),
        awardBadge(childId, childLanguage, BADGE_SLUG),
      ]);
      onStarsEarned?.(STARS_AWARD);
    } catch {
      setError("Couldn't create the story. Please try again.");
      setStep("writing");
    }
  }, [heroName, heroType, setting, problem, childLanguage, ageRange, childName, childId, moments, allMomentsReady, onStarsEarned]);

  const handleRead = useCallback(() => {
    if (!story) return;
    if (reading) {
      window.speechSynthesis.cancel();
      setReading(false);
      return;
    }
    const fullText = story.paragraphs.map(p => p.text).join(". ");
    const utt = new SpeechSynthesisUtterance(fullText);
    utt.lang = childLanguage === "fr" ? "fr-FR" : "en-US";
    utt.onend = () => setReading(false);
    utterRef.current = utt;
    window.speechSynthesis.speak(utt);
    setReading(true);
  }, [story, reading, childLanguage]);

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setReading(false);
    setStep("configure");
    setStory(null);
    setHeroName("");
    setMoments(["", "", ""]);
    setError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">

      <div>
        <p className="font-black text-[20px]" style={{ color: "var(--ds-text-primary,#111827)" }}>
          📖 Story Creator
        </p>
        <p className="text-[12px] font-nunito" style={{ color: "#6B7280" }}>
          You write the key moments — Nimi connects them into your story!
        </p>
      </div>

      {/* Step indicator */}
      {step !== "story" && (
        <div className="flex items-center gap-1.5">
          {(["configure","writing","generating"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: step === s ? G : (
                    ["configure","writing","generating"].indexOf(step) > i ? G : "#D1D5DB"
                  ),
                  opacity: step === s ? 1 : (["configure","writing","generating"].indexOf(step) > i ? 0.4 : 1),
                }}
              />
              {i < 2 && <div className="w-4 h-px" style={{ background: "#E5E7EB" }} />}
            </div>
          ))}
          <span className="ml-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>
            {step === "configure" ? "Set up" : step === "writing" ? "Your part" : "Generating…"}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── CONFIGURE ── */}
        {step === "configure" && (
          <motion.div key="configure" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex flex-col gap-5">

            {/* Hero name */}
            <div>
              <label className="block font-black text-[12px] uppercase tracking-widest mb-2" style={{ color: "#374151" }}>
                1. Your hero&apos;s name
              </label>
              <input
                type="text"
                value={heroName}
                onChange={e => setHeroName(e.target.value)}
                placeholder="e.g. Amara, Kwame, Luna…"
                maxLength={40}
                className="w-full text-[15px] font-bold px-4 py-3 rounded-2xl border focus:outline-none focus:ring-2"
                style={{ borderColor: "#D1D5DB", color: "#111827", background: "#FAFAFA" } as React.CSSProperties}
              />
            </div>

            {/* Hero type */}
            <div>
              <label className="block font-black text-[12px] uppercase tracking-widest mb-2" style={{ color: "#374151" }}>
                2. What kind of hero?
              </label>
              <div className="flex flex-wrap gap-2">
                {STORY_HEROES.map(h => (
                  <OptionPill key={h.id} value={h.id} selected={heroType === h.id}
                    emoji={h.emoji} label={h.label}
                    onClick={(v) => setHeroType(v as StoryHero)} />
                ))}
              </div>
            </div>

            {/* Setting */}
            <div>
              <label className="block font-black text-[12px] uppercase tracking-widest mb-2" style={{ color: "#374151" }}>
                3. Where does the story happen?
              </label>
              <div className="flex flex-wrap gap-2">
                {STORY_SETTINGS.map(s => (
                  <OptionPill key={s.id} value={s.id} selected={setting === s.id}
                    emoji={s.emoji} label={s.label}
                    onClick={(v) => setSetting(v as StorySetting)} />
                ))}
              </div>
            </div>

            {/* Problem */}
            <div>
              <label className="block font-black text-[12px] uppercase tracking-widest mb-2" style={{ color: "#374151" }}>
                4. What happens in the adventure?
              </label>
              <div className="flex flex-wrap gap-2">
                {STORY_PROBLEMS.map(p => (
                  <OptionPill key={p.id} value={p.id} selected={problem === p.id}
                    emoji={p.emoji} label={p.label}
                    onClick={(v) => setProblem(v as StoryProblem)} />
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("writing")}
              disabled={!heroName.trim()}
              className="w-full py-3.5 rounded-2xl font-black text-[15px] text-white hover:opacity-90 transition disabled:opacity-30"
              style={{ background: G }}>
              Next: Write your story moments →
            </button>
          </motion.div>
        )}

        {/* ── WRITING ── */}
        {step === "writing" && (
          <motion.div key="writing" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex flex-col gap-4">

            {/* Intro callout */}
            <div className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
              <span className="text-[24px] shrink-0">✍️</span>
              <div>
                <p className="font-black text-[13px]" style={{ color: "#166534" }}>
                  Now it&apos;s your turn, {childName}!
                </p>
                <p className="text-[12px] font-nunito" style={{ color: "#15803D" }}>
                  Write the 3 most important moments. Nimi will build the story around your words.
                </p>
              </div>
            </div>

            {writingPrompts.map((wp, i) => (
              <WritingPrompt
                key={i}
                index={i}
                label={wp.label}
                hint={wp.hint}
                placeholder={wp.placeholder}
                value={moments[i]}
                onChange={v => setMoment(i, v)}
              />
            ))}

            {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("configure")}
                className="py-3 px-5 rounded-2xl font-black text-[13px] border-2 hover:bg-gray-50 transition"
                style={{ borderColor: "#D1D5DB", color: "#6B7280" }}>
                ← Back
              </button>
              <button
                onClick={() => void handleGenerate()}
                disabled={!allMomentsReady}
                className="flex-1 py-3.5 rounded-2xl font-black text-[15px] text-white hover:opacity-90 transition disabled:opacity-30"
                style={{ background: G }}>
                ✨ Create Our Story!
              </button>
            </div>

            {!allMomentsReady && (
              <p className="text-center text-[11px] font-nunito" style={{ color: "#9CA3AF" }}>
                Fill in all 3 moments to continue ({moments.filter(m => m.trim().length >= 5).length}/3 done)
              </p>
            )}
          </motion.div>
        )}

        {/* ── GENERATING ── */}
        {step === "generating" && (
          <motion.div key="generating" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex flex-col items-center gap-4 py-16">
            <div className="text-[60px] animate-bounce">📖</div>
            <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${G} transparent transparent transparent` }} />
            <p className="font-black text-[16px]" style={{ color: G }}>
              Nimi is weaving your story…
            </p>
            <p className="text-[12px] font-nunito" style={{ color: "#9CA3AF" }}>
              Connecting your words into a full adventure — about 15 seconds
            </p>
          </motion.div>
        )}

        {/* ── STORY ── */}
        {step === "story" && story && (
          <motion.div key="story" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="flex flex-col gap-4">

            {/* Stars earned banner */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: "#FEF9C3", border: "1px solid #FDE047" }}>
              <span className="text-[24px]">🌟</span>
              <div>
                <p className="font-black text-[13px]" style={{ color: "#713F12" }}>
                  +{STARS_AWARD} stars earned! You&apos;re a real author, {childName}!
                </p>
                <p className="text-[11px] font-nunito" style={{ color: "#92400E" }}>
                  Story Creator badge unlocked! Your words are in the story.
                </p>
              </div>
            </motion.div>

            {/* Authorship legend */}
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#15803D" }} />
                <span className="text-[10px] font-bold" style={{ color: "#6B7280" }}>Nimi&apos;s paragraphs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#7C3AED" }} />
                <span className="text-[10px] font-bold" style={{ color: "#6B7280" }}>Your words ✍️</span>
              </div>
            </div>

            {/* Story card */}
            <div className="p-5 sm:p-6 rounded-3xl" style={{ background: "#FAFAFA", border: "1px solid #E5E7EB" }}>
              {/* Title */}
              <h2 className="font-baloo font-black text-[22px] sm:text-[26px] leading-tight mb-1"
                style={{ color: "#111827" }}>
                {story.title}
              </h2>
              <p className="text-[11px] font-nunito mb-5" style={{ color: "#9CA3AF" }}>
                ✍️ {story.author_note} · Co-written with Nimi
              </p>

              {/* Paragraphs */}
              <div className="space-y-4">
                {story.paragraphs.map((para, i) => {
                  const isChild = CHILD_PARA_INDICES.has(i);
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className={`flex gap-4 items-start rounded-2xl transition-all ${isChild ? "p-3" : ""}`}
                      style={isChild ? {
                        background: "#F5F3FF",
                        border: "1px solid #DDD6FE",
                      } : {}}>
                      <span className="text-[32px] sm:text-[36px] leading-none shrink-0 mt-1 select-none">
                        {para.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        {isChild && (
                          <span className="inline-flex items-center gap-1 mb-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: "#EDE9FE", color: "#6D28D9" }}>
                            ✍️ {childName}&apos;s words
                          </span>
                        )}
                        <p className="font-nunito text-[14px] sm:text-[15px] leading-relaxed"
                          style={{ color: isChild ? "#4C1D95" : "#374151", fontStyle: isChild ? "italic" : "normal" }}>
                          {para.text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Moral */}
              {story.moral && (
                <div className="mt-5 p-3.5 rounded-2xl" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                  <p className="text-[12px] font-bold" style={{ color: "#166534" }}>
                    📌 <em>{story.moral}</em>
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleRead}
                className="flex-1 py-2.5 rounded-2xl font-black text-[13px] border-2 hover:bg-gray-50 transition"
                style={{ borderColor: reading ? "#EF4444" : G, color: reading ? "#EF4444" : G }}>
                {reading ? "⏹ Stop" : "🔊 Read Aloud"}
              </button>
              <button onClick={() => printStory(story, childName)}
                className="flex-1 py-2.5 rounded-2xl font-black text-[13px] border-2 hover:bg-gray-50 transition"
                style={{ borderColor: "#6B7280", color: "#6B7280" }}>
                🖨️ Print Story
              </button>
              <button onClick={handleReset}
                className="w-full py-2.5 rounded-2xl font-black text-[13px] text-white hover:opacity-90 transition"
                style={{ background: G }}>
                ✨ Write Another Story
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
