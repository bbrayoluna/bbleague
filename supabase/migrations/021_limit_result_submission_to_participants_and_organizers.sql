-- Los participantes solo pueden subir resultados de sus propios partidos.
-- El creador del torneo puede registrar cualquier resultado de su torneo.

begin;

grant select, insert, update on public.results to authenticated;

drop policy if exists "participants can submit results" on public.results;
drop policy if exists "authenticated users can submit results" on public.results;
drop policy if exists "submitters can update results" on public.results;
drop policy if exists "authenticated users can update results" on public.results;

create policy "participants and tournament creators can submit results"
  on public.results
  for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      join public.tournaments t on t.id = m.tournament_id
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          t.creator_id = auth.uid()
          or player_a.user_id = auth.uid()
          or player_b.user_id = auth.uid()
        )
    )
  );

create policy "submitters can update authorized results"
  on public.results
  for update
  to authenticated
  using (
    submitted_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      join public.tournaments t on t.id = m.tournament_id
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          t.creator_id = auth.uid()
          or player_a.user_id = auth.uid()
          or player_b.user_id = auth.uid()
        )
    )
  )
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      join public.tournaments t on t.id = m.tournament_id
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          t.creator_id = auth.uid()
          or player_a.user_id = auth.uid()
          or player_b.user_id = auth.uid()
        )
    )
  );

commit;
