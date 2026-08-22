import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import AssetCard from "@/components/AssetCard";
import { searchAssets } from "@/lib/search";
import type { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" search results` : "Search",
    description: q
      ? `Prompts, workflows, templates and free AI credits matching "${q}".`
      : "Search AI prompts, workflows, templates, and free AI credits.",
    robots: { index: false, follow: true }, // avoid thin/duplicate query pages in the index
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: "relevance" | "newest" | "popular"; page?: string }>;
}) {
  const { q = "", sort, page } = await searchParams;
  const { results, total } = await searchAssets({
    query: q,
    sort,
    page: page ? Number(page) : 1,
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SearchBar initialQuery={q} />

        <div className="mt-8 flex items-center justify-between">
          <p className="font-mono text-xs text-muted">
            {q ? (
              <>
                <span className="text-amber">{total}</span> result{total === 1 ? "" : "s"} for “{q}”
              </>
            ) : (
              "browsing all indexed assets"
            )}
          </p>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r) => (
            <AssetCard
              key={`${r.type}-${r.id}`}
              type={r.type}
              title={r.title}
              description={r.description}
              url={r.url}
              votes={r.votes}
              views={r.views}
            />
          ))}
          {results.length === 0 && (
            <p className="font-mono text-sm text-muted col-span-full border border-dashed border-line rounded-card px-4 py-10 text-center">
              Nothing matched “{q}” yet. Try a broader term, or check back as new assets are indexed every 6 hours.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
