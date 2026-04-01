-- Drop old development tables
drop table if exists "transaction_categories" cascade;
drop table if exists "transaction_splits" cascade;
drop table if exists "transactions" cascade;
drop table if exists "accounts" cascade;
drop table if exists "products" cascade;
drop table if exists "categories" cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Accounts Table
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  type text not null references account_types (name) on update cascade,
  balance numeric(12, 2) not null default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Accounts
alter table accounts enable row level security;
create policy "Users can view their own accounts." on accounts for select using (auth.uid() = user_id);
create policy "Users can insert their own accounts." on accounts for insert with check (auth.uid() = user_id);
create policy "Users can update their own accounts." on accounts for update using (auth.uid() = user_id);
create policy "Users can delete their own accounts." on accounts for delete using (auth.uid() = user_id);

-- 2. Categories Table (user-scoped)
create table categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  color text, -- optional hex color like '#7c3aed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, name)
);

-- RLS for Categories
alter table categories enable row level security;
create policy "Users can view their own categories." on categories for select using (auth.uid() = user_id);
create policy "Users can insert their own categories." on categories for insert with check (auth.uid() = user_id);
create policy "Users can update their own categories." on categories for update using (auth.uid() = user_id);
create policy "Users can delete their own categories." on categories for delete using (auth.uid() = user_id);

