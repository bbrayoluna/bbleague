-- Solo se pueden consultar rosters de torneos en los que el usuario esta inscrito.
-- Ejecutar despues de 010_authenticated_roster_downloads.sql.

begin;

drop policy if exists "authenticated users can read rosters" on public.rosters;
create policy "users can read rosters from enrolled tournaments"
  on public.rosters for select
  to authenticated
  using (
    exists (
      select 1
      from public.tournament_users roster_registration
      join public.tournament_users viewer_registration
        on viewer_registration.tournament_id = roster_registration.tournament_id
       and viewer_registration.user_id = auth.uid()
      where roster_registration.id = tournament_user_id
    )
  );

drop policy if exists "authenticated users can read roster files" on storage.objects;
create policy "users can read roster files from enrolled tournaments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'rosters'
    and exists (
      select 1
      from public.tournament_users roster_registration
      join public.tournament_users viewer_registration
        on viewer_registration.tournament_id = roster_registration.tournament_id
       and viewer_registration.user_id = auth.uid()
      where roster_registration.id = split_part(name, '/', 1)::bigint
    )
  );

commit;
