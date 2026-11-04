-- Run this once in Supabase SQL Editor for the project used by the app.
-- Creates a private receipt bucket, adds a receipt reference to orders, and
-- restricts uploads/reviews to the order owner and admins.

alter table public.orders
  add column if not exists receipt_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-receipts', 'order-receipts', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Order owners upload their own receipts" on storage.objects;
create policy "Order owners upload their own receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'order-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Order owners and admins read receipts" on storage.objects;
create policy "Order owners and admins read receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'order-receipts'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin()
    )
  );

create or replace function public.attach_order_receipt(p_order_id text, p_receipt_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or p_receipt_path is null
    or (storage.foldername(p_receipt_path))[1] <> auth.uid()::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'order-receipts'
        and name = p_receipt_path
        and owner_id = auth.uid()::text
    ) then
    raise exception 'Receipt is invalid or does not belong to this user';
  end if;

  update public.orders
  set receipt_path = p_receipt_path
  where id = p_order_id
    and user_id = auth.uid()
    and status = 'Awaiting bank transfer';

  if not found then
    raise exception 'Matching bank-transfer order was not found';
  end if;
end;
$$;

revoke all on function public.attach_order_receipt(text, text) from public;
grant execute on function public.attach_order_receipt(text, text) to authenticated;

grant execute on function public.is_admin() to authenticated;
notify pgrst, 'reload schema';
