// Story Readiness Engine — SA-3.2
// Evaluates a story against requirements and returns a readiness score.
// Cover and Meet Characters are optional bonus items — they don't block publishing.

export interface ReadinessItem {
  key: string;
  label: string;
  group: "assets" | "activities";
  done: boolean;
  optional?: boolean;
}

export interface ReadinessResult {
  items: ReadinessItem[];
  completed: number;
  total: number;
  score: number;
  status: "draft" | "in_progress" | "nearly_ready" | "ready";
  statusLabel: string;
  statusColor: string;
}

export function computeReadiness(story: {
  cover_url?: string | null;
  story_versions?: { intro_video_url?: string | null; theme_song_url?: string | null; meet_characters_url?: string | null; story_intro_url?: string | null }[];
  story_slots?: { slot_key: string; mission_id?: string | null }[];
}): ReadinessResult {
  const version = (story.story_versions ?? [])[0];
  const slots = story.story_slots ?? [];
  const hasSlot = (key: string) => slots.some(s => s.slot_key === key && s.mission_id);

  const items: ReadinessItem[] = [
    { key: "cover", label: "Cover Image", group: "assets", done: !!story.cover_url, optional: true },
    { key: "intro_video", label: "Intro Video", group: "assets", done: !!version?.intro_video_url },
    { key: "theme_song", label: "Theme Song", group: "assets", done: !!version?.theme_song_url },
    { key: "meet_characters", label: "Meet Nimi & Piko", group: "assets", done: !!version?.meet_characters_url, optional: true },
    { key: "story_intro", label: "Story Introduction", group: "assets", done: !!version?.story_intro_url },
    { key: "flipflop_audio", label: "FlipFlop Audio Book", group: "activities", done: hasSlot("flipflop_audio") },
    { key: "story_pdf", label: "Story PDF", group: "activities", done: hasSlot("story_pdf") },
    { key: "coloring", label: "Coloring Activity", group: "activities", done: hasSlot("coloring") },
    { key: "move_explore", label: "Move & Explore", group: "activities", done: hasSlot("move_explore") },
    { key: "sing_along", label: "Sing Along", group: "activities", done: hasSlot("sing_along") },
    { key: "bonus_video", label: "Bonus Video", group: "activities", done: hasSlot("bonus_video") },
  ];

  const required = items.filter(i => !i.optional);
  const completed = required.filter(i => i.done).length;
  const total = required.length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  let status: ReadinessResult["status"];
  let statusLabel: string;
  let statusColor: string;

  if (score === 100) {
    status = "ready"; statusLabel = "Ready To Publish"; statusColor = "emerald";
  } else if (score >= 90) {
    status = "nearly_ready"; statusLabel = "Nearly Ready"; statusColor = "blue";
  } else if (score >= 50) {
    status = "in_progress"; statusLabel = "In Progress"; statusColor = "amber";
  } else {
    status = "draft"; statusLabel = "Draft"; statusColor = "gray";
  }

  return { items, completed, total, score, status, statusLabel, statusColor };
}
