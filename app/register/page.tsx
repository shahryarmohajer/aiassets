"use client";

import Header from "@/components/Header";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Could not create account.");
        return;
      }
      // account created — sign in immediately with the same credentials
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created — please sign in.");
        router.push("/login");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-sm px-4 py-20">
        <p className="font-mono text-xs text-amber tracking-widest mb-2 uppercase">Account</p>
        <h1 className="font-sans text-2xl font-semibold text-paper mb-6">Create an account</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface border border-line rounded-card px-3 py-2.5 text-paper text-sm outline-none focus:border-amber"
          />
          <input
            required
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface border border-line rounded-card px-3 py-2.5 text-paper text-sm outline-none focus:border-amber"
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface border border-line rounded-card px-3 py-2.5 text-paper text-sm outline-none focus:border-amber"
          />
          {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-mono text-sm text-ink bg-amber rounded-card px-4 py-2.5 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 font-mono text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-amber hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </>
  );
}
