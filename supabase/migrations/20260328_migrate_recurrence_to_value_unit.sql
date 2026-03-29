-- Add new recurrence columns
alter table public.transactions
  add column if not exists recurrence_value integer default 1,
  add column if not exists recurrence_unit text;

-- Add check constraint for recurrence_unit
alter table public.transactions
  add constraint recurrence_unit_check
  check (recurrence_unit in ('Days', 'Weeks', 'Months', 'Years', null));

-- Migrate existing data from recurrence_interval to new columns
update public.transactions
set recurrence_value = 1,
    recurrence_unit = case
      when recurrence_interval = 'Monthly' then 'Months'
      when recurrence_interval = 'Weekly' then 'Weeks'
      when recurrence_interval = 'Yearly' then 'Years'
      else null
    end
where recurrence_interval is not null;

-- Drop old column and its check constraint
alter table public.transactions drop column if exists recurrence_interval;

-- Update RPC: add_transaction_with_splits
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
  -- Verify the caller owns this user_id
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
  end if;

  insert into transactions (user_id, account_id, date, total_amount, payee, notes, type, is_recurring, recurrence_value, recurrence_unit)
  values (p_user_id, p_account_id, p_date, p_total_amount, p_payee, p_notes, p_type, p_is_recurring, p_recurrence_value, p_recurrence_unit)
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

-- Update RPC: update_transaction_with_splits
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
begin
  -- Verify the caller owns this user_id
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized: user_id mismatch';
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
$$ language plpgsql security definer;
