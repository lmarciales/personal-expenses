-- Drop old development tables
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
  type text not null check (type in ('Checking', 'Savings', 'Credit Card', 'Cash', 'Other')),
  balance numeric(12, 2) not null default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Accounts
alter table accounts enable row level security;
create policy "Users can view their own accounts." on accounts for select using (auth.uid() = user_id);
create policy "Users can insert their own accounts." on accounts for insert with check (auth.uid() = user_id);
create policy "Users can update their own accounts." on accounts for update using (auth.uid() = user_id);
create policy "Users can delete their own accounts." on accounts for delete using (auth.uid() = user_id);

-- 2. Transactions Table
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

-- 3. Transaction Splits Table (The Magic Table)
create table transaction_splits (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references transactions(id) on delete cascade not null,
  user_id uuid references auth.users not null, -- Ownership of the split record
  amount numeric(12, 2) not null,
  category text not null,
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
