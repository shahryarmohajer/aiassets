import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

// Next.js auto-serves this at /sitemap.xml. Capped per-type to keep the
// build/response light; for >50k assets, switch to a sitemap index with
// paginated sub-sitemaps (see README "Scaling SEO pages").
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [prompts, workflows, templates, credits, tags, categories] = await Promise.all([
    prisma.prompt.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true }, take: 10000 }),
    prisma.workflow.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true }, take: 10000 }),
    prisma.template.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true }, take: 10000 }),
    prisma.freeCredit.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, take: 10000 }),
    prisma.tag.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/category/prompts`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/category/workflows`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/category/templates`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/category/credits`, changeFrequency: "daily", priority: 0.8 },
  ];

  return [
    ...staticRoutes,
    ...prompts.map((p) => ({ url: `${SITE_URL}/prompt/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...workflows.map((w) => ({ url: `${SITE_URL}/workflow/${w.slug}`, lastModified: w.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...templates.map((t) => ({ url: `${SITE_URL}/template/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...credits.map((c) => ({ url: `${SITE_URL}/credits/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.5 })),
    ...tags.map((t) => ({ url: `${SITE_URL}/tag/${t.slug}`, changeFrequency: "daily" as const, priority: 0.4 })),
    ...categories.map((c) => ({ url: `${SITE_URL}/category/${c.slug}`, changeFrequency: "daily" as const, priority: 0.5 })),
  ];
}
