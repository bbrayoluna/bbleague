-- Permite a un master quitar el rol de master a otro usuario.
-- Ejecutar despues de 023_user_roles_and_master_permissions.sql.

begin;

create or replace function public.revoke_master_role(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master(auth.uid()) then
    raise exception 'Solo un master puede quitar este rol'
      using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'No puedes quitarte tu propio rol de master'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.users where id = target_user_id) then
    raise exception 'No existe el jugador indicado'
      using errcode = 'P0002';
  end if;

  delete from public.user_roles
  where user_id = target_user_id
    and role = 'master';
end;
$$;

revoke all on function public.revoke_master_role(uuid) from public, anon, authenticated;
grant execute on function public.revoke_master_role(uuid) to authenticated;

commit;
