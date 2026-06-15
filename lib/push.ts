import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Sends a push payload to every subscription the parent has registered.
// Expired/unsubscribed endpoints (404/410) are pruned as we go.
export async function sendPushToParent(
  sb: SupabaseClient,
  parentId: string,
  payload: PushPayload
): Promise<{ sent: number }> {
  const { data: subs } = await sb
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("parent_id", parentId);

  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await sb.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return { sent };
}

// Human-readable category names for push text (English-only for v1 — no
// i18n system available server-side).
export const CATEGORY_LABELS: Record<string, string> = {
  morning: "Morning Songs",
  movement: "Move & Groove",
  artistic: "Arts & Crafts",
  histoire: "Stories",
  zoom: "Zoom Adventures",
  discovery: "Discovery",
  flipflop: "FlipFlop Books",
  coloring: "Coloring Studio",
};

// "morning-master-en" -> "Morning Songs Master"
export function formatBadgeLabel(slug: string): string {
  const base = slug.replace(/-(en|fr|rw)$/, "").replace(/-master$/, "");
  return `${CATEGORY_LABELS[base] ?? base} Master`;
}
