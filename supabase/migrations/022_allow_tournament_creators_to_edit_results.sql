-- Permite al creador del torneo corregir resultados ya registrados.
-- El participante puede seguir editando un resultado que el mismo envio.

begin;

drop policy if exists "submitters can update authorized results" on public.results;
drop policy if exists "tournament creators and submitters can update results" on public.results;

create policy "tournament creators and submitters can update results"
  on public.results
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      join public.tournaments t on t.id = m.tournament_id
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          t.creator_id = auth.uid()
          or (
            submitted_by = auth.uid()
            and (player_a.user_id = auth.uid() or player_b.user_id = auth.uid())
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      join public.tournaments t on t.id = m.tournament_id
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          t.creator_id = auth.uid()
          or (
            submitted_by = auth.uid()
            and (player_a.user_id = auth.uid() or player_b.user_id = auth.uid())
          )
        )
    )
  );

create or replace function public.prevent_result_submitter_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.submitted_by is distinct from old.submitted_by then
    raise exception 'The result submitter cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists results_prevent_submitter_change on public.results;
create trigger results_prevent_submitter_change
  before update of submitted_by on public.results
  for each row execute function public.prevent_result_submitter_change();

revoke all on function public.prevent_result_submitter_change() from public, anon, authenticated;

commit;
