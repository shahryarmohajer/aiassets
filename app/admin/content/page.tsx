import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ContentType = "prompt" | "workflow" | "template";

async function getPending(type: ContentType) {
  if (type === "prompt") return prisma.prompt.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  if (type === "workflow") return prisma.workflow.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  return prisma.template.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
}

async function setStatus(type: ContentType, id: string, status: "APPROVED" | "REJECTED") {
  "use server";
  await requireAdmin();
  if (type === "prompt") await prisma.prompt.update({ where: { id }, data: { status } });
  if (type === "workflow") await prisma.workflow.update({ where: { id }, data: { status } });
  if (type === "template") await prisma.template.update({ where: { id }, data: { status } });
  revalidatePath("/admin/content");
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdmin();
  const { type: rawType } = await searchParams;
  const type: ContentType = rawType === "workflow" || rawType === "template" ? rawType : "prompt";

  const items = await getPending(type);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="font-mono text-xs text-amber tracking-widest mb-2">ADMIN · MODERATION QUEUE</p>
      <h1 className="font-sans text-3xl font-semibold text-paper mb-2">Pending {type}s</h1>

      <div className="flex gap-3 mb-8 font-mono text-xs">
        {(["prompt", "workflow", "template"] as ContentType[]).map((t) => (
          <a key={t} href={`/admin/content?type=${t}`} className={t === type ? "text-amber" : "text-muted hover:text-paper"}>
            {t}s
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((item: { id: string; title: string; description: string }) => (
          <div key={item.id} className="border border-line rounded-card p-4">
            <h3 className="font-sans font-medium text-paper">{item.title}</h3>
            <p className="text-sm text-muted mt-1">{item.description}</p>
            <div className="mt-3 flex gap-2">
              <form action={setStatus.bind(null, type, item.id, "APPROVED")}>
                <button className="font-mono text-xs text-ink bg-mint rounded px-3 py-1.5">approve</button>
              </form>
              <form action={setStatus.bind(null, type, item.id, "REJECTED")}>
                <button className="font-mono text-xs text-paper border border-line rounded px-3 py-1.5 hover:border-red-400">
                  reject
                </button>
              </form>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="font-mono text-sm text-muted border border-dashed border-line rounded-card px-4 py-10 text-center">
            Queue is empty. 🎉
          </p>
        )}
      </div>
    </main>
  );
}
