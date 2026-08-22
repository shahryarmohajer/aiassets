import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import AssetCard from "@/components/AssetCard";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 1800;

const CONTENT_TYPE_SLUGS = ["prompts", "workflows", "templates", "credits"] as const;
type ContentTypeSlug = (typeof CONTENT_TYPE_SLUGS)[number];

function isContentTypeSlug(s: string): s is ContentTypeSlug {
  return (CONTENT_TYPE_SLUGS as readonly string[]).includes(s);
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (isContentTypeSlug(category)) {
    return {
      title: `AI ${category} — browse the full index`,
      description: `Browse every ${category.slice(0, -1)} indexed on AI Assets Hub.`,
      alternates: { canonical: `/category/${category}` },
    };
  }
  const cat = await prisma.category.findUnique({ where: { slug: category } });
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.description ?? `AI assets in the ${cat.name} category.`,
    alternates: { canonical: `/category/${cat.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  if (isContentTypeSlug(category)) {
    return <ContentTypeView type={category} />;
  }

  const cat = await prisma.category.findUnique({ where: { slug: category } });
  if (!cat) notFound();

  const [prompts, workflows, templates] = await Promise.all([
    prisma.prompt.findMany({ where: { categoryId: cat.id, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.workflow.findMany({ where: { categoryId: cat.id, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.template.findMany({ where: { categoryId: cat.id, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs text-amber tracking-widest mb-2">CATEGORY</p>
        <h1 className="font-sans text-3xl font-semibold text-paper">{cat.name}</h1>
        {cat.description && <p className="mt-2 text-muted max-w-2xl">{cat.description}</p>}

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
        </div>
      </main>
    </>
  );
}

async function ContentTypeView({ type }: { type: ContentTypeSlug }) {
  const label = type[0].toUpperCase() + type.slice(1);

  if (type === "prompts") {
    const items = await prisma.prompt.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 60 });
    return (
      <Listing label={label}>
        {items.map((p) => (
          <AssetCard key={p.id} type="prompt" title={p.title} description={p.description} url={`/prompt/${p.slug}`} votes={p.votes} views={p.views} />
        ))}
      </Listing>
    );
  }
  if (type === "workflows") {
    const items = await prisma.workflow.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 60 });
    return (
      <Listing label={label}>
        {items.map((w) => (
          <AssetCard key={w.id} type="workflow" title={w.title} description={w.description} url={`/workflow/${w.slug}`} votes={w.votes} views={w.views} />
        ))}
      </Listing>
    );
  }
  if (type === "templates") {
    const items = await prisma.template.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 60 });
    return (
      <Listing label={label}>
        {items.map((t) => (
          <AssetCard key={t.id} type="template" title={t.title} description={t.description} url={`/template/${t.slug}`} views={t.views} />
        ))}
      </Listing>
    );
  }
  const items = await prisma.freeCredit.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 60 });
  return (
    <Listing label="Free Credits">
      {items.map((c) => (
        <AssetCard key={c.id} type="credit" title={c.offerTitle} description={c.offerDescription} url={`/credits/${c.slug}`} views={c.views} />
      ))}
    </Listing>
  );
}

function Listing({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs text-amber tracking-widest mb-2">INDEX</p>
        <h1 className="font-sans text-3xl font-semibold text-paper">{label}</h1>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {children}
        </div>
      </main>
    </>
  );
}
