/**
 * Reddit crawler
 * Uses Reddit's public JSON endpoints (no API key needed for read-only,
 * low-volume access) to pull recent posts from AI-prompt-focused subreddits,
 * store them as PENDING prompts for admin review, and auto-tag them.
 *
 * Run: `npm run crawl:reddit` (invoked every 6h via cron, see README)
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug, promptSlugExists, autoTag } from "@/lib/slug";
import { withCrawlerLog, claimIfNew, sleep } from "./lib";

const SUBREDDITS = ["ChatGPTPromptGenius", "PromptEngineering", "artificial"];
const USER_AGENT = "ai-assets-hub-crawler/1.0 (+https://example.com)";

interface RedditPost {
  data: {
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    ups: number;
    is_self: boolean;
  };
}

async function fetchSubreddit(subreddit: string): Promise<RedditPost[]> {
  const res = await fetch(`https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=25`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`reddit fetch failed for r/${subreddit}: ${res.status}`);
  const json = await res.json();
  return json.data.children as RedditPost[];
}

export async function run() {
  let found = 0;
  let saved = 0;
  let skipped = 0;

  for (const sub of SUBREDDITS) {
    const posts = await fetchSubreddit(sub);
    found += posts.length;

    for (const post of posts) {
      const { title, selftext, permalink, ups, is_self } = post.data;
      // only self-posts with enough body text look like real prompt content
      if (!is_self || selftext.trim().length < 60) {
        skipped++;
        continue;
      }

      const sourceUrl = `https://reddit.com${permalink}`;
      const isNew = await claimIfNew(sourceUrl);
      if (!isNew) {
        skipped++;
        continue;
      }

      const slug = await uniqueSlug(title, promptSlugExists);
      const tagNames = autoTag(title, selftext);

      await prisma.prompt.create({
        data: {
          title: title.slice(0, 200),
          slug,
          description: selftext.slice(0, 280),
          promptContent: selftext,
          sourceUrl,
          votes: Math.max(0, Math.floor(ups / 10)), // normalize reddit upvotes to a smaller votes scale
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
    }

    await sleep(1500); // be polite between subreddit requests
  }

  return { found, saved, skipped };
}

if (require.main === module) {
  withCrawlerLog("reddit", run).then((r) => {
    console.log(`[crawler:reddit] found=${r.found} saved=${r.saved} skipped=${r.skipped}`);
    process.exit(0);
  });
}
