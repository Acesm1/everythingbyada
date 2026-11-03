-- Run once in Supabase Dashboard > SQL Editor for the project used by the app.
-- Stores the optional public image URL for each special category.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text;

NOTIFY pgrst, 'reload schema';
