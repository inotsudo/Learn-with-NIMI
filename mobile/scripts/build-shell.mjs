// Builds the native app's bundled screens in mobile/www as single, self-contained
// HTML files (styles + logo inlined). Capacitor shows offline.html when the app
// can't reach NIMIPIKO and only serves that one file, so nothing may be external.
//
//   node mobile/scripts/build-shell.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WWW = path.join(ROOT, "mobile/www");
mkdirSync(WWW, { recursive: true });

const logo = await sharp(path.join(ROOT, "public/nimi-logo.png")).resize(384, 384).webp({ quality: 82 }).toBuffer();
const LOGO = `data:image/webp;base64,${logo.toString("base64")}`;
const CSS = readFileSync(path.join(ROOT, "mobile/scripts/shell.css"), "utf8").replace(/\s*\n\s*/g, " ");

const page = ({ lang, title, heading, text, button }) => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#06101F">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<div class="dust" aria-hidden="true"></div>
<main class="stage">
<div class="medal"><img src="${LOGO}" alt="NIMIPIKO"></div>
<p class="title">${heading}</p>
<p class="sub">${text}</p>
${button ?? '<p class="dots" aria-hidden="true"><span></span><span></span><span></span></p>'}
</main>
</body>
</html>
`;

writeFileSync(path.join(WWW, "index.html"), page({
  lang: "fr", title: "NIMIPIKO", heading: "NIMIPIKO AIRWAYS",
  text: "Préparation du vol… · Preparing your flight…",
}));
writeFileSync(path.join(WWW, "offline.html"), page({
  lang: "fr", title: "NIMIPIKO — Pas de connexion", heading: "PAS DE CONNEXION",
  text: "L'avion attend le Wi-Fi ! Vérifie ta connexion, puis réessaie.<br>The plane is waiting for Wi-Fi! Check your connection and try again.",
  // The failed page is in history: going back retries it.
  button: `<button class="btn" type="button" aria-label="Réessayer — Try again" onclick="history.length > 1 ? history.back() : location.reload()">✈️ Réessayer</button>`,
}));
for (const f of ["shell.css", "logo.webp", "logo.png"]) rmSync(path.join(WWW, f), { force: true });
console.log("mobile/www: index.html + offline.html (self-contained)");
