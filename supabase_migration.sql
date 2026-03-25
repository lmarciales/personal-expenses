-- ============================================================
-- Migration: Categories Feature Rework
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Create categories table
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, name)
);

alter table categories enable row level security;
create policy "Users can view their own categories." on categories for select using (auth.uid() = user_id);
create policy "Users can insert their own categories." on categories for insert with check (auth.uid() = user_id);
create policy "Users can update their own categories." on categories for update using (auth.uid() = user_id);
create policy "Users can delete their own categories." on categories for delete using (auth.uid() = user_id);

-- 2. Create transaction_categories junction table
create table if not exists transaction_categories (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references transactions(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(transaction_id, category_id)
);

alter table transaction_categories enable row level security;
create policy "Users can view their own transaction categories."
  on transaction_categories for select
  using (exists (select 1 from transactions t where t.id = transaction_id and t.user_id = auth.uid()));
create policy "Users can insert their own transaction categories."
  on transaction_categories for insert
  with check (exists (select 1 from transactions t where t.id = transaction_id and t.user_id = auth.uid()));
create policy "Users can delete their own transaction categories."
  on transaction_categories for delete
  using (exists (select 1 from transactions t where t.id = transaction_id and t.user_id = auth.uid()));

-- 3. Migrate existing category data from splits to new tables
insert into categories (user_id, name)
select distinct t.user_id, ts.category
from transaction_splits ts
join transactions t on t.id = ts.transaction_id
where ts.category is not null and ts.category <> ''
on conflict (user_id, name) do nothing;

insert into transaction_categories (transaction_id, category_id)
select distinct ts.transaction_id, c.id
from transaction_splits ts
join transactions t on t.id = ts.transaction_id
join categories c on c.user_id = t.user_id and c.name = ts.category
on conflict (transaction_id, category_id) do nothing;

-- 4. Drop category column from transaction_splits
alter table transaction_splits drop column if exists category;

-- 5. Replace RPC functions with updated versions

create or replace function add_transaction_with_splits(
  p_user_id uuid,
  p_account_id uuid,
  p_date date,
  p_total_amount numeric,
  p_payee text,
  p_notes text,
  p_type text default 'expense',
  p_is_recurring boolean default false,
  p_recurrence_interval text default null,
  p_splits json default '[]',
  p_category_ids uuid[] default '{}'
) returns text as $$
declare
  v_transaction_id uuid;
  v_split json;
  v_cat_id uuid;
begin
  insert into transactions (user_id, account_id, date, total_amount, payee, notes, type, is_recurring, recurrence_interval)
  values (p_user_id, p_account_id, p_date, p_total_amount, p_payee, p_notes, p_type, p_is_recurring, p_recurrence_interval)
  returning id into v_transaction_id;

  for v_split in select * from json_array_elements(p_splits) loop
    insert into transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    values (
      v_transaction_id,
      p_user_id,
      (v_split->>'amount')::numeric,
      v_split->>'assigned_to',
      v_split->>'status'
    );
  end loop;

  foreach v_cat_id in array p_category_ids loop
    insert into transaction_categories (transaction_id, category_id)
    values (v_transaction_id, v_cat_id);
  end loop;

  return v_transaction_id::text;
end;
$$ language plpgsql security definer;

create or replace function update_transaction_with_splits(
  p_transaction_id uuid,
  p_user_id uuid,
  p_account_id uuid,
  p_date date,
  p_total_amount numeric,
  p_payee text,
  p_notes text,
  p_type text default 'expense',
  p_is_recurring boolean default false,
  p_recurrence_interval text default null,
  p_splits json default '[]',
  p_category_ids uuid[] default '{}'
) returns void as $$
declare
  v_split json;
  v_cat_id uuid;
begin
  update transactions set
    account_id = p_account_id,
    date = p_date,
    total_amount = p_total_amount,
    payee = p_payee,
    notes = p_notes,
    type = p_type,
    is_recurring = p_is_recurring,
    recurrence_interval = p_recurrence_interval
  where id = p_transaction_id and user_id = p_user_id;

  delete from transaction_splits where transaction_id = p_transaction_id;
  for v_split in select * from json_array_elements(p_splits) loop
    insert into transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    values (
      p_transaction_id,
      p_user_id,
      (v_split->>'amount')::numeric,
      v_split->>'assigned_to',
      v_split->>'status'
    );
  end loop;

  delete from transaction_categories where transaction_id = p_transaction_id;
  foreach v_cat_id in array p_category_ids loop
    insert into transaction_categories (transaction_id, category_id)
    values (p_transaction_id, v_cat_id);
  end loop;
end;
$$ language plpgsql security definer;
