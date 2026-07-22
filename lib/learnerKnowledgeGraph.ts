// lib/learnerKnowledgeGraph.ts
//
// Global Learner Knowledge Graph — the cross-story intelligence layer.
//
// This service connects:
//   Learner ── Knows ──▶ Concept ── Appears In ──▶ Story
//   Concept ── Teaches ──▶ Emotion ── Linked Skill ──▶ Empathy
//   Empathy ── Curriculum Goal ──▶ "Recognise emotions in others"
//
// So the recommendation engine can reason:
//   "Annie has mastered empathy vocabulary but still struggles with sequencing.
//    Recommend a story that reinforces sequencing while introducing emotional
//    vocabulary at a medium level."
//
// Public API:
//   getSkillMastery()          — what CurriculumSkills does this child know?
//   getConceptsNeedingReview() — which concepts are below retention threshold?
//   upsertConceptKnowledge()   — update mastery after vocab/quiz event
//   getLearnerKnowledgeSummary() — narrative block for Nimi/parent/teacher
//   warnIfReviewWorthy()       — pick the top words Nimi should mention today
//   linkStoryConceptsToGraph() — call this on story publish to seed the graph

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveWordsToConcepts, resolveThemesToConcepts, getSkillForConcept, lookupConcept } from "./conceptTaxonomy";
import { buildRetentionSnapshots, buildReviewHint, REVIEW_THRESHOLD } from "./spacedRepetition";
import type { CurriculumSkill } from "./curriculumKnowledge";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SkillMasteryRow {
  curriculum_skill:   string;
  concept_count:      number;
  avg_confidence:     number;
  avg_retention:      number;
  needs_review_count: number;
  mastery_level:      "none" | "emerging" | "developing" | "strong";
}

export interface ConceptReviewRow {
  concept_name:        string;
  concept_type:        string;
  curriculum_skill:    string | null;
  confidence:          number;
  predicted_retention: number;
  stability_days:      number;
  last_correct_at:     string | null;
  times_seen:          number;
  story_ids:           string[];
}

export interface LearnerKnowledgeSummary {
  skillMastery:       SkillMasteryRow[];
  conceptsToReview:   ConceptReviewRow[];
  nimiReviewHints:    string[];     // sentences injected into Nimi's system prompt
  parentSummary:      string;       // paragraph for parent-ai
  teacherSummary:     string;       // paragraph for teacher-ai
  strongSkills:       string[];
  weakSkills:         string[];
  totalConceptsKnown: number;
}

export interface ConceptUpsertEvent {
  childId:    string;
  conceptName: string;
  seen:       boolean;
  correct:    boolean;
  storyId?:   string;
  language:   string;
}

// ── Skill Mastery ─────────────────────────────────────────────────────────────

/**
 * Fetches aggregated skill mastery for a child across all stories.
 * Result is ordered by confidence ASC (weakest first) — used for gap detection.
 */
export async function getSkillMastery(
  supabase: SupabaseClient,
  childId:  string,
  language: string = "en",
): Promise<SkillMasteryRow[]> {
  const { data, error } = await supabase.rpc("get_learner_skill_mastery", {
    p_child_id: childId,
    p_language: language,
  });
  if (error) {
    console.error("[KnowledgeGraph] getSkillMastery error:", error.message);
    return [];
  }
  return (data as SkillMasteryRow[]) ?? [];
}

// ── Concepts Needing Review ───────────────────────────────────────────────────

/**
 * Returns the N concepts with the lowest predicted retention.
 * These are the candidates for Nimi to weave into today's conversation.
 */
export async function getConceptsNeedingReview(
  supabase:  SupabaseClient,
  childId:   string,
  language:  string = "en",
  limit:     number = 5,
): Promise<ConceptReviewRow[]> {
  const { data, error } = await supabase.rpc("get_concepts_needing_review", {
    p_child_id: childId,
    p_language: language,
    p_limit:    limit,
  });
  if (error) {
    console.error("[KnowledgeGraph] getConceptsNeedingReview error:", error.message);
    return [];
  }
  return (data as ConceptReviewRow[]) ?? [];
}

// ── Upsert Concept Knowledge ──────────────────────────────────────────────────

/**
 * Records that a child encountered or was quizzed on a concept.
 * Fire-and-forget safe — errors are logged but never thrown.
 *
 * Call this:
 *   - After every vocab encounter (recordVocabEncounter → also call this)
 *   - After every quiz answer (recordQuizResult → also call this)
 *   - After story completion (story_finished inferFromEvent → also call this)
 */
