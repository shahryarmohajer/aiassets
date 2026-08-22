-- ==========================================================
-- Full Text Search setup for PostgreSQL
-- Run this ONCE after `prisma migrate deploy`, and again after
-- any migration that touches prompts/workflows/templates/free_credits.
--
-- Usage:
--   psql "$DATABASE_URL" -f prisma/fts-setup.sql
-- ==========================================================

-- PROMPTS -----------------------------------------------------
CREATE OR REPLACE FUNCTION prompts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.prompt_content, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prompts_search_vector_trigger ON prompts;
CREATE TRIGGER prompts_search_vector_trigger
  BEFORE INSERT OR UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION prompts_search_vector_update();

CREATE INDEX IF NOT EXISTS prompts_search_idx ON prompts USING GIN (search_vector);

-- backfill existing rows
UPDATE prompts SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(prompt_content, '')), 'C');

-- WORKFLOWS -----------------------------------------------------
CREATE OR REPLACE FUNCTION workflows_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.platform::text, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflows_search_vector_trigger ON workflows;
CREATE TRIGGER workflows_search_vector_trigger
  BEFORE INSERT OR UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION workflows_search_vector_update();

CREATE INDEX IF NOT EXISTS workflows_search_idx ON workflows USING GIN (search_vector);

UPDATE workflows SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(platform::text, '')), 'C');

-- TEMPLATES -----------------------------------------------------
CREATE OR REPLACE FUNCTION templates_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS templates_search_vector_trigger ON templates;
CREATE TRIGGER templates_search_vector_trigger
  BEFORE INSERT OR UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION templates_search_vector_update();

CREATE INDEX IF NOT EXISTS templates_search_idx ON templates USING GIN (search_vector);

UPDATE templates SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');

-- FREE CREDITS -----------------------------------------------------
CREATE OR REPLACE FUNCTION free_credits_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.offer_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.provider, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.offer_description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS free_credits_search_vector_trigger ON free_credits;
CREATE TRIGGER free_credits_search_vector_trigger
  BEFORE INSERT OR UPDATE ON free_credits
  FOR EACH ROW EXECUTE FUNCTION free_credits_search_vector_update();

CREATE INDEX IF NOT EXISTS free_credits_search_idx ON free_credits USING GIN (search_vector);

UPDATE free_credits SET search_vector =
  setweight(to_tsvector('english', coalesce(offer_title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(provider, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(offer_description, '')), 'B');

-- Trigram support for fuzzy/typo-tolerant fallback search on titles
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS prompts_title_trgm_idx ON prompts USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS workflows_title_trgm_idx ON workflows USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS templates_title_trgm_idx ON templates USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS free_credits_title_trgm_idx ON free_credits USING GIN (offer_title gin_trgm_ops);
