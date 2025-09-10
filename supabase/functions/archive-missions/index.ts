import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

interface Mission {
  id: string;
  title: string;
  description: string;
  type: string;
  day: number;
  difficulty: number;
  duration: number;
  points: number;
  video_url: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const today = new Date().getDate();
    const { data, error } = await supabase
    .from("missions")
    .update({ archived: true })
    .lt("day", today)
    .eq("archived", false)
    .select();
  

    if (error) {
      console.error("Archiving error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      archivedCount: data?.length ?? 0,
      archivedMissions: data ?? [],
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || String(err) });
  }
}
