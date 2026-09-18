-- Aplicar la apertura y cierre de inscripciones en RLS.
-- Ejecutar despues de 013_tournament_lifecycle.sql.

begin;

drop policy if exists "users can register themselves" on public.tournament_users;
create policy "users can register themselves"
  on public.tournament_users
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tournaments
      where public.tournaments.id = tournament_id
        and public.tournaments.registration_open = true
        and public.tournaments.status = 'active'
    )
  );

drop policy if exists "users can update their registration" on public.tournament_users;
create policy "users can update their registration"
  on public.tournament_users
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tournaments
      where public.tournaments.id = tournament_id
        and public.tournaments.registration_open = true
        and public.tournaments.status = 'active'
    )
  );

commit;
