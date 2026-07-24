// ── AI Context Manager ────────────────────────────────────────────
// Assembles a LearnerContext from Supabase for use in AI prompts.
// Session-level cache (5-minute TTL) prevents redundant RPC calls.
// Client + server compatible — pass any SupabaseClient.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearnerContext, RecommendationCandidate } from './types';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  ctx: LearnerContext;
  ts:  number;
}

class NimiContextManager {
  private cache = new Map<string, CacheEntry>();

  async build(
    supabase:  SupabaseClient,
    childId:   string,
    force      = false
  ): Promise<LearnerContext> {
    const entry = this.cache.get(childId);
    if (!force && entry && Date.now() - entry.ts < TTL_MS) {
      return entry.ctx;
    }

    const { data, error } = await supabase.rpc('get_learner_context', {
      p_child_id: childId,
    });

    if (error || !data) {
      throw new Error(`[ContextManager] get_learner_context failed: ${error?.message ?? 'no data'}`);
    }

    const ctx = data as LearnerContext;
    this.cache.set(childId, { ctx, ts: Date.now() });
    return ctx;
  }

  invalidate(childId: string): void {
    this.cache.delete(childId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  // Serializes context into a concise string for injection into AI prompts.
  summarize(ctx: LearnerContext): string {
    const { child, stats, memories, recent_activity, recommendations } = ctx;

    const lines: string[] = [
      `Learner: ${child.name}, age ${child.age}, learning ${child.language}`,
      `Progress: ${stats.total_missions} missions · ${stats.total_stars} stars · ${stats.streak_days}-day streak`,
    ];

    const prefs = memories
      .filter(m => m.memory_type === 'preference' && m.confidence >= 0.65)
      .slice(0, 4)
      .map(m => {
        if (m.key === 'favorite_mission_type') return `favourite activity: ${String(m.value.type ?? '')}`;
        return `${m.key}: ${JSON.stringify(m.value)}`;
      });
    if (prefs.length > 0) lines.push(`Preferences: ${prefs.join(', ')}`);

    const struggles = memories
      .filter(m => m.memory_type === 'struggle' && m.confidence >= 0.5)
      .slice(0, 3)
      .map(m => m.key.replace('mission_type_', '').replace('_count', ''));
    if (struggles.length > 0) lines.push(`Needs support: ${struggles.join(', ')}`);

    const achievements = memories
      .filter(m => m.memory_type === 'achievement')
      .slice(0, 3)
      .map(m => m.key);
    if (achievements.length > 0) lines.push(`Achievements: ${achievements.join(', ')}`);

    const personality = memories
      .filter(m => m.memory_type === 'personality' && m.confidence >= 0.7)
      .map(m => `${m.key} (${String(m.value.level ?? 'detected')})`);
    if (personality.length > 0) lines.push(`Traits: ${personality.join(', ')}`);

    if (recent_activity.length > 0) {
      const recent = recent_activity
        .slice(0, 3)
        .map(a => `${a.mission_type} in "${a.story_title}"`)
        .join(', ');
      lines.push(`Recent: ${recent}`);
    }

    if (recommendations.length > 0) {
      const top = recommendations[0] as RecommendationCandidate;
      lines.push(`Recommended next: "${top.story_title}" (${top.reason})`);
    }

    return lines.join('\n');
  }

  // Quick read of cached context — undefined if not yet loaded.
  getCached(childId: string): LearnerContext | undefined {
    const entry = this.cache.get(childId);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > TTL_MS) { this.cache.delete(childId); return undefined; }
    return entry.ctx;
  }
}

// Module-level singleton so the cache persists across renders
export const contextManager = new NimiContextManager();

