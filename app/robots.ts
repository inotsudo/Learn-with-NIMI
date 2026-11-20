import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/stories", "/pricing", "/parents", "/help", "/privacy", "/terms"],
        disallow: ["/admin/", "/api/", "/reset-password", "/home/", "/settings/", "/user-profile/", "/talk-to-nimi/", "/onboarding/"],
      },
    ],
    sitemap: "https://nimipiko.com/sitemap.xml",
  };
}
