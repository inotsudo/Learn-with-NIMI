import supabase from "@/lib/supabaseClient";

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
