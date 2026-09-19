-- Corrige las policies de upload/update de bases: deben comparar
-- tournaments.id con split_part(name, '/', 1) (path de storage.objects),
-- NO con split_part(tournaments.name, ...).
-- Bug: invalid input syntax for type bigint: "Luna Nueva"

begin;

drop policy if exists "creators can upload tournament bases" on storage.objects;
drop policy if exists "creators can update tournament bases files" on storage.objects;

create policy "creators can upload tournament bases"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tournament-documents'
    and exists (
      select 1
      from public.tournaments
      where public.tournaments.id = split_part(name, '/'::text, 1)::bigint
        and public.tournaments.creator_id = auth.uid()
    )
  );

create policy "creators can update tournament bases files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tournament-documents'
    and exists (
      select 1
      from public.tournaments
      where public.tournaments.id = split_part(name, '/'::text, 1)::bigint
        and public.tournaments.creator_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'tournament-documents'
    and exists (
      select 1
      from public.tournaments
      where public.tournaments.id = split_part(name, '/'::text, 1)::bigint
        and public.tournaments.creator_id = auth.uid()
    )
  );

commit;
