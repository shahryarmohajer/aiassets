import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = 20;

  const [items, total] = await Promise.all([
    prisma.template.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, tags: { include: { tag: true } } },
    }),
    prisma.template.count({ where: { status: "APPROVED" } }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
