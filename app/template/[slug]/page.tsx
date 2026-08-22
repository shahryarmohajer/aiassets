import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 3600;

async function getTemplate(slug: string) {
  return prisma.template.findFirst({
    where: { slug, status: "APPROVED" },
    include: { category: true, tags: { include: { tag: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTemplate(slug);
  if (!t) return {};
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: `/template/${t.slug}` },
    openGraph: { title: t.title, description: t.description, type: "article", url: `/template/${t.slug}` },
    twitter: { card: "summary_large_image", title: t.title, description: t.description },
  };
}

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTemplate(slug);
  if (!t) notFound();

  prisma.template.update({ where: { id: t.id }, data: { views: { increment: 1 } } }).catch(() => {});

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: t.title,
            description: t.description,
            dateCreated: t.createdAt,
            url: `/template/${t.slug}`,
          }),
        }}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-mono text-xs text-mint tracking-widest mb-3">TEMPLATE</p>
        <h1 className="font-sans text-3xl font-semibold text-paper">{t.title}</h1>
        <p className="mt-3 text-muted">{t.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {t.tags.map(({ tag }) => (
            <Link key={tag.id} href={`/tag/${tag.slug}`} className="font-mono text-xs text-muted border border-line rounded-full px-3 py-1 hover:text-amber hover:border-amber">
              #{tag.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <a
            href={t.downloadUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-mono text-sm text-ink bg-mint rounded-card px-4 py-2 hover:opacity-90"
          >
            download →
          </a>
          {t.sourceUrl && (
            <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-mono text-sm text-muted border border-line rounded-card px-4 py-2 hover:text-paper">
              view source
            </a>
          )}
        </div>

        <p className="mt-6 font-mono text-xs text-muted">{t.views} views</p>
      </main>
    </>
  );
}
