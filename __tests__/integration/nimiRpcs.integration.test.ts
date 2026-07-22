// @vitest-environment node
//
// Integration tests against the real remote Supabase.
// Tests actual Postgres RLS, upsert conflict semantics, and RPC ownership.
//
// Required env vars (all others come from .env.local):
//   SUPABASE_SERVICE_ROLE_KEY — service role, used only for setup/teardown
//
// Skip gracefully when env vars are absent so CI keeps passing.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Constants ─────────────────────────────────────────────────────────────────

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const RUN = !!(URL && ANON && SRK);

// ── State shared across tests ─────────────────────────────────────────────────

let serviceClient: SupabaseClient;
let user1Client:   SupabaseClient;   // authenticated as test user 1 (owns child1)
let child1Id: string;                // owned by user 1
let child2Id: string;                // owned by user 2 — foreign to user 1
let user1Id:  string;
let user2Id:  string;

// ── Helpers ───────────────────────────────────────────────────────────────────

function authClient(token: string): SupabaseClient {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth:   { persistSession: false },
  });
}

// ── Suite (skipped when env vars absent) ─────────────────────────────────────

const suite = RUN ? describe : describe.skip;

suite("Nimi AI — Remote RLS & RPC Integration", () => {

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    serviceClient = createClient(URL, ANON, {
      global: { headers: { Authorization: `Bearer ${SRK}` } },
      auth:   { persistSession: false },
    });

    // Use service role to create two isolated test users
    const run   = Date.now().toString(36);
    const email1 = `nimi-int-1-${run}@test.invalid`;
    const email2 = `nimi-int-2-${run}@test.invalid`;
    const pass   = `Int3gr@tion-${run}`;

    const { data: u1, error: e1 } = await serviceClient.auth.admin.createUser({
      email: email1, password: pass, email_confirm: true,
    });
    const { data: u2, error: e2 } = await serviceClient.auth.admin.createUser({
      email: email2, password: pass, email_confirm: true,
    });

    if (e1 || e2 || !u1?.user || !u2?.user) {
      throw new Error(`User creation failed: ${e1?.message ?? e2?.message}`);
    }

    user1Id = u1.user.id;
    user2Id = u2.user.id;

    // Insert children (trigger already created parents rows)
    const { data: c1, error: ec1 } = await serviceClient
      .from("children")
      .insert({ parent_id: user1Id, name: "IntTestChild1", language: "en", age: 7 })
      .select("id")
      .single();
    const { data: c2, error: ec2 } = await serviceClient
      .from("children")
      .insert({ parent_id: user2Id, name: "IntTestChild2", language: "en", age: 8 })
      .select("id")
      .single();

    if (ec1 || ec2 || !c1 || !c2) {
      throw new Error(`Child creation failed: ${ec1?.message ?? ec2?.message}`);
    }

    child1Id = c1.id;
    child2Id = c2.id;

    // Sign in as user 1
    const { data: session, error: es } = await createClient(URL, ANON, {
      auth: { persistSession: false },
    }).auth.signInWithPassword({ email: email1, password: pass });

    if (es || !session?.session) {
      throw new Error(`Sign-in failed: ${es?.message}`);
    }

    user1Client = authClient(session.session.access_token);
  }, 30_000);

  afterAll(async () => {
    if (!serviceClient) return;
    // Clean up in reverse dependency order
    await serviceClient.from("learner_memories").delete().eq("child_id", child1Id);
    await serviceClient.from("learner_memories").delete().eq("child_id", child2Id);
    await serviceClient.from("learner_events").delete().eq("child_id", child1Id);
    await serviceClient.from("proactive_queue").delete().eq("child_id", child1Id);
    await serviceClient.from("conversation_summaries").delete().eq("child_id", child1Id);
    await serviceClient.from("children").delete().eq("id", child1Id);
    await serviceClient.from("children").delete().eq("id", child2Id);
    await serviceClient.auth.admin.deleteUser(user1Id);
    await serviceClient.auth.admin.deleteUser(user2Id);
  }, 20_000);

  // ── 1. Learner memory CRUD + ownership ────────────────────────────────────

  it("upserts a memory on own child", async () => {
    const { error } = await user1Client.rpc("upsert_learner_memory", {
      p_child_id:   child1Id,
      p_type:       "preference",
      p_key:        "int_test_pref",
      p_value:      { value: "reading" },
      p_confidence: 0.9,
      p_source:     "system",
    });
    expect(error).toBeNull();
  });

  it("upsert is idempotent — second call updates, does not duplicate", async () => {
    // First upsert
    await user1Client.rpc("upsert_learner_memory", {
      p_child_id: child1Id, p_type: "preference",
      p_key: "int_test_idempotent", p_value: { count: 1 }, p_confidence: 0.5, p_source: "system",
    });
    // Second upsert with different value
    await user1Client.rpc("upsert_learner_memory", {
      p_child_id: child1Id, p_type: "preference",
      p_key: "int_test_idempotent", p_value: { count: 2 }, p_confidence: 0.8, p_source: "system",
    });

    // Only one row should exist for this key
    const { data } = await serviceClient
      .from("learner_memories")
      .select("key, value, confidence")
      .eq("child_id", child1Id)
      .eq("key", "int_test_idempotent");

    expect(data).toHaveLength(1);
    expect((data![0].value as { count: number }).count).toBe(2);
    expect(data![0].confidence).toBe(0.8);
  });

  it("rejects upsert on a foreign child", async () => {
    const { error } = await user1Client.rpc("upsert_learner_memory", {
      p_child_id:   child2Id,
      p_type:       "preference",
      p_key:        "should_not_exist",
      p_value:      { x: 1 },
      p_confidence: 1.0,
      p_source:     "system",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized/i);
  });

  it("rejects upsert with no auth token", async () => {
    const noAuth = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error } = await noAuth.rpc("upsert_learner_memory", {
      p_child_id: child1Id, p_type: "preference",
      p_key: "noauth_test", p_value: {}, p_confidence: 1.0, p_source: "system",
    });
    expect(error).not.toBeNull();
  });

  // ── 2. Key filter (migration 141) ─────────────────────────────────────────

  it("get_learner_memories with p_key returns only matching row", async () => {
    // Set up two distinct memories
    await user1Client.rpc("upsert_learner_memory", {
      p_child_id: child1Id, p_type: "skill", p_key: "key_filter_a",
      p_value: { tag: "A" }, p_confidence: 1.0, p_source: "system",
    });
    await user1Client.rpc("upsert_learner_memory", {
      p_child_id: child1Id, p_type: "skill", p_key: "key_filter_b",
      p_value: { tag: "B" }, p_confidence: 1.0, p_source: "system",
    });

    const { data, error } = await user1Client.rpc("get_learner_memories", {
      p_child_id: child1Id,
      p_types:    ["skill"],
      p_key:      "key_filter_a",
    });

    expect(error).toBeNull();
    const rows = data as { key: string }[];
    expect(rows.every(r => r.key === "key_filter_a")).toBe(true);
    expect(rows.some(r => r.key === "key_filter_b")).toBe(false);
  });

  it("get_learner_memories is rejected for foreign child", async () => {
    const { error } = await user1Client.rpc("get_learner_memories", {
      p_child_id: child2Id,
      p_types:    null,
      p_key:      null,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized/i);
  });

  // ── 3. Learner event logging ───────────────────────────────────────────────

  it("logs a learner event on own child", async () => {
    const { error } = await user1Client.rpc("log_learner_event", {
      p_child_id:   child1Id,
      p_event_type: "story_started",
      p_payload:    { storyId: "int-test-story" },
    });
    expect(error).toBeNull();
  });

  it("rejects event log for foreign child", async () => {
    const { error } = await user1Client.rpc("log_learner_event", {
      p_child_id:   child2Id,
      p_event_type: "story_started",
      p_payload:    {},
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized/i);
  });

  // ── 4. Proactive queue ownership (migration 138) ──────────────────────────

  it("queue_proactive_suggestion rejected for foreign child", async () => {
    const { error } = await user1Client.rpc("queue_proactive_suggestion", {
      p_child_id: child2Id,
      p_type:     "daily_checkin",
      p_title:    "Test",
      p_message:  "Test message",
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized/i);
  });

  it("get_pending_proactive rejected for foreign child", async () => {
    const { error } = await user1Client.rpc("get_pending_proactive", {
      p_child_id: child2Id,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized/i);
  });

  it("full proactive queue/deliver cycle on own child", async () => {
    // Queue
    const { error: qErr } = await user1Client.rpc("queue_proactive_suggestion", {
      p_child_id: child1Id,
      p_type:     "daily_checkin",
      p_title:    "Int test",
      p_message:  "Integration test suggestion",
    });
    expect(qErr).toBeNull();

    // Fetch
    const { data, error: fErr } = await user1Client.rpc("get_pending_proactive", {
      p_child_id: child1Id,
    });
    expect(fErr).toBeNull();
    const suggestions = data as { id: string; suggestion_type: string }[];
    const ours = suggestions.find(s => s.suggestion_type === "daily_checkin");
    expect(ours).toBeDefined();

    // Mark delivered
    const { error: dErr } = await user1Client.rpc("mark_proactive_delivered", {
      p_ids: [ours!.id],
    });
    expect(dErr).toBeNull();
  });

  // ── 5. Conversation summary ownership (migration 138) ─────────────────────

  it("upsert_conversation_summary rejected for foreign child", async () => {
    const { error } = await user1Client.rpc("upsert_conversation_summary", {
      p_child_id:       child2Id,
      p_session_id:     "int-test-session",
      p_summary:        "Test",
      p_key_topics:     [],
      p_mastered_vocab: [],
      p_mistakes:       [],
      p_language:       "en",
      p_story_id:       null,
      p_exchange_count: 1,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized/i);
  });

  it("persists and retrieves conversation summary for own child", async () => {
    const { error: wErr } = await user1Client.rpc("upsert_conversation_summary", {
      p_child_id:       child1Id,
      p_session_id:     "int-test-session",
      p_summary:        "Child practiced greetings.",
      p_key_topics:     ["greetings"],
      p_mastered_vocab: ["hello", "goodbye"],
      p_mistakes:       [],
      p_language:       "en",
      p_story_id:       null,
      p_exchange_count: 4,
    });
    expect(wErr).toBeNull();

    const { data, error: rErr } = await user1Client.rpc("get_conversation_history", {
      p_child_id: child1Id,
      p_limit:    5,
    });
    expect(rErr).toBeNull();
    const rows = data as { summary: string }[];
    expect(rows.some(r => r.summary === "Child practiced greetings.")).toBe(true);
  });

  // ── 6. Consecutive streak (migration 142) ─────────────────────────────────

  it("get_learner_context returns streak_days as integer >= 0", async () => {
    const { data, error } = await user1Client.rpc("get_learner_context", {
      p_child_id: child1Id,
    });
    expect(error).toBeNull();
    const ctx = data as { stats: { streak_days: number } };
    expect(typeof ctx.stats.streak_days).toBe("number");
    expect(ctx.stats.streak_days).toBeGreaterThanOrEqual(0);
  });

  it("get_learner_context rejected for foreign child", async () => {
    const { error } = await user1Client.rpc("get_learner_context", {
      p_child_id: child2Id,
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized/i);
  });

  // ── 7. RLS direct-table access ────────────────────────────────────────────

  it("learner_memories RLS blocks direct read of foreign child", async () => {
    // Insert a memory for child 2 using service role
    await serviceClient.from("learner_memories").upsert({
      child_id:    child2Id,
      memory_type: "preference",
      key:         "rls_test_foreign",
      value:       { secret: true },
      confidence:  1.0,
      source:      "system",
    }, { onConflict: "child_id,memory_type,key" });

    // User 1 tries to read it directly (bypassing RPC) — RLS should block
    const { data } = await user1Client
      .from("learner_memories")
      .select("key")
      .eq("child_id", child2Id)
      .eq("key", "rls_test_foreign");

    // RLS returns 0 rows (not an error — it silently filters)
    expect((data ?? []).length).toBe(0);
  });
});
