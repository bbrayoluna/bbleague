-- Ciclo de vida de torneos y propietario creador.
-- Ejecutar despues de las migraciones anteriores.

begin;

alter table public.tournaments
  add column if not exists creator_id uuid references public.users(id),
  add column if not exists registration_open boolean not null default false,
  add column if not exists status text not null default 'active',
  add column if not exists finished_at timestamptz;

alter table public.tournaments
  drop constraint if exists tournaments_status_check;

alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('active', 'finished'));

create index if not exists tournaments_creator_idx
  on public.tournaments (creator_id);

drop policy if exists "authenticated users can create tournaments" on public.tournaments;
create policy "authenticated users can create tournaments"
  on public.tournaments
  for insert
  to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "creators can update their tournaments" on public.tournaments;
create policy "creators can update their tournaments"
  on public.tournaments
  for update
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

commit;
