-- Allow transactions without an account (external debts).
-- When account_id is NULL the transaction is not tied to any
-- user-owned account and does not affect account balances.

-- 1. Make account_id nullable
ALTER TABLE transactions ALTER COLUMN account_id DROP NOT NULL;

-- 2. add_transaction_with_splits — skip balance update when no account
create or replace function add_transaction_with_splits(
  p_user_id uuid,
  p_account_id uuid default null,
  p_date date default current_date,
  p_total_amount numeric default 0,
  p_payee text default '',
  p_notes text default '',
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

  -- Only update balance when tied to an account
  if p_account_id is not null then
    if p_type = 'income' then
      update accounts set balance = balance + p_total_amount
      where id = p_account_id and user_id = p_user_id;
    elsif p_type = 'expense' then
      update accounts set balance = balance - p_total_amount
      where id = p_account_id and user_id = p_user_id;
    elsif p_type = 'transfer' then
      update accounts set balance = balance - p_total_amount
      where id = p_account_id and user_id = p_user_id;
    end if;
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

-- 3. update_transaction_with_splits — handle null accounts on both old and new sides
create or replace function update_transaction_with_splits(
  p_transaction_id uuid,
  p_user_id uuid,
  p_account_id uuid default null,
  p_date date default current_date,
  p_total_amount numeric default 0,
  p_payee text default '',
  p_notes text default '',
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

  select total_amount, type, account_id
  into v_old_amount, v_old_type, v_old_account_id
  from transactions
  where id = p_transaction_id and user_id = p_user_id;

  if not found then
    raise exception 'Transaction not found or unauthorized';
  end if;

  -- Reverse old balance effect (only if old transaction had an account)
  if v_old_account_id is not null then
    if v_old_type = 'income' then
      update accounts set balance = balance - v_old_amount
      where id = v_old_account_id and user_id = p_user_id;
    elsif v_old_type in ('expense', 'transfer') then
      update accounts set balance = balance + v_old_amount
      where id = v_old_account_id and user_id = p_user_id;
    end if;
  end if;

  -- Apply new balance effect (only if new account is set)
  if p_account_id is not null then
    if p_type = 'income' then
      update accounts set balance = balance + p_total_amount
      where id = p_account_id and user_id = p_user_id;
    elsif p_type in ('expense', 'transfer') then
      update accounts set balance = balance - p_total_amount
      where id = p_account_id and user_id = p_user_id;
    end if;
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

  delete from transaction_categories
  where transaction_id = p_transaction_id
    and transaction_id in (select id from transactions where id = p_transaction_id and user_id = p_user_id);
  foreach v_cat_id in array p_category_ids loop
    insert into transaction_categories (transaction_id, category_id)
    values (p_transaction_id, v_cat_id);
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- 4. delete_transaction_with_balance — skip balance reversal when no account
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

  -- Only reverse balance when account exists
  if v_account_id is not null then
    if v_type = 'income' then
      update accounts set balance = balance - v_amount
      where id = v_account_id and user_id = p_user_id;
    elsif v_type in ('expense', 'transfer') then
      update accounts set balance = balance + v_amount
      where id = v_account_id and user_id = p_user_id;
    end if;
  end if;

  delete from transactions
  where id = p_transaction_id and user_id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;
