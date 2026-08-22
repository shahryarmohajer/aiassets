/**
 * Hugging Face crawler
 * Uses the official public Hugging Face Hub API (no auth required for
 * read access; set HF_TOKEN for higher rate limits) to pull trending
 * Spaces relevant to prompt engineering / agents / automation.
 *
 * Run: `npx tsx crawlers/huggingface.ts`
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug, templateSlugExists, autoTag } from "@/lib/slug";
import { withCrawlerLog, claimIfNew, sleep } from "./lib";

const SEARCH_TERMS = ["prompt", "agent", "workflow", "mcp"];

interface HfSpace {
  id: string;
  likes: number;
  cardData?: { title?: string };
  lastModified: string;
}

async function searchSpaces(term: string): Promise<HfSpace[]> {
  const headers: Record<string, string> = {};
  if (process.env.HF_TOKEN) headers.Authorization = `Bearer ${process.env.HF_TOKEN}`;

  const res = await fetch(
    `https://huggingface.co/api/spaces?search=${encodeURIComponent(term)}&sort=likes&direction=-1&limit=20`,
    { headers }
  );
  if (!res.ok) throw new Error(`huggingface fetch failed for "${term}": ${res.status}`);
  return (await res.json()) as HfSpace[];
}

export async function run() {
  let found = 0;
  let saved = 0;
  let skipped = 0;

  for (const term of SEARCH_TERMS) {
    const spaces = await searchSpaces(term);
    found += spaces.length;

    for (const space of spaces) {
      const sourceUrl = `https://huggingface.co/spaces/${space.id}`;
      const isNew = await claimIfNew(sourceUrl);
      if (!isNew) {
        skipped++;
        continue;
      }

      const title = space.cardData?.title || space.id;
      const description = `Hugging Face Space: ${space.id} — ${space.likes} likes.`;
      const slug = await uniqueSlug(title, templateSlugExists);
      const tagNames = autoTag(title, description);

      await prisma.template.create({
        data: {
          title,
          slug,
          description,
          downloadUrl: sourceUrl,
          sourceUrl,
          status: space.likes >= 50 ? "APPROVED" : "PENDING",
          tags: {
            create: await Promise.all(
              tagNames.map(async (name) => {
                const tag = await prisma.tag.upsert({
                  where: { name },
                  create: { name, slug: name.replace(/\s+/g, "-") },
                  update: {},
                });
                return { tagId: tag.id };
              })
            ),
          },
        },
      });
      saved++;
    }

    await sleep(1000);
  }

  return { found, saved, skipped };
}

if (require.main === module) {
  withCrawlerLog("huggingface", run).then((r) => {
    console.log(`[crawler:huggingface] found=${r.found} saved=${r.saved} skipped=${r.skipped}`);
    process.exit(0);
  });
}
