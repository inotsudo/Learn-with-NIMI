// lib/ai/chatHandler.ts
// Shared core for /api/ai and /api/v1/ai/chat.
// Both routes do identical work after auth: build context → call AI → classify errors.
// Centralising here means a fix or feature lands in both routes at once.

import { callAI, buildSystemPrompt } from '@/lib/ai/aiService';
import { contextManager } from '@/lib/ai/contextManager';
import type { AICallType } from '@/lib/ai/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AICallOptions {
  type:        AICallType;
  prompt:      string;
  childId?:    string;
  system?:     string;
  maxTokens?:  number;
  signal?:     AbortSignal;
}

export interface AICallResult {
  content: string;
  model:   string;
  usage: {
    input_tokens:  number;
    output_tokens: number;
  };
}

export interface AICallError {
  message:   string;
  code:      string;
  retryable: boolean;
  status:    number;
}

export function classifyAIError(e: unknown): AICallError {
  const msg  = e instanceof Error ? e.message : String(e);
  const name = e instanceof Error ? e.name    : '';

  if (name === 'AbortError' || msg.includes('aborted') || msg.includes('timed out')) {
    return { message: 'The request timed out. Please try again.', code: 'timeout', retryable: true, status: 504 };
  }
  if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
    return { message: 'The AI is very busy right now. Please try again in a moment.', code: 'rate_limit', retryable: true, status: 429 };
  }
  if (msg.includes('503') || msg.includes('502') || msg.includes('529') || msg.toLowerCase().includes('unavailable')) {
    return { message: 'The AI service is temporarily unavailable. Please try again.', code: 'service_unavailable', retryable: true, status: 503 };
  }
  if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('unauthorized')) {
    return { message: 'AI service authentication failed. Please contact support.', code: 'auth_error', retryable: false, status: 503 };
  }
  return { message: 'Something went wrong. Please try again.', code: 'unknown', retryable: false, status: 500 };
}

export async function runAICall(
  db: SupabaseClient,
  opts: AICallOptions,
): Promise<AICallResult> {
  const { type, prompt, childId, system, maxTokens, signal } = opts;

  // Build system prompt — personalised when childId is present
  let resolvedSystem = system;
  if (!resolvedSystem && childId) {
    try {
      const ctx = await contextManager.build(db, childId);
      resolvedSystem = buildSystemPrompt(type, ctx);
    } catch {
      resolvedSystem = buildSystemPrompt(type);
    }
  } else if (!resolvedSystem) {
    resolvedSystem = buildSystemPrompt(type);
  }

  const result = await callAI({
    type,
    prompt: prompt.slice(0, 8000),
    system: resolvedSystem,
    maxTokens,
    signal,
  });

  return {
    content: result.content,
    model:   result.model,
    usage: {
      input_tokens:  result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
    },
  };
}
