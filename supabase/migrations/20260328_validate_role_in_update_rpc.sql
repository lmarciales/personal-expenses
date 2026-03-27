-- Add role validation to update_user_role RPC
create or replace function public.update_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if new_role not in ('user', 'admin') then
    raise exception 'Invalid role: %. Allowed values: user, admin', new_role;
  end if;
  update public.user_roles set role = new_role where public.user_roles.user_id = target_user_id;
end;
$$;
