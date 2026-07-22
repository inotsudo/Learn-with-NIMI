// GET|POST /api/knowledge
//
// Public API surface for the Knowledge Router.
// Called by client-side features that need knowledge before constructing
// their own AI calls (e.g. voice conversation, parent AI, teacher AI).
//
// POST body:
//   question:   string          — the question or topic
//   childId?:   string          — learner ID (optional for parent/teacher)
//   language?:  'en'|'fr'|'rw'
//   storyId?:   string
//   role?:      'child'|'parent'|'teacher'
//   age?:       number
//   readingLevel?: number
//   forceWeb?:  boolean
//
// Response:
//   intent        — classified intent
//   knowledgeBlock — ready-to-inject text (for use in system prompt)
//   confidence    — 0–1
//   usedWebSearch — boolean
//   cacheHit      — boolean
//   attributionBlock — source attribution for parent/teacher display

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { routeKnowledge }            from '@/lib/knowledgeRouter';
import type { RouterLearnerProfile } from '@/lib/knowledgeRouter/types';

export const runtime = 'edge';

function safeRole(r: unknown): 'child' | 'parent' | 'teacher' {
  if (r === 'parent' || r === 'teacher') return r;
  return 'child';
}
function safeLang(l: unknown): string {
  if (l === 'fr' || l === 'rw') return l as string;
  return 'en';
}

export async function POST(req: NextRequest) {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question || question.length > 1000) {
    return NextResponse.json({ error: 'question required (max 1000 chars)' }, { status: 400 });
  }

  const learner: RouterLearnerProfile = {
    childId:      typeof body.childId === 'string'      ? body.childId      : null,
    childName:    typeof body.childName === 'string'     ? body.childName    : '',
    age:          typeof body.age === 'number'           ? body.age          : null,
    readingLevel: typeof body.readingLevel === 'number'  ? body.readingLevel : null,
    language:     safeLang(body.language),
    role:         safeRole(body.role),
  };

  const result = await routeKnowledge(supabase, {
    question,
    context:    typeof body.context === 'string' ? body.context : undefined,
    learner,
    storyId:    typeof body.storyId === 'string' ? body.storyId : null,
    forceWeb:   body.forceWeb === true,
    maxSources: typeof body.maxSources === 'number' ? Math.min(5, body.maxSources) : 3,
  });

  // Never expose the full knowledge block to clients — it's for server-side prompt injection
  // Return only the metadata + attribution for display
  return NextResponse.json({
    intent:           result.intent,
    intentConfidence: result.intentConfidence,
    confidence:       result.confidence,
    usedWebSearch:    result.usedWebSearch,
    cacheHit:         result.cacheHit,
    internalSufficient: result.internalSufficient,
    attributionBlock: result.attributionBlock,
    sourceCount:      result.sources.length,
    // knowledgeBlock intentionally NOT returned — inject server-side only
  });
}
