// lib/sdk/types.ts — Nimi Platform SDK shared types

export interface NimiClientOptions {
  apiKey:   string;
  baseUrl?: string; // defaults to https://app.nimipiko.com
}

// ── Learner ───────────────────────────────────────────────────────────────────

export interface LearnerProfile {
  child: {
    id:       string;
    name:     string;
    age:      number;
    language: string;
    avatarId: string | null;
  };
  stats: {
    total_missions:  number;
    total_stars:     number;
    stories_started: number;
    streak_days:     number;
  } | null;
  memories:        LearnerMemory[];
  recommendations: StoryRecommendation[];
  recentActivity:  RecentActivity[];
}

export interface LearnerMemory {
  memory_type: 'skill' | 'preference' | 'achievement' | 'struggle' | 'personality';
  key:         string;
  value:       Record<string, unknown>;
  confidence:  number;
  source:      'system' | 'ai_inferred' | 'explicit';
}

export interface StoryRecommendation {
  story_id:       string;
  story_title:    string;
  story_emoji:    string;
  reason:         'in_progress' | 'not_started' | 'reinforcement';
  score:          number;
  missions_done:  number;
  total_missions: number;
}

export interface RecentActivity {
  mission_type:  string;
  story_title:   string;
  completed_at:  string;
  stars:         number;
}

// ── AI Chat ───────────────────────────────────────────────────────────────────

export interface ChatRequest {
  message:   string;
  childId?:  string;
  language?: string;
  system?:   string;
}

export interface ChatResponse {
  reply:    string;
  model:    string;
  language: string;
  usage: {
    input_tokens:  number;
    output_tokens: number;
  };
}

// ── Content ───────────────────────────────────────────────────────────────────

export interface StoryListOptions {
  language?: string;
  ageMin?:   number;
  ageMax?:   number;
  limit?:    number;
  offset?:   number;
}

export interface Story {
  id:             string;
  title:          string;
  emoji:          string;
  description:    string;
  language:       string;
  age_min:        number;
  age_max:        number;
  mission_count:  number;
  story_categories: { name: string }[];
}

export interface StoryListResponse {
  stories: Story[];
  total:   number;
  limit:   number;
  offset:  number;
}

// ── Events ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'mission_completed' | 'story_started' | 'story_finished'
  | 'hint_requested'    | 'session_started' | 'streak_earned' | 'story_created';

export interface EventRequest {
  childId:  string;
  type:     EventType;
  payload?: Record<string, unknown>;
}

export interface EventResponse {
  ok:      boolean;
  eventId: string;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export interface ApiKeyInfo {
  id:           string;
  name:         string;
  key_prefix:   string;
  plan:         string;
  scopes:       string[];
  last_used_at: string | null;
  expires_at:   string | null;
  revoked_at:   string | null;
  created_at:   string;
}

export interface CreateKeyRequest {
  name:    string;
  plan?:   'free' | 'pro' | 'enterprise';
  scopes?: string[];
}

export interface CreateKeyResponse {
  id:     string;
  key:    string;  // shown once — store securely
  prefix: string;
  plan:   string;
  scopes: string[];
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class NimiApiError extends Error {
  constructor(
    message: string,
    public readonly status:  number,
    public readonly code?:   string,
  ) {
    super(message);
    this.name = 'NimiApiError';
  }
}
