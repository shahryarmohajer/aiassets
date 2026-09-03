import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  uniqueSlug,
  promptSlugExists,
  workflowSlugExists,
  templateSlugExists,
  creditSlugExists,
} from "@/lib/slug";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

type AssetType = "prompt" | "workflow" | "template" | "credit";

function parseTagNames(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

async function tagConnections(tagNames: string[]) {
  return Promise.all(
    tagNames.map(async (name) => {
      const tag = await prisma.tag.upsert({
        where: { name },
        create: { name, slug: name.replace(/\s+/g, "-") },
        update: {},
      });
      return { tagId: tag.id };
    })
  );
}

async function createPrompt(formData: FormData) {
  "use server";
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const promptContent = String(formData.get("promptContent") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "") || undefined;
  const sourceUrl = String(formData.get("sourceUrl") ?? "") || undefined;
  const tagNames = parseTagNames(String(formData.get("tags") ?? ""));
  if (!title || !description || !promptContent) return;

  const slug = await uniqueSlug(title, promptSlugExists);
  await prisma.prompt.create({
    data: {
      title,
      slug,
      description,
      promptContent,
      sourceUrl,
      categoryId,
      status: "APPROVED",
      tags: { create: await tagConnections(tagNames) },
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/content");
  redirect(`/prompt/${slug}`);
}

async function createWorkflow(formData: FormData) {
  "use server";
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const platform = String(formData.get("platform") ?? "N8N") as "N8N" | "MAKE" | "ZAPIER";
  const workflowJsonRaw = String(formData.get("workflowJson") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "") || undefined;
  const sourceUrl = String(formData.get("sourceUrl") ?? "") || undefined;
  const tagNames = parseTagNames(String(formData.get("tags") ?? ""));
  if (!title || !description || !workflowJsonRaw) return;

  let workflowJson: unknown;
  try {
    workflowJson = JSON.parse(workflowJsonRaw);
  } catch {
    return; // invalid JSON — silently no-op; form re-renders empty state
  }

  const slug = await uniqueSlug(title, workflowSlugExists);
  await prisma.workflow.create({
    data: {
      title,
      slug,
      description,
      platform,
      workflowJson: workflowJson as never,
      sourceUrl,
      categoryId,
      status: "APPROVED",
      tags: { create: await tagConnections(tagNames) },
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/content");
  redirect(`/workflow/${slug}`);
}

async function createTemplate(formData: FormData) {
  "use server";
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const downloadUrl = String(formData.get("downloadUrl") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "") || undefined;
  const sourceUrl = String(formData.get("sourceUrl") ?? "") || undefined;
  const tagNames = parseTagNames(String(formData.get("tags") ?? ""));
  if (!title || !description || !downloadUrl) return;

  const slug = await uniqueSlug(title, templateSlugExists);
  await prisma.template.create({
    data: {
      title,
      slug,
      description,
      downloadUrl,
      sourceUrl,
      categoryId,
      status: "APPROVED",
      tags: { create: await tagConnections(tagNames) },
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/content");
  redirect(`/template/${slug}`);
}

async function createCredit(formData: FormData) {
  "use server";
  await requireAdmin();
  const provider = String(formData.get("provider") ?? "").trim();
  const offerTitle = String(formData.get("offerTitle") ?? "").trim();
  const offerDescription = String(formData.get("offerDescription") ?? "").trim();
  const couponCode = String(formData.get("couponCode") ?? "") || undefined;
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const expirationRaw = String(formData.get("expirationDate") ?? "");
  if (!provider || !offerTitle || !offerDescription || !sourceUrl) return;

  const slug = await uniqueSlug(offerTitle, creditSlugExists);
  await prisma.freeCredit.create({
    data: {
      provider,
      slug,
      offerTitle,
      offerDescription,
      couponCode,
      sourceUrl,
      status: "ACTIVE",
      expirationDate: expirationRaw ? new Date(expirationRaw) : undefined,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/content");
  redirect(`/credits/${slug}`);
}

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdmin();
  const { type: rawType } = await searchParams;
  const type: AssetType =
    rawType === "workflow" || rawType === "template" || rawType === "credit" ? rawType : "prompt";

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="font-mono text-xs text-amber tracking-widest mb-2 uppercase">Admin</p>
      <h1 className="font-sans text-3xl font-semibold text-paper mb-1">Add content</h1>
      <p className="text-sm text-muted mb-6">
        Published immediately — no moderation queue for admin-authored content.{" "}
        <Link href="/admin" className="text-amber hover:underline">back to dashboard</Link>
      </p>

      <div className="flex gap-2 mb-8 font-mono text-xs uppercase">
        {(["prompt", "workflow", "template", "credit"] as AssetType[]).map((t) => (
          <Link
            key={t}
            href={`/admin/content/new?type=${t}`}
            className={`rounded-card border px-3 py-1.5 transition-colors ${
              t === type ? "border-amber text-amber" : "border-line text-muted hover:text-paper"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {type === "prompt" && (
        <form action={createPrompt} className="space-y-4">
          <Field label="Title"><input name="title" required className="input" /></Field>
          <Field label="Description (shown in search results / cards)">
            <textarea name="description" required rows={2} className="input" />
          </Field>
          <Field label="Prompt content">
            <textarea name="promptContent" required rows={8} className="input font-mono text-sm" />
          </Field>
          <CategoryField categories={categories} />
          <Field label="Tags (comma-separated)">
            <input name="tags" placeholder="seo, marketing, chatgpt" className="input" />
          </Field>
          <Field label="Source URL (optional)"><input name="sourceUrl" type="url" className="input" /></Field>
          <SubmitButton label="Publish prompt" />
        </form>
      )}

      {type === "workflow" && (
        <form action={createWorkflow} className="space-y-4">
          <Field label="Title"><input name="title" required className="input" /></Field>
          <Field label="Description">
            <textarea name="description" required rows={2} className="input" />
          </Field>
          <Field label="Platform">
            <select name="platform" className="input">
              <option value="N8N">n8n</option>
              <option value="MAKE">Make.com</option>
              <option value="ZAPIER">Zapier</option>
            </select>
          </Field>
          <Field label="Workflow JSON (paste the exported workflow file contents)">
            <textarea name="workflowJson" required rows={10} className="input font-mono text-xs" placeholder='{"nodes": [...], "connections": {...}}' />
          </Field>
          <CategoryField categories={categories} />
          <Field label="Tags (comma-separated)"><input name="tags" placeholder="automation, ecommerce" className="input" /></Field>
          <Field label="Source URL (optional)"><input name="sourceUrl" type="url" className="input" /></Field>
          <SubmitButton label="Publish workflow" />
        </form>
      )}

      {type === "template" && (
        <form action={createTemplate} className="space-y-4">
          <Field label="Title"><input name="title" required className="input" /></Field>
          <Field label="Description">
            <textarea name="description" required rows={2} className="input" />
          </Field>
          <Field label="Download URL"><input name="downloadUrl" type="url" required className="input" /></Field>
          <CategoryField categories={categories} />
          <Field label="Tags (comma-separated)"><input name="tags" placeholder="cursor, mcp, react" className="input" /></Field>
          <Field label="Source URL (optional)"><input name="sourceUrl" type="url" className="input" /></Field>
          <SubmitButton label="Publish template" />
        </form>
      )}

      {type === "credit" && (
        <form action={createCredit} className="space-y-4">
          <Field label="Provider name"><input name="provider" required className="input" placeholder="OpenAI, Anthropic, ..." /></Field>
          <Field label="Offer title"><input name="offerTitle" required className="input" /></Field>
          <Field label="Offer description">
            <textarea name="offerDescription" required rows={3} className="input" />
          </Field>
          <Field label="Coupon code (optional)"><input name="couponCode" className="input" /></Field>
          <Field label="Expiration date (optional)"><input name="expirationDate" type="date" className="input" /></Field>
          <Field label="Source / claim URL"><input name="sourceUrl" type="url" required className="input" /></Field>
          <SubmitButton label="Publish offer" />
        </form>
      )}

      <style>{`
        .input {
          width: 100%;
          background: #14171F;
          border: 1px solid #262B38;
          border-radius: 6px;
          padding: 0.6rem 0.75rem;
          color: #E8EAF0;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: #F5B942; }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-xs text-muted mb-1.5 uppercase">{label}</span>
      {children}
    </label>
  );
}

function CategoryField({ categories }: { categories: { id: string; name: string }[] }) {
  return (
    <Field label="Category">
      <select name="categoryId" className="input">
        <option value="">— none —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </Field>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button type="submit" className="font-mono text-sm text-ink bg-amber rounded-card px-4 py-2.5 hover:opacity-90">
      {label}
    </button>
  );
}
