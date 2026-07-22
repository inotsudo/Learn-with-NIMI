import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Per-language word + meaning for a vocabulary concept */
export interface VocabTranslation {
  word: string;
  meaning: string;
}

export interface VocabItem {
  word: string;
  meaning: string;
  emoji?: string;
  /**
   * Same vocabulary concept in the other two languages, keyed by language code.
   * Populated by positional matching across the three mission_versions rows.
   * Only present when the other language's version exists and is published.
   */
  translations: Partial<Record<"en" | "fr" | "rw", VocabTranslation>>;
}

export interface StoryPage {
  pageNumber: number;
  text: string;
}

export type SlotStatus = "completed" | "current" | "upcoming";

export interface SlotInfo {
  slotKey: string;
  sortOrder: number;
  missionId: string;
  status: SlotStatus;
}

export interface StoryKnowledge {
  storyId: string;
  slug: string;
  language: string;
  /** Localized title from story_versions, falls back to stories.title */
  title: string;
  themeEmoji: string | null;
  themeTitle: string | null;
  ageMin: number | null;
  ageMax: number | null;
  isFree: boolean;
  /** Localized description/summary from story_versions */
  description: string | null;
  /** Story page text in the requested language, budget-capped */
  pages: StoryPage[];
  /** Vocabulary from completed + current slots only */
  vocabularyLearned: VocabItem[];
  /** Vocabulary from the current (in-progress) slot */
  vocabularyCurrent: VocabItem[];
  /** All slots with completion status */
  slots: SlotInfo[];
  /** Number of completed slots (DB-derived when childId provided, else 0) */
  completedSlotCount: number;
}

// ── Token budget constants ─────────────────────────────────────────────────────
// Target: knowledge block ≤ 600 tokens total (≈ 4 chars/token for English).
// This leaves ample room for Nimi's personality section in the system prompt.

const DESCRIPTION_MAX_CHARS  = 280;   //  ~70 tokens
const PAGE_TEXT_MAX_CHARS    = 1500;  // ~375 tokens
const VOCAB_LEARNED_MAX      = 20;    //  ~80 tokens (word + meaning per line)
const VOCAB_CURRENT_MAX      = 6;     //  ~24 tokens

// ── Slot key labels ───────────────────────────────────────────────────────────

const SLOT_LABELS: Record<string, string> = {
  flipflop_audio: "Flipflop Audio",
  story_pdf:      "Story",
  coloring:       "Coloring",
  move_explore:   "Move & Explore",
  sing_along:     "Sing Along",
  bonus_video:    "Bonus Video",
};

// ── In-process story cache ─────────────────────────────────────────────────────
// Story content (metadata, pages, slots, vocabulary) changes only on admin
// publish. This cache avoids re-fetching the same static data on every chat
// turn. child_progress is always queried fresh — it changes as the child works.
//
// TTL: 5 minutes. Per Edge instance (not shared across replicas), so a publish
// will propagate within 5 minutes of the next request hitting any given replica.

const STATIC_CACHE_TTL_MS = 5 * 60 * 1000;

interface StoryStaticData {
  slug: string;
  title: string;
  themeEmoji: string | null;
  themeTitle: string | null;
  ageMin: number | null;
  ageMax: number | null;
  isFree: boolean;
  description: string | null;
  pages: StoryPage[];
  slotMissionIds: string[];
  slotVocabByMission: Map<string, VocabItem[]>;
  rawSlotMeta: Array<{ slotKey: string; sortOrder: number; missionId: string }>;
}

const storyStaticCache = new Map<string, { data: StoryStaticData; expiresAt: number }>();

