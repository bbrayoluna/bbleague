-- Permitir que usuarios autenticados consulten y descarguen rosters.
-- La subida y sustitucion siguen limitadas al roster propio.

begin;

drop policy if exists "users can read their roster" on public.rosters;
create policy "authenticated users can read rosters"
  on public.rosters for select
  to authenticated
  using (true);

drop policy if exists "users can read own roster files" on storage.objects;
create policy "authenticated users can read roster files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'rosters');

commit;
