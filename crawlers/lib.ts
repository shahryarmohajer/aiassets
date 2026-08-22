import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { CrawlerStatus } from "@prisma/client";

/**
 * Wraps a crawler run with logging + timing, so every cron invocation
 * leaves a row in crawler_logs (visible in /admin/crawlers).
 */
export async function withCrawlerLog(
  source: string,
  fn: () => Promise<{ found: number; saved: number; skipped: number }>
) {
  const startedAt = new Date();
  let status: CrawlerStatus = "SUCCESS";
  let errorMessage: string | undefined;
  let result = { found: 0, saved: 0, skipped: 0 };

  try {
    result = await fn();
    if (result.saved === 0 && result.found > 0) status = "PARTIAL";
  } catch (err) {
    status = "FAILED";
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[crawler:${source}] failed:`, err);
  }

  await prisma.crawlerLog.create({
    data: {
      source,
      status,
      itemsFound: result.found,
      itemsSaved: result.saved,
      itemsSkipped: result.skipped,
      errorMessage,
      startedAt,
      finishedAt: new Date(),
    },
  });

  return result;
}

/** Hash a source URL for cheap, index-friendly dedupe lookups. */
export function hashUrl(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex");
}

/** Returns true if this URL has already been ingested; records it if not. */
export async function claimIfNew(sourceUrl: string): Promise<boolean> {
  const urlHash = hashUrl(sourceUrl);
  const existing = await prisma.seenSource.findUnique({ where: { urlHash } });
  if (existing) return false;
  await prisma.seenSource.create({ data: { urlHash, sourceUrl } });
  return true;
}

/** Simple polite delay between HTTP calls to avoid hammering source sites. */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
