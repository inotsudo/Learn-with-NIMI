// app/api/creations/upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const STORAGE_BUCKET = "creations";

// Service-role client — bypasses RLS for storage write
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. Auth — get the calling parent's user id from session cookie
    const authClient = await createRouteClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const childName = (formData.get("childName") as string | null)?.trim() ?? "";
    const description = (formData.get("description") as string | null)?.trim() ?? "";
    const isPublic = formData.get("isPublic") === "true";

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (childName.length < 2) return NextResponse.json({ error: "Child name too short" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 5 MB limit", maxSize: MAX_FILE_SIZE, actualSize: file.size }, { status: 413 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type", allowedTypes: ALLOWED_MIME_TYPES, receivedType: file.type }, { status: 415 });
    }

    // 3. Upload to Supabase Storage
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${user.id}/${uuidv4()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: storageError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json({ error: "Storage upload failed", detail: storageError.message }, { status: 500 });
    }

    const imageUrl = `${STORAGE_BUCKET}/${storagePath}`;

    // 4. Insert creation row — get the parent row for this user
    const { data: parentRow } = await adminClient
      .from("parents")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!parentRow) {
      // Clean up orphaned file before returning error
      await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return NextResponse.json({ error: "Parent profile not found" }, { status: 403 });
    }

    const { data: creation, error: insertError } = await adminClient
      .from("creations")
      .insert({
        parent_id: parentRow.id,
        child_name: childName,
        description: description || null,
        image_url: imageUrl,
        type: "art",
        is_public: isPublic,
        completion_status: "completed",
      })
      .select("id, image_url, child_name, type, created_at")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return NextResponse.json({ error: "Failed to save creation" }, { status: 500 });
    }

    return NextResponse.json(creation, { status: 201, headers: { "Cache-Control": "no-store" } });

  } catch (err: unknown) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
