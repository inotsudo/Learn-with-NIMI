// lib/plugins/types.ts — Plugin System types

// ── Manifest ──────────────────────────────────────────────────────────────────

export type PluginHookName =
  | 'beforeAI'      // mutate the AI request before it reaches callAI()
  | 'afterAI'       // mutate or augment the AI response
  | 'onEvent'       // react to a learner event (mission_completed, etc.)
  | 'onMission'     // react to a mission being rendered (inject content)
  | 'onStoryLoad';  // inject extra context when a story loads

export type PluginPermission =
  | 'read:learner'   // access child profile + stats
  | 'write:memory'   // upsert learner memories
  | 'emit:events'    // emit learner events
  | 'inject:prompt'  // append text to AI system prompts
  | 'read:content';  // read story/mission data

export interface PluginManifest {
  slug:        string;
  name:        string;
  version:     string;
  description: string;
  author:      string;
  hooks:       PluginHookName[];
  permissions: PluginPermission[];
  config_schema?: Record<string, {
    type:        'string' | 'number' | 'boolean';
    label:       string;
    default?:    unknown;
    required?:   boolean;
  }>;
  // Inline JS code for each hook (sandboxed eval — no imports, no DOM)
  handlers: Partial<Record<PluginHookName, string>>;
}

// ── Hook payloads ─────────────────────────────────────────────────────────────

export interface BeforeAIPayload {
  type:   string;
  prompt: string;
  system: string;
  childId?: string;
}

export interface AfterAIPayload {
  type:     string;
  response: string;
  childId?: string;
}

export interface OnEventPayload {
  eventType: string;
  childId:   string;
  payload:   Record<string, unknown>;
}

export interface OnMissionPayload {
  missionId:   string;
  missionType: string;
  storyId:     string;
  childId?:    string;
  language:    string;
}

export interface OnStoryLoadPayload {
  storyId:   string;
  childId?:  string;
  language:  string;
}

export type HookPayload =
  | BeforeAIPayload
  | AfterAIPayload
  | OnEventPayload
  | OnMissionPayload
  | OnStoryLoadPayload;

// ── Plugin execution context ──────────────────────────────────────────────────

export interface PluginContext {
  pluginId:  string;
  slug:      string;
  schoolId?: string;
  config:    Record<string, unknown>;
}

export interface PluginResult {
  // beforeAI: mutated prompt/system
  prompt?:  string;
  system?:  string;
  // afterAI: mutated response
  response?: string;
  // onMission / onStoryLoad: injected content blocks
  inject?: string;
  // any hook: memory upserts to apply
  memories?: Array<{
    childId:     string;
    type:        string;
    key:         string;
    value:       Record<string, unknown>;
    confidence?: number;
  }>;
  // any hook: events to emit
  events?: Array<{
    childId: string;
    type:    string;
    payload: Record<string, unknown>;
  }>;
}

// ── DB row shape (from get_school_plugins RPC) ────────────────────────────────

export interface InstalledPlugin {
  plugin_id:   string;
  slug:        string;
  name:        string;
  version:     string;
  hooks:       PluginHookName[];
  permissions: PluginPermission[];
  manifest:    PluginManifest;
  config:      Record<string, unknown>;
  enabled:     boolean;
}
