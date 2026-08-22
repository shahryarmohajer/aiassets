"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="font-mono text-xs text-ink bg-amber rounded px-2 py-1 hover:opacity-90 transition-opacity"
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}
