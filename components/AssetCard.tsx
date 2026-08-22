import Link from "next/link";

const TYPE_LABEL: Record<string, string> = {
  prompt: "PROMPT",
  workflow: "WORKFLOW",
  template: "TEMPLATE",
  credit: "CREDIT",
};

const TYPE_COLOR: Record<string, string> = {
  prompt: "text-amber",
  workflow: "text-indigo2",
  template: "text-mint",
  credit: "text-amber",
};

export interface AssetCardProps {
  type: "prompt" | "workflow" | "template" | "credit";
  title: string;
  description: string;
  url: string;
  votes?: number;
  views?: number;
}

export default function AssetCard({ type, title, description, url, votes, views }: AssetCardProps) {
  return (
    <Link
      href={url}
      className="index-tab block bg-surface border border-line rounded-card px-4 py-3 hover:border-amber transition-colors group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`font-mono text-[11px] tracking-wider ${TYPE_COLOR[type]}`}>
          {TYPE_LABEL[type]}
        </span>
        <span className="font-mono text-[11px] text-muted">
          {votes !== undefined && votes > 0 ? `▲ ${votes}` : ""}
          {views !== undefined && views > 0 ? ` · ${views} views` : ""}
        </span>
      </div>
      <h3 className="font-sans font-medium text-paper group-hover:text-amber transition-colors leading-snug">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted line-clamp-2">{description}</p>
    </Link>
  );
}
