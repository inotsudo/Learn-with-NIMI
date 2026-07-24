import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import type { Child } from "@/lib/queries";
import MasterpieceClient from "./MasterpieceClient";

export default async function MasterpiecePage() {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/loginpage");

  const { data: childrenData } = await supabase.from("children").select("*")
    .or(`parent_id.eq.${user.id},teacher_id.eq.${user.id}`)
    .order("created_at");

  return <MasterpieceClient initialChildren={(childrenData ?? []) as Child[]} />;
}