-- 3. Transactions Table
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  account_id uuid references accounts(id) not null,
  date date not null default current_date,
  total_amount numeric(12, 2) not null,
  payee text not null,
  notes text,
  is_recurring boolean default false,
  recurrence_interval text check (recurrence_interval in ('Monthly', 'Yearly', 'Weekly', null)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Transactions
alter table transactions enable row level security;
create policy "Users can view their own transactions." on transactions for select using (auth.uid() = user_id);
create policy "Users can insert their own transactions." on transactions for insert with check (auth.uid() = user_id);
create policy "Users can update their own transactions." on transactions for update using (auth.uid() = user_id);
create policy "Users can delete their own transactions." on transactions for delete using (auth.uid() = user_id);

-- 4. Transaction Splits Table
create table transaction_splits (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references transactions(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  amount numeric(12, 2) not null,
  assigned_to text not null, -- 'Me', 'Friend A', etc.
  status text not null check (status in ('Settled', 'Pending Receival', 'Pending Payment', 'Ignored')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Transaction Splits
alter table transaction_splits enable row level security;
create policy "Users can view their own transaction splits." on transaction_splits for select using (auth.uid() = user_id);
create policy "Users can insert their own transaction splits." on transaction_splits for insert with check (auth.uid() = user_id);
create policy "Users can update their own transaction splits." on transaction_splits for update using (auth.uid() = user_id);
create policy "Users can delete their own transaction splits." on transaction_splits for delete using (auth.uid() = user_id);

-- 5. Transaction Categories Junction Table (many-to-many)
create table transaction_categories (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references transactions(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(transaction_id, category_id)
);

-- RLS for Transaction Categories
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

-- ============================================================
-- RPC Functions
-- ============================================================

-- Add transaction with splits and categories (updates account balance)
create or replace function add_transaction_with_splits(
  p_user_id uuid,
  p_account_id uuid,
  p_date date,
  p_total_amount numeric,
  p_payee text,
  p_notes text,
  p_type text default 'expense',
  p_is_recurring boolean default false,
  p_recurrence_value integer default null,
  p_recurrence_unit text default null,
  p_splits json default '[]',
  p_category_ids uuid[] default '{}'
) returns text as $$
declare
  v_transaction_id uuid;
  v_split json;
  v_cat_id uuid;
begin
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  if exists (
    select 1 from unnest(p_category_ids) as cid
    where not exists (
      select 1 from categories c where c.id = cid and c.user_id = p_user_id
    )
  ) then
    raise exception 'Unauthorized: one or more category_ids do not belong to the user';
  end if;

  insert into transactions (user_id, account_id, date, total_amount, payee, notes, type, is_recurring, recurrence_value, recurrence_unit)
  values (p_user_id, p_account_id, p_date, p_total_amount, p_payee, p_notes, p_type, p_is_recurring, p_recurrence_value, p_recurrence_unit)
  returning id into v_transaction_id;

  -- Update account balance based on transaction type
  if p_type = 'income' then
    update accounts set balance = balance + p_total_amount
    where id = p_account_id and user_id = p_user_id;
  elsif p_type in ('expense', 'transfer') then
    update accounts set balance = balance - p_total_amount
    where id = p_account_id and user_id = p_user_id;
  end if;

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
$$ language plpgsql security definer set search_path = public;

-- Update transaction with splits and categories (reverses old balance, applies new)
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
  p_recurrence_value integer default null,
  p_recurrence_unit text default null,
  p_splits json default '[]',
  p_category_ids uuid[] default '{}'
) returns void as $$
declare
  v_split json;
  v_cat_id uuid;
  v_old_amount numeric;
  v_old_type text;
  v_old_account_id uuid;
begin
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  if exists (
    select 1 from unnest(p_category_ids) as cid
    where not exists (
      select 1 from categories c where c.id = cid and c.user_id = p_user_id
    )
  ) then
    raise exception 'Unauthorized: one or more category_ids do not belong to the user';
  end if;

  -- Fetch old values before update
  select total_amount, type, account_id
  into v_old_amount, v_old_type, v_old_account_id
  from transactions
  where id = p_transaction_id and user_id = p_user_id;

  if not found then
    raise exception 'Transaction not found or unauthorized';
  end if;

  -- Reverse old balance effect on old account
  if v_old_type = 'income' then
    update accounts set balance = balance - v_old_amount
    where id = v_old_account_id and user_id = p_user_id;
  elsif v_old_type in ('expense', 'transfer') then
    update accounts set balance = balance + v_old_amount
    where id = v_old_account_id and user_id = p_user_id;
  end if;

  -- Apply new balance effect on new account
  if p_type = 'income' then
    update accounts set balance = balance + p_total_amount
    where id = p_account_id and user_id = p_user_id;
  elsif p_type in ('expense', 'transfer') then
    update accounts set balance = balance - p_total_amount
    where id = p_account_id and user_id = p_user_id;
  end if;

  update transactions set
    account_id = p_account_id,
    date = p_date,
    total_amount = p_total_amount,
    payee = p_payee,
    notes = p_notes,
    type = p_type,
    is_recurring = p_is_recurring,
    recurrence_value = p_recurrence_value,
    recurrence_unit = p_recurrence_unit
  where id = p_transaction_id and user_id = p_user_id;

  -- Replace splits (scoped to transactions owned by the caller)
  delete from transaction_splits
  where transaction_id = p_transaction_id
    and transaction_id in (select id from transactions where id = p_transaction_id and user_id = p_user_id);
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

  -- Replace categories (scoped to transactions owned by the caller)
  delete from transaction_categories
  where transaction_id = p_transaction_id
    and transaction_id in (select id from transactions where id = p_transaction_id and user_id = p_user_id);
  foreach v_cat_id in array p_category_ids loop
    insert into transaction_categories (transaction_id, category_id)
    values (p_transaction_id, v_cat_id);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Delete transaction and reverse its balance effect
create or replace function delete_transaction_with_balance(
  p_transaction_id uuid,
  p_user_id uuid
) returns void as $$
declare
  v_amount numeric;
  v_type text;
  v_account_id uuid;
begin
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  select total_amount, type, account_id
  into v_amount, v_type, v_account_id
  from transactions
  where id = p_transaction_id and user_id = p_user_id;

  if not found then
    raise exception 'Transaction not found or unauthorized';
  end if;

  if v_type = 'income' then
    update accounts set balance = balance - v_amount
    where id = v_account_id and user_id = p_user_id;
  elsif v_type in ('expense', 'transfer') then
    update accounts set balance = balance + v_amount
    where id = v_account_id and user_id = p_user_id;
  end if;

  delete from transactions
  where id = p_transaction_id and user_id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Settle debts (atomic credit card payment flow)
create or replace function settle_debts(
  p_user_id uuid,
  p_split_ids uuid[],
  p_payment_amount numeric,
  p_target_account_id uuid,
  p_source_account_id uuid default null,
  p_notes text default ''
) returns text as $$
declare
  v_transaction_id uuid;
  v_target_name text;
begin
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  select name into v_target_name from accounts
  where id = p_target_account_id and user_id = p_user_id;

  update transaction_splits set status = 'Settled'
  where id = any(p_split_ids) and user_id = p_user_id;

  update accounts set balance = balance - p_payment_amount
  where id = p_target_account_id and user_id = p_user_id;

  if p_source_account_id is not null then
    update accounts set balance = balance - p_payment_amount
    where id = p_source_account_id and user_id = p_user_id;

    insert into transactions (user_id, account_id, date, total_amount, payee, notes, type)
    values (p_user_id, p_source_account_id, current_date, p_payment_amount,
            'Payment - ' || coalesce(v_target_name, 'Credit Card'),
            coalesce(nullif(p_notes, ''), 'Automatic payment from settle_debts'), 'transfer')
    returning id into v_transaction_id;

    insert into transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    values (v_transaction_id, p_user_id, p_payment_amount, 'Me', 'Settled');

    return v_transaction_id::text;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

-- Settle receivables (mark debts others owe as received)
create or replace function settle_receivables(
  p_user_id uuid,
  p_split_ids uuid[],
  p_received_amount numeric,
  p_person_name text,
  p_receiving_account_id uuid default null,
  p_notes text default ''
) returns text as $$
declare
  v_transaction_id uuid;
begin
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  update transaction_splits set status = 'Settled'
  where id = any(p_split_ids) and user_id = p_user_id;

  if p_receiving_account_id is not null then
    update accounts set balance = balance + p_received_amount
    where id = p_receiving_account_id and user_id = p_user_id;

    insert into transactions (user_id, account_id, date, total_amount, payee, notes, type)
    values (p_user_id, p_receiving_account_id, current_date, p_received_amount,
            'Debt Repayment - ' || p_person_name, coalesce(nullif(p_notes, ''), 'Automatic entry from settle_receivables'), 'income')
    returning id into v_transaction_id;

    insert into transaction_splits (transaction_id, user_id, amount, assigned_to, status)
    values (v_transaction_id, p_user_id, p_received_amount, 'Me', 'Settled');

    return v_transaction_id::text;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- Data Migration (run once on existing data)
-- ============================================================
-- Migrate existing split categories into the new categories table:
--
-- insert into categories (user_id, name)
-- select distinct t.user_id, ts.category
-- from transaction_splits ts
-- join transactions t on t.id = ts.transaction_id
-- where ts.category is not null and ts.category <> ''
-- on conflict (user_id, name) do nothing;
--
-- insert into transaction_categories (transaction_id, category_id)
-- select distinct ts.transaction_id, c.id
-- from transaction_splits ts
-- join transactions t on t.id = ts.transaction_id
-- join categories c on c.user_id = t.user_id and c.name = ts.category
-- on conflict (transaction_id, category_id) do nothing;
--
-- After verifying migration:
-- alter table transaction_splits drop column category;
