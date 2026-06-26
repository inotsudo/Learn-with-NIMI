// ══════════════════════════════════════════════════════════════
//  NIMIPIKO — Story Certificate Repository (SA-1.3)
//
//  Data access for story certificates.
//  Calls RPCs: get_story_certificate
// ══════════════════════════════════════════════════════════════

import supabase from "./supabaseClient";
import type { StoryCertificate } from "./story-types";

export async function getStoryCertificate(
  childId: string,
  storyId: string,
  language: string
): Promise<StoryCertificate | null> {
  const { data, error } = await supabase.rpc("get_story_certificate", {
    p_child_id: childId,
    p_story_id: storyId,
    p_language: language,
  });
  if (error) {
    console.error("[getStoryCertificate]", error);
    return null;
  }
  const rows = data as StoryCertificate[] | null;
  return rows?.[0] ?? null;
}
