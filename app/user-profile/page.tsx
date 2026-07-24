import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import type { Child } from "@/lib/queries";
import UserProfileClient from "./UserProfileClient";

export default async function UserProfilePage() {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/loginpage");

  const [{ data: childrenData }, { data: subData }] = await Promise.all([
    supabase.from("children").select("*")
      .or(`parent_id.eq.${user.id},teacher_id.eq.${user.id}`)
      .order("created_at"),
    supabase.from("nimipiko_subscriptions").select("id,status")
      .eq("parent_id", user.id).eq("status", "active").limit(1).maybeSingle(),
  ]);

  return (
    <UserProfileClient
      initialChildren={(childrenData ?? []) as Child[]}
      initialHasSubscription={!!subData}
    />
  );
}
