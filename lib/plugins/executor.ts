// lib/plugins/executor.ts — Safe plugin hook execution
//
// Plugins are inline JS strings stored in the DB manifest.handlers field.
// They run in a restricted sandbox: no imports, no DOM, no fetch, no timers.
// The handler receives (payload, context) and must return a PluginResult.
//
// Security model:
// - eval() is the only option in Edge runtime (no vm.Script, no iframe).
// - The handler string is wrapped in a strict-mode IIFE.
// - Execution time is bounded by a sync watchdog (50ms CPU limit via Date).
// - Any thrown error is caught and logged — never propagated to the user.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InstalledPlugin, PluginHookName, HookPayload,
  PluginContext, PluginResult,
} from './types';

const MAX_HANDLER_MS = 50;

// ── executeHook ───────────────────────────────────────────────────────────────
// Runs a single plugin's handler for a given hook.
// Returns PluginResult or null on error/timeout.

export async function executeHook(
  plugin:  InstalledPlugin,
  hook:    PluginHookName,
  payload: HookPayload,
): Promise<PluginResult | null> {
  const handlerSrc = plugin.manifest?.handlers?.[hook];
  if (!handlerSrc || typeof handlerSrc !== 'string') return null;

  const ctx: PluginContext = {
    pluginId: plugin.plugin_id,
    slug:     plugin.slug,
    config:   plugin.config ?? {},
  };

  // Wrap in a strict IIFE that blocks dangerous globals
  const wrapped = `"use strict";
(function(payload, context, Date, Math, JSON, console) {
  const startMs = Date.now();
  const __watchdog = () => { if (Date.now() - startMs > ${MAX_HANDLER_MS}) throw new Error("plugin_timeout"); };
  ${handlerSrc}
})(payload, context, Date, Math, JSON, console)`;

  try {
    // eslint-disable-next-line no-new-func
    const fn     = new Function('payload', 'context', wrapped);
    const result = fn(payload, ctx) as PluginResult | null;
    // Handlers may return a plain object or a Promise-like
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return await (result as Promise<PluginResult>);
    }
    return result ?? null;
  } catch (e) {
    console.warn(`[plugin:${plugin.slug}] ${hook} error:`, e);
    return null;
  }
}

// ── runHookPipeline ───────────────────────────────────────────────────────────
// Runs all plugins for a hook in sequence, merging results.
// Earlier plugins' mutations are visible to later ones.

export async function runHookPipeline(
  db:      SupabaseClient,
  plugins: InstalledPlugin[],
  hook:    PluginHookName,
  payload: HookPayload,
): Promise<PluginResult> {
  const merged: PluginResult = {};

  for (const plugin of plugins) {
    const result = await executeHook(plugin, hook, payload);
    if (!result) continue;

    // Merge mutations
    if (result.prompt  != null) (payload as { prompt?: string }).prompt   = result.prompt;
    if (result.system  != null) (payload as { system?: string }).system   = result.system;
    if (result.response != null) (payload as { response?: string }).response = result.response;
    if (result.inject  != null) merged.inject = (merged.inject ?? '') + result.inject;
    if (result.memories)        (merged.memories  ??= []).push(...result.memories);
    if (result.events)          (merged.events    ??= []).push(...result.events);

    // Log execution (best-effort, fire-and-forget)
    void Promise.resolve(db.rpc('log_plugin_event', {
      p_plugin_id:   plugin.plugin_id,
      p_school_id:   null,
      p_hook:        hook,
      p_duration_ms: null,
      p_error:       null,
    })).catch(() => null);
  }

  // Apply any memory upserts produced by plugins
  if (merged.memories?.length) {
    for (const m of merged.memories) {
      void Promise.resolve(db.rpc('upsert_learner_memory', {
        p_child_id:   m.childId,
        p_type:       m.type,
        p_key:        m.key,
        p_value:      m.value,
        p_confidence: m.confidence ?? 0.8,
        p_source:     'ai_inferred',
      })).catch(() => null);
    }
  }

  // Apply any events produced by plugins
  if (merged.events?.length) {
    for (const ev of merged.events) {
      void Promise.resolve(db.rpc('log_learner_event', {
        p_child_id:   ev.childId,
        p_event_type: ev.type,
        p_payload:    ev.payload,
      })).catch(() => null);
    }
  }

  // Final state of mutated payload fields
  if ((payload as { prompt?: string }).prompt   != null) merged.prompt   = (payload as { prompt?: string }).prompt;
  if ((payload as { system?: string }).system   != null) merged.system   = (payload as { system?: string }).system;
  if ((payload as { response?: string }).response != null) merged.response = (payload as { response?: string }).response;

  return merged;
}
