-- Assignees table for per-user managed assignee records
create table if not exists public.assignees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  unique(user_id, name)
);

alter table public.assignees enable row level security;

-- RLS policies (same pattern as categories)
create policy "Users can read own assignees" on assignees for select using (auth.uid() = user_id);
create policy "Users can insert own assignees" on assignees for insert with check (auth.uid() = user_id);
create policy "Users can update own assignees" on assignees for update using (auth.uid() = user_id);
create policy "Users can delete own assignees" on assignees for delete using (auth.uid() = user_id);

-- Auto-create "Me" assignee for existing users who have transactions
insert into public.assignees (user_id, name)
select distinct user_id, 'Me' from public.transactions
on conflict (user_id, name) do nothing;
