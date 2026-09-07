"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStorageUrl } from "@/lib/queries";
import type { StoryLibraryItem } from "@/lib/story-types";

interface Props {
  stories:  StoryLibraryItem[];
  curStory: StoryLibraryItem | null | undefined;
}

const MAX_VISIBLE = 7;

export default function HomeJourneyMapPanel({ stories, curStory }: Props) {
  const [showInfo, setShowInfo] = useState(false);

  if (!stories.length) return null;

  const visible = stories.slice(0, MAX_VISIBLE);

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0D1E3A, #0A1828)", border: "1px solid rgba(201,168,76,0.22)" }}
    >
      {/* Gold top bar */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #C9A84C, #F5C842, #C9A84C)" }} />

      {/* Faint scattered stars/pin-dots behind the route — a plain continent silhouette at this
          size read as smudges rather than a map, so this stays intentionally abstract instead
          of pretending to be geography. */}
      <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.10]">
        <g fill="#F0E8D4">
          {[[24,24,1.6],[70,60,1],[130,20,1.3],[180,70,1],[230,30,1.6],[280,65,1],[330,22,1.3],[370,55,1],
            [40,110,1],[95,140,1.4],[150,115,1],[200,150,1.3],[255,120,1],[305,145,1.4],[355,115,1],
            [65,175,1],[160,180,1.3],[260,175,1],[340,180,1.2]].map(([x,y,r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      </svg>

      <div className="relative px-4 py-3.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">✈️</span>
            <div>
              <p className="font-baloo font-black text-sm leading-tight" style={{ color: "#F0E8D4" }}>
                My Journey
              </p>
              <p className="font-nunito text-[10px]" style={{ color: "rgba(240,232,212,0.38)" }}>
                Your adventure map
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              aria-expanded={showInfo}
              className="font-baloo font-bold text-[9px] px-2.5 py-1 rounded-lg hover:opacity-80 transition"
              style={{ background: "rgba(201,168,76,0.10)", color: "#E8BC56", border: "1px solid rgba(201,168,76,0.20)" }}
            >
              ⓘ How it works
            </button>
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 rounded-2xl p-3 text-left shadow-2xl"
                  style={{ background: "#0D1E3A", border: "1px solid rgba(201,168,76,0.35)" }}
                >
                  <p className="font-nunito text-[11px] leading-snug" style={{ color: "#F0E8D4" }}>
                    ✨ Collect stars and complete missions to unlock new destinations on your map!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Destination nodes — a winding path, not a flat row. Nodes alternate between a
            raised and lowered row (matching the reference's zigzag), with a dashed wave
            drawn behind them so it reads as one continuous route. */}
        <div className="relative overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <svg
            aria-hidden
            viewBox={`0 0 ${Math.max(visible.length, 1) * 74} 90`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-3 h-[64px] w-full"
          >
            <path
              d={visible.map((_, i) => {
                const x = 37 + i * 74;
                const y = i % 2 === 0 ? 62 : 18;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ")}
              fill="none"
              stroke="#C9A84C"
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeDasharray="1 7"
              strokeLinecap="round"
            />
          </svg>

          <div className="relative flex items-start gap-[22px]">
            {visible.map((story, idx) => {
              const isCurrent = story.sid === curStory?.sid;
              const isLocked  = !story.unlocked;
              const pct       = Math.round((story.progress ?? 0) * 100);
              const href      = isLocked ? "/pricing" : `/stories/${story.slug}`;
              const raised    = idx % 2 === 1;
              const shortTitle = (story.title ?? `Book ${idx + 1}`)
                .replace(/^(Nimi|Piko|Zilo)\s+/i, "")
                .split(" ")
                .slice(0, 2)
                .join(" ");

              return (
                <Link
                  key={story.sid}
                  href={href}
                  className="relative flex shrink-0 flex-col items-center gap-1"
                  style={{ width: 52, marginTop: raised ? 0 : 44 }}
                >
                  {/* Node circle */}
                  <motion.div
                    whileHover={{ scale: isLocked ? 1 : 1.06 }}
                    className="relative w-[52px] h-[52px] rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{
                      background: isLocked ? "rgba(255,255,255,0.03)" : "rgba(201,168,76,0.07)",
                      border:     isCurrent
                        ? "2px solid #F5C842"
                        : story.complete
                        ? "1.5px solid rgba(201,168,76,0.50)"
                        : "1px solid rgba(255,255,255,0.10)",
                      opacity: isLocked ? 0.45 : 1,
                      boxShadow: isCurrent ? "0 0 14px rgba(245,200,66,0.30)" : "none",
                    }}
                  >
                    {isLocked ? (
                      <span className="text-xl">🔒</span>
                    ) : story.cover_url ? (
                      <img src={getStorageUrl(story.cover_url)} alt={story.title ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{story.theme_emoji ?? "📚"}</span>
                    )}

                    {/* Complete overlay */}
                    {story.complete && !isLocked && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(201,168,76,0.25)" }}
                      >
                        <span className="text-lg leading-none">✅</span>
                      </div>
                    )}

                    {/* In-progress ring pulse */}
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ border: "2px solid #F5C842" }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                    )}
                  </motion.div>

                  {/* Label */}
                  <div className="text-center" style={{ width: 52 }}>
                    <p
                      className="font-baloo font-black text-[9px] leading-tight truncate"
                      style={{ color: isLocked ? "rgba(240,232,212,0.22)" : "#F0E8D4" }}
                    >
                      {shortTitle || `Book ${idx + 1}`}
                    </p>
                    <p
                      className="font-nunito text-[8px] mt-0.5"
                      style={{
                        color: isCurrent
                          ? "#E8BC56"
                          : story.complete
                          ? "rgba(201,168,76,0.60)"
                          : "rgba(240,232,212,0.28)",
                      }}
                    >
                      {isLocked
                        ? "🔒"
                        : story.complete
                        ? "Done ✓"
                        : pct > 0
                        ? `${pct}%`
                        : `Book ${idx + 1}`}
                    </p>
                  </div>
                </Link>
              );
            })}

            {/* More indicator if stories > MAX_VISIBLE */}
            {stories.length > MAX_VISIBLE && (
              <Link
                href="/stories"
                className="flex shrink-0 flex-col items-center gap-1"
                style={{ width: 52, marginTop: visible.length % 2 === 1 ? 0 : 44 }}
              >
                <div
                  className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(201,168,76,0.06)", border: "1px dashed rgba(201,168,76,0.22)" }}
                >
                  <span className="font-baloo font-black text-xs" style={{ color: "rgba(240,232,212,0.38)" }}>
                    +{stories.length - MAX_VISIBLE}
                  </span>
                </div>
                <p className="font-nunito text-[8px]" style={{ color: "rgba(240,232,212,0.28)" }}>
                  more
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* Hint */}
        <p
          className="font-nunito text-[9px] mt-2.5 text-center"
          style={{ color: "rgba(240,232,212,0.25)" }}
        >
          ✨ Collect stars, complete missions and unlock new destinations!
        </p>
      </div>
    </div>
  );
}