async function fetchStoryStatic(
  supabase: SupabaseClient,
  storyId: string,
  language: string,
): Promise<StoryStaticData | null> {
  const cacheKey = `${storyId}:${language}`;
  const cached = storyStaticCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // ── Story metadata + localized version (parallel with pages + slots) ──────
  const [storyResult, pagesResult, slotsResult] = await Promise.all([
    supabase
      .from("stories")
      .select(`
        id, slug, title, theme_emoji, theme_title, age_min, age_max, is_free,
        story_versions!inner (
          language, title, description, published
        )
      `)
      .eq("id", storyId)
      .eq("story_versions.language", language)
      .eq("story_versions.published", true)
      .eq("status", "published")
      .maybeSingle(),

    supabase
      .from("story_pages")
      .select(`
        page_number,
        story_page_versions!inner (
          language, text, published
        )
      `)
      .eq("story_id", storyId)
      .eq("story_page_versions.language", language)
      .eq("story_page_versions.published", true)
      .order("page_number", { ascending: true }),

    supabase
      .from("story_slots")
      .select(`
        slot_key, sort_order,
        missions!inner (
          id,
          mission_versions (
            language, content_json, published
          )
        )
      `)
      .eq("story_id", storyId)
      .order("sort_order", { ascending: true }),
  ]);

  if (storyResult.error || !storyResult.data) return null;

  const storyRow = storyResult.data;
  const sv = Array.isArray(storyRow.story_versions)
    ? storyRow.story_versions[0]
    : storyRow.story_versions;
  if (!sv) return null;

  // ── Page text — budget-capped ─────────────────────────────────────────────
  const pages: StoryPage[] = [];
  let pageCharCount = 0;

  for (const row of pagesResult.data ?? []) {
    const spv = Array.isArray(row.story_page_versions)
      ? row.story_page_versions[0]
      : row.story_page_versions;
    const text = spv?.text?.trim();
    if (!text) continue;
    if (pageCharCount + text.length > PAGE_TEXT_MAX_CHARS) break;
    pages.push({ pageNumber: row.page_number, text });
    pageCharCount += text.length;
  }

  // ── Slots — collect mission IDs and cross-language vocabulary ─────────────
  type RawMissionVersion = {
    language: string;
    content_json: Record<string, unknown>;
    published: boolean;
  };
  type RawSlot = {
    slot_key: string;
    sort_order: number;
    missions:
      | { id: string; mission_versions: RawMissionVersion[] }
      | Array<{ id: string; mission_versions: RawMissionVersion[] }>;
  };

  const rawSlots = (slotsResult.data ?? []) as RawSlot[];

  const slotMissionIds: string[] = [];
  const slotVocabByMission = new Map<string, VocabItem[]>();
  const rawSlotMeta: StoryStaticData["rawSlotMeta"] = [];

  type RawVocabEntry = { word?: string; meaning?: string; emoji?: string };
  const SUPPORTED_LANGS = ["en", "fr", "rw"] as const;

  for (const slot of rawSlots) {
    const mission = Array.isArray(slot.missions) ? slot.missions[0] : slot.missions;
    const missionId = mission?.id ?? "";

    rawSlotMeta.push({ slotKey: slot.slot_key, sortOrder: slot.sort_order, missionId });

    if (!mission) continue;

    slotMissionIds.push(mission.id);

    const versions: RawMissionVersion[] = Array.isArray(mission.mission_versions)
      ? mission.mission_versions
      : [mission.mission_versions];

    // Collect each published language's vocabulary list indexed by language code
    const langVocab: Partial<Record<"en" | "fr" | "rw", RawVocabEntry[]>> = {};
    for (const mv of versions) {
      if (!mv?.published) continue;
      const lang = mv.language as "en" | "fr" | "rw";
      if (!SUPPORTED_LANGS.includes(lang)) continue;
      const raw = mv.content_json?.vocabulary;
      if (Array.isArray(raw)) langVocab[lang] = raw as RawVocabEntry[];
    }

    // Primary list: child's language first, then English fallback
    const primaryLang = (langVocab[language as "en" | "fr" | "rw"] ? language : "en") as "en" | "fr" | "rw";
    const primaryList = langVocab[primaryLang] ?? [];

    const items: VocabItem[] = [];

    for (let idx = 0; idx < primaryList.length; idx++) {
      const raw  = primaryList[idx];
      const word = raw.word?.trim();
      const meaning = raw.meaning?.trim();
      if (!word || !meaning) continue;

      // Zip translations from every other published language at the same index
      const translations: Partial<Record<"en" | "fr" | "rw", VocabTranslation>> = {};
      for (const lang of SUPPORTED_LANGS) {
        if (lang === primaryLang) continue;
        const entry = langVocab[lang]?.[idx];
        const tWord = entry?.word?.trim();
        const tMeaning = entry?.meaning?.trim();
        if (tWord && tMeaning) translations[lang] = { word: tWord, meaning: tMeaning };
      }

      items.push({ word, meaning, emoji: raw.emoji, translations });
    }

    slotVocabByMission.set(mission.id, items);
  }

  const description = (sv as { description?: string | null }).description?.trim() ?? null;

  const data: StoryStaticData = {
    slug:               storyRow.slug,
    title:              (sv as { title: string }).title || storyRow.title,
    themeEmoji:         storyRow.theme_emoji ?? null,
    themeTitle:         storyRow.theme_title ?? null,
    ageMin:             storyRow.age_min ?? null,
    ageMax:             storyRow.age_max ?? null,
    isFree:             storyRow.is_free ?? false,
    description:        description ? description.slice(0, DESCRIPTION_MAX_CHARS) : null,
    pages,
    slotMissionIds,
    slotVocabByMission,
    rawSlotMeta,
  };

  storyStaticCache.set(cacheKey, { data, expiresAt: Date.now() + STATIC_CACHE_TTL_MS });
  return data;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches structured, completion-aware story knowledge for Nimi's system prompt.
 *
 * Static story content (metadata, pages, vocabulary) is cached in-process for
 * 5 minutes per (storyId, language) pair. child_progress is always queried
 * fresh so slot status reflects the child's actual current progress.
 *
 * When `childId` is provided the engine queries `child_progress` to determine
 * which slots the child has completed. Vocabulary is then filtered to only the
 * words from completed slots and the current (first incomplete) slot.
 *
 * When `childId` is omitted all vocabulary is returned as "learned" and slots
 * carry `status: "upcoming"` as a safe fallback.
 */
export async function getStoryKnowledge(
  supabase: SupabaseClient,
  storyId: string,
  language: string,
  childId?: string | null,
): Promise<StoryKnowledge | null> {

  // ── 1. Static story data (cached) ────────────────────────────────────────
  const static_ = await fetchStoryStatic(supabase, storyId, language);
  if (!static_) return null;

  const { slotMissionIds, slotVocabByMission, rawSlotMeta } = static_;

  // ── 4. Completion state — query child_progress when childId provided ──────
  const completedMissionIds = new Set<string>();

  if (childId && slotMissionIds.length > 0) {
    const { data: progressRows } = await supabase
      .from("child_progress")
      .select("mission_id")
      .eq("child_id", childId)
      .eq("language", language)
      .in("mission_id", slotMissionIds);

    for (const row of progressRows ?? []) {
      completedMissionIds.add(row.mission_id);
    }
  }

  // ── 2. Build SlotInfo array with status ──────────────────────────────────
  let currentFound = false;
  const slots: SlotInfo[] = [];

  for (const meta of rawSlotMeta) {
    let status: SlotStatus;
    if (!childId) {
      status = "upcoming";
    } else if (completedMissionIds.has(meta.missionId)) {
      status = "completed";
    } else if (!currentFound) {
      status = "current";
      currentFound = true;
    } else {
      status = "upcoming";
    }

    slots.push({ slotKey: meta.slotKey, sortOrder: meta.sortOrder, missionId: meta.missionId, status });
  }

  // ── 3. Filter vocabulary by slot status ───────────────────────────────────
  const learnedVocabMap = new Map<string, VocabItem>();
  const currentVocabMap = new Map<string, VocabItem>();

  if (childId) {
    for (const slot of slots) {
      const vocab  = slotVocabByMission.get(slot.missionId) ?? [];
      const target = slot.status === "completed"
        ? learnedVocabMap
        : slot.status === "current"
        ? currentVocabMap
        : null; // upcoming — skip

      if (!target) continue;
      for (const item of vocab) {
        const key = item.word.toLowerCase();
        if (!learnedVocabMap.has(key) && !currentVocabMap.has(key)) {
          target.set(key, item);
        }
      }
    }
  } else {
    // No childId — show all vocabulary as "learned"
    for (const items of slotVocabByMission.values()) {
      for (const item of items) {
        const key = item.word.toLowerCase();
        if (!learnedVocabMap.has(key)) learnedVocabMap.set(key, item);
      }
    }
  }

  const vocabularyLearned = [...learnedVocabMap.values()].slice(0, VOCAB_LEARNED_MAX);
  const vocabularyCurrent = [...currentVocabMap.values()].slice(0, VOCAB_CURRENT_MAX);

  return {
    storyId,
    slug:               static_.slug,
    language,
    title:              static_.title,
    themeEmoji:         static_.themeEmoji,
    themeTitle:         static_.themeTitle,
    ageMin:             static_.ageMin,
    ageMax:             static_.ageMax,
    isFree:             static_.isFree,
    description:        static_.description,
    pages:              static_.pages,
    vocabularyLearned,
    vocabularyCurrent,
    slots,
    completedSlotCount: completedMissionIds.size,
  };
}

// ── Vocabulary line formatter ─────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = { en: "EN", fr: "FR", rw: "RW" };

/**
 * Renders a single vocabulary item as a compact one-liner with cross-language
 * translations appended in brackets when present.
 *
 * Examples:
 *   • Face 😊 — the front of your head [FR: Visage | RW: Amaso]
 *   • Smile 😁 — when your mouth curves up happily
 */
function formatVocabLine(item: VocabItem): string {
  const base = `• ${item.word}${item.emoji ? ` ${item.emoji}` : ""} — ${item.meaning}`;

  const translationParts = Object.entries(item.translations ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lang, t]) => `${LANG_LABELS[lang] ?? lang}: ${t.word}`);

  return translationParts.length > 0
    ? `${base} [${translationParts.join(" | ")}]`
    : base;
}

