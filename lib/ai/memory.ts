// ── Shared Memory Layer ───────────────────────────────────────────
// Client + server compatible. Pass any Supabase client instance.
// Wraps learner_memories table via security-definer RPCs.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemoryType, LearnerMemory, AIEvent } from './types';
import { evaluateOutcomesAfterStory } from '../outcomeEvaluator';

// ── Read ──────────────────────────────────────────────────────────

export async function getMemories(
  supabase: SupabaseClient,
  childId: string,
  types?: MemoryType[]
): Promise<LearnerMemory[]> {
  const { data, error } = await supabase.rpc('get_learner_memories', {
    p_child_id: childId,
    p_types:    types ?? null,
  });

  if (error) {
    console.error('[NimiMemory] getMemories failed:', error.message);
    return [];
  }

  return (data as LearnerMemory[]) ?? [];
}

export async function getMemory(
  supabase: SupabaseClient,
  childId: string,
  type: MemoryType,
  key: string
): Promise<LearnerMemory | undefined> {
  const { data, error } = await supabase.rpc('get_learner_memories', {
    p_child_id: childId,
    p_types:    [type],
    p_key:      key,
  });
  if (error) {
    console.error('[NimiMemory] getMemory failed:', error.message);
    return undefined;
  }
  return ((data as LearnerMemory[]) ?? [])[0];
}

// ── Write ─────────────────────────────────────────────────────────

export async function upsertMemory(
  supabase: SupabaseClient,
  childId:    string,
  type:       MemoryType,
  key:        string,
  value:      Record<string, unknown>,
  confidence = 1.0,
  source:    'system' | 'ai_inferred' | 'explicit' = 'system'
): Promise<void> {
  const { error } = await supabase.rpc('upsert_learner_memory', {
    p_child_id:   childId,
    p_type:       type,
    p_key:        key,
    p_value:      value,
    p_confidence: confidence,
    p_source:     source,
  });

  if (error) {
    console.error('[NimiMemory] upsertMemory failed:', error.message);
  }
}

// ── Inference — update memories based on a single learner event ───

