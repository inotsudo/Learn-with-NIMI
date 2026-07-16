// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Story Adventure Type Definitions (SA-1.3)
//
//  Strongly typed interfaces matching 044_story_adventure_rpcs.sql
//  return shapes. No runtime code — types only.
// ══════════════════════════════════════════════════════════════

// ── Core Entities ────────────────────────────────────────────

export interface StoryLibraryItem {
  sid: string;
  slug: string;
  title: string;
  cover_url: string | null;
  sort_order: number;
  theme_emoji: string | null;
  category: string | null;
  age_min: number | null;
  age_max: number | null;
  unlocked: boolean;
  complete: boolean;
  progress: number;
  is_free: boolean;
}

export interface StoryDetails {
  sid: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  sort_order: number;
  theme_emoji: string | null;
  age_min: number | null;
  age_max: number | null;
  intro_video_url: string | null;
  theme_song_url: string | null;
  meet_characters_url: string | null;
  story_intro_url: string | null;
}

export interface StorySlot {
  slot_key: string;
  slot_order: number;
  mission_id: string;
  mission_type: string;
  title: string;
  subtitle: string;
  stars: number;
  completed: boolean;
}

export interface StoryCompletion {
  total_slots: number;
  completed_slots: number;
  is_complete: boolean;
}

export interface StoryCertificate {
  cert_slug: string;
  earned_at: string;
}

export interface StoryIntroProgress {
  slot_key: string;
  consumed: boolean;
  consumed_at: string | null;
}

export interface StoryRecommendation {
  sid: string;
  slug: string;
  title: string;
  cover_url: string | null;
  sort_order: number;
  theme_emoji: string | null;
  age_match: boolean;
}

// ── Weekly Challenges ────────────────────────────────────────

export interface WeeklyChallenge {
  challenge_id: string;
  challenge_type: string;
  ch_stars: number;
  title: string;
  description: string;
  content_json: Record<string, unknown>;
  completed: boolean;
  stars_earned: number;
}

// ── Mutation Results ─────────────────────────────────────────

export interface CompleteSlotResult {
  stars_earned: number;
  new_badges: string[];
  new_certificate: string | null;
  story_complete: boolean;
  next_story_unlocked: boolean;
}

export interface CompleteChallengeResult {
  stars_earned: number;
  already_completed: boolean;
}

// ── Slot Key Constants ───────────────────────────────────────

export type SlotKey =
  | "flipflop_audio"
  | "story_pdf"
  | "coloring"
  | "move_explore"
  | "sing_along"
  | "bonus_video";

export type IntroKey =
  | "intro_video"
  | "theme_song"
  | "meet_characters";

export const SLOT_KEYS: SlotKey[] = [
  "flipflop_audio",
  "story_pdf",
  "coloring",
  "move_explore",
  "sing_along",
  "bonus_video",
];

export const INTRO_KEYS: IntroKey[] = [
  "intro_video",
  "theme_song",
  "meet_characters",
];

export const TOTAL_STORY_MISSIONS = 6;