export async function upsertConceptKnowledge(
  supabase: SupabaseClient,
  event:    ConceptUpsertEvent,
): Promise<void> {
  // Step 1: resolve name → concept_id from the concepts table
  const { data: concepts, error: lookupError } = await supabase
    .from("concepts")
    .select("id")
    .eq("name", event.conceptName.toLowerCase())
    .eq("language", event.language)
    .limit(1);

  if (lookupError || !concepts?.length) {
    // Concept not yet in DB — seed it from the taxonomy if known
    const node = lookupConcept(event.conceptName);
    if (node) {
      const { data: inserted, error: insertError } = await supabase
        .from("concepts")
        .upsert({
          name:             node.name,
          concept_type:     node.concept_type,
          language:         event.language,
          parent_name:      node.parent_name ?? null,
          curriculum_skill: node.curriculum_skill ?? null,
          display_emoji:    node.display_emoji ?? null,
          description:      node.description ?? null,
        }, { onConflict: "name,language,concept_type" })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("[KnowledgeGraph] Could not seed concept:", event.conceptName, insertError?.message);
        return;
      }

      await supabase.rpc("upsert_concept_knowledge", {
        p_child_id:   event.childId,
        p_concept_id: inserted.id,
        p_seen:       event.seen,
        p_correct:    event.correct,
        p_story_id:   event.storyId ?? null,
      });
    }
    return;
  }

  const conceptId = concepts[0].id;
  const { error } = await supabase.rpc("upsert_concept_knowledge", {
    p_child_id:   event.childId,
    p_concept_id: conceptId,
    p_seen:       event.seen,
    p_correct:    event.correct,
    p_story_id:   event.storyId ?? null,
  });

  if (error) {
    console.error("[KnowledgeGraph] upsertConceptKnowledge RPC error:", error.message);
  }
}

// ── Learner Knowledge Summary ──────────────────────────────────────────────────

/**
 * Builds a complete intelligence snapshot for one learner.
 * Returns structured data AND pre-formatted narrative blocks for:
 *   - Nimi system prompt (review hints)
 *   - Parent AI context block
 *   - Teacher AI context block
 *
 * Costs 2 RPC calls (skill mastery + concepts to review).
 * Called once per route in the parallel fetch group — never called twice per request.
 */
export async function getLearnerKnowledgeSummary(
  supabase: SupabaseClient,
  childId:  string,
  language: string = "en",
): Promise<LearnerKnowledgeSummary> {
  const [mastery, reviewConcepts] = await Promise.all([
    getSkillMastery(supabase, childId, language),
    getConceptsNeedingReview(supabase, childId, language, 5),
  ]);

  const snapshots = buildRetentionSnapshots(reviewConcepts);

  const nimiReviewHints = snapshots
    .filter(s => s.nimi_hint)
    .map(s => s.nimi_hint!);

  const strongSkills   = mastery.filter(m => m.mastery_level === "strong").map(m => m.curriculum_skill);
  const weakSkills     = mastery.filter(m => m.mastery_level === "none" || m.mastery_level === "emerging").map(m => m.curriculum_skill);
  const totalConcepts  = mastery.reduce((acc, m) => acc + m.concept_count, 0);

  const parentSummary  = buildParentSummary(mastery, snapshots, totalConcepts);
  const teacherSummary = buildTeacherSummary(mastery, snapshots, totalConcepts);

  return {
    skillMastery:       mastery,
    conceptsToReview:   reviewConcepts,
    nimiReviewHints,
    parentSummary,
    teacherSummary,
    strongSkills,
    weakSkills,
    totalConceptsKnown: totalConcepts,
  };
}

// ── Narrative builders ─────────────────────────────────────────────────────────

function buildParentSummary(
  mastery:    SkillMasteryRow[],
  snapshots:  ReturnType<typeof buildRetentionSnapshots>,
  total:      number,
): string {
  if (total === 0) {
    return "Your child hasn't encountered any vocabulary or concepts yet — start their first story today!";
  }

  const strong = mastery.filter(m => m.mastery_level === "strong");
  const weak   = mastery.filter(m => m.mastery_level === "none" || m.mastery_level === "emerging");
  const review = snapshots.filter(s => s.needs_review);

  const lines: string[] = [];
  lines.push(`Your child has built knowledge across ${total} concept${total !== 1 ? "s" : ""}.`);

  if (strong.length > 0) {
    lines.push(`Strong areas: ${strong.map(s => s.curriculum_skill.replace(/_/g, " ")).join(", ")}.`);
  }
  if (weak.length > 0) {
    lines.push(`Still developing: ${weak.map(s => s.curriculum_skill.replace(/_/g, " ")).join(", ")}.`);
  }
  if (review.length > 0) {
    const words = review.slice(0, 3).map(s => `"${s.name}"`).join(", ");
    lines.push(`Nimi will revisit ${words} soon — spaced repetition keeps learning sticky.`);
  }

  return lines.join(" ");
}