export async function inferFromEvent(
  supabase: SupabaseClient,
  event: AIEvent
): Promise<void> {
  const { childId, type, payload } = event;

  switch (type) {
    case 'mission_completed': {
      const missionType = payload.missionType as string | undefined;
      const stars       = (payload.stars as number | undefined) ?? 0;
      if (!missionType) break;

      // Increment per-type preference counter
      const existing = await getMemory(supabase, childId, 'preference', `mission_type_${missionType}_count`);
      const count    = ((existing?.value.count as number) ?? 0) + 1;
      await upsertMemory(supabase, childId, 'preference', `mission_type_${missionType}_count`,
        { count, missionType }, 0.9, 'ai_inferred');

      // Once 5+ completions of a type, declare it a preference
      if (count >= 5) {
        await upsertMemory(supabase, childId, 'preference', 'favorite_mission_type',
          { type: missionType, count }, 0.85, 'ai_inferred');
      }

      // Track star performance (achievement if consistently high)
      if (stars >= 3) {
        const ach = await getMemory(supabase, childId, 'achievement', `high_stars_${missionType}`);
        const achCount = ((ach?.value.count as number) ?? 0) + 1;
        await upsertMemory(supabase, childId, 'achievement', `high_stars_${missionType}`,
          { count: achCount, missionType }, 0.8, 'ai_inferred');
      }

      // Track struggle (0 stars = couldn't complete)
      if (stars === 0) {
        const str = await getMemory(supabase, childId, 'struggle', `mission_type_${missionType}`);
        const strCount = ((str?.value.count as number) ?? 0) + 1;
        await upsertMemory(supabase, childId, 'struggle', `mission_type_${missionType}`,
          { count: strCount, missionType }, 0.75, 'ai_inferred');
      } else if (stars >= 2) {
        // Good performance clears struggle memory for this type
        const str = await getMemory(supabase, childId, 'struggle', `mission_type_${missionType}`);
        if (str && (str.value.count as number) > 0) {
          // Reduce confidence on the struggle memory (recovery signal)
          await upsertMemory(supabase, childId, 'struggle', `mission_type_${missionType}`,
            { ...str.value, recovering: true }, Math.max(0.1, str.confidence - 0.2), 'ai_inferred');
        }
      }
      break;
    }

    case 'hint_requested': {
      const missionType = payload.missionType as string | undefined;
      if (!missionType) break;
      const str = await getMemory(supabase, childId, 'struggle', `mission_type_${missionType}`);
      const count = ((str?.value.count as number) ?? 0) + 1;
      await upsertMemory(supabase, childId, 'struggle', `mission_type_${missionType}`,
        { count, missionType, hint_requested: true }, 0.8, 'ai_inferred');
      break;
    }

    case 'story_finished': {
      const storyId    = payload.storyId as string | undefined;
      const storyTitle = payload.storyTitle as string | undefined;
      const childName  = payload.childName as string | undefined;
      if (!storyId) break;
      await upsertMemory(supabase, childId, 'achievement', `story_completed_${storyId}`,
        { storyId, storyTitle: storyTitle ?? '', completedAt: new Date().toISOString() },
        1.0, 'system');
      // Trigger outcome evaluation — closes the prediction → measurement loop
      void evaluateOutcomesAfterStory(supabase, childId, storyId, childName).catch(() => null);
      break;
    }

    case 'streak_earned': {
      const days = (payload.days as number | undefined) ?? 1;
      const best = await getMemory(supabase, childId, 'achievement', 'best_streak');
      const prev = (best?.value.days as number) ?? 0;
      if (days > prev) {
        await upsertMemory(supabase, childId, 'achievement', 'best_streak',
          { days }, 1.0, 'system');
      }
      if (days >= 7) {
        await upsertMemory(supabase, childId, 'personality', 'persistence',
          { level: 'high', streak: days }, 0.9, 'ai_inferred');
      }
      break;
    }

    case 'story_created': {
      const prev = await getMemory(supabase, childId, 'achievement', 'story_author');
      const count = ((prev?.value.count as number | undefined) ?? 0) + 1;
      await upsertMemory(supabase, childId, 'achievement', 'story_author',
        { createdAt: new Date().toISOString(), count }, 1.0, 'system');
      await upsertMemory(supabase, childId, 'personality', 'creative',
        { signal: 'story_created', count }, 0.8, 'ai_inferred');
      break;
    }

    case 'coloring_completed': {
      const prev = await getMemory(supabase, childId, 'preference', 'mission_type_little-creators_count');
      const count = ((prev?.value.count as number | undefined) ?? 0) + 1;
      await upsertMemory(supabase, childId, 'preference', 'mission_type_little-creators_count',
        { count, missionType: 'little-creators' }, 0.85, 'ai_inferred');
      if (count >= 3) {
        await upsertMemory(supabase, childId, 'personality', 'creative',
          { signal: 'coloring_completed', count }, 0.8, 'ai_inferred');
      }
      break;
    }

    case 'reading_session_started': {
      const lang = (payload.language as string | undefined) ?? 'en';
      const prev = await getMemory(supabase, childId, 'preference', `reading_sessions_${lang}`);
      const count = ((prev?.value.count as number | undefined) ?? 0) + 1;
      await upsertMemory(supabase, childId, 'preference', `reading_sessions_${lang}`,
        { count, language: lang }, 0.7, 'ai_inferred');
      break;
    }

    case 'quiz_completed': {
      const correct = Boolean(payload.correct);
      const qType   = (payload.questionType as string | undefined) ?? 'comprehension';

      const prev    = await getMemory(supabase, childId, 'skill', `quiz_${qType}_accuracy`);
      const attempts = ((prev?.value.attempts as number | undefined) ?? 0) + 1;
      const correct_count = ((prev?.value.correct as number | undefined) ?? 0) + (correct ? 1 : 0);
      const accuracy = correct_count / attempts;

      await upsertMemory(supabase, childId, 'skill', `quiz_${qType}_accuracy`,
        { attempts, correct: correct_count, accuracy }, 0.9, 'system');

      // Flag struggling if accuracy drops below 40% after 5+ attempts
      if (attempts >= 5 && accuracy < 0.4) {
        await upsertMemory(supabase, childId, 'struggle', `quiz_type_${qType}`,
          { accuracy, attempts }, 0.8, 'ai_inferred');
      }
      break;
    }

    case 'vocabulary_reviewed': {
      const word    = (payload.word as string | undefined) ?? '';
      const correct = Boolean(payload.correct);
      const lang    = (payload.language as string | undefined) ?? 'en';
      if (!word) break;

      const key = `vocab_reviewed_${word.toLowerCase().replace(/\s+/g, '_')}_${lang}`;
      const prev = await getMemory(supabase, childId, 'skill', key);
      const reviews = ((prev?.value.reviews as number | undefined) ?? 0) + 1;
      const correct_count = ((prev?.value.correct as number | undefined) ?? 0) + (correct ? 1 : 0);

      await upsertMemory(supabase, childId, 'skill', key,
        { word, language: lang, reviews, correct: correct_count }, 0.85, 'system');

      // After 3+ correct reviews, upgrade to mastered
      if (correct && correct_count >= 3) {
        const masteredKey = `vocab_mastered_${word.toLowerCase().replace(/\s+/g, '_')}`;
        await upsertMemory(supabase, childId, 'skill', masteredKey,
          { word, language: lang, masteredAt: new Date().toISOString() }, 1.0, 'system');
      }
      break;
    }

    case 'certificate_earned': {
      const certType = (payload.certType as string | undefined) ?? 'unknown';
      const certName = (payload.certName as string | undefined) ?? certType;
      await upsertMemory(supabase, childId, 'achievement', `certificate_${certType}`,
        { certType, certName, earnedAt: new Date().toISOString() }, 1.0, 'system');
      break;
    }

    default:
      break;
  }
}
