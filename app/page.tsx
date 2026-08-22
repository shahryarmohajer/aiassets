import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import AssetCard from "@/components/AssetCard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 300; // ISR: regenerate every 5 min, keeps DB load low

async function getHomeData() {
  const [prompts, workflows, credits, categories, trending] = await Promise.all([
    prisma.prompt.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.workflow.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.freeCredit.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.category.findMany({ orderBy: { featured: "desc" }, take: 8 }),
    prisma.searchQuery.groupBy({
      by: ["query"],
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 8,
    }).catch(() => []),
  ]);
  return { prompts, workflows, credits, categories, trending };
}

export default async function HomePage() {
  const { prompts, workflows, credits, categories, trending } = await getHomeData();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4">
        {/* Hero */}
        <section className="card-catalog pt-16 pb-10 -mx-4 px-4">
          <p className="font-mono text-xs text-amber tracking-widest mb-3">
            001 · A CATALOG OF PRACTICAL AI ASSETS
          </p>
          <h1 className="font-sans text-3xl sm:text-5xl font-semibold text-paper max-w-2xl leading-tight">
            Find the prompt, workflow, or free credit you're looking for — instantly.
          </h1>
          <p className="mt-4 text-muted max-w-xl">
            An indexed, searchable library of AI prompts, n8n &amp; Make.com workflows,
            Cursor rules, MCP servers, and free AI credits — all in one place.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBar />
          </div>
          {trending.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
              <span className="text-amber">trending:</span>
              {trending.map((t) => (
                <Link
                  key={t.query}
                  href={`/search?q=${encodeURIComponent(t.query)}`}
                  className="hover:text-paper underline decoration-line underline-offset-4"
                >
                  {t.query}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="py-8 border-t border-line">
            <h2 className="font-mono text-xs text-muted tracking-widest mb-4">002 · BROWSE BY CATEGORY</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="border border-line rounded-card px-4 py-3 hover:border-amber transition-colors"
                >
                  <div className="font-sans text-paper text-sm font-medium">{c.name}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest Prompts */}
        <section className="py-8 border-t border-line">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-muted tracking-widest">003 · LATEST PROMPTS</h2>
            <Link href="/category/prompts" className="font-mono text-xs text-amber hover:underline">view all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prompts.map((p) => (
              <AssetCard key={p.id} type="prompt" title={p.title} description={p.description} url={`/prompt/${p.slug}`} votes={p.votes} views={p.views} />
            ))}
            {prompts.length === 0 && <EmptyNote label="prompts" />}
          </div>
        </section>

        {/* Latest Workflows */}
        <section className="py-8 border-t border-line">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-muted tracking-widest">004 · LATEST WORKFLOWS</h2>
            <Link href="/category/workflows" className="font-mono text-xs text-amber hover:underline">view all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workflows.map((w) => (
              <AssetCard key={w.id} type="workflow" title={w.title} description={w.description} url={`/workflow/${w.slug}`} votes={w.votes} views={w.views} />
            ))}
            {workflows.length === 0 && <EmptyNote label="workflows" />}
          </div>
        </section>

        {/* Free Credits */}
        <section className="py-8 border-t border-line pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-muted tracking-widest">005 · FREE AI CREDITS &amp; PROMOTIONS</h2>
            <Link href="/category/credits" className="font-mono text-xs text-amber hover:underline">view all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {credits.map((c) => (
              <AssetCard key={c.id} type="credit" title={c.offerTitle} description={c.offerDescription} url={`/credits/${c.slug}`} views={c.views} />
            ))}
            {credits.length === 0 && <EmptyNote label="offers" />}
          </div>
        </section>
      </main>
    </>
  );
}

function EmptyNote({ label }: { label: string }) {
  return (
    <p className="font-mono text-sm text-muted col-span-full border border-dashed border-line rounded-card px-4 py-6 text-center">
      No {label} indexed yet — run the crawlers or check back soon.
    </p>
  );
}