function buildTeacherSummary(
  mastery:    SkillMasteryRow[],
  snapshots:  ReturnType<typeof buildRetentionSnapshots>,
  total:      number,
): string {
  if (total === 0) {
    return "No learner knowledge data yet for this student.";
  }

  const byLevel: Record<string, string[]> = { strong: [], developing: [], emerging: [], none: [] };
  for (const m of mastery) {
    byLevel[m.mastery_level]?.push(m.curriculum_skill);
  }

  const review = snapshots.filter(s => s.needs_review);

  const lines: string[] = [];
  lines.push(`Global knowledge graph: ${total} concepts tracked across all sessions.`);

  for (const level of ["strong", "developing", "emerging", "none"] as const) {
    if (byLevel[level].length > 0) {
      const label = level === "none" ? "Not yet developed" : level.charAt(0).toUpperCase() + level.slice(1);
      lines.push(`${label}: ${byLevel[level].map(s => s.replace(/_/g, " ")).join(", ")}`);
    }
  }

  if (review.length > 0) {
    lines.push(`Spaced repetition queue (${review.length} items): ${review.map(s => s.name).join(", ")}`);
  }

  return lines.join("\n");
}

// ── Nimi prompt formatter ──────────────────────────────────────────────────────

/**
 * Formats the review hint block for injection into Nimi's system prompt.
 * Called only when there are concepts to review — keeps the prompt lean otherwise.
 *
 * Example output:
 *   ## Cross-Story Memory (Global Knowledge)
 *   These words need gentle reinforcement today:
 *   → "delight" — last reviewed 5 days ago (retention: 61%). Weave it naturally.
 *   → "courage" — last reviewed 10 days ago (retention: 44%). Weave it naturally.
 */
export function formatKnowledgeGraphForNimi(summary: LearnerKnowledgeSummary): string {
  const lines: string[] = [];

  if (summary.nimiReviewHints.length > 0) {
    lines.push("## Cross-Story Memory (Global Knowledge)");
    lines.push("These words need gentle reinforcement today (spaced repetition):");
    for (const hint of summary.nimiReviewHints.slice(0, 3)) {
      lines.push(`→ ${hint}`);
    }
  }

  if (summary.weakSkills.length > 0 && summary.strongSkills.length > 0) {
    lines.push("");
    lines.push(`Skill profile: Strong in ${summary.strongSkills.map(s => s.replace(/_/g, " ")).join(", ")}. Still developing: ${summary.weakSkills.map(s => s.replace(/_/g, " ")).join(", ")}.`);
  }

  return lines.join("\n");
}

// ── Story publish hook — seed concepts into the graph ─────────────────────────

/**
 * Called when a story is published (from the admin warm-cache route).
 * Seeds concept nodes + story→concept links from the AI-extracted story analysis.
 * These nodes exist globally — they're available to all learners once seeded.
 *
 * This is idempotent: safe to call on republish.
 */
export async function linkStoryConceptsToGraph(
  supabase:  SupabaseClient,
  storyId:   string,
  language:  string,
  analysis: {
    vocabulary:           string[];
    themes:               string[];
    educational_concepts: string[];
    characters?:          Array<{ name: string }>;
  },
): Promise<{ conceptsSeeded: number }> {
  const wordNodes    = resolveWordsToConcepts(analysis.vocabulary ?? []);
  const themeNodes   = resolveThemesToConcepts(analysis.themes ?? []);
  const conceptNodes = resolveWordsToConcepts(analysis.educational_concepts ?? []);

  // Character nodes (type=character)
  const charNodes = (analysis.characters ?? []).map(c => ({
    name:         c.name.toLowerCase(),
    concept_type: "character" as const,
    description:  `Character in story`,
  }));

  const allNodes = [...wordNodes, ...themeNodes, ...conceptNodes, ...charNodes];
  if (allNodes.length === 0) return { conceptsSeeded: 0 };

  // Build the jsonb array for the RPC
  const conceptsJson = allNodes.map(n => ({
    name:             n.name,
    type:             n.concept_type,
    curriculum_skill: ("curriculum_skill" in n ? n.curriculum_skill : getSkillForConcept(n.name)) ?? null,
    parent_name:      ("parent_name" in n ? n.parent_name : null) ?? null,
    emoji:            ("display_emoji" in n ? n.display_emoji : null) ?? null,
  }));

  const { data, error } = await supabase.rpc("warm_story_concepts", {
    p_story_id: storyId,
    p_language: language,
    p_concepts: conceptsJson,
  });

  if (error) {
    console.error("[KnowledgeGraph] linkStoryConceptsToGraph error:", error.message);
    return { conceptsSeeded: 0 };
  }

  return { conceptsSeeded: typeof data === "number" ? data : allNodes.length };
}
