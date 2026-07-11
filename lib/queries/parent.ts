import supabase from "@/lib/supabaseClient";
import type { Parent, Child } from "./types";

export async function getParent(): Promise<Parent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("parents")
    .select("*")
    .eq("id", user.id)
    .single();
  return data ?? null;
}

// Ensures a parent row exists for the signed-in user.
// Handles accounts created before the new schema migration.
export async function ensureParentRow(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.warn("[ensureParentRow] no session"); return false; }
  const { error } = await supabase.from("parents").upsert(
    { id: user.id, email: user.email ?? "", name: user.user_metadata?.name ?? "Parent" },
    { onConflict: "id" }
  );
  if (error) console.error("[ensureParentRow] error:", error.message, error.code);
  return !error;
}

export async function updateParent(name: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("parents").update({ name }).eq("id", user.id);
}

export async function getChildren(): Promise<Child[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { console.warn("[getChildren] no session"); return []; }
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", user.id)
    .order("created_at");
  if (error) console.error("[getChildren] error:", error.message, error.code);
  return (data ?? []) as Child[];
}

export async function createChild(
  child: Pick<Child, "name" | "avatar_url" | "language" | "age"> & Partial<Pick<Child, "favorite_category">>
): Promise<{ data: Child | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not signed in" };
  const parentOk = await ensureParentRow();
  if (!parentOk) return { data: null, error: "Could not create parent profile" };
  const { data, error } = await supabase
    .from("children")
    .insert({ ...child, parent_id: user.id })
    .select()
    .single();
  if (error) console.error("[createChild]", error);
  return { data: (data ?? null) as Child | null, error: error?.message ?? null };
}

export async function updateChild(
  childId: string,
  updates: Partial<Pick<Child, "name" | "avatar_url" | "language" | "age">>
): Promise<void> {
  await supabase.from("children").update(updates).eq("id", childId);
}

// Switching language starts a fresh per-category mission sequence for the
// child (child_progress is partitioned by language) — prior-language
// progress, stars and badges are preserved untouched.
export async function updateChildLanguage(
  childId: string,
  language: "en" | "fr" | "rw"
): Promise<void> {
  const { data: current } = await supabase
    .from("children")
    .select("language")
    .eq("id", childId)
    .maybeSingle();

  await supabase.from("children").update({ language }).eq("id", childId);

  const fromLanguage = current?.language as "en" | "fr" | "rw" | undefined;
  if (fromLanguage && fromLanguage !== language) {
    await supabase.from("language_switch_log").insert({
      child_id: childId,
      from_language: fromLanguage,
      to_language: language,
    });
  }
}

export async function getParentalSettings(
  childId: string
): Promise<import("./types").ParentalSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("parental_settings")
    .select("*")
    .eq("parent_id", user.id)
    .eq("child_id", childId)
    .single();
  return (data ?? null) as import("./types").ParentalSettings | null;
}

export async function updateParentalSettings(
  childId: string,
  settings: Partial<Pick<import("./types").ParentalSettings, "daily_limit_minutes" | "notifications_enabled">>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("parental_settings").upsert({
    parent_id: user.id,
    child_id: childId,
    ...settings,
  });
}
