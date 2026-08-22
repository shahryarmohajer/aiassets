import { NextRequest, NextResponse } from "next/server";
import { searchAssets, AssetType } from "@/lib/search";
import { prisma } from "@/lib/prisma";

// This route is the single source of truth for combined search across
// prompts, workflows, templates, and free credits. Target: < 300ms on a
// 2 vCPU / 4GB VPS thanks to GIN indexes on tsvector columns.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const query = searchParams.get("q") ?? "";
  const typesParam = searchParams.get("types"); // comma-separated: prompt,workflow,template,credit
  const category = searchParams.get("category") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const sort = (searchParams.get("sort") as "relevance" | "newest" | "popular") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);

  const types = typesParam
    ? (typesParam.split(",").filter(Boolean) as AssetType[])
    : undefined;

  const data = await searchAssets({ query, types, category, tag, sort, page });

  // fire-and-forget analytics log (non-blocking, don't await to keep latency low)
  if (query.trim()) {
    prisma.searchQuery
      .create({ data: { query: query.trim(), resultsCount: data.total } })
      .catch(() => {});
  }

  return NextResponse.json(data);
}
