// ── Nimi Event Bus — client-side singleton ────────────────────────
// Lightweight pub/sub for learner events.
// emit() dispatches to local subscribers AND posts to /api/ai/event.
// Import this in client components only.

import type { AIEvent, AIEventType } from './types';

type Handler = (event: AIEvent) => void | Promise<void>;

class NimiEventBus {
  private listeners = new Map<string, Set<Handler>>();

  // Subscribe to a specific event type, or '*' for all events.
  // Returns an unsubscribe function.
  on(type: AIEventType | '*', handler: Handler): () => void {
    const key = type as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);
    return () => this.off(type, handler);
  }

  off(type: AIEventType | '*', handler: Handler): void {
    this.listeners.get(type as string)?.delete(handler);
  }

  async emit(event: AIEvent): Promise<void> {
    // 1. Dispatch to typed subscribers
    const typed = this.listeners.get(event.type);
    if (typed) {
      for (const h of typed) {
        try { await h(event); } catch (e) { console.warn('[EventBus]', e); }
      }
    }

    // 2. Dispatch to wildcard subscribers
    const wild = this.listeners.get('*');
    if (wild) {
      for (const h of wild) {
        try { await h(event); } catch (e) { console.warn('[EventBus]', e); }
      }
    }

    // 3. Fire-and-forget to server for persistence + memory inference
    void this._postToServer(event);
  }

  private async _postToServer(event: AIEvent): Promise<void> {
    try {
      // Pull the auth token from supabase localStorage session
      const token = this._getToken();
      if (!token) return; // not authenticated, skip server post

      await fetch('/api/ai/event', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify(event),
      });
    } catch {
      // Server post is best-effort; local subscribers already ran
    }
  }

  private _getToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Supabase stores the session in localStorage under this key pattern
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('supabase') && key.includes('auth-token')) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as { access_token?: string };
          return parsed.access_token ?? null;
        }
      }
    } catch {
      // localStorage not available (SSR guard or iframe)
    }
    return null;
  }
}

// Singleton — all components share the same bus
export const eventBus = new NimiEventBus();

// ── Convenience emitters ──────────────────────────────────────────

export function emitMissionCompleted(
  childId: string,
  payload: { missionType: string; missionId: string; storyId: string; storyTitle: string; stars: number }
) {
  void eventBus.emit({ type: 'mission_completed', childId, payload, timestamp: Date.now() });
}

export function emitStoryStarted(
  childId: string,
  payload: { storyId: string; storyTitle: string }
) {
  void eventBus.emit({ type: 'story_started', childId, payload, timestamp: Date.now() });
}

export function emitStoryFinished(
  childId: string,
  payload: { storyId: string; storyTitle: string }
) {
  void eventBus.emit({ type: 'story_finished', childId, payload, timestamp: Date.now() });
}

export function emitHintRequested(
  childId: string,
  payload: { missionType: string; missionId: string; storyId: string }
) {
  void eventBus.emit({ type: 'hint_requested', childId, payload, timestamp: Date.now() });
}

export function emitSessionStarted(childId: string) {
  void eventBus.emit({ type: 'session_started', childId, payload: {}, timestamp: Date.now() });
}

export function emitStreakEarned(childId: string, days: number) {
  void eventBus.emit({ type: 'streak_earned', childId, payload: { days }, timestamp: Date.now() });
}

export function emitStoryCreated(
  childId: string,
  payload: { heroName: string; language: string }
) {
  void eventBus.emit({ type: 'story_created', childId, payload, timestamp: Date.now() });
}

export function emitColoringCompleted(
  childId: string,
  payload: { creationId?: string; pageTitle?: string }
) {
  void eventBus.emit({ type: 'coloring_completed', childId, payload, timestamp: Date.now() });
}

export function emitReadingSessionStarted(
  childId: string,
  payload: { missionId?: string; storyId?: string; language?: string }
) {
  void eventBus.emit({ type: 'reading_session_started', childId, payload, timestamp: Date.now() });
}

export function emitQuizCompleted(
  childId: string,
  payload: { correct: boolean; questionType?: string; word?: string; storyId?: string }
) {
  void eventBus.emit({ type: 'quiz_completed', childId, payload, timestamp: Date.now() });
}

export function emitVocabularyReviewed(
  childId: string,
  payload: { word: string; correct: boolean; language?: string }
) {
  void eventBus.emit({ type: 'vocabulary_reviewed', childId, payload, timestamp: Date.now() });
}

export function emitCertificateEarned(
  childId: string,
  payload: { certType: string; certName?: string }
) {
  void eventBus.emit({ type: 'certificate_earned', childId, payload, timestamp: Date.now() });
}
