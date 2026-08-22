# AI Assets Hub

A search engine for AI prompts, n8n/Make.com workflows, Cursor rules, MCP
servers, and free AI credits — built to run comfortably on a single
**2 vCPU / 4GB RAM / 40GB SSD** VPS with no external services.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 15 (App Router) + TypeScript | SSR/ISR for SEO, one deployable process |
| DB | PostgreSQL | Full text search built in — no Elasticsearch needed |
| ORM | Prisma | Type-safe schema + migrations |
| Auth | NextAuth v5 | Google, GitHub, magic-link email |
| Search | Postgres `tsvector`/`GIN` + `pg_trgm` | Sub-300ms search at 50k+ rows, zero extra infra |
| Crawlers | Plain TypeScript scripts + Linux cron | No message queue, no worker service |
| Web server | Nginx (reverse proxy) | TLS termination, gzip, static caching |
| Process manager | PM2 | Single-instance fork mode, memory-capped |

No Redis, no Elasticsearch, no Kubernetes, no serverless — one Postgres
instance and one Node process, as specified.

## Project layout

```
app/              Next.js routes (pages + API routes)
  api/             search, prompts, workflows, templates, credits, auth
  prompt|workflow|template|credits/[slug]   SEO detail pages
  tag|category/[..]                          taxonomy pages
  admin/                                     moderation + crawler dashboard
  sitemap.ts, robots.ts                      auto-generated SEO files
components/       Header, SearchBar, AssetCard, CopyButton
lib/              prisma client, search.ts (core FTS logic), slug/auto-tag, admin guard
crawlers/         reddit.ts, github.ts, flowgpt.ts, huggingface.ts, producthunt.ts, run-all.ts
prisma/           schema.prisma, fts-setup.sql (triggers + GIN indexes)
scripts/seed.ts   baseline categories + one sample prompt
nginx/            reverse proxy config template
ecosystem.config.js   PM2 config
crontab.example   6-hourly crawler schedule
```

## Local development

```bash
cp .env.example .env      # fill in DATABASE_URL at minimum
npm install
npm run db:migrate:dev    # creates tables
psql "$DATABASE_URL" -f prisma/fts-setup.sql   # sets up search triggers/indexes
npm run db:seed           # optional: baseline categories + sample prompt
npm run dev
```

## Production deployment (Ubuntu 24.04 VPS)

1. **System packages**
   ```bash
   sudo apt update && sudo apt install -y postgresql nginx nodejs npm git
   sudo npm install -g pm2 tsx
   ```

2. **Database**
   ```bash
   sudo -u postgres psql -c "CREATE USER aiassets WITH PASSWORD 'CHANGE_ME';"
   sudo -u postgres psql -c "CREATE DATABASE aiassets OWNER aiassets;"
   ```

3. **App**
   ```bash
   git clone <your-repo-url> /var/www/aiassets
   cd /var/www/aiassets
   cp .env.example .env   # fill in real values
   npm install
   npm run build
   npm run db:migrate     # runs prisma migrate deploy
   psql "$DATABASE_URL" -f prisma/fts-setup.sql
   npm run db:seed
   ```

4. **Process manager**
   ```bash
   mkdir -p logs
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup   # follow the printed command to enable on boot
   ```

5. **Nginx + HTTPS**
   ```bash
   sudo cp nginx/aiassets.conf /etc/nginx/sites-available/aiassets
   sudo ln -s /etc/nginx/sites-available/aiassets /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

6. **Crawlers (cron)**
   ```bash
   crontab crontab.example   # edit the path inside first if not /var/www/aiassets
   ```

7. **Make yourself admin** (no UI for this yet — direct SQL after your first login):
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
   ```

## Search

All search goes through `lib/search.ts`, which issues a single raw SQL
`UNION ALL` query across prompts/workflows/templates/free_credits using
`ts_rank` against each table's `search_vector` (a `tsvector` GIN-indexed
column maintained by Postgres triggers — see `prisma/fts-setup.sql`).
Sorting supports `relevance` (default when a query is present), `newest`,
and `popular`. No external search engine is used or required.

**Re-run `fts-setup.sql` after every `prisma migrate` that touches the
searchable tables** — Prisma migrations don't know about the trigger/index
SQL since `search_vector` is an `Unsupported("tsvector")` column.

## Scaling SEO pages past ~50k assets

`app/sitemap.ts` currently returns one sitemap in a single response. Once
indexed assets exceed roughly the 50k Google-recommends-per-file mark,
switch to Next's [sitemap index support](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap#generate-multiple-sitemaps)
(generateSitemaps) to split by content type/page range — no other
architecture changes needed.

## Content moderation

Crawled and user-submitted content lands as `PENDING`. GitHub/Hugging Face
items with enough stars/likes auto-approve; everything else needs a click
in `/admin/content`. Approved-only content is what search, sitemap, and
listing pages serve.

## Premium system (intentionally disabled)

Tables (`SponsoredListing`, `PaymentRecord`, `isPremium`/`vipStatus`
columns) exist so the schema doesn't need a breaking migration later, but
nothing reads the `VIP_ENABLED` / `CRYPTO_ENABLED` / `PAYPAL_ENABLED` /
`SPONSORED_ENABLED` env vars yet — no code path activates them. Flip them
on and wire up payment providers when you're ready to monetize.

## Performance notes for the 2 vCPU / 4GB target

- `next.config.mjs` uses `output: "standalone"` for a small, self-contained
  build and disables multi-worker builds to keep peak memory down.
- PM2 runs a single fork-mode instance (no cluster mode) with a 700MB
  restart ceiling, leaving headroom for Postgres on the same box.
- Homepage and detail pages use ISR (`revalidate`) instead of
  request-time DB hits on every load.
- Crawlers run sequentially, not in parallel, and sleep briefly between
  requests — deliberately trades crawl speed for low, predictable
  resource usage alongside the web process.
