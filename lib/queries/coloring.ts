import supabase from "@/lib/supabaseClient";
import type { ColoringSave } from "./types";

export async function getColoringSave(
  childId: string,
  coloringPageId: string
): Promise<ColoringSave | null> {
  const { data } = await supabase
    .from("coloring_saves")
    .select("*")
    .eq("child_id", childId)
    .eq("coloring_page_id", coloringPageId)
    .single();
  return (data ?? null) as ColoringSave | null;
}

export async function saveColoringProgress(
  childId: string,
  coloringPageId: string,
  canvasData: object
): Promise<void> {
  await supabase.from("coloring_saves").upsert({
    child_id: childId,
    coloring_page_id: coloringPageId,
    canvas_data: canvasData,
    saved_at: new Date().toISOString(),
  });
}
