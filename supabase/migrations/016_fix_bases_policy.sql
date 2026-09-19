-- Corrige las policies de upload/update de bases.
-- Bug: invalid input syntax for type bigint: "Luna Nueva"
-- La policy comparaba tournaments.id con split_part(tournaments.name,'/',1)::bigint
-- (nombre del torneo). Se corrige para comparar con split_part(objects.name,'/',1)::bigint
-- (primer segmento del path de storage.objects = el id numerico del torneo).
-- 'name' sin calificar es ambiguo (tabla FROM=tournaments), por eso se usa objects.name.

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
      where public.tournaments.id = split_part(objects.name, '/'::text, 1)::bigint
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
      where public.tournaments.id = split_part(objects.name, '/'::text, 1)::bigint
        and public.tournaments.creator_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'tournament-documents'
    and exists (
      select 1
      from public.tournaments
      where public.tournaments.id = split_part(objects.name, '/'::text, 1)::bigint
        and public.tournaments.creator_id = auth.uid()
    )
  );
