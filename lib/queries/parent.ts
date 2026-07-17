import supabase from "@/lib/supabaseClient";
import { qcached, qinvalidate, lscached, lsinvalidate } from "@/lib/queryCache";
import type { Parent, Child } from "./types";

// Skip the upsert if we've already ensured a parent row this browser session.
const ensuredForUser = new Set<string>();

// ─── Auth user cache ─────────────────────────────────────────────────────────
// getCachedUser() validates the JWT with the Supabase Auth server on
// every call. With 8+ functions all calling it independently, that's 8 network
// round-trips on cold page load. Cache the result for 30 s and deduplicate
// concurrent calls so all callers share one request.
const AUTH_TTL = 30_000;
let _authUser:    { user: ReturnType<typeof Object.create> | null; expires: number } | null = null;
let _authPending: Promise<ReturnType<typeof Object.create> | null> | null = null;

export async function getCachedUser() {
  if (_authUser && Date.now() < _authUser.expires) return _authUser.user;
  if (_authPending) return _authPending;
  _authPending = supabase.auth.getUser()
    .then(({ data: { user } }) => {
      _authUser    = { user, expires: Date.now() + AUTH_TTL };
      _authPending = null;
      return user;
    })
    .catch(err => { _authPending = null; throw err; });
  return _authPending;
}

/** Call on sign-out so the next getUser() hits the server. */
export function clearAuthCache() {
  _authUser    = null;
  _authPending = null;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function getParent(): Promise<Parent | null> {
  const user = await getCachedUser();
  if (!user) return null;
  return qcached(`parent:${user.id}`, async () => {
    const { data } = await supabase
      .from("parents")
      .select("*")
      .eq("id", user.id)
      .single();
    return data ?? null;
  });
}

// Ensures a parent row exists for the signed-in user.
// Handles accounts created before the new schema migration.
// Skips the upsert if already confirmed this browser session (module-level guard).
export async function ensureParentRow(): Promise<boolean> {
  const user = await getCachedUser();
  if (!user) { console.warn("[ensureParentRow] no session"); return false; }
  if (ensuredForUser.has(user.id)) return true;
  const { error } = await supabase.from("parents").upsert(
    { id: user.id, email: user.email ?? "", name: user.user_metadata?.name ?? "Parent" },
    { onConflict: "id" }
  );
  if (error) console.error("[ensureParentRow] error:", error.message, error.code);
  else ensuredForUser.add(user.id);
  return !error;
}

export async function updateParent(name: string): Promise<void> {
  const user = await getCachedUser();
  if (!user) return;
  await supabase.from("parents").update({ name }).eq("id", user.id);
  qinvalidate(`parent:${user.id}`);
}

export async function getChildren(): Promise<Child[]> {
  const user = await getCachedUser();
  if (!user) { console.warn("[getChildren] no session"); return []; }
  return lscached(`children:${user.id}`, 5 * 60_000, async () => {
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", user.id)
      .order("created_at");
    if (error) console.error("[getChildren] error:", error.message, error.code);
    return (data ?? []) as Child[];
  });
}

export async function createChild(
  child: Pick<Child, "name" | "avatar_url" | "language" | "age"> & Partial<Pick<Child, "favorite_category">>
): Promise<{ data: Child | null; error: string | null }> {
  const user = await getCachedUser();
  if (!user) return { data: null, error: "Not signed in" };
  const parentOk = await ensureParentRow();
  if (!parentOk) return { data: null, error: "Could not create parent profile" };

  // First child is free; any additional child requires an active subscription.
  const { count } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user.id);

  if ((count ?? 0) >= 1) {
    const { data: sub } = await supabase
      .from("nimipiko_subscriptions")
      .select("id")
      .eq("parent_id", user.id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle();
    if (!sub) return { data: null, error: "subscription_required" };
  }

  const { data, error } = await supabase
    .from("children")
    .insert({ ...child, parent_id: user.id })
    .select()
    .single();
  if (error) console.error("[createChild]", error);
  else { qinvalidate(`children:${user.id}`); lsinvalidate(`children:${user.id}`); }
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
  const [user, { data: current }] = await Promise.all([
    getCachedUser(),
    supabase.from("children").select("language").eq("id", childId).maybeSingle(),
  ]);

  await supabase.from("children").update({ language }).eq("id", childId);

  if (user) { qinvalidate(`children:${user.id}`); lsinvalidate(`children:${user.id}`); }

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
  const user = await getCachedUser();
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
  const user = await getCachedUser();
  if (!user) return;
  await supabase.from("parental_settings").upsert({
    parent_id: user.id,
    child_id: childId,
    ...settings,
  });
}
