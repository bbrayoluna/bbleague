-- Permitir consultar la vista de clasificación desde master.html.
-- Ejecutar despues de las migraciones anteriores.

grant select on public.classification to anon, authenticated;
