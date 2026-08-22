import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 1800;

async function getCredit(slug: string) {
  return prisma.freeCredit.findFirst({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCredit(slug);
  if (!c) return {};
  return {
    title: c.offerTitle,
    description: c.offerDescription,
    alternates: { canonical: `/credits/${c.slug}` },
    openGraph: { title: c.offerTitle, description: c.offerDescription, type: "article", url: `/credits/${c.slug}` },
    twitter: { card: "summary_large_image", title: c.offerTitle, description: c.offerDescription },
  };
}

export default async function CreditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCredit(slug);
  if (!c) notFound();

  prisma.freeCredit.update({ where: { id: c.id }, data: { views: { increment: 1 } } }).catch(() => {});
  const expired = c.status === "EXPIRED";

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Offer",
            name: c.offerTitle,
            description: c.offerDescription,
            availability: expired ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            url: `/credits/${c.slug}`,
          }),
        }}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-mono text-xs text-amber tracking-widest mb-3">
          FREE CREDITS · {c.provider.toUpperCase()} {expired && "· EXPIRED"}
        </p>
        <h1 className="font-sans text-3xl font-semibold text-paper">{c.offerTitle}</h1>
        <p className="mt-3 text-muted">{c.offerDescription}</p>

        {c.couponCode && (
          <div className="mt-6 inline-flex items-center gap-3 bg-surface border border-dashed border-amber rounded-card px-4 py-2">
            <span className="font-mono text-xs text-muted">CODE</span>
            <span className="font-mono text-paper tracking-widest">{c.couponCode}</span>
          </div>
        )}

        {c.expirationDate && (
          <p className="mt-4 font-mono text-xs text-muted">
            expires: {new Date(c.expirationDate).toLocaleDateString()}
          </p>
        )}

        <div className="mt-8">
          <a
            href={c.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-mono text-sm text-ink bg-amber rounded-card px-4 py-2 hover:opacity-90"
          >
            claim offer →
          </a>
        </div>
      </main>
    </>
  );
}
