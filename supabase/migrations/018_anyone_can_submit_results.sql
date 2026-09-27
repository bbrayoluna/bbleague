-- Cualquier usuario autenticado puede subir el resultado de cualquier partido,
-- no solo los jugadores que lo disputan. Asi el organizador o cualquier otro
-- jugador pueden registrar los resultados de la ronda.
-- Ejecutar despues de 017_roster_lifecycle.sql.

begin;

grant select, insert, update on public.results to authenticated;

drop policy if exists "participants can submit results" on public.results;
create policy "authenticated users can submit results"
  on public.results
  for insert
  to authenticated
  with check (submitted_by = auth.uid());

drop policy if exists "submitters can update results" on public.results;
create policy "authenticated users can update results"
  on public.results
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (submitted_by = auth.uid());

commit;
