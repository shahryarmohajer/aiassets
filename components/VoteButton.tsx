"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VoteButton({
  assetType,
  assetId,
  initialVotes,
  signedIn,
}: {
  assetType: "prompt" | "workflow";
  assetId: string;
  initialVotes: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    fetch(`/api/votes?assetType=${assetType}&assetId=${assetId}`)
      .then((r) => r.json())
      .then((d) => setVoted(!!d.voted))
      .catch(() => {});
  }, [assetType, assetId, signedIn]);

  async function handleClick() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);

    // optimistic update
    const wasVoted = voted;
    setVoted(!wasVoted);
    setVotes((v) => v + (wasVoted ? -1 : 1));

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetType, assetId }),
      });
      if (!res.ok) throw new Error("vote failed");
      const data = await res.json();
      setVotes(data.votes);
      setVoted(data.voted);
    } catch {
      // revert on failure
      setVoted(wasVoted);
      setVotes((v) => v + (wasVoted ? 1 : -1));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`font-mono text-xs rounded-card border px-3 py-1.5 transition-colors ${
        voted
          ? "border-amber text-amber bg-amber/10"
          : "border-line text-muted hover:text-paper hover:border-amber"
      }`}
    >
      ▲ {votes} {voted ? "voted" : "vote"}
    </button>
  );
}