// ── Prompt Formatter ──────────────────────────────────────────────────────────

/**
 * Renders a StoryKnowledge object as a structured text block for Nimi's system
 * prompt. The block is designed to be informative but compact (target ≤ 600
 * tokens) so it doesn't crowd out the personality section or the conversation
 * history.
 *
 * Progress awareness:
 * - Completed vocabulary → what Nimi can quiz the child on
 * - Current vocabulary  → what the child is actively learning right now
 * - Upcoming slots      → NOT shown (Nimi shouldn't mention activities
 *                         the child hasn't reached yet)
 */
export function formatKnowledgeForPrompt(k: StoryKnowledge): string {
  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  const ageLabel =
    k.ageMin != null && k.ageMax != null ? ` | Ages ${k.ageMin}–${k.ageMax}` :
    k.ageMin != null ? ` | Ages ${k.ageMin}+` : "";
  lines.push(
    `📖 STORY: "${k.title}"${k.themeEmoji ? ` ${k.themeEmoji}` : ""}${ageLabel}`
  );

  if (k.description) {
    lines.push(`Summary: ${k.description}`);
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  if (k.slots.length > 0) {
    const done     = k.completedSlotCount;
    const total    = k.slots.length;
    const pct      = Math.round((done / total) * 100);
    const barDone  = Math.round(done / total * 5);
    const bar      = "█".repeat(barDone) + "░".repeat(5 - barDone);

    lines.push("");
    if (done === 0) {
      lines.push(`Progress: Just starting [${bar}] 0/${total} activities done`);
    } else if (done === total) {
      lines.push(`Progress: Fully completed! [${bar}] ${done}/${total} activities ✅`);
    } else {
      lines.push(`Progress: [${bar}] ${done}/${total} activities (${pct}%) — currently on "${SLOT_LABELS[k.slots.find(s => s.status === "current")?.slotKey ?? ""] ?? "next activity"}"`);
    }
  }

  // ── Story text — scoped to progress ──────────────────────────────────────
  // When we have real progress data (childId provided) and the child has not
  // yet completed any activity, show only the opening pages so Nimi can tease
  // the story without spoiling events the child hasn't reached yet.
  // Once any activity is completed, the child has experienced the full story
  // content (audio/pdf slots cover all pages), so all pages are shown.
  const hasProgressData = k.slots.some(s => s.status !== "upcoming");
  const visiblePages =
    hasProgressData && k.completedSlotCount === 0
      ? k.pages.slice(0, 3)
      : k.pages;

  if (visiblePages.length > 0) {
    lines.push("");
    lines.push(
      k.completedSlotCount === 0 && hasProgressData && k.pages.length > 3
        ? "STORY OPENING (first pages — child has not started activities yet):"
        : "STORY TEXT:"
    );
    for (const page of visiblePages) {
      lines.push(`Page ${page.pageNumber}: ${page.text}`);
    }
  }

  // ── Vocabulary already learned ────────────────────────────────────────────
  if (k.vocabularyLearned.length > 0) {
    lines.push("");
    lines.push("VOCABULARY LEARNED (practiced — quiz freely, explain with examples):");
    for (const item of k.vocabularyLearned) {
      lines.push(formatVocabLine(item));
    }
  }

  // ── Vocabulary currently being learned ────────────────────────────────────
  if (k.vocabularyCurrent.length > 0) {
    lines.push("");
    lines.push("CURRENTLY LEARNING (introduce naturally — child is working on these now):");
    for (const item of k.vocabularyCurrent) {
      lines.push(formatVocabLine(item));
    }
  }

  // ── Activity log ──────────────────────────────────────────────────────────
  if (k.slots.length > 0 && k.completedSlotCount > 0) {
    lines.push("");
    const activityLine = k.slots
      .map(s => {
        const label = SLOT_LABELS[s.slotKey] ?? s.slotKey;
        return s.status === "completed" ? `✅ ${label}`
             : s.status === "current"   ? `🔄 ${label}`
             : `⬜ ${label}`;
      })
      .join(", ");
    lines.push(`ACTIVITIES: ${activityLine}`);
  }

  return lines.join("\n").trim();
}
