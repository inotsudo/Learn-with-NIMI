// ── Nimi Intelligence Layer — shared types ─────────────────────────

export type MemoryType =
  | 'skill'        // demonstrated language/curriculum competency
  | 'preference'   // inferred content and activity preferences
  | 'achievement'  // notable accomplishments
  | 'struggle'     // areas needing support
  | 'personality'; // inferred learning style traits

export interface LearnerMemory {
  memory_type: MemoryType;
  key:         string;
  value:       Record<string, unknown>;
  confidence:  number; // 0–1; decays over time for ai_inferred memories
  source:      'system' | 'ai_inferred' | 'explicit';
}

export interface LearnerStats {
  total_missions:  number;
  total_stars:     number;
  stories_started: number;
  streak_days:     number;
}

export interface RecentActivity {
  mission_type: string;
  story_title:  string;
  completed_at: string;
  stars:        number;
}

export interface RecommendationCandidate {
  story_id:       string;
  story_title:    string;
  story_emoji:    string;
  total_missions: number;
  missions_done:  number;
  reason:         'in_progress' | 'not_started' | 'reinforcement';
  score:          number;
  next_mission_id: string | null;
  mission_types:  string[];
}

export interface LearnerContext {
  child: {
    id:       string;
    name:     string;
    language: string;
    age:      number;
  };
  stats:           LearnerStats;
  recent_activity: RecentActivity[];
  memories:        LearnerMemory[];
  recommendations: RecommendationCandidate[];
}

// ── Emotion Intelligence ──────────────────────────────────────────

export type EmotionType =
  | 'frustrated'  // short answers, repeated errors, "I don't know"
  | 'bored'       // single-word responses, increasingly terse
  | 'excited'     // exclamations, "wow", "cool", high energy
  | 'confident'   // detailed answers, self-correction, elaboration
  | 'hesitant'    // "maybe", "I think", question marks in answers
  | 'neutral';    // no strong signal detected

export interface EmotionAdjustments {
  sentenceTarget:   '1-2' | '2-3' | '3-4';  // response length
  encouragement:    'high' | 'normal' | 'low';
  questionDifficulty: 'lower' | 'keep' | 'raise';
  toneShift:        'warmer' | 'neutral' | 'energetic';
}

export interface EmotionSignal {
  emotion:     EmotionType;
  confidence:  number;  // 0–1
  adjustments: EmotionAdjustments;
}

// ── Proactive Intelligence ────────────────────────────────────────

export type ProactiveSuggestionType =
  | 'achievement_congrats'
  | 'story_followup'
  | 'mission_recommend'
  | 'vocab_review'
  | 'certificate_nudge'
  | 'community_invite'
  | 'streak_celebrate'
  | 'daily_checkin';

export interface ProactiveSuggestion {
  id?:             string;   // set when retrieved from DB
  type:            ProactiveSuggestionType;
  title:           string;
  message:         string;
  contextData:     Record<string, unknown>;
  priority:        number;   // 1 = highest
}

// ── Universal Recommendation Engine ──────────────────────────────

export type UniversalContentType =
  | 'story'
  | 'lesson'
  | 'coloring'
  | 'mission'
  | 'certificate'
  | 'community'
  | 'vocab_review';

export type UniversalReasonKey =
  | 'in_progress'
  | 'level_up'
  | 'interest_match'
  | 'review_needed'
  | 'streak_builder'
  | 'achievement_unlock'
  | 'new_adventure';

// A single piece of evidence that contributed to a recommendation decision.
export interface EvidenceSignal {
  // What kind of signal this is
  type: 'skill_gap' | 'spaced_repetition' | 'in_progress' | 'quiz_performance'
      | 'interest_match' | 'achievement_unlock' | 'level_progression' | 'time_based';
  // Short label for UI chips
  label:    string;    // "Skill gap"
  // Full sentence describing the signal and its value
  detail:   string;    // "empathy skill at 'emerging' level (67% confidence)"
  // How confident we are that this signal is meaningful
  strength: 'strong' | 'moderate' | 'weak';
}

// A curriculum skill objective targeted by this recommendation.
export interface CurriculumObjective {
  skill:       string;  // "empathy"
  skillLabel:  string;  // "Empathy"
  objective:   string;  // "Recognise emotions in story characters"
  masteryLevel?: string; // "emerging" | "developing" | "strong"
  confidence?:   number; // 0–1
}

// Complete evidence trail for one recommendation.
// Built deterministically from learner state — no LLM calls.
export interface RecommendationEvidence {
  signals:         EvidenceSignal[];
  curriculumGoals: CurriculumObjective[];
  // Warm, specific, uses the child's name. For parent portal.
  parentSentence:  string;
  // Data-forward, curriculum-framed. For teacher portal.
  teacherNotes:    string;
  // Which data sources were consulted to build this recommendation
  dataSourcesUsed: ('knowledge_graph' | 'quiz_history' | 'conversation_memory'
                  | 'story_knowledge' | 'learner_memory' | 'learning_profile')[];
}

export interface UniversalRecommendation {
  contentType:  UniversalContentType;
  id:           string;
  title:        string;
  emoji:        string;
  reason:       UniversalReasonKey;
  reasonLabel:  string;
  priority:     number;
  href:         string;
  metadata:     Record<string, unknown>;
  // Structured evidence trail — always present for recommendations that have
  // learner-specific signals; null for generic/fallback recommendations.
  evidence:     RecommendationEvidence | null;
}

// ── Conversation Memory ───────────────────────────────────────────

export interface ConversationSummary {
  sessionId:     string;
  summary:       string;
  keyTopics:     string[];
  masteredVocab: string[];
  mistakes:      { word: string; errorType: string; correctedAt: string }[];
  language:      string;
  storyId:       string | null;
  exchangeCount: number;
  createdAt:     string;
}

// ── Event Bus ─────────────────────────────────────────────────────

export type AIEventType =
  | 'mission_completed'
  | 'story_started'
  | 'story_finished'
  | 'hint_requested'
  | 'session_started'
  | 'streak_earned'
  | 'story_created'
  | 'vocabulary_reviewed'
  | 'quiz_completed'
  | 'certificate_earned'
  | 'coloring_completed'
  | 'reading_session_started';

export interface AIEvent {
  type:      AIEventType;
  childId:   string;
  payload:   Record<string, unknown>;
  timestamp: number;
}

// ── Unified AI Service ────────────────────────────────────────────

export type AIModel = 'fast' | 'quality' | 'best';

export type AICallType =
  | 'story_generate'
  | 'lesson_hint'
  | 'nimi_chat'
  | 'recommendation_explain'
  | 'context_summarize'
  | 'quiz_generate'
  | 'lesson_generate'
  | 'homework_generate'
  | 'coloring_coach'
  | 'drawing_coach'
  | 'voice_chat'
  | 'pronunciation_coach'
  | 'creativity_challenge'
  | 'parent_insight'
  | 'parent_recommendation'
  | 'teacher_insight'
  | 'story_analyze';

export interface AIServiceRequest {
  type:         AICallType;
  prompt?:      string;
  messages?:    { role: 'user' | 'assistant'; content: string }[];
  system?:      string;
  maxTokens?:   number;
  temperature?: number;
  model?:       AIModel;
  signal?:      AbortSignal;
}

export interface AIServiceResponse {
  content: string;
  model:   string;
  usage:   { input_tokens: number; output_tokens: number };
}
