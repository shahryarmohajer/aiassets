/**
 * Runs all crawler sources sequentially (not in parallel) to keep memory
 * and network usage low on a 2 vCPU / 4GB VPS. Invoked by cron every 6h.
 *
 * To add a new source: create crawlers/<source>.ts exporting an async
 * `run()` that returns { found, saved, skipped }, then add it below.
 */
import { withCrawlerLog } from "./lib";
import { run as runReddit } from "./reddit";
import { run as runGithub } from "./github";
import { run as runFlowgpt } from "./flowgpt";
import { run as runHuggingface } from "./huggingface";
import { run as runProducthunt } from "./producthunt";

const SOURCES: Array<{ name: string; run: () => Promise<{ found: number; saved: number; skipped: number }> }> = [
  { name: "reddit", run: runReddit },
  { name: "github", run: runGithub },
  { name: "flowgpt", run: runFlowgpt },
  { name: "huggingface", run: runHuggingface },
  { name: "producthunt", run: runProducthunt },
];

async function main() {
  for (const source of SOURCES) {
    const result = await withCrawlerLog(source.name, source.run);
    console.log(`[crawler:${source.name}] found=${result.found} saved=${result.saved} skipped=${result.skipped}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[crawlers] fatal error running crawl:all", err);
  process.exit(1);
});
