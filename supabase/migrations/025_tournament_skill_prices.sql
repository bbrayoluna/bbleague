-- Configurable skill upgrade prices for each tournament.
-- Run after 024_revoke_master_role.sql.

begin;

alter table public.tournaments
  add column if not exists primary_skill_cost bigint not null default 20000
    check (primary_skill_cost >= 0),
  add column if not exists secondary_skill_cost bigint not null default 40000
    check (secondary_skill_cost >= 0),
  add column if not exists elite_skill_surcharge bigint not null default 10000
    check (elite_skill_surcharge >= 0),
  add column if not exists second_skill_surcharge bigint not null default 10000
    check (second_skill_surcharge >= 0);

commit;
