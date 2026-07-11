import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: mp } = await supabase
    .from("masterpiece_orders")
    .select("pdf_url, child_name, status")
    .eq("id", id)
    .single();

  if (!mp || !mp.pdf_url || mp.status !== "completed") {
    return NextResponse.json({ error: "PDF not ready" }, { status: 404 });
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
