// GET /api/nimi/recommendations?childId=<uuid>&lang=en&limit=6&explain=true&storyId=<uuid>
//
// Returns cross-type ranked recommendations with:
//   • Structured evidence trail (why each rec was chosen)
//   • Learning outcome prediction (what success looks like before they start)
//   • Intelligence-adjusted priorities (from historical success rates)
//
// Side effect: persists predictions to recommendation_predictions table
// so outcomes can be measured after completion.
//
// ?explain=true  → include evidence + predictions (default: true)
// ?role=teacher  → include teacherNotes in evidence (default: parent)
// ?storyId=<id>  → pass active story for enriched prediction

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUniversalRecommendations } from '@/lib/intelligence/universalRecommender';
import { getSkillMastery, getConceptsNeedingReview } from '@/lib/learnerKnowledgeGraph';
import { buildLearningPrediction } from '@/lib/learningPrediction';
import {
  getRecommendationIntelligence,
  applyIntelligenceAdjustments,
} from '@/lib/recommendationIntelligence';
import type { LearnerMemory, LearnerContext } from '@/lib/ai/types';

export const runtime = 'edge';

function safeLang(raw: string | null): 'en' | 'fr' | 'rw' {
  if (raw === 'fr' || raw === 'rw') return raw;
  return 'en';
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const childId  = searchParams.get('childId');
  const language = safeLang(searchParams.get('lang'));
  const limit    = Math.min(8, Math.max(1, parseInt(searchParams.get('limit') ?? '6', 10)));
  const storyId  = searchParams.get('storyId') ?? null;
  const explain  = searchParams.get('explain') !== 'false';
  const role     = searchParams.get('role') === 'teacher' ? 'teacher' : 'parent';

  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

  // Six parallel fetches — all independent, all non-fatal
  const [ctxResult, memResult, masteryResult, reviewResult, intelligenceResult, storyVocabResult] =
    await Promise.allSettled([
      supabase.rpc('get_learner_context',  { p_child_id: childId }),
      supabase.rpc('get_learner_memories', { p_child_id: childId, p_types: null }),
      getSkillMastery(supabase, childId, language),
      getConceptsNeedingReview(supabase, childId, language, 5),
      // Historical success rates — used to adjust future priorities
      getRecommendationIntelligence(supabase, childId),
      // Story vocab — used to predict which words will improve
      storyId
        ? supabase
            .from('story_knowledge_cache')
            .select('analysis')
            .eq('story_id', storyId)
            .eq('language', language)
            .single()
        : Promise.resolve(null),
    ]);

  const ctx: LearnerContext | null = (ctxResult.status === 'fulfilled' && ctxResult.value.data)
    ? (ctxResult.value.data as LearnerContext)
    : null;

  if (!ctx) return NextResponse.json({ recommendations: [] });

  const memories: LearnerMemory[] = (memResult.status === 'fulfilled' && Array.isArray(memResult.value))
    ? (memResult.value as LearnerMemory[])
    : [];

  const skillMastery     = masteryResult.status    === 'fulfilled' ? masteryResult.value    : [];
  const conceptsToReview = reviewResult.status     === 'fulfilled' ? reviewResult.value     : [];
  const intelligence     = intelligenceResult.status === 'fulfilled' ? intelligenceResult.value : null;

  // Extract story vocab from the knowledge cache for richer predictions
  const storyAnalysis = storyVocabResult?.status === 'fulfilled' && storyVocabResult.value
    ? (storyVocabResult.value as { data: { analysis: Record<string, unknown> } | null })?.data?.analysis
    : null;
  const storyVocab: string[] = Array.isArray(storyAnalysis?.vocabulary)
    ? (storyAnalysis.vocabulary as string[])
    : [];

  const quizMem = memories.find(m => m.key === 'quiz_comprehension_accuracy');
  const quizAccuracy = typeof quizMem?.value?.accuracy === 'number' ? quizMem.value.accuracy : null;
  const quizDataPoints = typeof quizMem?.value?.count === 'number' ? quizMem.value.count : 0;

  // Generate recommendations (with evidence already attached)
  let recs = await getUniversalRecommendations(
    supabase, ctx, memories, language,
    conceptsToReview, limit, skillMastery, quizAccuracy,
  );

  // Apply historical success adjustments (the self-improving layer)
  if (intelligence?.adjustments && intelligence.adjustments.length > 0) {
    recs = applyIntelligenceAdjustments(recs, intelligence.adjustments);
  }

  // Build learning outcome predictions for story recommendations
  // (Fire-and-forget persistence happens after response is sent)
  const predictionsToSave: Array<{
    rec_id: string;
    story_id: string | null;
    content_type: string;
    reason_key: string;
    prediction: ReturnType<typeof buildLearningPrediction>;
  }> = [];

  for (const rec of recs) {
    if (rec.contentType !== 'story') continue;
    const recStoryId = typeof rec.metadata?.storyId === 'string' ? rec.metadata.storyId
                     : storyId;

    const prediction = buildLearningPrediction({
      skillMastery,
      conceptsToReview,
      curriculum: null, // not available without a per-story fetch
      storyVocab,
      currentQuizAccuracy:  quizAccuracy,
      quizDataPoints,
    });

    // Attach prediction to the recommendation object
    (rec as unknown as Record<string, unknown>)['prediction'] = prediction;

    predictionsToSave.push({
      rec_id:       rec.id,
      story_id:     recStoryId,
      content_type: rec.contentType,
      reason_key:   rec.reason,
      prediction,
    });
  }

  // Build response payload
  const payload = explain
    ? recs
    : recs.map(({ evidence: _, ...rest }) => rest);

  if (explain && role === 'teacher') {
    for (const rec of payload as typeof recs) {
      if (rec.evidence) {
        (rec as unknown as Record<string, unknown>)['teacherExplanation'] = rec.evidence.teacherNotes;
      }
    }
  }

  // Persist predictions as a background side-effect (non-blocking)
  // Using ctx to access the service-role-equivalent authClient is not available in edge,
  // so we fire a fire-and-forget to save predictions via the RPC.
  // This is safe to skip if it fails — outcome evaluation just won't have a baseline.
  void Promise.allSettled(
    predictionsToSave.map(p =>
      supabase.rpc('save_recommendation_prediction', {
        p_child_id:                  childId,
        p_story_id:                  p.story_id,
        p_content_type:              p.content_type,
        p_recommendation_id:         p.rec_id,
        p_reason_key:                p.reason_key,
        p_predicted_quiz_accuracy:   p.prediction.expectedQuizAccuracy,
        p_predicted_vocab_gains:     p.prediction.expectedVocabGains,
        p_predicted_skill_gains:     JSON.stringify(p.prediction.expectedSkillGains),
        p_predicted_retention_gains: JSON.stringify(p.prediction.expectedRetentionGains),
        p_success_criteria:          JSON.stringify(p.prediction.successCriteria),
        p_prediction_confidence:     p.prediction.predictionConfidence,
        p_evidence_snapshot:         null,
      }).then(() => null, () => null)
    )
  );

  return NextResponse.json({
    recommendations: payload,
    intelligence: intelligence ? {
      overallSuccessRate:    intelligence.overallSuccessRate,
      totalOutcomesMeasured: intelligence.totalOutcomesMeasured,
      aiQualitySummary:      intelligence.aiQualitySummary,
    } : null,
    meta: {
      childId,
      language,
      skillsTracked:    skillMastery.length,
      conceptsToReview: conceptsToReview.length,
      explainMode:      explain,
      role,
      storyVocabWords:  storyVocab.length,
    },
  });
}
