-- BBLeague: limpiar datos de prueba manteniendo usuarios/jugadores
-- Ejecutar en el SQL Editor de Supabase (con el rol postgres o service_role).
-- ATENCION: elimina todos los datos de competición, pero PRESERVA:
--   - public.users        (perfiles de jugadores)
--   - public.races        (datos de referencia)
--   - storage.buckets     (los buckets 'rosters' y 'tournament-documents')
--
-- Borra: tournaments, tournament_users, rounds, matches, results,
--        rosters, tournament_bases y archivos de storage.

begin;

-- TRUNCATE tournaments CASCADE elimina en cascada todas las tablas
-- que dependen de tournaments a través de FK:
--   tournaments → tournament_users → rosters
--                → rounds          → matches → results
--                → matches
--                → tournament_bases
--
-- La tabla public.users NO se ve afectada porque es una tabla PADRE:
-- otras tablas le hacen referencia (user_id, creator_id, submitted_by),
-- pero users no referencia ninguna de ellas, por lo que CASCADE no
-- llega hasta ella.
--
-- RESTART IDENTITY reinicia las secuencias (auto-increment) de todas
-- las tablas afectadas por CASCADE.
truncate table public.tournaments restart identity cascade;

commit;

-- Verificación rápida (opcional): contar filas restantes
select 'users' as tabla, count(*) from public.users
union all
select 'races', count(*) from public.races
union all
select 'tournaments', count(*) from public.tournaments
union all
select 'tournament_users', count(*) from public.tournament_users
union all
select 'rounds', count(*) from public.rounds
union all
select 'matches', count(*) from public.matches
union all
select 'results', count(*) from public.results
union all
select 'rosters', count(*) from public.rosters
union all
select 'tournament_bases', count(*) from public.tournament_bases;

-- ============================================================
-- LIMPIEZA DE STORAGE (opcional, ejecutar por separado)
-- ============================================================
-- Supabase bloquea DELETE directo sobre storage.objects mediante un
-- trigger (storage.protect_delete). Por eso no se puede usar:
--   delete from storage.objects where bucket_id in (...);
--
-- OPCIÓN A: TRUNCATE (no dispara triggers de tipo DELETE).
-- Ejecutar en el SQL Editor como una sentencia separada:
--   truncate storage.objects restart identity;
--
-- OPCIÓN B: Usar el Dashboard de Supabase > Storage.
--   1. Ve a Storage > rosters
--   2. Elimina todos los archivos (botón de tres puntos > Empty bucket)
--   3. Repite para tournament-documents
--
-- OPCIÓN C: Usar el CLI de Supabase:
--   supabase storage rm --bucket-name rosters
--   supabase storage rm --bucket-name tournament-documents