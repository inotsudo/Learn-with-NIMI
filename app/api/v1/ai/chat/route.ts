// app/api/v1/ai/chat/route.ts — Public API AI endpoint (API key auth)
// POST { childId?, message, language?, system? }
// Requires scope: ai:chat
// Returns { reply, model, language, usage }

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKeyRequest, apiOk, apiError } from '@/lib/api/apiKeyAuth';
import { runAICall, classifyAIError } from '@/lib/ai/chatHandler';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await validateApiKeyRequest(req.headers.get('authorization'), 'ai:chat'); }
  catch (r) { return r as Response; }

  let body: {
    childId?:  string;
    message:   string;
    language?: string;
    system?:   string;
  };
  try { body = await req.json(); }
  catch { return apiError('Invalid JSON', 400); }

  const { childId, message, language = 'en', system } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return apiError('message is required', 400);
  }
  if (message.length > 2000) return apiError('message too long (max 2000 chars)', 400);

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  if (childId) {
    const { data: child } = await db
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('parent_id', ctx.userId)
      .single();
    if (!child) return apiError('Child not found or access denied', 403);
  }

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 20_000);

  try {
    const result = await runAICall(db, {
      type:   'nimi_chat',
      prompt: message.trim(),
      childId,
      system,
      signal: controller.signal,
    });

    return apiOk({
      reply:    result.content,
      model:    result.model,
      language,
      usage: {
        input_tokens:  result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
      },
    }, ctx);
  } catch (e) {
    const { message: msg, code, retryable, status } = classifyAIError(e);
    return apiError(`${msg} [${code}]${retryable ? ' (retryable)' : ''}`, status);
  } finally {
    clearTimeout(timeout);
  }
}
