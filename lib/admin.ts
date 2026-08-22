import { auth } from "@/auth";
import { redirect } from "next/navigation";

/** Ensure the current session belongs to an admin, or redirect home. */
export async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "admin") {
    redirect("/");
  }
  return session;
}
