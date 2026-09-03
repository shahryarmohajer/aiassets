import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import VoteButton from "@/components/VoteButton";
import { auth } from "@/auth";

export const revalidate = 3600;

async function getPrompt(slug: string) {
  return prisma.prompt.findFirst({
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
  const prompt = await getPrompt(slug);
  if (!prompt) return {};

  return {
    title: prompt.title,
    description: prompt.description,
    alternates: { canonical: `/prompt/${prompt.slug}` },
    openGraph: {
      title: prompt.title,
      description: prompt.description,
      type: "article",
      url: `/prompt/${prompt.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: prompt.title,
      description: prompt.description,
    },
  };
}

export default async function PromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prompt = await getPrompt(slug);
  if (!prompt) notFound();

  const session = await auth();

  // fire-and-forget view increment
  prisma.prompt.update({ where: { id: prompt.id }, data: { views: { increment: 1 } } }).catch(() => {});

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: prompt.title,
            description: prompt.description,
            dateCreated: prompt.createdAt,
            url: `/prompt/${prompt.slug}`,
          }),
        }}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-mono text-xs text-amber tracking-widest mb-3">PROMPT</p>
        <h1 className="font-sans text-3xl font-semibold text-paper">{prompt.title}</h1>
        <p className="mt-3 text-muted">{prompt.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {prompt.tags.map(({ tag }) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="font-mono text-xs text-muted border border-line rounded-full px-3 py-1 hover:text-amber hover:border-amber"
            >
              #{tag.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-surface border border-line rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-muted">PROMPT CONTENT</span>
            <CopyButton text={prompt.promptContent} />
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-paper leading-relaxed">
            {prompt.promptContent}
          </pre>
        </div>

        <div className="mt-6 flex items-center gap-4 font-mono text-xs text-muted">
          <VoteButton
            assetType="prompt"
            assetId={prompt.id}
            initialVotes={prompt.votes}
            signedIn={!!session?.user}
          />
          <span>{prompt.views} views</span>
          {prompt.sourceUrl && (
            <a href={prompt.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-amber hover:underline">
              source →
            </a>
          )}
        </div>
      </main>
    </>
  );
}
