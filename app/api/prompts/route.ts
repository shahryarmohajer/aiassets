import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { uniqueSlug, promptSlugExists, autoTag } from "@/lib/slug";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = 20;
  const sort = searchParams.get("sort") ?? "newest";

  const [items, total] = await Promise.all([
    prisma.prompt.findMany({
      where: { status: "APPROVED" },
      orderBy: sort === "popular" ? { votes: "desc" } : { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, tags: { include: { tag: true } } },
    }),
    prisma.prompt.count({ where: { status: "APPROVED" } }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  promptContent: z.string().min(5),
  categorySlug: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

// Content submissions land as PENDING and require admin approval — keeps
// the index clean without needing moderation infra beyond the admin panel.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { title, description, promptContent, categorySlug, sourceUrl } = parsed.data;

  const category = categorySlug
    ? await prisma.category.findUnique({ where: { slug: categorySlug } })
    : null;

  const slug = await uniqueSlug(title, promptSlugExists);
  const tagNames = autoTag(title, description);

  const prompt = await prisma.prompt.create({
    data: {
      title,
      slug,
      description,
      promptContent,
      sourceUrl,
      categoryId: category?.id,
      status: "PENDING",
      tags: {
        create: await Promise.all(
          tagNames.map(async (name) => {
            const tag = await prisma.tag.upsert({
              where: { name },
              create: { name, slug: name.replace(/\s+/g, "-") },
              update: {},
            });
            return { tagId: tag.id };
          })
        ),
      },
    },
  });

  return NextResponse.json({ prompt }, { status: 201 });
}
