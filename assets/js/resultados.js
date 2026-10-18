import {
  botonFormulario,
  crearMensaje,
  enviarDatos,
  getSesion,
  obtenerDatos
} from './commons.js';

/**
 * Conecta un formulario para registrar resultados de partidos pendientes.
 * @param {{ sufijo?: string, alcance: 'participante'|'organizador' }} opciones
 * @returns {() => Promise<void>} carga o actualiza los partidos disponibles
 */
export function inicializarFormularioResultados({ sufijo = '', alcance }) {
  const formulario = document.getElementById(`formResultado${sufijo}`);
  const mostrarMensaje = crearMensaje(`resultadoMensaje${sufijo}`);
  const torneoSelect = document.getElementById(`torneoResultado${sufijo}`);
  const rondaSelect = document.getElementById(`rondaResultado${sufijo}`);
  const partidoSelect = document.getElementById(`partidoResultado${sufijo}`);
  let partidosPendientes = [];

  async function cargarPartidosPendientes() {
    const userId = getSesion().user.id;
    const filtroTorneos = alcance === 'organizador' ? `&creator_id=eq.${userId}` : '';
    const [matches, registrations, users, results, tournaments, rounds] = await Promise.all([
      obtenerDatos('matches?select=id,round_id,tournament_id,tournament_user_a_id,tournament_user_b_id,status&order=tournament_id.asc,round_id.asc,id.asc'),
      obtenerDatos('tournament_users?select=id,user_id,team_name'),
      obtenerDatos('users?select=id,username'),
      obtenerDatos('results?select=match_id'),
      obtenerDatos(`tournaments?select=id,name,year${filtroTorneos}&order=year.desc,name.asc`),
      obtenerDatos('rounds?select=id,number')
    ]);

    const registrationById = new Map(registrations.map(registration => [String(registration.id), registration]));
    const usernameById = new Map(users.map(user => [user.id, user.username]));
    const completedMatchIds = new Set(results.map(result => String(result.match_id)));
    const tournamentById = new Map(tournaments.map(tournament => [String(tournament.id), tournament]));
    const roundNumberById = new Map(rounds.map(round => [String(round.id), round.number]));
    const misInscripciones = new Set(
      registrations
        .filter(registration => registration.user_id === userId)
        .map(registration => String(registration.id))
    );
    const torneosPermitidos = new Set(tournaments.map(tournament => String(tournament.id)));

    partidosPendientes = matches
      .filter(match => match.status !== 'cancelled'
        && !completedMatchIds.has(String(match.id))
        && (alcance === 'organizador'
          ? torneosPermitidos.has(String(match.tournament_id))
          : misInscripciones.has(String(match.tournament_user_a_id))
            || misInscripciones.has(String(match.tournament_user_b_id))))
      .map(match => {
        const playerA = registrationById.get(String(match.tournament_user_a_id));
        const playerB = registrationById.get(String(match.tournament_user_b_id));
        const nameA = usernameById.get(playerA?.user_id) || 'Jugador A';
        const nameB = usernameById.get(playerB?.user_id) || 'Jugador B';
        const tournament = tournamentById.get(String(match.tournament_id));

        return {
          ...match,
          torneo: tournament ? `${tournament.name} (${tournament.year})` : 'Torneo',
          ronda: Number(roundNumberById.get(String(match.round_id)) ?? match.round_id),
          texto: `${nameA} vs ${nameB}`
        };
      });

    const torneosPendientes = [...new Map(
      partidosPendientes.map(match => [String(match.tournament_id), {
        value: match.tournament_id,
        text: match.torneo
      }])
    ).values()].sort((a, b) => a.text.localeCompare(b.text, 'es'));

    rellenarSelect(torneoSelect, torneosPendientes, 'Selecciona un torneo', 'No hay partidos pendientes');
    rellenarSelect(rondaSelect, [], 'Selecciona una ronda', 'No hay rondas pendientes');
    rellenarSelect(partidoSelect, [], 'Selecciona un partido', 'No hay partidos pendientes');
    rondaSelect.disabled = true;
    partidoSelect.disabled = true;
  }

  function rellenarSelect(select, opciones, textoPorDefecto, textoVacio) {
    select.innerHTML = `<option value="">${opciones.length ? textoPorDefecto : textoVacio}</option>`;
    opciones.forEach(({ value, text }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
  }

  function cargarRondas() {
    const torneoId = torneoSelect.value;
    const rondas = [...new Map(
      partidosPendientes
        .filter(match => String(match.tournament_id) === torneoId)
        .map(match => [String(match.round_id), {
          value: match.round_id,
          text: `Ronda ${match.ronda}`,
          numero: match.ronda
        }])
    ).values()]
      .sort((a, b) => a.numero - b.numero)
      .map(({ value, text }) => ({ value, text }));

    rellenarSelect(rondaSelect, rondas, 'Selecciona una ronda', 'No hay rondas pendientes');
    rondaSelect.disabled = !torneoId;
    cargarPartidos();
  }

  function cargarPartidos() {
    const torneoId = torneoSelect.value;
    const rondaId = rondaSelect.value;
    const partidos = partidosPendientes
      .filter(match => String(match.tournament_id) === torneoId
        && String(match.round_id) === rondaId)
      .map(match => ({ value: match.id, text: match.texto }));

    rellenarSelect(partidoSelect, partidos, 'Selecciona un partido', 'No hay partidos pendientes');
    partidoSelect.disabled = !torneoId || !rondaId;
  }

  torneoSelect.addEventListener('change', cargarRondas);
  rondaSelect.addEventListener('change', cargarPartidos);
  formulario.addEventListener('submit', async event => {
    event.preventDefault();

    const boton = botonFormulario(formulario);
    const partidoId = partidoSelect.value;
    const touchdownsA = document.getElementById(`touchdownsA${sufijo}`).value;
    const touchdownsB = document.getElementById(`touchdownsB${sufijo}`).value;
    const bajasA = document.getElementById(`bajasA${sufijo}`).value;
    const bajasB = document.getElementById(`bajasB${sufijo}`).value;

    if (!partidoId || [touchdownsA, touchdownsB, bajasA, bajasB].some(value => value === '')) {
      mostrarMensaje('Completa todos los campos.', 'red');
      return;
    }

    if (boton) boton.disabled = true;
    mostrarMensaje('Enviando resultado...', 'blue');

    try {
      await enviarDatos('results', {
        body: {
          match_id: Number(partidoId),
          submitted_by: getSesion().user.id,
          touchdowns_a: Number(touchdownsA),
          touchdowns_b: Number(touchdownsB),
          casualties_a: Number(bajasA),
          casualties_b: Number(bajasB),
          status: 'confirmed'
        }
      });
      formulario.reset();
      await cargarPartidosPendientes();
      mostrarMensaje('Resultado enviado correctamente.', 'blue');
    } catch (error) {
      console.error('Error al enviar el resultado:', error);
      mostrarMensaje(error.message, 'red');
    } finally {
      if (boton) boton.disabled = false;
    }
  });

  return cargarPartidosPendientes;
}
