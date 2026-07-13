import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore — auth-helpers-nextjs pre-dates Next.js 15 async cookies; passing the fn works at runtime
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const authClient = createRouteHandlerClient({ cookies });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: mp } = await supabase
    .from("masterpiece_orders")
    .select("pdf_url, child_name, status, parent_id")
    .eq("id", id)
    .single();

  if (!mp || !mp.pdf_url || mp.status !== "completed") {
    return NextResponse.json({ error: "PDF not ready" }, { status: 404 });
  }

  if (mp.parent_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: signedUrl } = await supabase.storage
    .from("masterpieces")
    .createSignedUrl(mp.pdf_url.replace("masterpieces/", ""), 3600);

  if (!signedUrl?.signedUrl) {
    return NextResponse.json({ error: "Download link failed" }, { status: 500 });
  }

  return NextResponse.json({
    downloadUrl: signedUrl.signedUrl,
    childName: mp.child_name,
  });
}
