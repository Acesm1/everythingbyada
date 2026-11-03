-- Run once in Supabase SQL Editor after deploying the Paystack flow.
-- Supports idempotent recording of verified payments. Customer order reads remain
-- constrained by the existing Customers and admins view orders RLS policy.
alter table public.orders add column if not exists payment_reference text;
create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference)
  where payment_reference is not null;

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

notify pgrst, 'reload schema';
