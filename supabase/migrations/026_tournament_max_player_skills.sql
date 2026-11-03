-- Configurable maximum number of purchased skills per player and tournament.
-- Run after 025_tournament_skill_prices.sql.

begin;

alter table public.tournaments
  add column if not exists max_added_skills_per_player integer not null default 2
    check (max_added_skills_per_player >= 0);

commit;
