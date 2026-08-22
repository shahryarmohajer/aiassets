/**
 * Product Hunt crawler
 * Uses Product Hunt's GraphQL API v2 (requires a free developer token —
 * set PRODUCTHUNT_TOKEN in .env, get one at https://api.producthunt.com/v2/oauth/applications).
 * Pulls recent AI-topic launches and stores ones that mention free
 * credits/trials as FreeCredit entries.
 *
 * Run: `npx tsx crawlers/producthunt.ts`
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug, creditSlugExists } from "@/lib/slug";
import { withCrawlerLog, claimIfNew } from "./lib";

const QUERY = `
  query {
    posts(topic: "artificial-intelligence", order: NEWEST, first: 25) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          website
        }
      }
    }
  }
`;

interface PhPost {
  node: { id: string; name: string; tagline: string; description: string; url: string; website: string };
}

const FREE_OFFER_PATTERN = /free (trial|credits?|tier|plan|access)/i;

async function fetchLaunches(): Promise<PhPost[]> {
  if (!process.env.PRODUCTHUNT_TOKEN) {
    throw new Error("PRODUCTHUNT_TOKEN not set — skipping (see crawlers/producthunt.ts header for setup)");
  }
  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PRODUCTHUNT_TOKEN}`,
    },
    body: JSON.stringify({ query: QUERY }),
  });
  if (!res.ok) throw new Error(`producthunt fetch failed: ${res.status}`);
  const json = await res.json();
  return (json.data?.posts?.edges ?? []) as PhPost[];
}

export async function run() {
  let found = 0;
  let saved = 0;
  let skipped = 0;

  const posts = await fetchLaunches();
  found = posts.length;

  for (const { node } of posts) {
    const text = `${node.tagline} ${node.description}`;
    if (!FREE_OFFER_PATTERN.test(text)) {
      skipped++;
      continue;
    }

    const isNew = await claimIfNew(node.url);
    if (!isNew) {
      skipped++;
      continue;
    }

    const slug = await uniqueSlug(node.name, creditSlugExists);

    await prisma.freeCredit.create({
      data: {
        provider: node.name,
        slug,
        offerTitle: `${node.name} — ${node.tagline}`.slice(0, 200),
        offerDescription: node.description.slice(0, 500),
        sourceUrl: node.website || node.url,
        status: "ACTIVE",
      },
    });
    saved++;
  }

  return { found, saved, skipped };
}

if (require.main === module) {
  withCrawlerLog("producthunt", run).then((r) => {
    console.log(`[crawler:producthunt] found=${r.found} saved=${r.saved} skipped=${r.skipped}`);
    process.exit(0);
  });
}
