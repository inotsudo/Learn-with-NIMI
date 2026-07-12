"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";
import { PageSurface } from "@/components/layout/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChildren, getStorageUrl } from "@/lib/queries";
import supabase from "@/lib/supabaseClient";
import { SPRING } from "@/lib/design-system/motion";

const ACTIVE_CHILD_KEY = "nimipiko_active_child";

interface VocabWord {
  word: string;
  meaning: string;
  emoji?: string;
  audio_url?: string | null;
}

function FlipCard({ word, index }: { word: VocabWord; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const [played, setPlayed] = useState(false);

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!word.audio_url) return;
    const a = new Audio(getStorageUrl(word.audio_url));
    a.play().catch(() => {});
    setPlayed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING.card, delay: Math.min(index * 0.04, 0.4) }}
      className="cursor-pointer select-none"
      style={{ perspective: 800 }}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        style={{ transformStyle: "preserve-3d", position: "relative", minHeight: 140 }}
      >
        {/* Front — word + emoji */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-teal-200/60 bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex flex-col items-center justify-center gap-2 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.07)]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-4xl leading-none">{word.emoji ?? "📖"}</span>
          <p className="font-baloo font-black text-teal-800 text-[17px] text-center leading-tight">
            {word.word}
          </p>
          <p className="font-nunito text-teal-400 text-[10px] uppercase tracking-widest">tap to reveal</p>
        </div>

        {/* Back — meaning + audio */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex flex-col items-center justify-center gap-3 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.07)]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="font-baloo font-black text-violet-700 text-[15px] text-center leading-snug">
            {word.meaning}
          </p>
          {word.audio_url && (
            <button
              onClick={playAudio}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-black transition ${
                played
                  ? "bg-teal-500 text-white"
                  : "bg-teal-100 text-teal-600 hover:bg-teal-200"
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {played ? "Played!" : "Hear it"}
            </button>
          )}
          <p className="font-nunito text-violet-300 text-[10px] uppercase tracking-widest">tap to flip back</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function VocabPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "audio">("all");

  useEffect(() => {
    void (async () => {
      const list = await getChildren();
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CHILD_KEY) : null;
      const child = list.find(c => c.id === savedId) ?? list[0];
      if (!child) { setLoading(false); return; }

      // All completed mission IDs for this child+language
      const { data: progress } = await supabase
        .from("child_progress")
        .select("mission_id")
        .eq("child_id", child.id)
        .eq("language", child.language);

      const missionIds = (progress ?? []).map(p => p.mission_id);
      if (missionIds.length === 0) { setLoading(false); return; }

      // Fetch content_json for those missions (only those with vocabulary)
      const { data: missions } = await supabase
        .from("missions")
        .select("content_json")
        .in("id", missionIds);

      // Extract and deduplicate vocab words
      const seen = new Set<string>();
      const collected: VocabWord[] = [];
      for (const m of missions ?? []) {
        const vocab = (m.content_json as { vocabulary?: VocabWord[] })?.vocabulary;
        if (!Array.isArray(vocab)) continue;
        for (const v of vocab as VocabWord[]) {
          if (!v.word) continue;
          const key = v.word.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          collected.push(v);
        }
      }

      setWords(collected);
      setLoading(false);
    })();
  }, []);

  const filtered = words.filter(w => {
    if (filter === "audio" && !w.audio_url) return false;
    if (search) {
      const q = search.toLowerCase();
      return w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-28 space-y-3">
          <Bone className="h-10 w-full rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-32 leaf-lg" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSurface>
        <main className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-28 flex-1 w-full content-enter">

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <Link href="/user-profile" className="w-9 h-9 rounded-full bg-ds-surface border border-ds-border flex items-center justify-center text-ds-muted hover:bg-gray-100 transition shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-baloo font-black text-ds-text text-[22px] leading-tight">My Word Library 📚</h1>
              <p className="font-nunito text-ds-muted text-[12px]">
                {words.length === 0 ? "Complete missions to collect words" : `${words.length} word${words.length === 1 ? "" : "s"} collected`}
              </p>
            </div>
          </div>

          {words.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center gap-4 py-16 text-center"
            >
              <span className="text-6xl">📖</span>
              <p className="font-baloo font-black text-ds-text text-[20px]">No words yet!</p>
              <p className="font-nunito text-ds-muted text-[14px] max-w-xs">
                Finish story missions and new vocabulary words will appear here.
              </p>
              <Link href="/stories"
                className="mt-2 font-baloo font-black text-white px-6 py-2.5 rounded-full shadow-md text-[14px] transition"
                style={{ backgroundColor: "var(--nimi-green)" }}>
                Start a Story →
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Search + filter bar */}
              <div className="flex gap-2 mb-5">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ds-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search words…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-full border-2 border-ds-border bg-ds-surface text-ds-text font-nunito font-bold text-[13px] outline-none focus:border-teal-400 transition"
                  />
                </div>
                <button
                  onClick={() => setFilter(f => f === "all" ? "audio" : "all")}
                  className={`px-4 py-2.5 rounded-full border-2 font-nunito font-black text-[12px] transition shrink-0 ${
                    filter === "audio"
                      ? "bg-teal-500 border-teal-500 text-white"
                      : "bg-ds-surface border-ds-border text-ds-muted hover:border-teal-300"
                  }`}
                >
                  🔊 Audio only
                </button>
              </div>

              {filtered.length === 0 ? (
                <p className="text-center text-ds-muted font-nunito py-10">No words match your search.</p>
              ) : (
                <>
                  <p className="font-nunito text-ds-muted text-[11px] mb-3 text-center">
                    Tap a card to reveal the meaning
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filtered.map((w, i) => (
                      <FlipCard key={w.word} word={w} index={i} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </PageSurface>
    </AppShell>
  );
}
