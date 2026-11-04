-- Run once in Supabase SQL Editor for the project used by the app.
-- Adds columns required by checkout and customer order history to older databases.
-- Existing rows cannot be assigned to customers automatically: user_id remains NULL
-- until those legacy orders are reconciled manually from trusted records.

alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists payment_reference text;

create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference)
  where payment_reference is not null;

grant usage on schema public to authenticated;
grant select, insert on public.orders to authenticated;
alter table public.orders enable row level security;

drop policy if exists "Customers create their own orders" on public.orders;
create policy "Customers create their own orders"
  on public.orders for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Customers and admins view orders" on public.orders;
create policy "Customers and admins view orders"
  on public.orders for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant execute on function public.is_admin() to authenticated;
notify pgrst, 'reload schema';
