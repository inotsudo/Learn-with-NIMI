import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabaseRouteAuth";
import { getServiceClient } from "@/lib/supabase/serviceClient";



export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const user = await getAuthUser(req);
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
