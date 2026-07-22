"use client";

import { useState } from "react";
import supabase from "@/lib/supabaseClient";

type MaterialType = "lesson" | "quiz" | "homework";

export function useSaveMaterial(teacherId: string | undefined) {
  const [saving,  setSaving]  = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function save(opts: {
    type:       MaterialType;
    title:      string;
    storyTitle: string | undefined;
    language:   string;
    content:    unknown;
  }): Promise<boolean> {
    if (!teacherId) return false;
    setSaving(true);
    setSavedId(null);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("save_teacher_material", {
      p_teacher_id:  teacherId,
      p_type:        opts.type,
      p_title:       opts.title,
      p_story_title: opts.storyTitle ?? null,
      p_language:    opts.language,
      p_content:     opts.content,
    });

    setSaving(false);

    if (rpcError || !data) {
      setError("Couldn't save. Try again.");
      return false;
    }

    setSavedId(data as string);
    return true;
  }

  function reset() {
    setSavedId(null);
    setError(null);
  }

  return { save, saving, savedId, error, reset };
}
