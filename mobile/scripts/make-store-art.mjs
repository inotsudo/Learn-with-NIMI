// Builds the source images for the store apps' icon and splash screen from the
// official NIMIPIKO medallion (public/nimi-logo.png), in the Airways navy + gold look.
// Then `npm run mobile:assets` turns them into every Android/iOS size.
//
//   node mobile/scripts/make-store-art.mjs
import { createCanvas, loadImage } from "canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "mobile/assets");
mkdirSync(OUT, { recursive: true });
const logo = await loadImage(path.join(ROOT, "public/nimi-logo.png"));

const NAVY_IN = "#1A3558", NAVY_MID = "#0B1A33", NAVY_OUT = "#06101F";

/** Airways night-sky background with a soft gold glow and a few gold motes. */
function background(g, size) {
  const bg = g.createRadialGradient(size / 2, size * 0.42, size * 0.05, size / 2, size / 2, size * 0.75);
  bg.addColorStop(0, NAVY_IN); bg.addColorStop(0.5, NAVY_MID); bg.addColorStop(1, NAVY_OUT);
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  const glow = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5);
  glow.addColorStop(0, "rgba(253,230,138,0.22)"); glow.addColorStop(1, "rgba(253,230,138,0)");
  g.fillStyle = glow; g.fillRect(0, 0, size, size);
  // deterministic gold dust
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size, y = rnd() * size, r = (0.6 + rnd() * 1.8) * (size / 1024);
    g.fillStyle = `rgba(253,230,138,${0.25 + rnd() * 0.5})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}

/** The medallion: logo disc + double gold ring + drop shadow. */
function medallion(g, cx, cy, d) {
  const r = d / 2;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = d * 0.08; g.shadowOffsetY = d * 0.03;
  g.fillStyle = "#C9A84C"; g.beginPath(); g.arc(cx, cy, r * 1.07, 0, Math.PI * 2); g.fill();
  g.restore();
  const ring = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, "#FFF3C4"); ring.addColorStop(0.45, "#E8BC56"); ring.addColorStop(1, "#9C7424");
  g.fillStyle = ring; g.beginPath(); g.arc(cx, cy, r * 1.07, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(cx, cy, r * 1.005, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  g.drawImage(logo, cx - r, cy - r, d, d);
  g.restore();
}

function save(name, canvas) {
  writeFileSync(path.join(OUT, name), canvas.toBuffer("image/png"));
  console.log("wrote", path.relative(ROOT, path.join(OUT, name)), `${canvas.width}×${canvas.height}`);
}

// 1. iOS + legacy icon: full art, square (the stores round the corners themselves)
{
  const S = 1024, c = createCanvas(S, S), g = c.getContext("2d");
  background(g, S); medallion(g, S / 2, S / 2, S * 0.8); save("icon-only.png", c);
}
// 2. Android adaptive icon: background layer + foreground layer (medallion inside the 66% safe zone)
{
  const S = 1024, c = createCanvas(S, S), g = c.getContext("2d");
  background(g, S); save("icon-background.png", c);
  const f = createCanvas(S, S), fg = f.getContext("2d");
  medallion(fg, S / 2, S / 2, S * 0.6); save("icon-foreground.png", f);
}
// 3. Splash screens (light + dark are the same night sky)
{
  const S = 2732, c = createCanvas(S, S), g = c.getContext("2d");
  background(g, S); medallion(g, S / 2, S / 2, S * 0.3);
  save("splash.png", c); save("splash-dark.png", c);
}
