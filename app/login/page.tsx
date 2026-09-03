import { signIn } from "@/auth";
import Header from "@/components/Header";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-sm px-4 py-20">
        <p className="font-mono text-xs text-amber tracking-widest mb-2 uppercase">Account</p>
        <h1 className="font-sans text-2xl font-semibold text-paper mb-6">Sign in</h1>

        {error && (
          <p className="mb-4 font-mono text-sm text-red-400">
            {error === "CredentialsSignin" ? "Incorrect email or password." : "Sign-in failed. Try again."}
          </p>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/",
            });
          }}
          className="space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full bg-surface border border-line rounded-card px-3 py-2.5 text-paper text-sm outline-none focus:border-amber"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full bg-surface border border-line rounded-card px-3 py-2.5 text-paper text-sm outline-none focus:border-amber"
          />
          <button className="w-full font-mono text-sm text-ink bg-amber rounded-card px-4 py-2.5 hover:opacity-90">
            Sign in
          </button>
        </form>

        <p className="mt-3 font-mono text-xs text-muted">
          No account?{" "}
          <Link href="/register" className="text-amber hover:underline">
            Create one
          </Link>
        </p>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="font-mono text-xs text-muted uppercase">or</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button className="w-full font-mono text-sm border border-line rounded-card px-4 py-2.5 text-paper hover:border-amber transition-colors">
              Continue with Google
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await signIn("github");
            }}
          >
            <button className="w-full font-mono text-sm border border-line rounded-card px-4 py-2.5 text-paper hover:border-amber transition-colors">
              Continue with GitHub
            </button>
          </form>
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("nodemailer", { email: formData.get("email") });
            }}
            className="flex gap-2"
          >
            <input
              name="email"
              type="email"
              required
              placeholder="Email for magic link"
              className="flex-1 bg-surface border border-line rounded-card px-3 py-2.5 text-paper text-sm outline-none focus:border-amber"
            />
            <button className="font-mono text-sm text-ink bg-amber rounded-card px-4 hover:opacity-90">
              Send link
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
