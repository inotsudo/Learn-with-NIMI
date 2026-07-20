import supabase from "./supabaseClient";

function loadImage(src: string, timeoutMs = 10_000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Image load timeout")), timeoutMs);
    const img = new window.Image();
    img.onload  = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error(`Failed to load: ${src}`)); };
    img.src = src;
  });
}

/** Route a Supabase Storage URL through our own proxy so canvas stays un-tainted. */
function proxied(url: string): string {
  return `/api/img-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Draws the configured certificate template onto a canvas, stamps the child's
 * name at the admin-configured position, uploads the result to Supabase Storage,
 * and returns the public URL.
 *
 * Falls back to 'en' template if the requested language has none configured.
 * Returns null if no template image has been uploaded yet.
 */
export async function generateCertificateImageUrl(
  childName: string,
  language: string,
  childId?: string,
  storySlug?: string
): Promise<string | null> {
  // Fetch template; fall back to English
  let { data: tpl } = await supabase
    .from("certificate_templates")
    .select("image_url, name_x, name_y, name_size, name_color")
    .eq("lang", language)
    .maybeSingle();

  if (!tpl?.image_url) {
    const { data: fallback } = await supabase
      .from("certificate_templates")
      .select("image_url, name_x, name_y, name_size, name_color")
      .eq("lang", "en")
      .maybeSingle();
    tpl = fallback;
  }

  if (!tpl?.image_url) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const fullUrl = tpl.image_url.startsWith("http")
    ? tpl.image_url
    : `${baseUrl}/storage/v1/object/public/${tpl.image_url}`;

  let img: HTMLImageElement;
  try {
    img = await loadImage(proxied(fullUrl));
  } catch {
    console.error("[generateCertificateImageUrl] template image failed to load");
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width  = 864;
  canvas.height = 1152;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  ctx.font         = `900 ${tpl.name_size ?? 50}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle    = tpl.name_color ?? "#0d1b4b";
  ctx.fillText(childName.toUpperCase(), tpl.name_x ?? 432, tpl.name_y ?? 1089);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );
  if (!blob) return null;

  // Use a deterministic path when caller provides identity — re-shares overwrite
  // the same file instead of accumulating duplicates in the bucket.
  const path = (childId && storySlug)
    ? `community/${childId}_${storySlug}_${language}.jpg`
    : `community/cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from("certificates")
    .upload(path, blob, { contentType: "image/jpeg", upsert: !!(childId && storySlug) });

  if (error) {
    // On a deterministic path the file likely already exists (RLS blocks upsert
    // UPDATE, or a concurrent request beat us). Return the existing public URL
    // rather than failing — the cert was already uploaded successfully before.
    if (childId && storySlug) {
      const { data: { publicUrl } } = supabase.storage.from("certificates").getPublicUrl(path);
      return publicUrl;
    }
    console.error("[generateCertificateImageUrl] upload error:", error.message);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("certificates")
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Same as generateCertificateImageUrl but returns a local data URL for
 * display only — no upload happens. Use this for the certificates page.
 */
export async function generateCertificateDataUrl(
  childName: string,
  language: string
): Promise<string | null> {
  let { data: tpl } = await supabase
    .from("certificate_templates")
    .select("image_url, name_x, name_y, name_size, name_color")
    .eq("lang", language)
    .maybeSingle();

  if (!tpl?.image_url) {
    const { data: fallback } = await supabase
      .from("certificate_templates")
      .select("image_url, name_x, name_y, name_size, name_color")
      .eq("lang", "en")
      .maybeSingle();
    tpl = fallback;
  }

  if (!tpl?.image_url) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const fullUrl = tpl.image_url.startsWith("http")
    ? tpl.image_url
    : `${baseUrl}/storage/v1/object/public/${tpl.image_url}`;

  let img: HTMLImageElement;
  try { img = await loadImage(proxied(fullUrl)); }
  catch { return null; }

  const canvas = document.createElement("canvas");
  canvas.width  = 864;
  canvas.height = 1152;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.font         = `900 ${tpl.name_size ?? 50}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle    = tpl.name_color ?? "#0d1b4b";
  ctx.fillText(childName.toUpperCase(), tpl.name_x ?? 432, tpl.name_y ?? 1089);

  return canvas.toDataURL("image/jpeg", 0.88);
}
