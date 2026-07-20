import type { ActivityCategory } from "@/app/_activityData";

export interface Parent {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export type FavoriteCategory = "animals" | "space" | "music" | "art" | "stories" | "adventure";

export interface Child {
  id: string;
  parent_id: string;
  teacher_id: string | null;
  name: string;
  avatar_url: string | null;
  language: "en" | "fr" | "rw";
  age: number | null;
  favorite_category: FavoriteCategory | null;
  created_at: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  sort_order: number;
  is_active: boolean;
  theme_title?: string | null;
  theme_emoji?: string | null;
}

export interface StoryPage {
  id: string;
  story_id: string;
  page_number: number;
  image_url: string | null;
  audio_url: string | null;
  text: string | null;
}

export interface ColoringPage {
  id: string;
  story_id: string;
  page_number: number;
  template_image_url: string | null;
}

export interface MissionContent {
  lyrics?: string[];
  prompts?: { emoji: string; label: string }[];
  cover_image_url?: string;
  [key: string]: unknown;
}

export interface Mission {
  id: string;
  story_id: string | null;
  day_number: number;
  type: "listen" | "read" | "color" | "move" | "sing" | "watch" | "story" | "quiz" | "find";
  title: string;
  duration_minutes: number;
  media_url: string | null;
  page_start: number | null;
  page_end: number | null;
  category?: string | null;
  stars?: number | null;
  subtitle?: string | null;
  tip_text?: string | null;
  content?: MissionContent | null;
}

export interface Category {
  slug: ActivityCategory;
  sort_order: number;
  default_type: string;
}

export interface CurriculumMission extends Mission {
  category: ActivityCategory;
  level: number;
  completed: boolean;
  level_complete: boolean;
}

export interface CompleteCurriculumMissionResult {
  stars_earned: number;
  new_badges: string[];
  new_certificate: string | null;
  level: number;
  level_complete: boolean;
}

export interface ChildProgress {
  id: string;
  child_id: string;
  mission_id: string;
  completed_at: string;
}

export interface ColoringSave {
  id: string;
  child_id: string;
  coloring_page_id: string;
  canvas_data: object | null;
  saved_at: string;
}

export interface ChildBadge {
  id: string;
  child_id: string;
  language: string;
  badge_slug: string;
  earned_at: string;
}

export interface ChildAchievement {
  id: string;
  child_id: string;
  language: "en" | "fr" | "rw";
  type: "badge" | "certificate";
  slug: string;
  earned_at: string;
}

export interface ShopPurchase {
  id: string;
  child_id: string;
  item_id: string;
  price: number;
  purchased_at: string;
}

export interface ParentalSettings {
  id: string;
  parent_id: string;
  child_id: string;
  daily_limit_minutes: number;
  notifications_enabled: boolean;
}

export interface ChildCosmetics {
  nimi_outfit: string | null;
  piko_outfit: string | null;
  frame: string | null;
  title_badge: string | null;
}

export interface LevelMissionRow {
  level_number: number;
  category_slug: ActivityCategory;
  mission_id: string;
}

export interface ProgressRow {
  mission_id: string;
  language: "en" | "fr" | "rw";
  category: ActivityCategory;
  stars_earned: number;
  completed_at: string;
}
