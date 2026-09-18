-- Cambios incrementales para una base ya creada.
-- Ejecutar en Supabase despues de 001 y 002.

begin;

-- Asegurar que cada usuario publico tiene el email interno de Supabase Auth.
alter table public.users
  add column if not exists email text;

update public.users public_user
set email = auth_user.email
from auth.users auth_user
where auth_user.id = public_user.id
  and public_user.email is null;

alter table public.users
  alter column email set not null;

create unique index if not exists users_email_unique_idx
  on public.users (email);

-- Mantener sincronizado el perfil publico cuando se registre un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- Login visible por alias; Supabase Auth sigue usando el email internamente.
create or replace function public.get_auth_email(login_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.users
  where lower(username) = lower(login_username)
  limit 1;
$$;

grant execute on function public.get_auth_email(text) to anon, authenticated;

-- El formulario de master solo puede crear torneos con una sesion valida.
drop policy if exists "public can create tournaments" on public.tournaments;
drop policy if exists "authenticated users can create tournaments" on public.tournaments;

create policy "authenticated users can create tournaments"
  on public.tournaments
  for insert
  to authenticated
  with check (auth.uid() is not null);

commit;
