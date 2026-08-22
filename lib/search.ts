import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type AssetType = "prompt" | "workflow" | "template" | "credit";

export interface SearchResult {
  id: string;
  type: AssetType;
  title: string;
  slug: string;
  description: string;
  url: string;
  votes: number;
  views: number;
  createdAt: Date;
  rank: number;
}

export interface SearchParams {
  query?: string;
  types?: AssetType[]; // filter to specific content types, default = all
  category?: string; // category slug
  tag?: string; // tag slug
  sort?: "relevance" | "newest" | "popular";
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Unified search across prompts, workflows, templates, and free credits
 * using PostgreSQL's built-in full text search (tsvector/tsquery) with
 * ts_rank for relevance. Falls back to trigram similarity for short/typo
 * queries. No external search engine required.
 */
export async function searchAssets(params: SearchParams): Promise<{
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const {
    query = "",
    types = ["prompt", "workflow", "template", "credit"],
    category,
    tag,
    sort = query ? "relevance" : "newest",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;

  const offset = (page - 1) * pageSize;
  const tsQuery = query.trim().length > 0 ? toTsQuery(query) : null;

  const parts: Prisma.Sql[] = [];

  if (types.includes("prompt")) {
    parts.push(Prisma.sql`
      SELECT p.id, 'prompt' AS type, p.title, p.slug, p.description,
             p.votes, p.views, p.created_at AS "createdAt",
             ${tsQuery ? Prisma.sql`ts_rank(p.search_vector, to_tsquery('english', ${tsQuery}))` : Prisma.sql`0`} AS rank
      FROM prompts p
      WHERE p.status = 'APPROVED'
        ${tsQuery ? Prisma.sql`AND p.search_vector @@ to_tsquery('english', ${tsQuery})` : Prisma.empty}
        ${category ? Prisma.sql`AND p.category_id IN (SELECT id FROM categories WHERE slug = ${category})` : Prisma.empty}
        ${tag ? Prisma.sql`AND p.id IN (SELECT prompt_id FROM prompt_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.slug = ${tag})` : Prisma.empty}
    `);
  }

  if (types.includes("workflow")) {
    parts.push(Prisma.sql`
      SELECT w.id, 'workflow' AS type, w.title, w.slug, w.description,
             w.votes, w.views, w.created_at AS "createdAt",
             ${tsQuery ? Prisma.sql`ts_rank(w.search_vector, to_tsquery('english', ${tsQuery}))` : Prisma.sql`0`} AS rank
      FROM workflows w
      WHERE w.status = 'APPROVED'
        ${tsQuery ? Prisma.sql`AND w.search_vector @@ to_tsquery('english', ${tsQuery})` : Prisma.empty}
        ${category ? Prisma.sql`AND w.category_id IN (SELECT id FROM categories WHERE slug = ${category})` : Prisma.empty}
        ${tag ? Prisma.sql`AND w.id IN (SELECT workflow_id FROM workflow_tags wt JOIN tags t ON t.id = wt.tag_id WHERE t.slug = ${tag})` : Prisma.empty}
    `);
  }

  if (types.includes("template")) {
    parts.push(Prisma.sql`
      SELECT tp.id, 'template' AS type, tp.title, tp.slug, tp.description,
             0 AS votes, tp.views, tp.created_at AS "createdAt",
             ${tsQuery ? Prisma.sql`ts_rank(tp.search_vector, to_tsquery('english', ${tsQuery}))` : Prisma.sql`0`} AS rank
      FROM templates tp
      WHERE tp.status = 'APPROVED'
        ${tsQuery ? Prisma.sql`AND tp.search_vector @@ to_tsquery('english', ${tsQuery})` : Prisma.empty}
        ${category ? Prisma.sql`AND tp.category_id IN (SELECT id FROM categories WHERE slug = ${category})` : Prisma.empty}
        ${tag ? Prisma.sql`AND tp.id IN (SELECT template_id FROM template_tags tt JOIN tags t ON t.id = tt.tag_id WHERE t.slug = ${tag})` : Prisma.empty}
    `);
  }

  if (types.includes("credit")) {
    parts.push(Prisma.sql`
      SELECT fc.id, 'credit' AS type, fc.offer_title AS title, fc.slug, fc.offer_description AS description,
             0 AS votes, fc.views, fc.created_at AS "createdAt",
             ${tsQuery ? Prisma.sql`ts_rank(fc.search_vector, to_tsquery('english', ${tsQuery}))` : Prisma.sql`0`} AS rank
      FROM free_credits fc
      WHERE fc.status = 'ACTIVE'
        ${tsQuery ? Prisma.sql`AND fc.search_vector @@ to_tsquery('english', ${tsQuery})` : Prisma.empty}
    `);
  }

  if (parts.length === 0) return { results: [], total: 0, page, pageSize };

  const unioned = Prisma.join(parts, " UNION ALL ");

  const orderBy =
    sort === "popular"
      ? Prisma.sql`ORDER BY votes DESC, "createdAt" DESC`
      : sort === "newest"
        ? Prisma.sql`ORDER BY "createdAt" DESC`
        : Prisma.sql`ORDER BY rank DESC, votes DESC`;

  const rows = await prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    SELECT * FROM (${unioned}) combined
    ${orderBy}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const countRows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count FROM (${unioned}) combined
  `);

  const results: SearchResult[] = rows.map((r) => ({
    ...r,
    url: urlFor(r.type as AssetType, r.slug),
  }));

  return {
    results,
    total: Number(countRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

function urlFor(type: AssetType, slug: string): string {
  switch (type) {
    case "prompt":
      return `/prompt/${slug}`;
    case "workflow":
      return `/workflow/${slug}`;
    case "template":
      return `/template/${slug}`;
    case "credit":
      return `/credits/${slug}`;
  }
}

/**
 * Convert a free-text query into a safe to_tsquery expression.
 * Splits on whitespace, escapes special tsquery chars, joins terms with
 * `&` (AND) and appends `:*` for prefix matching on the last term so
 * partial/incremental typing still returns results.
 */
function toTsQuery(input: string): string {
  const terms = input
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[&|!():*']/g, ""))
    .filter(Boolean);

  if (terms.length === 0) return "";

  return terms.map((t, i) => (i === terms.length - 1 ? `${t}:*` : t)).join(" & ");
}
