import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminCrawlersPage() {
  await requireAdmin();
  const logs = await prisma.crawlerLog.findMany({ orderBy: { startedAt: "desc" }, take: 100 });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="font-mono text-xs text-amber tracking-widest mb-2">ADMIN</p>
      <h1 className="font-sans text-3xl font-semibold text-paper mb-8">Crawler Logs</h1>

      <table className="w-full font-mono text-sm border border-line rounded-card overflow-hidden">
        <thead className="bg-surface text-muted text-left">
          <tr>
            <th className="px-4 py-2">Source</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Found</th>
            <th className="px-4 py-2">Saved</th>
            <th className="px-4 py-2">Skipped</th>
            <th className="px-4 py-2">Started</th>
            <th className="px-4 py-2">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {logs.map((log) => (
            <tr key={log.id} className="text-paper">
              <td className="px-4 py-2">{log.source}</td>
              <td className={`px-4 py-2 ${log.status === "SUCCESS" ? "text-mint" : log.status === "FAILED" ? "text-red-400" : "text-amber"}`}>
                {log.status}
              </td>
              <td className="px-4 py-2">{log.itemsFound}</td>
              <td className="px-4 py-2">{log.itemsSaved}</td>
              <td className="px-4 py-2">{log.itemsSkipped}</td>
              <td className="px-4 py-2 text-muted text-xs">{log.startedAt.toLocaleString()}</td>
              <td className="px-4 py-2 text-red-400 text-xs max-w-xs truncate">{log.errorMessage ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {logs.length === 0 && <p className="mt-6 text-center text-muted font-mono text-sm">No crawler runs logged yet.</p>}
    </main>
  );
}
