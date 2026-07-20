"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, CheckCircle2, Circle, Star, Sparkles,
} from "lucide-react";
import supabase from "@/lib/supabaseClient";
import type { StorySlot } from "@/lib/story-types";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Assignment {
  assignment_id: string;
  title: string;
  instructions: string | null;
  story_id: string | null;
  story_title: string | null;
  story_slug: string | null;
  due_date: string | null;
  completed_at: string | null;
  teacher_name: string;
  class_name: string | null;
}

interface MissionCard extends Assignment {
  slots: StorySlot[];
  slotsLoaded: boolean;
  slotsError: boolean;
}

interface Props {
  childId: string;
  language: string;
}

/* ─── Constants ─────────────────────────────────────────────────── */
const SLOT_META: Record<string, { emoji: string; label: string }> = {
  flipflop_audio: { emoji: "🎧", label: "Listen" },
  story_pdf:      { emoji: "📖", label: "Read" },
  coloring:       { emoji: "🎨", label: "Color" },
  move_explore:   { emoji: "🤸", label: "Move" },
  sing_along:     { emoji: "🎵", label: "Sing" },
  bonus_video:    { emoji: "🎬", label: "Watch" },
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function dueLabel(due: string | null): string | null {
  if (!due) return null;
  const diff = Math.round((new Date(due).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return `${Math.abs(diff)}d ago — finish soon`;
  if (diff === 0) return "Finish today!";
  if (diff === 1) return "Finish tomorrow";
  return `By ${new Date(due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/* ─── Slot shimmer ───────────────────────────────────────────────── */
function SlotSkeleton() {
  return (
    <div className="px-4 py-3 space-y-0.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-4 h-4 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="w-5 h-4 rounded bg-gray-100 animate-pulse" />
          <div
            className="h-3 rounded bg-gray-100 animate-pulse"
            style={{ width: `${55 + (i % 3) * 20}px`, animationDelay: `${i * 80}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Story mission card ─────────────────────────────────────────── */
function MissionAdventureCard({
  card, childId, language, onCompleted, onRetry,
}: {
  card: MissionCard;
  childId: string;
  language: string;
  onCompleted: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const MAX_COMPLETE_RETRIES = 3;
  const [open, setOpen]           = useState(true);
  const [autoFired, setAutoFired] = useState(false);
  const [retryKey, setRetryKey]   = useState(0);
  const [completeError, setCompleteError] = useState(false);
  const autoFiredRef              = useRef(false);

  const slots     = card.slots;
  const doneCount = slots.filter(s => s.completed).length;
  const total     = slots.length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone   = card.slotsLoaded && total > 0 && doneCount === total;
  const done      = !!card.completed_at;
  const nextSlot  = slots.find(s => !s.completed);
  const due       = dueLabel(card.due_date);

  // Auto-mark complete the moment all slots are done — no button needed
  useEffect(() => {
    if (!allDone || done || autoFiredRef.current) return;
    if (retryKey >= MAX_COMPLETE_RETRIES) { setCompleteError(true); return; }
    autoFiredRef.current = true;
    setAutoFired(true);
    void (async () => {
      const { error } = await supabase.rpc("mark_assignment_complete", {
        p_assignment_id: card.assignment_id,
        p_child_id: childId,
      });
      if (error) {
        console.error("[mark_assignment_complete]", error);
        autoFiredRef.current = false;
        setAutoFired(false);
        setRetryKey(k => k + 1);
        return;
      }
      onCompleted(card.assignment_id);
    })();
  }, [allDone, done, card.assignment_id, childId, onCompleted, retryKey]);

  // Slim "done" row once the server confirms completion
  if (done && !allDone) {
    return (
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: "#f0fdf4", borderRadius: "14px 14px 14px 4px", border: "1px solid #bbf7d0" }}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
        <div className="flex-1 min-w-0">
          <p className="font-nunito font-bold text-[12px] text-emerald-700 line-through truncate">
            {card.story_title ?? card.title}
          </p>
          <p className="font-nunito text-[10px] text-emerald-600">Adventure complete!</p>
        </div>
        <span className="text-[18px]">⭐</span>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden"
      style={{ borderRadius: "18px 18px 18px 5px", border: "1.5px solid #bbf7d0", background: "#fff" }}
    >
      {/* Header — always visible, tap to collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
        style={{ background: "linear-gradient(135deg, #15803d 0%, #166534 100%)" }}
      >
        <div className="px-4 pt-4 pb-3">

          {/* Teacher badge + due date */}
          <div className="flex items-center gap-1.5 mb-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span className="font-nunito font-bold text-[10px] text-white">
                {card.class_name ?? card.teacher_name}
              </span>
            </div>
            {due && (
              <span className="font-nunito text-[10px] text-white/70 ml-auto">{due}</span>
            )}
          </div>

          {/* Story title + collapse arrow */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              <p
                className="font-baloo font-black text-white leading-tight"
                style={{ fontSize: "clamp(15px, 4vw, 18px)" }}
              >
                {card.story_title ?? card.title}
              </p>
              {card.instructions && (
                <p className="font-nunito text-white/70 text-[11px] mt-0.5 line-clamp-1">
                  {card.instructions}
                </p>
              )}
            </div>
            <div
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              {open
                ? <ChevronUp   className="w-3.5 h-3.5 text-white" />
                : <ChevronDown className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.20)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: allDone ? "#fde68a" : "#86efac" }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-nunito text-[10px] text-white/70">
                {card.slotsLoaded ? `${doneCount} of ${total} missions` : "Loading…"}
              </span>
              <span className="font-baloo font-black text-white text-[12px]">{pct}%</span>
            </div>
          </div>
        </div>
      </button>

      {/* Body — collapsible */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Slot list, shimmer, or error */}
            {!card.slotsLoaded ? (
              <SlotSkeleton />
            ) : card.slotsError ? (
              <div className="px-4 py-3">
                <button
                  onClick={() => onRetry(card.assignment_id)}
                  className="w-full flex items-center justify-center gap-2 py-3 font-nunito font-bold text-[12px] text-gray-500 transition-colors hover:text-gray-700"
                  style={{ background: "#f9fafb", borderRadius: "12px 12px 12px 3px", border: "1px solid #E5E7EB" }}
                >
                  <span>⚠️</span> Couldn't load missions · Tap to retry
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-0.5">
                {slots.map((sl, i) => {
                  const meta   = SLOT_META[sl.slot_key] ?? { emoji: "📌", label: sl.slot_key };
                  const isNext = sl.slot_key === nextSlot?.slot_key;

                  return (
                    <motion.div
                      key={sl.slot_key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{
                        background: sl.completed ? "#f0fdf4" : isNext ? "#fefce8" : "transparent",
                      }}
                    >
                      {sl.completed
                        ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        : <Circle className={`w-4 h-4 shrink-0 ${isNext ? "text-amber-400" : "text-gray-200"}`} />}

                      <span className="text-[15px]">{meta.emoji}</span>

                      <span
                        className={`font-nunito font-bold text-[13px] flex-1 ${
                          sl.completed ? "text-emerald-700 line-through" : isNext ? "text-amber-700" : "text-gray-400"
                        }`}
                      >
                        {meta.label}
                      </span>

                      {sl.completed && (
                        <span className="flex items-center gap-0.5 font-nunito font-bold text-[10px] text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {sl.stars}
                        </span>
                      )}

                      {isNext && (
                        <span
                          className="font-nunito font-bold text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "#fef3c7", color: "#b45309" }}
                        >
                          NEXT
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Footer CTA */}
            <div className="px-4 pb-4">
              {allDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={completeError
                    ? { background: "#fef2f2", border: "1px solid #fecaca" }
                    : { background: "#fef9c3", border: "1px solid #fde68a" }}
                >
                  <span className="text-[22px]">{completeError ? "😬" : "🎉"}</span>
                  <div>
                    <p className={`font-baloo font-black text-[13px] ${completeError ? "text-red-700" : "text-amber-700"}`}>
                      {completeError ? "Couldn't save progress" : autoFired ? "Saved! Mission complete!" : "All missions done!"}
                    </p>
                    <p className={`font-nunito text-[11px] mt-0.5 ${completeError ? "text-red-500" : "text-amber-600"}`}>
                      {completeError ? "Check your connection and reopen the app." : "Your teacher can see your progress."}
                    </p>
                  </div>
                </motion.div>
              ) : card.story_slug ? (
                <Link
                  href={`/stories/${card.story_slug}`}
                  className="flex items-center justify-center gap-2 w-full font-nunito font-bold text-[13px] text-white py-3 transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "#15803d", borderRadius: "12px 12px 12px 3px" }}
                >
                  <span>{SLOT_META[nextSlot?.slot_key ?? ""]?.emoji ?? "▶"}</span>
                  Continue Adventure →
                </Link>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Simple task card (no story link) ──────────────────────────── */
function SimpleTaskCard({
  card, childId, onCompleted,
}: {
  card: Assignment;
  childId: string;
  onCompleted: (id: string) => void;
}) {
  const [marking, setMarking] = useState(false);
  const due = dueLabel(card.due_date);

  if (card.completed_at) {
    return (
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: "#f9fafb", borderRadius: "14px 14px 14px 4px", border: "1px solid #E5E7EB" }}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
        <p className="font-nunito text-[12px] flex-1 line-through text-gray-400">{card.title}</p>
      </div>
    );
  }

  async function markDone() {
    setMarking(true);
    await supabase.rpc("mark_assignment_complete", {
      p_assignment_id: card.assignment_id,
      p_child_id: childId,
    });
    setMarking(false);
    onCompleted(card.assignment_id);
  }

  return (
    <div
      className="p-3.5"
      style={{ background: "#F0FDF4", border: "1px solid #bbf7d0", borderRadius: "14px 14px 14px 4px" }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-nunito font-bold text-[13px] flex-1 text-gray-900">{card.title}</p>
        {due && <span className="font-nunito text-[10px] text-emerald-600 shrink-0">{due}</span>}
      </div>
      {card.instructions && (
        <p className="font-nunito text-[12px] text-gray-500 mb-2.5">{card.instructions}</p>
      )}
      <button
        onClick={markDone}
        disabled={marking}
        className="flex items-center gap-1.5 font-nunito font-bold text-[12px] px-3 py-2 transition-all disabled:opacity-50"
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "10px 10px 10px 3px",
          color: "#6B7280",
        }}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {marking ? "Saving…" : "Mark done"}
      </button>
    </div>
  );
}

/* ─── Panel skeleton (initial load) ─────────────────────────────── */
function PanelSkeleton() {
  return (
    <div
      className="p-4 space-y-3"
      style={{ background: "#fff", borderRadius: "20px 20px 20px 5px", border: "1px solid #E5E7EB" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[14px_14px_14px_4px] bg-gray-100 animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse" />
          <div className="h-2.5 w-24 rounded bg-gray-100 animate-pulse" />
        </div>
      </div>
      <div className="h-24 rounded-[18px_18px_18px_5px] bg-gray-100 animate-pulse" />
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────── */
function NoMissionsCard() {
  return (
    <div
      className="px-5 py-6 flex flex-col items-center text-center gap-2"
      style={{ background: "#F0FDF4", borderRadius: "18px 18px 18px 5px", border: "1px dashed #bbf7d0" }}
    >
      <span className="text-[28px]">🌱</span>
      <p className="font-baloo font-black text-[14px] text-emerald-700">No missions yet</p>
      <p className="font-nunito text-[12px] text-gray-400 max-w-[200px]">
        Your teacher will send class adventures here.
      </p>
    </div>
  );
}

/* ─── Main panel ─────────────────────────────────────────────────── */
export default function HomeAssignmentsPanel({ childId, language }: Props) {
  const [cards,   setCards]   = useState<MissionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(true);

  async function fetchSlots(assignment: Assignment): Promise<MissionCard> {
    if (!assignment.story_id) return { ...assignment, slots: [], slotsLoaded: true, slotsError: false };
    const { data, error } = await supabase.rpc("get_story_slots", {
      p_child_id: childId,
      p_story_id: assignment.story_id,
      p_language: language,
    });
    return {
      ...assignment,
      slots:       error ? [] : (data ?? []) as StorySlot[],
      slotsLoaded: true,
      slotsError:  !!error || (!error && data === null),
    };
  }

  useEffect(() => {
    async function load() {
      const { data: raw } = await supabase.rpc("get_student_assignments", { p_child_id: childId });
      const assignments   = (raw ?? []) as Assignment[];

      // Render shells with shimmer immediately
      setCards(assignments.map(a => ({ ...a, slots: [], slotsLoaded: false, slotsError: false })));
      setLoading(false);

      // Fetch slot state for story missions in parallel
      const filled = await Promise.all(assignments.map(fetchSlots));
      setCards(filled);
    }
    void load();
  // fetchSlots is defined in render scope; listing childId/language covers its deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, language]);

  const handleCompleted = useCallback((assignmentId: string) => {
    setCards(prev =>
      prev.map(c =>
        c.assignment_id === assignmentId
          ? { ...c, completed_at: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const handleRetry = useCallback(async (assignmentId: string) => {
    const card = cards.find(c => c.assignment_id === assignmentId);
    if (!card) return;
    // Reset to shimmer state while retrying
    setCards(prev => prev.map(c =>
      c.assignment_id === assignmentId ? { ...c, slotsLoaded: false, slotsError: false } : c
    ));
    const updated = await fetchSlots(card);
    setCards(prev => prev.map(c => c.assignment_id === assignmentId ? updated : c));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, childId, language]);

  if (loading) return <PanelSkeleton />;

  const pending   = cards.filter(c => !c.completed_at);
  const completed = cards.filter(c =>  c.completed_at);

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "#fff",
        borderRadius: "var(--leaf-r, 20px 20px 20px 5px)",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* Panel header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center text-[16px]"
            style={{ background: "#F0FDF4", borderRadius: "14px 14px 14px 4px" }}
          >
            🌟
          </div>
          <div className="text-left">
            <p className="font-baloo font-black text-[14px] leading-none text-gray-900">
              Class Adventures
            </p>
            <p className="font-nunito text-[11px] mt-0.5 text-gray-400">
              {pending.length > 0
                ? `${pending.length} mission${pending.length !== 1 ? "s" : ""} in progress`
                : cards.length > 0
                  ? "All adventures complete! 🎉"
                  : "No missions yet"}
            </p>
          </div>
        </div>
        {open
          ? <ChevronUp   className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14 }}
            >
              {/* No assignments at all */}
              {cards.length === 0 && <NoMissionsCard />}

              {/* Active missions */}
              {pending.map(c =>
                c.story_id
                  ? <MissionAdventureCard key={c.assignment_id} card={c} childId={childId} language={language} onCompleted={handleCompleted} onRetry={handleRetry} />
                  : <SimpleTaskCard       key={c.assignment_id} card={c} childId={childId} onCompleted={handleCompleted} />
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div className="space-y-1.5">
                  {pending.length > 0 && (
                    <p className="font-nunito font-bold text-[10px] uppercase tracking-wider px-1 text-gray-400 pt-1">
                      Done
                    </p>
                  )}
                  {completed.map(c =>
                    c.story_id
                      ? <MissionAdventureCard key={c.assignment_id} card={c} childId={childId} language={language} onCompleted={handleCompleted} onRetry={handleRetry} />
                      : <SimpleTaskCard       key={c.assignment_id} card={c} childId={childId} onCompleted={handleCompleted} />
                  )}
                </div>
              )}

              {/* All-done celebration */}
              {cards.length > 0 && pending.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-5"
                >
                  <p className="text-[32px] mb-1">🏆</p>
                  <p className="font-baloo font-black text-[14px] text-emerald-700">Hero of the class!</p>
                  <p className="font-nunito text-[11px] text-gray-400 mt-0.5">All missions complete.</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
