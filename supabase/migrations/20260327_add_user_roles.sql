-- User roles table for role-based access control
create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now() not null
);

alter table public.user_roles enable row level security;

-- Helper function to check admin status (security definer bypasses RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- RLS policies (using is_admin() to avoid self-referencing recursion)
create policy "Users can read own role" on user_roles for select using (auth.uid() = user_id);
create policy "Admins can read all roles" on user_roles for select using (public.is_admin());
create policy "Admins can update roles" on user_roles for update using (public.is_admin());

-- Auto-assign "user" role on registration
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin RPC: get all users with roles (security definer bypasses RLS)
create or replace function public.get_all_users_with_roles()
returns table (id uuid, email text, role text, email_confirmed_at timestamptz, created_at timestamptz)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  return query
    select u.id, u.email::text, r.role, u.email_confirmed_at, u.created_at
    from auth.users u join public.user_roles r on u.id = r.user_id
    order by u.created_at desc;
end;
$$;

-- Admin RPC: update a user's role (security definer bypasses RLS)
create or replace function public.update_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  update public.user_roles set role = new_role where public.user_roles.user_id = target_user_id;
end;
$$;

-- Bootstrap: First admin must be promoted manually:
-- update user_roles set role = 'admin' where user_id = '<your-user-id>';
