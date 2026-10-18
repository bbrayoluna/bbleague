-- Cierra las jornadas cuando todos sus partidos no anulados tienen resultado
-- y todas las jornadas al finalizar un torneo.

begin;

create or replace function public.close_round_if_complete(p_round_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.matches m
    where m.round_id = p_round_id
  )
  and not exists (
    select 1
    from public.matches m
    left join public.results r on r.match_id = m.id
    where m.round_id = p_round_id
      and m.status <> 'cancelled'
      and r.id is null
  ) then
    update public.rounds
       set status = 'closed'
     where id = p_round_id
       and status <> 'closed';
  end if;
end;
$$;

create or replace function public.close_round_after_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_id bigint;
begin
  select round_id
    into v_round_id
    from public.matches
   where id = new.match_id;

  if v_round_id is not null then
    perform public.close_round_if_complete(v_round_id);
  end if;

  return new;
end;
$$;

create or replace function public.close_round_after_match_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'cancelled' then
    update public.rounds r
       set status = 'active'
      from public.tournaments t
     where r.id = new.round_id
       and t.id = r.tournament_id
       and t.status = 'active'
       and r.status = 'closed';
  end if;

  perform public.close_round_if_complete(new.round_id);
  return new;
end;
$$;

create or replace function public.close_tournament_rounds_when_finished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished' and old.status is distinct from new.status then
    update public.rounds
       set status = 'closed'
     where tournament_id = new.id
       and status <> 'closed';
  end if;

  return new;
end;
$$;

drop trigger if exists results_close_completed_round on public.results;
create trigger results_close_completed_round
  after insert on public.results
  for each row execute function public.close_round_after_result();

drop trigger if exists matches_close_completed_round on public.matches;
create trigger matches_close_completed_round
  after insert or update of status on public.matches
  for each row execute function public.close_round_after_match_change();

drop trigger if exists tournaments_close_rounds_when_finished on public.tournaments;
create trigger tournaments_close_rounds_when_finished
  after update of status on public.tournaments
  for each row execute function public.close_tournament_rounds_when_finished();

update public.rounds r
   set status = 'closed'
 where exists (
   select 1
   from public.matches m
   where m.round_id = r.id
 )
 and not exists (
   select 1
   from public.matches m
   left join public.results result on result.match_id = m.id
   where m.round_id = r.id
     and m.status <> 'cancelled'
     and result.id is null
 );

update public.rounds r
   set status = 'closed'
  from public.tournaments t
 where t.id = r.tournament_id
   and t.status = 'finished'
   and r.status <> 'closed';

revoke all on function public.close_round_if_complete(bigint) from public, anon, authenticated;
revoke all on function public.close_round_after_result() from public, anon, authenticated;
revoke all on function public.close_round_after_match_change() from public, anon, authenticated;
revoke all on function public.close_tournament_rounds_when_finished() from public, anon, authenticated;

commit;
