// app/api/creations/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore — auth-helpers-nextjs pre-dates Next.js 15 async cookies; passing the fn works at runtime
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Service-role client — bypasses RLS so comments are always readable
// even before the migration's RLS policy propagates.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("creation_comments")
    .select("id, author, content, created_at")
    .eq("creation_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Comments GET error:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authClient = createRouteHandlerClient({ cookies });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: { content?: string; author?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Content must be a non-empty string." }, { status: 400 });
  }
  if (content.length > 500) {
    return NextResponse.json({ error: "Comment too long (max 500 chars)." }, { status: 400 });
  }

  const author = typeof body.author === "string" && body.author.trim() ? body.author.trim() : "Friend";

  const { data, error } = await supabase
    .from("creation_comments")
    .insert({ creation_id: id, author, content })
    .select("id, author, content, created_at")
    .single();

  if (error) {
    console.error("Comments POST error:", error);
    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
