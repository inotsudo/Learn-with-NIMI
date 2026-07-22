// ── AI Orchestrator ───────────────────────────────────────────────
// Centralises the "which knowledge sources does THIS request need?" decision.
// Routes call orchestrate() → get back an OrchestratedContext they can inject
// directly into their system prompt without manually wiring every source.
//
// Design principle: orchestrate() is a thin coordinator, not a god object.
// Every knowledge source still lives in its own module (story, memory, goals…).
// The orchestrator only decides WHAT to fetch and assembles the final string.
//
// Consumers: Nimi chat, voice chat, quiz/lesson generation
// Non-consumers: parent-ai, teacher-insights (they have their own context)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearnerMemory, ConversationSummary } from '@/lib/ai/types';
import {
  formatConversationHistoryForPrompt,
  getRecentConversationContext,
} from './conversationMemory';

// ── Request spec — callers declare what they need ─────────────────

export interface OrchestrateRequest {
  supabase:       SupabaseClient;
  childId:        string | null;
  language:       string;

  // Which knowledge sources to include
  needs: {
    memory?:       boolean;   // learner memories (always fast — cached)
    conversation?: boolean;   // past session summaries
    curriculum?:   boolean;   // not yet wired — placeholder for future
    community?:    boolean;   // not yet wired — placeholder
    achievements?: boolean;   // achievement memories only
  };
}

// ── Output ────────────────────────────────────────────────────────

export interface OrchestratedContext {
  memories:            LearnerMemory[];
  conversationHistory: ConversationSummary[];
  // Formatted string ready for system prompt injection
  systemBlock:         string;
}

// ── Core ─────────────────────────────────────────────────────────

export async function orchestrate(
  req: OrchestrateRequest
): Promise<OrchestratedContext> {
  const { supabase, childId, needs } = req;

  if (!childId) {
    return { memories: [], conversationHistory: [], systemBlock: '' };
  }

  // Parallel fetches for each requested source
  const fetches: Promise<void>[] = [];
  let memories:            LearnerMemory[]      = [];
  let conversationHistory: ConversationSummary[] = [];

  if (needs.memory || needs.achievements) {
    fetches.push(
      Promise.resolve(
        supabase.rpc('get_learner_memories', { p_child_id: childId, p_types: null })
      )
        .then(r => {
          const all = (r.data as LearnerMemory[] | null) ?? [];
          memories  = needs.achievements
            ? all.filter(m => m.memory_type === 'achievement')
            : all;
        })
        .catch(() => { /* silent fail */ })
    );
  }

  if (needs.conversation) {
    fetches.push(
      getRecentConversationContext(supabase, childId, 3)
        .then(h => { conversationHistory = h; })
        .catch(() => { /* silent fail */ })
    );
  }

  await Promise.all(fetches);

  // Assemble system block
  const blocks: string[] = [];

  if (memories.length > 0) {
    blocks.push(formatMemoriesBlock(memories));
  }

  if (conversationHistory.length > 0) {
    const historyBlock = formatConversationHistoryForPrompt(conversationHistory);
    if (historyBlock) blocks.push(historyBlock);
  }

  return {
    memories,
    conversationHistory,
    systemBlock: blocks.join('\n\n'),
  };
}

// ── Formatters ────────────────────────────────────────────────────

function formatMemoriesBlock(memories: LearnerMemory[]): string {
  const prefs = memories
    .filter(m => m.memory_type === 'preference' && m.confidence >= 0.6)
    .slice(0, 4)
    .map(m => {
      if (m.key === 'favorite_mission_type') return `favourite activity: ${String(m.value.type ?? '')}`;
      return `${m.key}: ${JSON.stringify(m.value)}`;
    });

  const struggles = memories
    .filter(m => m.memory_type === 'struggle' && m.confidence >= 0.5)
    .slice(0, 3)
    .map(m => m.key.replace('mission_type_', '').replace(/_/g, ' '));

  const achievements = memories
    .filter(m => m.memory_type === 'achievement')
    .slice(0, 4)
    .map(m => m.key.replace(/_/g, ' '));

  const personality = memories
    .filter(m => m.memory_type === 'personality' && m.confidence >= 0.7)
    .map(m => `${m.key} (${String(m.value.level ?? 'detected')})`);

  const skill = memories
    .filter(m => m.memory_type === 'skill' && m.key.startsWith('vocab_mastered_'))
    .slice(0, 8)
    .map(m => (m.value?.word as string | undefined) ?? m.key.replace('vocab_mastered_', ''));

  const lines: string[] = ['## Learner Memory'];
  if (prefs.length > 0)       lines.push(`Preferences: ${prefs.join(', ')}`);
  if (struggles.length > 0)   lines.push(`Needs support: ${struggles.join(', ')}`);
  if (achievements.length > 0) lines.push(`Achievements: ${achievements.join(', ')}`);
  if (personality.length > 0) lines.push(`Learning style: ${personality.join(', ')}`);
  if (skill.length > 0)       lines.push(`Vocab mastered: ${skill.join(', ')}`);

  return lines.join('\n');
}

// ── Convenience: append orchestrated context to a system prompt ───

export function appendOrchestratedContext(
  systemPrompt: string,
  ctx:          OrchestratedContext
): string {
  if (!ctx.systemBlock) return systemPrompt;
  return `${systemPrompt}\n\n${ctx.systemBlock}`;
}
