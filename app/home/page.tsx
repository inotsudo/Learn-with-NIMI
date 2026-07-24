import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import type { Child } from "@/lib/queries";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/loginpage");

  const [{ data: childrenData }, { data: subData }] = await Promise.all([
    supabase.from("children").select("*")
      .or(`parent_id.eq.${user.id},teacher_id.eq.${user.id}`)
      .order("created_at"),
    supabase.from("nimipiko_subscriptions").select("id,status,payment_provider,current_period_end")
      .eq("parent_id", user.id).eq("status", "active")
      .order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const children = (childrenData ?? []) as Child[];
  if (children.length === 0) redirect("/onboarding");

  return (
    <HomeClient
      initialChildren={children}
      initialHasSubscription={!!subData}
    />
  );
}
