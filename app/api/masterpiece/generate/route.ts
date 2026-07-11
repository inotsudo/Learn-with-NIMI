export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";

interface StoryPageVersion { image_url?: string; language?: string; text?: string }
interface StoryPage { page_number?: number; text?: string; story_page_versions?: StoryPageVersion[] }
interface Story { title?: string; personalization_config?: Record<string, unknown>; story_pages?: StoryPage[] }
interface PageCfg { x: number; y: number; size: number }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function makeCircularPhoto(photoBuffer: Buffer, size: number): Promise<Buffer> {
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  );
  return sharp(photoBuffer)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toBuffer();
}

export async function POST(req: NextRequest) {
  try {
    const { masterpieceId } = await req.json();
    if (!masterpieceId) {
      return NextResponse.json({ error: "Missing masterpieceId" }, { status: 400 });
    }

    // Get the masterpiece order with story details
    const { data: mp } = await supabase
      .from("masterpiece_orders")
      .select("*, stories(*, story_pages(*, story_page_versions(*)))")
      .eq("id", masterpieceId)
      .single();

    if (!mp) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase.from("masterpiece_orders").update({ status: "processing" }).eq("id", masterpieceId);

    const story = mp.stories as Story;
    const config = (story.personalization_config ?? {}) as {
      pages?: Record<string, PageCfg>;
      photoPages?: number[];
      photoOnAllPages?: boolean;
      photoX?: number; photoY?: number; photoSize?: number;
    };

    function getPageConfig(pageNumber: number): PageCfg {
      const perPage = config.pages?.[String(pageNumber)];
      if (perPage) return perPage;
      return { x: config.photoX ?? 200, y: config.photoY ?? 300, size: config.photoSize ?? 150 };
    }

    // Get story pages sorted by page number
    const pages = (story.story_pages ?? [])
      .sort((a, b) => (a.page_number ?? 0) - (b.page_number ?? 0));

    // Create PDF
    const pdf = PDFDocument.create();
    const pdfDoc = await pdf;

    // Cover page
    const coverPage = pdfDoc.addPage([612, 792]); // Letter size
    coverPage.drawText(story.title || "My Story", {
      x: 50, y: 700, size: 36, color: rgb(0.2, 0.1, 0.4),
    });
    coverPage.drawText(`Starring: ${mp.child_name}`, {
      x: 50, y: 650, size: 20, color: rgb(0.4, 0.2, 0.6),
    });
    coverPage.drawText("A Nimipiko Masterpiece", {
      x: 50, y: 100, size: 14, color: rgb(0.5, 0.5, 0.5),
    });

    // Add child's photo to cover if available
    if (mp.child_photo_url) {
      try {
        const photoBuffer = await fetchImage(mp.child_photo_url);
        const circularPhoto = await makeCircularPhoto(photoBuffer, 300);
        const photoImage = await pdfDoc.embedPng(circularPhoto);
        coverPage.drawImage(photoImage, {
          x: 156, y: 250, width: 300, height: 300,
        });
      } catch (e) {
        console.error("[Masterpiece] Photo embed failed:", e);
      }
    }

    // Story pages
    for (const page of pages) {
      const pdfPage = pdfDoc.addPage([612, 792]);

      // Get the page image
      const version = (page.story_page_versions || []).find(
        (v: { language?: string }) => v.language === mp.language
      ) || (page.story_page_versions || [])[0];

      if (version?.image_url) {
        try {
          const imgUrl = version.image_url.startsWith("http")
            ? version.image_url
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${version.image_url}`;
          const imgBuffer = await fetchImage(imgUrl);
          const resized = await sharp(imgBuffer).resize(550, 700, { fit: "inside" }).jpeg().toBuffer();
          const img = await pdfDoc.embedJpg(resized);
          const dims = img.scale(550 / img.width);
          pdfPage.drawImage(img, {
            x: 31, y: 792 - dims.height - 30, width: dims.width, height: dims.height,
          });
        } catch (e) {
          console.error("[Masterpiece] Page image failed:", e);
        }
      }

      // Add text if available
      const text = version?.text || page.text || "";
      if (text) {
        const personalized = text.replace(/\{child\}/gi, mp.child_name);
        pdfPage.drawText(personalized, {
          x: 50, y: 60, size: 12, color: rgb(0.2, 0.2, 0.2), maxWidth: 512,
        });
      }

      // Embed child photo on pages that have a placement configured
      const pageConfig = getPageConfig(page.page_number ?? 0);
      const photoPagesConfig = config.pages
        ? Object.keys(config.pages).map(Number)      // new: pages with explicit config
        : (config.photoPages || []);                  // legacy: explicit list
      const shouldAddPhoto = config.photoOnAllPages
        || photoPagesConfig.includes(page.page_number ?? 0);

      if (shouldAddPhoto && mp.child_photo_url) {
        try {
          const photoBuffer = await fetchImage(mp.child_photo_url);
          const circularPhoto = await makeCircularPhoto(photoBuffer, pageConfig.size);
          const photoImage = await pdfDoc.embedPng(circularPhoto);
          pdfPage.drawImage(photoImage, {
            x: pageConfig.x, y: pageConfig.y,
            width: pageConfig.size, height: pageConfig.size,
          });
        } catch (e) { /* skip photo on this page */ }
      }
    }

    // Certificate page
    const certPage = pdfDoc.addPage([612, 792]);
    certPage.drawText("Champion Certificate", {
      x: 150, y: 600, size: 30, color: rgb(0.8, 0.6, 0),
    });
    certPage.drawText(`This certifies that`, {
      x: 200, y: 520, size: 16, color: rgb(0.3, 0.3, 0.3),
    });
    certPage.drawText(mp.child_name, {
      x: 180, y: 470, size: 32, color: rgb(0.2, 0.1, 0.5),
    });
    certPage.drawText(`completed the story "${story.title}"`, {
      x: 130, y: 420, size: 16, color: rgb(0.3, 0.3, 0.3),
    });
    certPage.drawText("and is a true Nimipiko Champion!", {
      x: 150, y: 380, size: 16, color: rgb(0.3, 0.3, 0.3),
    });
    certPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 220, y: 320, size: 12, color: rgb(0.5, 0.5, 0.5),
    });

    // Add child photo on certificate
    if (mp.child_photo_url) {
      try {
        const photoBuffer = await fetchImage(mp.child_photo_url);
        const circularPhoto = await makeCircularPhoto(photoBuffer, 200);
        const photoImage = await pdfDoc.embedPng(circularPhoto);
        certPage.drawImage(photoImage, { x: 220, y: 120, width: 160, height: 160 });
      } catch (e) { /* skip */ }
    }

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();

    // Upload to Supabase Storage
    const fileName = `masterpiece_${masterpieceId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("masterpieces")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      // Create bucket if it doesn't exist
      await supabase.storage.createBucket("masterpieces", { public: false });
      await supabase.storage.from("masterpieces").upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    }

    const pdfUrl = `masterpieces/${fileName}`;

    await supabase.from("masterpiece_orders").update({
      status: "completed",
      pdf_url: pdfUrl,
      completed_at: new Date().toISOString(),
    }).eq("id", masterpieceId);

    return NextResponse.json({ success: true, pdfUrl });
  } catch (err: unknown) {
    console.error("[Masterpiece Generate]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
