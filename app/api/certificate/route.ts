export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore — auth-helpers-nextjs pre-dates Next.js 15 async cookies; passing the fn works at runtime
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Language content ────────────────────────────────────────
const MISSIONS: Record<string, { label: string; icon: string }[]> = {
  en: [
    { label: "FlipFlop Audio",    icon: "🎧" },
    { label: "Story PDF",         icon: "📚" },
    { label: "Coloring Page",     icon: "🎨" },
    { label: "Move and Explore",  icon: "👟" },
    { label: "Karaoke & Song",    icon: "🎤" },
    { label: "Bonus Animation",   icon: "🎬" },
  ],
  fr: [
    { label: "Audio FlipFlop",        icon: "🎧" },
    { label: "PDF de l'Histoire",     icon: "📚" },
    { label: "Page de Coloriage",     icon: "🎨" },
    { label: "Bouger et Explorer",    icon: "👟" },
    { label: "Karaoké et Chanson",    icon: "🎤" },
    { label: "Animation Bonus",       icon: "🎬" },
  ],
  rw: [
    { label: "FlipFlop Audio",        icon: "🎧" },
    { label: "Inganji PDF",           icon: "📚" },
    { label: "Urupapuro rwo Gushora", icon: "🎨" },
    { label: "Gutera Intambwe",       icon: "👟" },
    { label: "Indirimbo & Karaoke",   icon: "🎤" },
    { label: "Filime ya Bonus",       icon: "🎬" },
  ],
};

const LABELS: Record<string, Record<string, string>> = {
  en: {
    congrats:  "Congratulations, Champion!",
    completed: "ADVENTURE COMPLETED",
    awardedTo: "Awarded to:",
    tagline:   "Grow With Every Story.",
    brand1:    "SUPER EXPLORER",
    brand2:    "NIMIPIKO",
  },
  fr: {
    congrats:  "Félicitations, Champion !",
    completed: "AVENTURE TERMINÉE",
    awardedTo: "Décerné à :",
    tagline:   "Pousse Avec Chaque Histoire.",
    brand1:    "SUPER EXPLORATEUR",
    brand2:    "NIMIPIKO",
  },
  rw: {
    congrats:  "Congratulations, Champion!",
    completed: "ADVENTURE COMPLETED",
    awardedTo: "Awarded to:",
    tagline:   "Grow With Every Story.",
    brand1:    "SUPER EXPLORER",
    brand2:    "NIMIPIKO",
  },
};

