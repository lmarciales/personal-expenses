-- Add display_order to accounts so users can pin up to 3 "featured" accounts
-- on the dashboard summary card in their preferred order. NULL means
-- "not featured" — such accounts fall back to default ordering.
alter table public.accounts
  add column if not exists display_order integer;

create index if not exists accounts_user_display_order_idx
  on public.accounts (user_id, display_order)
  where display_order is not null;
