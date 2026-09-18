-- Los resultados se consideran confirmados al enviarse.
-- Ejecutar despues de las migraciones anteriores.

begin;

update public.results
set status = 'confirmed',
    updated_at = now()
where status = 'pending';

alter table public.results
  alter column status set default 'confirmed';

commit;
