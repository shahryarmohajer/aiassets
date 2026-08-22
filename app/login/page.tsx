import { signIn } from "@/auth";
import Header from "@/components/Header";

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-sm px-4 py-20">
        <p className="font-mono text-xs text-amber tracking-widest mb-2">ACCOUNT</p>
        <h1 className="font-sans text-2xl font-semibold text-paper mb-6">Sign in</h1>

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
              placeholder="you@example.com"
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
