-- Roles de usuario y permisos exclusivos para crear y gestionar torneos.
-- Ejecutar despues de 022_allow_tournament_creators_to_edit_results.sql.

begin;

create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('player', 'master')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

revoke all on public.user_roles from public, anon, authenticated;
grant select on public.user_roles to authenticated;

drop policy if exists "authenticated users can read user roles" on public.user_roles;
create policy "authenticated users can read user roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() is not null);

create or replace function public.add_default_player_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'player')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists users_assign_default_player_role on public.users;
create trigger users_assign_default_player_role
  after insert on public.users
  for each row execute function public.add_default_player_role();

insert into public.user_roles (user_id, role)
select id, 'player'
from public.users
on conflict (user_id, role) do nothing;

create or replace function public.is_master(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = p_user_id
      and role = 'master'
  );
$$;

revoke all on function public.is_master(uuid) from public, anon, authenticated;
grant execute on function public.is_master(uuid) to authenticated;

create or replace function public.grant_master_role(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_master(auth.uid()) then
    raise exception 'Solo un master puede asignar este rol'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.users where id = target_user_id) then
    raise exception 'No existe el jugador indicado'
      using errcode = 'P0002';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'master')
  on conflict (user_id, role) do nothing;
end;
$$;

revoke all on function public.grant_master_role(uuid) from public, anon, authenticated;
grant execute on function public.grant_master_role(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from public.users
    where lower(username) = lower('Casaca')
  ) then
    raise exception 'No existe un usuario con el nombre Casaca en public.users';
  end if;
end;
$$;

insert into public.user_roles (user_id, role)
select id, 'master'
from public.users
where lower(username) = lower('Casaca')
on conflict (user_id, role) do nothing;

-- Cualquier master puede gestionar torneos, aunque los haya creado otro master.
drop policy if exists "public can create tournaments" on public.tournaments;
drop policy if exists "authenticated users can create tournaments" on public.tournaments;
create policy "masters can create tournaments"
  on public.tournaments
  for insert
  to authenticated
  with check (
    public.is_master(auth.uid())
    and creator_id = auth.uid()
  );

drop policy if exists "creators can update their tournaments" on public.tournaments;
create policy "masters can update tournaments"
  on public.tournaments
  for update
  to authenticated
  using (public.is_master(auth.uid()))
  with check (public.is_master(auth.uid()));

drop policy if exists "authenticated users can create rounds" on public.rounds;
create policy "masters can create rounds"
  on public.rounds
  for insert
  to authenticated
  with check (
    public.is_master(auth.uid())
    and exists (
      select 1
      from public.tournaments
      where id = tournament_id
    )
  );

drop policy if exists "authenticated users can create matches" on public.matches;
create policy "masters can create matches"
  on public.matches
  for insert
  to authenticated
  with check (
    public.is_master(auth.uid())
    and exists (
      select 1
      from public.tournaments
      where id = tournament_id
    )
  );

drop policy if exists "creators can manage tournament bases" on public.tournament_bases;
create policy "masters can manage tournament bases"
  on public.tournament_bases
  for all
  to authenticated
  using (
    public.is_master(auth.uid())
    and exists (
      select 1
      from public.tournaments
      where id = tournament_bases.tournament_id
    )
  )
  with check (
    public.is_master(auth.uid())
    and exists (
      select 1
      from public.tournaments
      where id = tournament_id
    )
  );

drop policy if exists "creators can upload tournament bases" on storage.objects;
create policy "masters can upload tournament bases"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tournament-documents'
    and public.is_master(auth.uid())
    and exists (
      select 1
      from public.tournaments
      where id = split_part(objects.name, '/', 1)::bigint
    )
  );

drop policy if exists "creators can update tournament bases files" on storage.objects;
create policy "masters can update tournament bases files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'tournament-documents'
    and public.is_master(auth.uid())
    and exists (
      select 1
      from public.tournaments
      where id = split_part(objects.name, '/', 1)::bigint
    )
  )
  with check (
    bucket_id = 'tournament-documents'
    and public.is_master(auth.uid())
    and exists (
      select 1
      from public.tournaments
      where id = split_part(objects.name, '/', 1)::bigint
    )
  );

drop policy if exists "participants and tournament creators can submit results" on public.results;
create policy "participants and masters can submit results"
  on public.results
  for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          player_a.user_id = auth.uid()
          or player_b.user_id = auth.uid()
          or public.is_master(auth.uid())
        )
    )
  );

drop policy if exists "submitters can update authorized results" on public.results;
drop policy if exists "tournament creators and submitters can update results" on public.results;
create policy "masters and submitters can update results"
  on public.results
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          public.is_master(auth.uid())
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
      left join public.tournament_users player_a on player_a.id = m.tournament_user_a_id
      left join public.tournament_users player_b on player_b.id = m.tournament_user_b_id
      where m.id = match_id
        and (
          public.is_master(auth.uid())
          or (
            submitted_by = auth.uid()
            and (player_a.user_id = auth.uid() or player_b.user_id = auth.uid())
          )
        )
    )
  );

revoke all on function public.add_default_player_role() from public, anon, authenticated;

commit;
