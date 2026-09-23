-- Apertura y cierre de rosters por parte del organizador del torneo.
-- Anade tournaments.rosters_open y hace que las policies de subida/sustitucion
-- de rosters (tabla public.rosters y bucket 'rosters') la respeten.
-- Ejecutar despues de 016_fix_bases_policy.sql.

begin;

alter table public.tournaments
  add column if not exists rosters_open boolean not null default true;

-- Los torneos ya finalizados se quedan con los rosters cerrados.
update public.tournaments
   set rosters_open = false
 where status = 'finished';

-- Tabla public.rosters: solo se pueden subir o sustituir rosters mientras el
-- torneo los tenga abiertos y siga activo (igual que la inscripcion).
drop policy if exists "users can upload their roster" on public.rosters;
create policy "users can upload their roster when rosters are open"
  on public.rosters for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.tournament_users tu
      join public.tournaments t on t.id = tu.tournament_id
      where tu.id = tournament_user_id
        and tu.user_id = auth.uid()
        and t.rosters_open = true
        and t.status = 'active'
    )
  );

drop policy if exists "users can update their roster" on public.rosters;
create policy "users can update their roster when rosters are open"
  on public.rosters for update
  to authenticated
  using (
    exists (
      select 1
      from public.tournament_users tu
      join public.tournaments t on t.id = tu.tournament_id
      where tu.id = tournament_user_id
        and tu.user_id = auth.uid()
        and t.rosters_open = true
        and t.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.tournament_users tu
      join public.tournaments t on t.id = tu.tournament_id
      where tu.id = tournament_user_id
        and tu.user_id = auth.uid()
        and t.rosters_open = true
        and t.status = 'active'
    )
  );

-- Bucket 'rosters': la ruta empieza por el id de la inscripcion
-- (split_part(objects.name,'/',1)::bigint), como en 009_rosters_storage.sql.
drop policy if exists "users can upload own roster files" on storage.objects;
create policy "users can upload own roster files when rosters are open"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rosters'
    and exists (
      select 1
      from public.tournament_users tu
      join public.tournaments t on t.id = tu.tournament_id
      where tu.id = split_part(objects.name, '/'::text, 1)::bigint
        and tu.user_id = auth.uid()
        and t.rosters_open = true
        and t.status = 'active'
    )
  );

drop policy if exists "users can update own roster files" on storage.objects;
create policy "users can update own roster files when rosters are open"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'rosters'
    and exists (
      select 1
      from public.tournament_users tu
      join public.tournaments t on t.id = tu.tournament_id
      where tu.id = split_part(objects.name, '/'::text, 1)::bigint
        and tu.user_id = auth.uid()
        and t.rosters_open = true
        and t.status = 'active'
    )
  )
  with check (
    bucket_id = 'rosters'
    and exists (
      select 1
      from public.tournament_users tu
      join public.tournaments t on t.id = tu.tournament_id
      where tu.id = split_part(objects.name, '/'::text, 1)::bigint
        and tu.user_id = auth.uid()
        and t.rosters_open = true
        and t.status = 'active'
    )
  );

commit;
