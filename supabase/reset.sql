-- BBLeague: reset completo del esquema creado por 001_initial_schema.sql
-- Ejecutar en el SQL Editor de Supabase.
-- ATENCION: elimina todos los datos de estas tablas.

begin;

drop view if exists public.classification cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists results_set_updated_at on public.results;

-- CASCADE elimina dependencias como políticas RLS, vistas y triggers.
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.is_admin() cascade;

drop table if exists public.results cascade;
drop table if exists public.matches cascade;
drop table if exists public.rounds cascade;
drop table if exists public.tournament_users cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.races cascade;
drop table if exists public.users cascade;

commit;
