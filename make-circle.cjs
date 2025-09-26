import fs from "fs";
import { createCanvas, loadImage } from "canvas";

const input = "public/nimi-logo.png";        // your square logo
const output = "public/nimi-logo-circle.png"; // output circular logo

const createCircleFavicon = async () => {
  try {
    const img = await loadImage(input);
    const size = Math.min(img.width, img.height);

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Draw circular clipping mask
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw the image inside the circle
    ctx.drawImage(img, 0, 0, size, size);

    // Save as PNG
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(output, buffer);

    console.log("Circular favicon created:", output);
  } catch (err) {
    console.error(err);
  }
};

createCircleFavicon();
