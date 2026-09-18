-- Vista de clasificacion limitada a torneos del usuario autenticado.
-- Ejecutar despues de las migraciones anteriores.

create or replace view public.classification_for_user as
select classification.*
from public.classification
where exists (
  select 1
  from public.tournament_users
  where tournament_users.tournament_id = classification.tournament_id
    and tournament_users.user_id = auth.uid()
);

grant select on public.classification_for_user to authenticated;
revoke all on public.classification_for_user from anon;
