import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nimipiko.com";
  const now = new Date();

  return [
    { url: base,                    lastModified: now, changeFrequency: "daily",   priority: 1 },
    { url: `${base}/stories`,       lastModified: now, changeFrequency: "daily",   priority: 0.9 },

    { url: `${base}/community`,     lastModified: now, changeFrequency: "hourly",  priority: 0.8 },
    { url: `${base}/shop`,          lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/talk-to-nimi`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/parents`,       lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pricing`,       lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/help`,          lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/schools`,        lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`,       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,         lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/loginpage`,     lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/signuppage`,    lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];
}
