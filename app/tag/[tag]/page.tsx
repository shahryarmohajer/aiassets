import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import AssetCard from "@/components/AssetCard";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
  if (!tag) return {};
  return {
    title: `#${tag.name} — AI assets tagged "${tag.name}"`,
    description: `Prompts, workflows, and templates tagged ${tag.name}.`,
    alternates: { canonical: `/tag/${tag.slug}` },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: tagSlug } = await params;
  const tag = await prisma.tag.findUnique({
    where: { slug: tagSlug },
    include: {
      prompts: { include: { prompt: true } },
      workflows: { include: { workflow: true } },
      templates: { include: { template: true } },
    },
  });
  if (!tag) notFound();

  const prompts = tag.prompts.map((pt) => pt.prompt).filter((p) => p.status === "APPROVED");
  const workflows = tag.workflows.map((wt) => wt.workflow).filter((w) => w.status === "APPROVED");
  const templates = tag.templates.map((tt) => tt.template).filter((t) => t.status === "APPROVED");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs text-amber tracking-widest mb-2">TAG</p>
        <h1 className="font-sans text-3xl font-semibold text-paper">#{tag.name}</h1>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {prompts.map((p) => (
            <AssetCard key={p.id} type="prompt" title={p.title} description={p.description} url={`/prompt/${p.slug}`} votes={p.votes} views={p.views} />
          ))}
          {workflows.map((w) => (
            <AssetCard key={w.id} type="workflow" title={w.title} description={w.description} url={`/workflow/${w.slug}`} votes={w.votes} views={w.views} />
          ))}
          {templates.map((t) => (
            <AssetCard key={t.id} type="template" title={t.title} description={t.description} url={`/template/${t.slug}`} views={t.views} />
          ))}
          {prompts.length + workflows.length + templates.length === 0 && (
            <p className="font-mono text-sm text-muted col-span-full border border-dashed border-line rounded-card px-4 py-10 text-center">
              Nothing tagged #{tag.name} yet.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
