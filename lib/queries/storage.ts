import supabase from "@/lib/supabaseClient";

// Accepts:
//   "flipbook/page-1.jpg"   → Supabase Storage public URL
//   "/story/page-1.jpg"     → returned as-is (local public/ file)
//   "https://..."           → returned as-is (already full URL)
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  const slash = path.indexOf("/");
  if (slash === -1) return path;
  const bucket = path.substring(0, slash);
  const file   = path.substring(slash + 1);
  const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(file).data;
  // Supabase does not URL-encode spaces — encode them so video/image src works
  return publicUrl.replace(/ /g, '%20');
}
