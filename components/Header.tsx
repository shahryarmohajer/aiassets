import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-line bg-ink/95 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-mono text-amber text-lg tracking-tight">§</span>
          <span className="font-mono font-semibold text-paper tracking-tight">
            ai-assets<span className="text-muted">/</span>index
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5 font-mono text-sm text-muted">
          <Link href="/category/prompts" className="hover:text-paper transition-colors">prompts</Link>
          <Link href="/category/workflows" className="hover:text-paper transition-colors">workflows</Link>
          <Link href="/category/templates" className="hover:text-paper transition-colors">templates</Link>
          <Link href="/category/credits" className="hover:text-paper transition-colors">credits</Link>
          <Link href="/login" className="text-paper border border-line rounded-card px-3 py-1 hover:border-amber transition-colors">
            sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
