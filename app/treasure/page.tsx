import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import type { Child } from "@/lib/queries";
import TreasureClient from "./TreasureClient";

export default async function TreasurePage() {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/loginpage");

  const { data: childrenData } = await supabase.from("children").select("*")
    .or(`parent_id.eq.${user.id},teacher_id.eq.${user.id}`)
    .order("created_at");

  return <TreasureClient initialChildren={(childrenData ?? []) as Child[]} />;
}
