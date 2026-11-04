-- Run once in Supabase SQL Editor to save delivery details on paid orders.
-- Existing orders remain valid; these fields are nullable for historical orders.

alter table public.orders
  add column if not exists delivery_full_name text,
  add column if not exists delivery_phone text,
  add column if not exists delivery_address text,
  add column if not exists delivery_city text,
  add column if not exists delivery_state text,
  add column if not exists delivery_postal_code text,
  add column if not exists delivery_notes text;

notify pgrst, 'reload schema';
