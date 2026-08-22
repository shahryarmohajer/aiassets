/**
 * FlowGPT crawler
 * FlowGPT does not expose a stable public JSON API, so this uses their
 * internal search endpoint (subject to change — verify with browser
 * devtools before relying on it in production, and add an API key/cookie
 * via FLOWGPT_COOKIE if they start requiring auth).
 *
 * Run: `npx tsx crawlers/flowgpt.ts`
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug, promptSlugExists, autoTag } from "@/lib/slug";
import { withCrawlerLog, claimIfNew, sleep } from "./lib";

const ENDPOINT = "https://backend-v2.flowgpt.com/prompt/search-cursor";

interface FlowGptItem {
  uuid: string;
  title: string;
  description: string;
  content: string;
  upVote: number;
}

async function fetchTrending(): Promise<FlowGptItem[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchTerm: "", filterOption: "trending", tags: [], limit: 25 }),
  });
  if (!res.ok) throw new Error(`flowgpt fetch failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? []) as FlowGptItem[];
}

export async function run() {
  let found = 0;
  let saved = 0;
  let skipped = 0;

  let items: FlowGptItem[] = [];
  try {
    items = await fetchTrending();
  } catch (err) {
    // FlowGPT's endpoint is undocumented and may change shape without notice.
    // Fail soft: log via the caller's crawler log rather than crashing the whole cron chain.
    throw new Error(`FlowGPT endpoint unreachable or changed shape: ${(err as Error).message}`);
  }

  found = items.length;

  for (const item of items) {
    if (!item.content || item.content.trim().length < 40) {
      skipped++;
      continue;
    }
    const sourceUrl = `https://flowgpt.com/prompt/${item.uuid}`;
    const isNew = await claimIfNew(sourceUrl);
    if (!isNew) {
      skipped++;
      continue;
    }

    const slug = await uniqueSlug(item.title, promptSlugExists);
    const tagNames = autoTag(item.title, item.description ?? "");

    await prisma.prompt.create({
      data: {
        title: item.title.slice(0, 200),
        slug,
        description: (item.description ?? item.content).slice(0, 280),
        promptContent: item.content,
        sourceUrl,
        votes: Math.max(0, Math.floor((item.upVote ?? 0) / 5)),
        status: "PENDING",
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
    await sleep(300);
  }

  return { found, saved, skipped };
}

if (require.main === module) {
  withCrawlerLog("flowgpt", run).then((r) => {
    console.log(`[crawler:flowgpt] found=${r.found} saved=${r.saved} skipped=${r.skipped}`);
    process.exit(0);
  });
}
