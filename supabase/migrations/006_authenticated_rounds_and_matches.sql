-- Permitir a usuarios autenticados gestionar rondas y partidos desde master.html.
-- Ejecutar despues de las migraciones anteriores.

begin;

drop policy if exists "authenticated users can create rounds" on public.rounds;
create policy "authenticated users can create rounds"
  on public.rounds
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "authenticated users can create matches" on public.matches;
create policy "authenticated users can create matches"
  on public.matches
  for insert
  to authenticated
  with check (auth.uid() is not null);

commit;