// ── SVG certificate builder ─────────────────────────────────
function buildCertificateSvg(opts: {
  childName: string;
  storyTitle: string;
  lang: string;
  stars: string;
  nimiB64: string | null;
  pikoB64: string | null;
}): string {
  const { childName, storyTitle, lang, nimiB64, pikoB64 } = opts;
  const l = LABELS[lang] || LABELS.en;
  const missions = MISSIONS[lang] || MISSIONS.en;
  const W = 794, H = 1123;

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Scattered border stars (x, y, size, color, opacity)
  const stars = [
    [35, 40, 38, "#FFD700", 1], [90, 15, 28, "#60A5FA", 1], [140, 45, 22, "#34D399", 0.9],
    [700, 40, 38, "#FFD700", 1], [745, 12, 28, "#A78BFA", 1], [760, 60, 22, "#F472B6", 0.9],
    [15, 300, 20, "#FFD700", 0.8], [22, 700, 24, "#60A5FA", 0.8],
    [765, 280, 20, "#FFD700", 0.8], [760, 680, 24, "#34D399", 0.8],
    [35, 1060, 38, "#60A5FA", 1], [80, 1088, 26, "#FFD700", 1], [130, 1055, 22, "#34D399", 0.9],
    [695, 1060, 38, "#A78BFA", 1], [740, 1088, 28, "#F59E0B", 1], [758, 1052, 22, "#F472B6", 0.9],
  ] as [number, number, number, string, number][];

  const starPath = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.4;
      pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
    }
    return `M${pts.join("L")}Z`;
  };

  // Mission rows
  const missionStartY = 572;
  const missionRows = missions.map((m, i) => {
    const y = missionStartY + i * 48;
    return `
      <!-- Mission ${i + 1} -->
      <circle cx="230" cy="${y}" r="14" fill="#2ECC40"/>
      <text x="230" y="${y + 5}" text-anchor="middle" font-size="14" fill="white" font-family="Arial Black,sans-serif" font-weight="900">✓</text>
      <text x="258" y="${y + 6}" font-size="21" font-family="Arial,sans-serif" fill="#1a2a6c" font-weight="700">${esc(m.label)}</text>
      <text x="550" y="${y + 6}" font-size="22" font-family="Arial,sans-serif">${m.icon}</text>
    `;
  }).join("\n");

  // Nimi + Piko images (if available)
  const nimiImg = nimiB64
    ? `<image href="${nimiB64}" x="40" y="510" width="160" height="310" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="100" y="700" text-anchor="middle" font-size="80">🌟</text>`;

  const pikoImg = pikoB64
    ? `<image href="${pikoB64}" x="594" y="510" width="160" height="310" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="694" y="700" text-anchor="middle" font-size="80">🤖</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="3" stdDeviation="4" flood-color="#00000033"/>
    </filter>
    <filter id="textglow">
      <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#0e2d7a" flood-opacity="0.7"/>
    </filter>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FEF9EC"/>
      <stop offset="100%" stop-color="#FDF3D0"/>
    </linearGradient>
    <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFE566"/>
      <stop offset="100%" stop-color="#F5B800"/>
    </linearGradient>
    <linearGradient id="blueRibbon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF9F1C"/>
      <stop offset="100%" stop-color="#F5A623"/>
    </linearGradient>
    <linearGradient id="goldMedal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#F5A623"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)" rx="18"/>

  <!-- Border frame -->
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="12"
    fill="none" stroke="#F5C842" stroke-width="5" stroke-dasharray="0"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="10"
    fill="none" stroke="#F5C842" stroke-width="2" opacity="0.5"/>

  <!-- Scattered stars -->
  ${stars.map(([cx, cy, r, fill, op]) =>
    `<path d="${starPath(cx as number, cy as number, r as number)}" fill="${fill}" opacity="${op}" filter="url(#shadow)"/>`
  ).join("\n  ")}

  <!-- Book icon at top -->
  <text x="${W / 2}" y="72" text-anchor="middle" font-size="38" font-family="Arial,sans-serif">📗</text>
  <text x="${W / 2 - 16}" y="60" text-anchor="middle" font-size="16" font-family="Arial,sans-serif">🌱</text>

  <!-- STORY CERTIFICATE title (3D effect: stroke + fill) -->
  <text x="${W / 2}" y="145" text-anchor="middle"
    font-size="72" font-family="Arial Black, sans-serif" font-weight="900"
    stroke="#1E50A2" stroke-width="8" stroke-linejoin="round" paint-order="stroke"
    fill="url(#yellowGrad)" filter="url(#shadow)">STORY</text>
  <text x="${W / 2}" y="220" text-anchor="middle"
    font-size="72" font-family="Arial Black, sans-serif" font-weight="900"
    stroke="#1E50A2" stroke-width="8" stroke-linejoin="round" paint-order="stroke"
    fill="url(#yellowGrad)" filter="url(#shadow)">CERTIFICATE</text>

  <!-- Blue ribbon banner -->
  <rect x="120" y="238" width="${W - 240}" height="48" rx="24" fill="url(#blueRibbon)" filter="url(#shadow)"/>
  <!-- Ribbon tails -->
  <polygon points="120,238 80,262 120,286" fill="#1D4ED8"/>
  <polygon points="${W - 120},238 ${W - 80},262 ${W - 120},286" fill="#1D4ED8"/>
  <text x="${W / 2}" y="270" text-anchor="middle"
    font-size="20" font-family="Arial Black,sans-serif" font-weight="900"
    fill="white">${esc(l.congrats)}</text>

  <!-- Story title -->
  <text x="${W / 2}" y="325" text-anchor="middle"
    font-size="22" font-family="Arial Black,sans-serif" font-weight="900"
    fill="#1a2a6c">${esc(storyTitle)}</text>

  <!-- Green leaf dividers -->
  <text x="${W / 2 - 120}" y="360" text-anchor="middle" font-size="18">🌿</text>
  <line x1="180" y1="355" x2="${W / 2 - 130}" y2="355" stroke="#2ECC40" stroke-width="2.5"/>
  <text x="${W / 2}" y="362" text-anchor="middle" font-size="14" font-family="Arial Black,sans-serif"
    fill="#1a2a6c" font-weight="900">${esc(l.completed)}</text>
  <line x1="${W / 2 + 130}" y1="355" x2="${W - 180}" y2="355" stroke="#2ECC40" stroke-width="2.5"/>
  <text x="${W / 2 + 120}" y="360" text-anchor="middle" font-size="18">🌿</text>

  <!-- Mission checklist box -->
  <rect x="200" y="385" width="390" height="310" rx="12"
    fill="white" fill-opacity="0.7" stroke="#E5E7EB" stroke-width="2"
    stroke-dasharray="8,4"/>

  <!-- Missions -->
  ${missionRows}

  <!-- Nimi + Piko character images -->
  ${nimiImg}
  ${pikoImg}

  <!-- SUPER EXPLORER / NIMIPIKO branding -->
  <text x="${W / 2}" y="870" text-anchor="middle"
    font-size="26" font-family="Arial Black,sans-serif" font-weight="900"
    fill="#1a2a6c">★ ${esc(l.brand1)} ★</text>
  <text x="${W / 2}" y="930" text-anchor="middle"
    font-size="62" font-family="Arial Black,sans-serif" font-weight="900"
    stroke="#1E50A2" stroke-width="6" stroke-linejoin="round" paint-order="stroke"
    fill="url(#orangeGrad)" filter="url(#shadow)">${esc(l.brand2)}</text>

  <!-- Left medallion -->
  <circle cx="110" cy="1000" r="52" fill="url(#goldMedal)" stroke="#F5A623" stroke-width="4" filter="url(#shadow)"/>
  <circle cx="110" cy="1000" r="38" fill="none" stroke="white" stroke-width="2.5"/>
  <text x="110" y="993" text-anchor="middle" font-size="28">🌿</text>
  <text x="110" y="1018" text-anchor="middle" font-size="10" font-family="Arial Black,sans-serif" font-weight="900" fill="#1a2a6c">NIMIPIKO</text>

  <!-- Right shield badge -->
  <path d="M684,950 L734,950 L744,960 L714,1050 L684,960 Z" fill="#1D4ED8" filter="url(#shadow)"/>
  <path d="M688,954 L730,954 L739,963 L714,1043 L688,963 Z" fill="none" stroke="#60A5FA" stroke-width="2"/>
  <text x="714" y="980" text-anchor="middle" font-size="9" font-family="Arial Black,sans-serif" font-weight="900" fill="#FFD700">NIMIPIKO</text>
  <text x="714" y="995" text-anchor="middle" font-size="14">🌿</text>
  <text x="714" y="1015" text-anchor="middle" font-size="9" font-family="Arial Black,sans-serif" font-weight="900" fill="#FFD700">CHAMPION</text>

  <!-- Awarded to + name -->
  <text x="${W / 2}" y="975" text-anchor="middle"
    font-size="18" font-family="Arial,sans-serif" fill="#4B5563">${esc(l.awardedTo)}</text>
  <text x="${W / 2}" y="1012" text-anchor="middle"
    font-size="34" font-family="Arial Black,sans-serif" font-weight="900"
    fill="#1a2a6c">${esc(childName)}</text>
  <line x1="${W / 2 - 140}" y1="1020" x2="${W / 2 + 140}" y2="1020" stroke="#D1D5DB" stroke-width="1.5"/>

  <!-- Tagline -->
  <text x="${W / 2 - 14}" y="1074" text-anchor="middle" font-size="14" font-family="Arial,sans-serif"
    fill="#6B7280">🌿 ${esc(l.tagline)} 🌿</text>
</svg>`;
}

