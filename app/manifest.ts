import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIMIPIKO",
    short_name: "NIMIPIKO",
    description: "Daily little victory",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/nimi-logo-circle.png",
        sizes: "139x115",
        type: "image/png",
      },
    ],
  };
}
