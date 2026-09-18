-- Añadir dos rondas a un torneo existente.
-- Edita solo los valores de la seccion CONFIGURACION.

begin;

do $$
declare
  -- CONFIGURACION
  v_tournament_id bigint := 1;
  v_round_1_start date := date '2026-10-01';
  v_round_1_end date := date '2026-10-07';
  v_round_2_start date := date '2026-10-08';
  v_round_2_end date := date '2026-10-14';

  v_next_number integer;
begin
  if not exists (
    select 1
    from public.tournaments
    where id = v_tournament_id
  ) then
    raise exception 'No existe el torneo con id %', v_tournament_id;
  end if;

  if v_round_1_end < v_round_1_start
     or v_round_2_end < v_round_2_start then
    raise exception 'La fecha de fin no puede ser anterior a la fecha de inicio';
  end if;

  select coalesce(max(number), 0) + 1
  into v_next_number
  from public.rounds
  where tournament_id = v_tournament_id;

  insert into public.rounds (
    tournament_id,
    number,
    start_date,
    end_date,
    status
  )
  values
    (
      v_tournament_id,
      v_next_number,
      v_round_1_start,
      v_round_1_end,
      'pending'
    ),
    (
      v_tournament_id,
      v_next_number + 1,
      v_round_2_start,
      v_round_2_end,
      'pending'
    );
end;
$$;

commit;
