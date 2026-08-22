import slugify from "slugify";
import { prisma } from "@/lib/prisma";

/**
 * Generate a unique, URL-safe slug for a given title within a model.
 * Appends -2, -3, ... on collision.
 */
export async function uniqueSlug(
  title: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(title, { lower: true, strict: true, trim: true }).slice(0, 80);
  let candidate = base || "item";
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${n}`;
    n++;
  }
  return candidate;
}

export async function promptSlugExists(slug: string) {
  return (await prisma.prompt.count({ where: { slug } })) > 0;
}
export async function workflowSlugExists(slug: string) {
  return (await prisma.workflow.count({ where: { slug } })) > 0;
}
export async function templateSlugExists(slug: string) {
  return (await prisma.template.count({ where: { slug } })) > 0;
}
export async function creditSlugExists(slug: string) {
  return (await prisma.freeCredit.count({ where: { slug } })) > 0;
}

/**
 * Very lightweight keyword-based auto-tagger. Looks for known AI/automation
 * terms in the title+description and returns matching tag names. Cheap
 * enough to run on every crawled item without extra API calls or ML models
 * (keeps crawler resource usage low on a 4GB VPS).
 */
const TAG_VOCAB = [
  "seo", "automation", "marketing", "sales", "email", "content", "copywriting",
  "youtube", "video", "social media", "ecommerce", "productivity", "coding",
  "chatgpt", "claude", "gemini", "cursor", "mcp", "n8n", "make", "zapier",
  "lead generation", "customer support", "data analysis", "image generation",
  "voice", "agents", "rag", "prompt engineering", "react", "python", "api",
  "no-code", "free credits", "startup", "writing", "research",
];

export function autoTag(title: string, description: string): string[] {
  const haystack = `${title} ${description}`.toLowerCase();
  return TAG_VOCAB.filter((t) => haystack.includes(t));
}
