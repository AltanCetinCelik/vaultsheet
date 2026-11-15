import type { MetadataRoute } from "next";
import { SEO_BANKS } from "@/lib/seoCatalog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vaultsheet.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const bankRoutes: MetadataRoute.Sitemap = SEO_BANKS.map((bank) => ({
    url: `${SITE_URL}/convert/${bank.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/convert`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...bankRoutes,
  ];
}
