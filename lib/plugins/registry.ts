// lib/plugins/registry.ts — Plugin registry: fetch + cache installed plugins
// Edge-safe module-level cache (5-minute TTL per school).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InstalledPlugin, PluginHookName } from './types';

interface CacheEntry {
  plugins:   InstalledPlugin[];
  expiresAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 min
const cache     = new Map<string, CacheEntry>();

// ── getSchoolPlugins ──────────────────────────────────────────────────────────
// Returns all enabled installed plugins for a school, cached for 5 minutes.

export async function getSchoolPlugins(
  db:       SupabaseClient,
  schoolId: string,
): Promise<InstalledPlugin[]> {
  const cached = cache.get(schoolId);
  if (cached && cached.expiresAt > Date.now()) return cached.plugins;

  const { data, error } = await db.rpc('get_school_plugins', { p_school_id: schoolId });
  if (error || !data) return [];

  const plugins = (data as InstalledPlugin[]).filter(p => p.enabled);
  cache.set(schoolId, { plugins, expiresAt: Date.now() + CACHE_TTL });
  return plugins;
}

// ── getPluginsForHook ─────────────────────────────────────────────────────────
// Returns only plugins that register a specific hook.

export async function getPluginsForHook(
  db:       SupabaseClient,
  schoolId: string,
  hook:     PluginHookName,
): Promise<InstalledPlugin[]> {
  const all = await getSchoolPlugins(db, schoolId);
  return all.filter(p => p.hooks.includes(hook));
}

// ── invalidateSchoolCache ─────────────────────────────────────────────────────

export function invalidateSchoolCache(schoolId: string): void {
  cache.delete(schoolId);
}
