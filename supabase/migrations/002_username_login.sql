-- Permitir login con username usando el email interno de Supabase Auth.
-- Ejecutar después de 001_initial_schema.sql si la base ya existe.

alter table public.users
  add column if not exists email text;

update public.users u
set email = au.email
from auth.users au
where au.id = u.id
  and u.email is null;

alter table public.users
  alter column email set not null;

create unique index if not exists users_email_unique_idx
  on public.users (email);

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

create or replace function public.get_auth_email(login_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.users
  where lower(username) = lower(login_username);
$$;

grant execute on function public.get_auth_email(text) to anon, authenticated;
