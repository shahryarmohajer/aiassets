/**
 * GitHub crawler
 * Uses the GitHub REST search API to find repos tagged with relevant
 * topics (n8n workflows, cursor rules, MCP servers) and indexes them as
 * templates. Set GITHUB_TOKEN in .env for a much higher rate limit
 * (5000/hr vs 60/hr unauthenticated).
 *
 * Run: `npm run crawl:github`
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug, templateSlugExists, autoTag } from "@/lib/slug";
import { withCrawlerLog, claimIfNew, sleep } from "./lib";

const TOPICS = ["n8n-workflow", "cursor-rules", "mcp-server", "make-com-template", "ai-prompts"];

interface GithubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  topics: string[];
}

async function searchTopic(topic: string): Promise<GithubRepo[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ai-assets-hub-crawler",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(
    `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}&sort=updated&order=desc&per_page=25`,
    { headers }
  );
  if (!res.ok) throw new Error(`github search failed for topic ${topic}: ${res.status}`);
  const json = await res.json();
  return json.items as GithubRepo[];
}

export async function run() {
  let found = 0;
  let saved = 0;
  let skipped = 0;

  for (const topic of TOPICS) {
    const repos = await searchTopic(topic);
    found += repos.length;

    for (const repo of repos) {
      if (!repo.description || repo.description.trim().length < 10) {
        skipped++;
        continue;
      }

      const isNew = await claimIfNew(repo.html_url);
      if (!isNew) {
        skipped++;
        continue;
      }

      const title = repo.full_name;
      const slug = await uniqueSlug(title, templateSlugExists);
      const tagNames = Array.from(
        new Set([...autoTag(title, repo.description), ...repo.topics.slice(0, 5)])
      );

      await prisma.template.create({
        data: {
          title,
          slug,
          description: repo.description.slice(0, 280),
          downloadUrl: repo.html_url,
          sourceUrl: repo.html_url,
          status: repo.stargazers_count >= 20 ? "APPROVED" : "PENDING", // auto-approve well-starred repos
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

    await sleep(1500);
  }

  return { found, saved, skipped };
}

if (require.main === module) {
  withCrawlerLog("github", run).then((r) => {
    console.log(`[crawler:github] found=${r.found} saved=${r.saved} skipped=${r.skipped}`);
    process.exit(0);
  });
}
