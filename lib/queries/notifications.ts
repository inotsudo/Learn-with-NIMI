import supabase from "@/lib/supabaseClient";
import type { CompleteCurriculumMissionResult } from "./types";

export async function createNotification(
  parentId: string,
  notification: { title: string; body: string; type: string; url?: string | null }
): Promise<void> {
  await supabase.from("notifications").insert({
    parent_id: parentId,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    url: notification.url ?? null,
    read: false,
  });
}

// Fire-and-forget: tells the server to push a notification to the parent
// about this mission completion. Never throws into the caller.
export async function notifyPushOnCompletion(
  childId: string,
  category: string,
  result: CompleteCurriculumMissionResult
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/push/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        child_id: childId,
        category,
        stars_earned: result.stars_earned,
        new_badges: result.new_badges,
        new_certificate: result.new_certificate,
      }),
    });
  } catch {
    // best-effort only
  }
}
