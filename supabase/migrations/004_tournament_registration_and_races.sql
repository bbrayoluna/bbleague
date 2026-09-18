-- Inscripcion de usuarios en torneos con raza y nombre de equipo.
-- Ejecutar despues de 003_username_login_and_tournament_insert.sql.

begin;

alter table public.tournament_users
  add column if not exists team_name text not null default '';

insert into public.races (name)
values
  ('Alianza del Viejo Mundo'),
  ('Altos Elfos'),
  ('Altos Elfos-NEW'),
  ('Amazonas'),
  ('Bretonianos'),
  ('Elegidos del Caos'),
  ('Elfos Oscuros'),
  ('Elfos Silvanos'),
  ('Enanos'),
  ('Enanos del Caos'),
  ('Gnomos'),
  ('Goblins'),
  ('Halflings'),
  ('Hombres Lagarto'),
  ('Humanos'),
  ('Inframundo'),
  ('Khorne'),
  ('Nigromantes'),
  ('No Muertos'),
  ('Nobles Imperiales'),
  ('Norses'),
  ('Norse'),
  ('Nurgle'),
  ('Ogros'),
  ('Orcos'),
  ('Orcos Negros'),
  ('Renegados del Caos'),
  ('Reyes Funerarios'),
  ('Skaven'),
  ('Slann'),
  ('Snotlings'),
  ('Unión Élfica'),
  ('Vampiros')
on conflict (name) do update
set active = true;

commit;
