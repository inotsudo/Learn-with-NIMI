// lib/sdk/NimiClient.ts — Nimi Platform SDK client
// Works in browser, Node.js, and Edge runtimes.
// All methods are async and throw NimiApiError on failure.

import type {
  NimiClientOptions,
  LearnerProfile,
  ChatRequest, ChatResponse,
  StoryListOptions, StoryListResponse,
  EventRequest, EventResponse,
  ApiKeyInfo, CreateKeyRequest, CreateKeyResponse,
} from './types';
import { NimiApiError } from './types';

const DEFAULT_BASE = 'https://app.nimipiko.com';
const API_VERSION  = 'v1';

export class NimiClient {
  private readonly apiKey:  string;
  private readonly baseUrl: string;

  constructor(options: NimiClientOptions) {
    if (!options.apiKey) throw new Error('NimiClient: apiKey is required');
    this.apiKey  = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  }

  // ── Core fetch ──────────────────────────────────────────────────────────────

  private async fetch<T>(
    path:    string,
    init:    RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/${API_VERSION}${path}`;
    const res  = await fetch(url, {
      ...init,
      headers: {
        Authorization:  `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Nimi-SDK':   '1.0',
        ...(init.headers ?? {}),
      },
    });

    const body = await res.json().catch(() => ({ error: res.statusText })) as
      T & { error?: string };

    if (!res.ok) {
      throw new NimiApiError(
        (body as { error?: string }).error ?? `HTTP ${res.status}`,
        res.status,
      );
    }

    return body;
  }

  // ── Learner ─────────────────────────────────────────────────────────────────

  /** Fetch a learner's full profile: progress, memories, and recommendations. */
  async getLearner(childId: string): Promise<LearnerProfile> {
    return this.fetch<LearnerProfile>(`/learner/${encodeURIComponent(childId)}`);
  }

  // ── AI Chat ─────────────────────────────────────────────────────────────────

  /** Send a message to Nimi AI. Optionally personalized with a childId. */
  async chat(req: ChatRequest): Promise<ChatResponse> {
    return this.fetch<ChatResponse>('/ai/chat', {
      method: 'POST',
      body:   JSON.stringify(req),
    });
  }

  // ── Content ─────────────────────────────────────────────────────────────────

  /** List published stories with optional filters. */
  async listStories(opts: StoryListOptions = {}): Promise<StoryListResponse> {
    const params = new URLSearchParams();
    if (opts.language) params.set('language', opts.language);
    if (opts.ageMin   != null) params.set('ageMin',   String(opts.ageMin));
    if (opts.ageMax   != null) params.set('ageMax',   String(opts.ageMax));
    if (opts.limit    != null) params.set('limit',    String(opts.limit));
    if (opts.offset   != null) params.set('offset',   String(opts.offset));
    const qs = params.toString();
    return this.fetch<StoryListResponse>(`/content/stories${qs ? `?${qs}` : ''}`);
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  /** Log a learner event (triggers memory inference server-side). */
  async logEvent(req: EventRequest): Promise<EventResponse> {
    return this.fetch<EventResponse>('/events', {
      method: 'POST',
      body:   JSON.stringify(req),
    });
  }

  // ── API Key management (session auth) ────────────────────────────────────────
  // These methods require a Supabase session token, not an API key.
  // Use them in your own dashboard to manage keys.

  /** List all API keys for the authenticated user. */
  async listKeys(sessionToken: string): Promise<ApiKeyInfo[]> {
    const url = `${this.baseUrl}/api/${API_VERSION}/keys`;
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
    });
    const body = await res.json() as { keys: ApiKeyInfo[]; error?: string };
    if (!res.ok) throw new NimiApiError(body.error ?? `HTTP ${res.status}`, res.status);
    return body.keys;
  }

  /** Create a new API key. The raw key is returned once — store it securely. */
  async createKey(req: CreateKeyRequest, sessionToken: string): Promise<CreateKeyResponse> {
    const url = `${this.baseUrl}/api/${API_VERSION}/keys`;
    const res  = await fetch(url, {
      method:  'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(req),
    });
    const body = await res.json() as CreateKeyResponse & { error?: string };
    if (!res.ok) throw new NimiApiError(body.error ?? `HTTP ${res.status}`, res.status);
    return body;
  }

  /** Revoke an API key by ID. */
  async revokeKey(keyId: string, sessionToken: string): Promise<void> {
    const url = `${this.baseUrl}/api/${API_VERSION}/keys?id=${encodeURIComponent(keyId)}`;
    const res  = await fetch(url, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new NimiApiError(body.error ?? `HTTP ${res.status}`, res.status);
    }
  }
}
