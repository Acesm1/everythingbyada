-- Run in Supabase Dashboard > SQL Editor for the project used by the storefront.
-- Public visitors may read the catalog; only authenticated admins retain write access.

alter table public.products
  add column if not exists best_seller boolean not null default false;

alter table public.categories
  add column if not exists is_special boolean not null default false,
  add column if not exists image_url text;

-- Explicitly grant anonymous and signed-in visitors read access. These grants do
-- not permit inserts, updates, or deletes.
grant usage on schema public to anon, authenticated;
grant select on public.products, public.categories to anon, authenticated;

alter table public.products enable row level security;
alter table public.categories enable row level security;

drop policy if exists "Catalog is readable by everyone" on public.products;
create policy "Catalog is readable by everyone"
  on public.products for select to anon, authenticated using (true);

drop policy if exists "Categories are readable by everyone" on public.categories;
create policy "Categories are readable by everyone"
  on public.categories for select to anon, authenticated using (true);

notify pgrst, 'reload schema';
