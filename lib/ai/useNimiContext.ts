'use client';
import { useEffect, useState, useRef } from 'react';
import supabaseClient from '@/lib/supabaseClient';
import { contextManager } from './contextManager';
import type { LearnerContext } from './types';

export function useNimiContext(childId: string | null | undefined) {
  const [context, setContext] = useState<LearnerContext | null>(
    childId ? contextManager.getCached(childId) ?? null : null
  );
  const [loading, setLoading] = useState(!context && !!childId);
  const [error,   setError]   = useState<string | null>(null);
  const built = useRef(false);

  useEffect(() => {
    if (!childId) return;
    if (built.current) return;
    built.current = true;

    void (async () => {
      try {
        const ctx = await contextManager.build(supabaseClient, childId);
        setContext(ctx);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load context');
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  const refresh = () => {
    if (!childId) return;
    built.current = false;
    contextManager.invalidate(childId);
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const ctx = await contextManager.build(supabaseClient, childId, true);
        setContext(ctx);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load context');
      } finally {
        setLoading(false);
      }
    })();
  };

  return { context, loading, error, refresh };
}
