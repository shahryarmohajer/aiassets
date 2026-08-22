"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = [
  "youtube automation",
  "seo prompts",
  "marketing workflow",
  "free claude credits",
  "cursor rules react",
  "n8n ecommerce",
];

export default function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function submit(q: string) {
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 focus-within:border-amber transition-colors"
      >
        <span className="font-mono text-amber select-none">&gt;</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="search prompts, workflows, templates, free credits…"
          className="flex-1 bg-transparent outline-none font-mono text-paper placeholder:text-muted text-base"
        />
        <button
          type="submit"
          className="font-mono text-sm text-ink bg-amber rounded px-3 py-1.5 hover:opacity-90 transition-opacity"
        >
          search
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => submit(ex)}
            className="font-mono text-xs text-muted border border-line rounded-full px-3 py-1 hover:text-amber hover:border-amber transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
