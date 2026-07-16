import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToParent, formatBadgeLabel, CATEGORY_LABELS } from "@/lib/push";

interface NotifyBody {
  child_id: string;
  category: string;
  stars_earned: number;
  new_badges: string[];
  new_certificate: string | null;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await sb.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as NotifyBody;
    const { child_id, category, stars_earned, new_badges, new_certificate } = body;

    const { data: child } = await sb
      .from("children")
      .select("name")
      .eq("id", child_id)
      .eq("parent_id", user.id)
      .single();

    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const { data: settings } = await sb
      .from("parental_settings")
      .select("notifications_enabled")
      .eq("parent_id", user.id)
      .eq("child_id", child_id)
      .maybeSingle();

    if (settings?.notifications_enabled === false) {
      return NextResponse.json({ sent: false, reason: "disabled" });
    }

    const childName = child.name as string;
    let payload;

    if (new_certificate) {
      payload = {
        title: "🎓 Program Completed!",
        body: `${childName} earned the Program Completion Certificate!`,
        url: "/certificates",
      };
    } else if (new_badges?.length > 0) {
      payload = {
        title: "🏅 New Badge!",
        body: `${childName} earned the ${formatBadgeLabel(new_badges[0])} badge!`,
        url: "/certificates",
      };
    } else {
      const categoryLabel = CATEGORY_LABELS[category] ?? category;
      payload = {
        title: "✅ Mission Complete!",
        body: `${childName} finished today's ${categoryLabel} mission! +${stars_earned}⭐`,
        url: `/missions/${category}`,
      };
    }

    const result = await sendPushToParent(sb, user.id, payload);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[push/notify] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
