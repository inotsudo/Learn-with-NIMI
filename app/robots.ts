import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/stories", "/pricing", "/community", "/parents", "/help", "/privacy", "/terms", "/schools"],
        disallow: ["/admin/", "/api/", "/reset-password", "/home/", "/settings/", "/user-profile/", "/talk-to-nimi/", "/shop/", "/onboarding/"],
      },
    ],
    sitemap: "https://nimipiko.com/sitemap.xml",
  };
}
