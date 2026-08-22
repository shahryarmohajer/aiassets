import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboard() {
  await requireAdmin();

  const [pendingPrompts, pendingWorkflows, pendingTemplates, recentLogs, topQueries] = await Promise.all([
    prisma.prompt.count({ where: { status: "PENDING" } }),
    prisma.workflow.count({ where: { status: "PENDING" } }),
    prisma.template.count({ where: { status: "PENDING" } }),
    prisma.crawlerLog.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.searchQuery.groupBy({
      by: ["query"],
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="font-mono text-xs text-amber tracking-widest mb-2">ADMIN</p>
      <h1 className="font-sans text-3xl font-semibold text-paper mb-8">Dashboard</h1>

      <div className="grid sm:grid-cols-3 gap-3 mb-10">
        <StatCard label="Pending Prompts" value={pendingPrompts} href="/admin/content?type=prompt&status=PENDING" />
        <StatCard label="Pending Workflows" value={pendingWorkflows} href="/admin/content?type=workflow&status=PENDING" />
        <StatCard label="Pending Templates" value={pendingTemplates} href="/admin/content?type=template&status=PENDING" />
      </div>

      <section className="mb-10">
        <h2 className="font-mono text-xs text-muted tracking-widest mb-3">CRAWLER LOGS</h2>
        <div className="border border-line rounded-card divide-y divide-line">
          {recentLogs.map((log) => (
            <div key={log.id} className="px-4 py-3 flex items-center justify-between font-mono text-sm">
              <span className="text-paper">{log.source}</span>
              <span className={log.status === "SUCCESS" ? "text-mint" : log.status === "FAILED" ? "text-red-400" : "text-amber"}>
                {log.status}
              </span>
              <span className="text-muted text-xs">
                {log.itemsSaved}/{log.itemsFound} saved
              </span>
              <span className="text-muted text-xs">{log.startedAt.toLocaleString()}</span>
            </div>
          ))}
          {recentLogs.length === 0 && <p className="px-4 py-6 text-center text-muted font-mono text-sm">No crawler runs yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-xs text-muted tracking-widest mb-3">TOP SEARCH QUERIES</h2>
        <div className="border border-line rounded-card divide-y divide-line">
          {topQueries.map((q) => (
            <div key={q.query} className="px-4 py-2.5 flex items-center justify-between font-mono text-sm">
              <span className="text-paper">{q.query}</span>
              <span className="text-muted">{q._count.query}×</span>
            </div>
          ))}
          {topQueries.length === 0 && <p className="px-4 py-6 text-center text-muted font-mono text-sm">No searches logged yet.</p>}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block border border-line rounded-card px-4 py-4 hover:border-amber transition-colors">
      <div className="font-mono text-3xl text-amber">{value}</div>
      <div className="font-mono text-xs text-muted mt-1">{label}</div>
    </Link>
  );
}
