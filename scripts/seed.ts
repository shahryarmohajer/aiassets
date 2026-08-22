/**
 * Seeds baseline categories/tags and a handful of sample assets so the
 * site isn't empty on first run. Run: `npm run db:seed`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Prompts", slug: "prompts", description: "AI prompts for every use case.", featured: true },
  { name: "Workflows", slug: "workflows", description: "n8n, Make.com, and Zapier automation workflows.", featured: true },
  { name: "Templates", slug: "templates", description: "Cursor rules, MCP servers, and reusable templates.", featured: true },
  { name: "Free Credits", slug: "credits", description: "Free AI credits, trials, and promotions.", featured: true },
  { name: "Marketing", slug: "marketing" },
  { name: "SEO", slug: "seo" },
  { name: "Coding", slug: "coding" },
  { name: "Productivity", slug: "productivity" },
];

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: cat.slug }, create: cat, update: cat });
  }

  const seoCategory = await prisma.category.findUnique({ where: { slug: "seo" } });

  await prisma.prompt.upsert({
    where: { slug: "chatgpt-seo-prompt" },
    create: {
      title: "ChatGPT SEO Content Brief Generator",
      slug: "chatgpt-seo-prompt",
      description: "Generates a full SEO content brief — target keyword, search intent, outline, and meta description — from a single topic.",
      promptContent:
        "You are an SEO strategist. Given a topic, produce: 1) primary keyword, 2) 3 related keywords, 3) searcher intent, 4) an H2/H3 outline, 5) a 155-character meta description. Topic: {{topic}}",
      categoryId: seoCategory?.id,
      status: "APPROVED",
      votes: 12,
    },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
