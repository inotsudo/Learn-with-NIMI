import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIMIPIKO",
    short_name: "NIMIPIKO",
    description: "Interactive stories & AI learning companion for kids ages 2–12 in English, French & Kinyarwanda",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    categories: ["education", "kids"],
    background_color: "#ffffff",
    theme_color: "#15803d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