// ── Load a local public asset as base64 data URI ────────────
async function loadPublicAssetAsBase64(relPath: string): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), "public", relPath);
    if (!fs.existsSync(fullPath)) return null;
    const buf = fs.readFileSync(fullPath);
    const resized = await sharp(buf).resize(160, 310, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return `data:image/png;base64,${resized.toString("base64")}`;
  } catch {
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const authClient = createRouteHandlerClient({ cookies });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const childName = searchParams.get("child") || "Explorer";
  const storyId   = searchParams.get("storyId");
  const storyTitle = searchParams.get("story") || "Story Adventure";
  const lang      = searchParams.get("lang") || "en";
  const stars     = searchParams.get("stars") || "60";

  // ── Template mode: use admin-configured certificate image ──
  if (storyId) {
    try {
      const { data: story } = await supabase
        .from("stories")
        .select("certificate_config")
        .eq("id", storyId)
        .single();

      const config = story?.certificate_config as any;
      const langConfig = config?.[lang] || config?.en;

      if (langConfig?.image_url) {
        const url = langConfig.image_url.startsWith("http")
          ? langConfig.image_url
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${langConfig.image_url}`;

        const nameX    = langConfig.nameX    ?? 397;
        const nameY    = langConfig.nameY    ?? 1010;
        const nameSize = langConfig.nameSize ?? 40;
        const nameColor = langConfig.nameColor ?? "#1a2a6c";

        const imgRes = await fetch(url);
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const metadata  = await sharp(imgBuffer).metadata();
          const imgW = metadata.width || 794;
          const imgH = metadata.height || 1123;

          const hex2rgb = (h: string) => ({
            r: parseInt(h.replace("#","").slice(0,2),16),
            g: parseInt(h.replace("#","").slice(2,4),16),
            b: parseInt(h.replace("#","").slice(4,6),16),
          });
          const { r, g, b } = hex2rgb(nameColor);

          const textSvg = Buffer.from(`
            <svg width="${imgW}" height="${imgH}">
              <text x="${nameX}" y="${nameY}" text-anchor="middle"
                font-size="${nameSize}" fill="rgb(${r},${g},${b})"
                font-family="Arial Black,sans-serif" font-weight="900">
                ${childName.toUpperCase().replace(/&/g,"&amp;").replace(/</g,"&lt;")}
              </text>
            </svg>`);

          const composited = await sharp(imgBuffer)
            .composite([{ input: textSvg, top: 0, left: 0 }])
            .png().toBuffer();

          const pdfDoc  = await PDFDocument.create();
          const pdfImg  = await pdfDoc.embedPng(composited);
          const ar      = pdfImg.width / pdfImg.height;
          const pw      = ar > 1 ? 842 : 595;
          const ph      = ar > 1 ? 595 : 842;
          const page    = pdfDoc.addPage([pw, ph]);
          const scale   = Math.min(pw / pdfImg.width, ph / pdfImg.height);
          page.drawImage(pdfImg, {
            x: (pw - pdfImg.width * scale) / 2,
            y: (ph - pdfImg.height * scale) / 2,
            width: pdfImg.width * scale,
            height: pdfImg.height * scale,
          });
          const pdfBytes = await pdfDoc.save();
          return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${childName}_certificate.pdf"`,
            },
          });
        }
      }
    } catch (err) {
      console.error("[Certificate template]", err);
    }
  }

  // ── Global template: check certificate_templates table for this language ──
  try {
    const { data: tmpl } = await supabase
      .from("certificate_templates")
      .select("image_url, name_x, name_y, name_size, name_color")
      .eq("lang", lang)
      .maybeSingle();

    if (tmpl?.image_url) {
      const imgRes = await fetch(tmpl.image_url);
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const { width: imgW = 864, height: imgH = 1152 } = await sharp(imgBuffer).metadata();
        const nameX     = tmpl.name_x     ?? 438;
        const nameY     = tmpl.name_y     ?? 1089;
        const nameSize  = tmpl.name_size  ?? 50;
        const nameColor = tmpl.name_color ?? "#0d1b4b";

        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const textSvg = Buffer.from(`
          <svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">
            <text x="${nameX}" y="${nameY}" text-anchor="middle"
              font-size="${nameSize}" fill="${nameColor}"
              font-family="Arial Black, sans-serif" font-weight="900">
              ${esc(childName.toUpperCase())}
            </text>
          </svg>`);

        const composited = await sharp(imgBuffer)
          .composite([{ input: textSvg, top: 0, left: 0 }])
          .jpeg({ quality: 97 })
          .toBuffer();

        const pdfDoc = await PDFDocument.create();
        const pdfImg = await pdfDoc.embedJpg(composited);
        const page   = pdfDoc.addPage([595, 842]);
        const scale  = Math.min(595 / pdfImg.width, 842 / pdfImg.height);
        page.drawImage(pdfImg, {
          x: (595 - pdfImg.width * scale) / 2,
          y: (842 - pdfImg.height * scale) / 2,
          width: pdfImg.width * scale, height: pdfImg.height * scale,
        });
        const pdfBytes = await pdfDoc.save();
        return new NextResponse(Buffer.from(pdfBytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${childName}_certificate.pdf"`,
          },
        });
      }
    }
  } catch (err) {
    console.error("[Certificate global template]", err);
  }

  // ── Default: stamp child name onto the real boss-designed certificate ──
  const certPath = path.join(process.cwd(), "public", "certs", "congz.jpeg");
  const certBuffer = fs.readFileSync(certPath);
  const { width: imgW = 864, height: imgH = 1152 } = await sharp(certBuffer).metadata();

  // Coordinates confirmed via preview tool against boss's congs.jpeg reference
  const nameX     = 438;
  const nameY     = 1089;
  const nameSize  = 50;
  const nameColor = "#0d1b4b";

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const textSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">
      <text x="${nameX}" y="${nameY}"
        text-anchor="middle"
        font-size="${nameSize}"
        fill="${nameColor}"
        font-family="Arial Black, sans-serif"
        font-weight="900">
        ${esc(childName.toUpperCase())}
      </text>
    </svg>
  `);

  const composited = await sharp(certBuffer)
    .composite([{ input: textSvg, top: 0, left: 0 }])
    .jpeg({ quality: 97 })
    .toBuffer();

  // Wrap in PDF (A4 portrait)
  const pdfDoc = await PDFDocument.create();
  const pdfImg = await pdfDoc.embedJpg(composited);
  const page   = pdfDoc.addPage([595, 842]);
  const scale  = Math.min(595 / pdfImg.width, 842 / pdfImg.height);
  page.drawImage(pdfImg, {
    x: (595 - pdfImg.width * scale) / 2,
    y: (842 - pdfImg.height * scale) / 2,
    width:  pdfImg.width * scale,
    height: pdfImg.height * scale,
  });

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${childName}_certificate.pdf"`,
    },
  });
}
