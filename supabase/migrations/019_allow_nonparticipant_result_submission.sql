-- Permite que cualquier usuario autenticado registre el resultado de cualquier
-- partido. Aplicar despues de 018_anyone_can_submit_results.sql.

begin;

grant select, insert, update on public.results to authenticated;

drop policy if exists "participants can submit results" on public.results;
drop policy if exists "authenticated users can submit results" on public.results;

create policy "authenticated users can submit results"
  on public.results
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and submitted_by = auth.uid()
  );

commit;
