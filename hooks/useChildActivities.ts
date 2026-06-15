"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

export interface Activity {
  id: string;
  child_id: string;
  mission_id: string;
  completed_at: string | null;
  mission?: { title: string; type: string };
}

export function useChildActivities(childId?: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!childId) { setActivities([]); setIsReady(true); return; }

        const { data, error: fetchError } = await supabase
          .from("child_progress")
          .select("id, child_id, mission_id, completed_at, missions(title, type)")
          .eq("child_id", childId)
          .order("completed_at", { ascending: false });

        if (fetchError) throw fetchError;
        setActivities((data ?? []) as Activity[]);
      } catch (err: any) {
        console.error("Failed to load activities:", err);
        setError(err.message || "Unknown error");
        setActivities([]);
      } finally {
        setIsReady(true);
      }
    };
    load();
  }, [childId]);

  return { activities, isReady, error };
}
