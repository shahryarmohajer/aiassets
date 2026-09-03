import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  assetType: z.enum(["prompt", "workflow"]),
  assetId: z.string().min(1),
});

// One vote per user per asset. POSTing again on the same asset removes the
// vote (toggle behavior) rather than stacking duplicate votes. The visible
// `votes` count on Prompt/Workflow is denormalized for fast sorting/display
// and kept in sync here inside a transaction.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in to vote" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { assetType, assetId } = parsed.data;

  const whereExisting =
    assetType === "prompt"
      ? { userId_promptId: { userId, promptId: assetId } }
      : { userId_workflowId: { userId, workflowId: assetId } };

  const existing = await prisma.vote.findUnique({ where: whereExisting as never }).catch(() => null);

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.vote.delete({ where: { id: existing.id } });
      if (assetType === "prompt") {
        await tx.prompt.update({ where: { id: assetId }, data: { votes: { decrement: 1 } } });
      } else {
        await tx.workflow.update({ where: { id: assetId }, data: { votes: { decrement: 1 } } });
      }
      return { voted: false };
    }

    await tx.vote.create({
      data: {
        userId,
        promptId: assetType === "prompt" ? assetId : undefined,
        workflowId: assetType === "workflow" ? assetId : undefined,
      },
    });
    if (assetType === "prompt") {
      await tx.prompt.update({ where: { id: assetId }, data: { votes: { increment: 1 } } });
    } else {
      await tx.workflow.update({ where: { id: assetId }, data: { votes: { increment: 1 } } });
    }
    return { voted: true };
  });

  const votes =
    assetType === "prompt"
      ? (await prisma.prompt.findUnique({ where: { id: assetId }, select: { votes: true } }))?.votes
      : (await prisma.workflow.findUnique({ where: { id: assetId }, select: { votes: true } }))?.votes;

  return NextResponse.json({ ...result, votes: votes ?? 0 });
}

// Tells the client whether the current user has already voted on this asset,
// so the button can render its active state on page load.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const { searchParams } = new URL(req.url);
  const assetType = searchParams.get("assetType");
  const assetId = searchParams.get("assetId");

  if (!userId || !assetId || (assetType !== "prompt" && assetType !== "workflow")) {
    return NextResponse.json({ voted: false });
  }

  const where =
    assetType === "prompt"
      ? { userId_promptId: { userId, promptId: assetId } }
      : { userId_workflowId: { userId, workflowId: assetId } };

  const existing = await prisma.vote.findUnique({ where: where as never }).catch(() => null);
  return NextResponse.json({ voted: !!existing });
}
