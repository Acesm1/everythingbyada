-- Fixes the catalog error when an existing Supabase project predates the
-- special-category feature. Safe to run repeatedly in the Supabase SQL Editor.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_special boolean NOT NULL DEFAULT false;

-- Ask PostgREST to refresh its schema cache so the storefront sees the new column.
NOTIFY pgrst, 'reload schema';
