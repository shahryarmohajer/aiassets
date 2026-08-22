import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import CopyButton from "@/components/CopyButton";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 3600;

async function getWorkflow(slug: string) {
  return prisma.workflow.findFirst({
    where: { slug, status: "APPROVED" },
    include: { category: true, tags: { include: { tag: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const wf = await getWorkflow(slug);
  if (!wf) return {};
  return {
    title: wf.title,
    description: wf.description,
    alternates: { canonical: `/workflow/${wf.slug}` },
    openGraph: { title: wf.title, description: wf.description, type: "article", url: `/workflow/${wf.slug}` },
    twitter: { card: "summary_large_image", title: wf.title, description: wf.description },
  };
}

export default async function WorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wf = await getWorkflow(slug);
  if (!wf) notFound();

  prisma.workflow.update({ where: { id: wf.id }, data: { views: { increment: 1 } } }).catch(() => {});
  const jsonString = JSON.stringify(wf.workflowJson, null, 2);

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: wf.title,
            description: wf.description,
            programmingLanguage: wf.platform,
            dateCreated: wf.createdAt,
            url: `/workflow/${wf.slug}`,
          }),
        }}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-mono text-xs text-indigo2 tracking-widest mb-3">
          WORKFLOW · {wf.platform}
        </p>
        <h1 className="font-sans text-3xl font-semibold text-paper">{wf.title}</h1>
        <p className="mt-3 text-muted">{wf.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {wf.tags.map(({ tag }) => (
            <Link key={tag.id} href={`/tag/${tag.slug}`} className="font-mono text-xs text-muted border border-line rounded-full px-3 py-1 hover:text-amber hover:border-amber">
              #{tag.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-surface border border-line rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-muted">WORKFLOW JSON</span>
            <CopyButton text={jsonString} />
          </div>
          <pre className="overflow-x-auto font-mono text-xs text-paper leading-relaxed max-h-96 overflow-y-auto">
            {jsonString}
          </pre>
        </div>

        <div className="mt-6 flex items-center gap-4 font-mono text-xs text-muted">
          <span>▲ {wf.votes} votes</span>
          <span>{wf.views} views</span>
          {wf.sourceUrl && (
            <a href={wf.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-amber hover:underline">
              source →
            </a>
          )}
        </div>
      </main>
    </>
  );
}
