import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import CommunityClient from "./CommunityClient";

export default async function CommunityPage() {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/loginpage");

  const { data: subData } = await supabase
    .from("nimipiko_subscriptions").select("id,status")
    .eq("parent_id", user.id).eq("status", "active").limit(1).maybeSingle();

  return (
    <CommunityClient
      initialUserId={user.id}
      initialHasSubscription={!!subData}
    />
  );
}
