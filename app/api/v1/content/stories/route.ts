// app/api/v1/content/stories/route.ts
// GET /api/v1/content/stories — public story catalog
// Requires scope: read:content
// Query params: language, ageMin, ageMax, limit (max 50), offset

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKeyRequest, apiOk, apiError } from '@/lib/api/apiKeyAuth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await validateApiKeyRequest(req.headers.get('authorization'), 'read:content'); }
  catch (r) { return r as Response; }

  const p        = req.nextUrl.searchParams;
  const language = p.get('language') ?? 'en';
  const ageMin   = parseInt(p.get('ageMin')  ?? '2',  10);
  const ageMax   = parseInt(p.get('ageMax')  ?? '12', 10);
  const limit    = Math.min(parseInt(p.get('limit')  ?? '20', 10), 50);
  const offset   = Math.max(parseInt(p.get('offset') ?? '0',  10), 0);

  if (!['en','fr','rw'].includes(language)) return apiError('Invalid language', 400);

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error, count } = await db
    .from('stories')
    .select(`
      id, title, emoji, description, language,
      age_min, age_max, mission_count,
      story_categories(name)
    `, { count: 'exact' })
    .eq('language', language)
    .gte('age_min', ageMin)
    .lte('age_max', ageMax)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(error.message, 500);

  return apiOk({
    stories: data ?? [],
    total:   count ?? 0,
    limit,
    offset,
  }, ctx);
}
