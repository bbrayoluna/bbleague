/**
 * master.js
 * Lógica exclusiva de master.html: crear torneos con sus rondas, gestionar su
 * estado (abrir y cerrar inscripciones y rosters, y finalizarlo), subir las
 * bases en PDF, añadir partidos y calcular los emparejamientos de la próxima
 * ronda según el sistema suizo. Todo lo compartido está en commons.js.
 */
import {
  botonFormulario,
  conectarSesion,
  crearMensaje,
  enviarDatos,
  getSesion,
  obtenerDatos,
  subirArchivo
} from './commons.js';

// --- Elementos de la página -------------------------------------------------

const formTorneo = document.getElementById('formTorneo');
const botonCrearTorneo = botonFormulario(formTorneo);
const mostrarTorneoMensaje = crearMensaje('mensaje');
const rondasTorneo = document.getElementById('rondasTorneo');
const anadirRondaButton = document.getElementById('anadirRonda');

const torneoGestionSelect = document.getElementById('torneoGestion');
const estadoTorneo = document.getElementById('estadoTorneo');
const mostrarGestionMensaje = crearMensaje('gestionMensaje');
const abrirInscripcionesButton = document.getElementById('abrirInscripciones');
const cerrarInscripcionesButton = document.getElementById('cerrarInscripciones');
const abrirRostersButton = document.getElementById('abrirRosters');
const cerrarRostersButton = document.getElementById('cerrarRosters');
const finalizarTorneoButton = document.getElementById('finalizarTorneo');

const partidoForm = document.getElementById('formPartido');
const mostrarPartidoMensaje = crearMensaje('partidoMensaje');
const torneoPartidoSelect = document.getElementById('torneoPartido');
const rondaPartidoSelect = document.getElementById('rondaPartido');
const jugadorAPartidoSelect = document.getElementById('jugadorAPartido');
const jugadorBPartidoSelect = document.getElementById('jugadorBPartido');

const torneoProximaRondaSelect = document.getElementById('torneoProximaRonda');
const proximaRondaContenedor = document.getElementById('proximaRondaContenedor');
const proximaRondaTitulo = document.getElementById('proximaRondaTitulo');
const proximaRondaEmparejamientos = document.getElementById('proximaRondaEmparejamientos');
const mostrarProximaRondaMensaje = crearMensaje('proximaRondaMensaje');

const basesForm = document.getElementById('formBasesTorneo');
const torneoBasesSelect = document.getElementById('torneoBases');
const archivoBases = document.getElementById('archivoBases');
const mostrarBasesMensaje = crearMensaje('basesMensaje');

// --- Crear torneo -----------------------------------------------------------

/** Crea el torneo en Supabase y devuelve la fila creada. */
async function crearTorneo(name, year) {
  const [torneo] = await enviarDatos('tournaments', {
    body: {
      name,
      year,
      creator_id: getSesion().user.id,
      registration_open: true,
      rosters_open: true,
      status: 'active'
    }
  });
  return torneo;
}

/** Guarda en Supabase las rondas de un torneo recién creado. */
async function crearRondas(tournamentId, rounds) {
  await enviarDatos('rounds', {
    body: rounds.map(round => ({ tournament_id: tournamentId, ...round }))
  });
}

/** Lee las fechas de las rondas que hay ahora mismo en el formulario. */
function obtenerRondasFormulario() {
  return [...rondasTorneo.querySelectorAll('.ronda-form')].map((ronda, index) => ({
    number: index + 1,
    start_date: ronda.querySelector('[data-field="start-date"]').value,
    end_date: ronda.querySelector('[data-field="end-date"]').value,
    status: index === 0 ? 'active' : 'pending'
  }));
}

/** Construye el bloque de fechas de una ronda nueva. */
function nuevaRondaForm(number) {
  const ronda = document.createElement('div');
  ronda.className = 'ronda-form';
  ronda.dataset.ronda = number;
  ronda.innerHTML = `
    <h3>Ronda ${number}</h3>
    <label for="inicioRonda${number}">Fecha de inicio</label>
    <input type="date" id="inicioRonda${number}" data-field="start-date" required>

    <label for="finRonda${number}">Fecha de fin</label>
    <input type="date" id="finRonda${number}" data-field="end-date" required>
  `;
  return ronda;
}

/** Deja el formulario de rondas con una única ronda vacía. */
function reiniciarRondas() {
  rondasTorneo.innerHTML = '<legend>Rondas</legend>';
  rondasTorneo.appendChild(nuevaRondaForm(1));
}

anadirRondaButton?.addEventListener('click', () => {
  const number = rondasTorneo.querySelectorAll('.ronda-form').length + 1;
  rondasTorneo.appendChild(nuevaRondaForm(number));
});

// --- Gestionar torneo -------------------------------------------------------

/** Devuelve los datos del torneo elegido en el selector de gestión. */
function torneoSeleccionado() {
  return JSON.parse(torneoGestionSelect.selectedOptions[0]?.dataset.tournament || 'null');
}

/** Refresca el texto de estado y los botones disponibles del torneo elegido. */
function actualizarEstadoGestion(tournament) {
  if (!tournament) {
    estadoTorneo.textContent = '';
    abrirInscripcionesButton.disabled = true;
    cerrarInscripcionesButton.disabled = true;
    abrirRostersButton.disabled = true;
    cerrarRostersButton.disabled = true;
    finalizarTorneoButton.disabled = true;
    return;
  }

  estadoTorneo.textContent = tournament.status === 'finished'
    ? 'Estado: finalizado'
    : `Estado: activo. Inscripciones: ${tournament.registration_open ? 'abiertas' : 'cerradas'}`
      + `. Rosters: ${tournament.rosters_open ? 'abiertos' : 'cerrados'}`;
  abrirInscripcionesButton.disabled = tournament.status === 'finished' || tournament.registration_open;
  cerrarInscripcionesButton.disabled = tournament.status === 'finished' || !tournament.registration_open;
  abrirRostersButton.disabled = tournament.status === 'finished' || tournament.rosters_open;
  cerrarRostersButton.disabled = tournament.status === 'finished' || !tournament.rosters_open;
  finalizarTorneoButton.disabled = tournament.status === 'finished';
}

/** Rellena el selector con los torneos creados por el usuario conectado. */
async function cargarGestionTorneos() {
  const tournaments = await obtenerDatos(
    `tournaments?select=id,name,year,creator_id,registration_open,rosters_open,status,finished_at&creator_id=eq.${getSesion().user.id}&order=year.desc,name.asc`
  );

  torneoGestionSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments.forEach(tournament => {
    const option = document.createElement('option');
    option.value = tournament.id;
    option.textContent = `${tournament.name} (${tournament.year})`;
    option.dataset.tournament = JSON.stringify(tournament);
    torneoGestionSelect.appendChild(option);
  });

  actualizarEstadoGestion(null);
}

/**
 * Cambia el estado del torneo elegido (abrir/cerrar inscripciones, finalizar).
 * @param {object} changes campos que se actualizan en la tabla tournaments
 * @param {string} mensajeExito texto que se muestra si el cambio va bien
 */
async function cambiarEstadoTorneo(changes, mensajeExito) {
  const tournamentId = torneoGestionSelect.value;
  if (!tournamentId) {
    mostrarGestionMensaje('Selecciona un torneo.', 'red');
    return;
  }

  const button = document.activeElement;
  if (button) button.disabled = true;
  mostrarGestionMensaje('Guardando cambios...', 'blue');

  try {
    await enviarDatos(`tournaments?id=eq.${tournamentId}`, { method: 'PATCH', body: changes });
    mostrarGestionMensaje(mensajeExito, 'blue');
    await cargarGestionTorneos();
  } catch (error) {
    mostrarGestionMensaje(error.message, 'red');
    actualizarEstadoGestion(torneoSeleccionado());
  }
}

torneoGestionSelect?.addEventListener('change', () => {
  actualizarEstadoGestion(torneoSeleccionado());
});

abrirInscripcionesButton?.addEventListener('click', () => {
  cambiarEstadoTorneo({ registration_open: true }, 'Inscripciones abiertas correctamente.');
});

cerrarInscripcionesButton?.addEventListener('click', () => {
  cambiarEstadoTorneo({ registration_open: false }, 'Inscripciones cerradas correctamente.');
});

abrirRostersButton?.addEventListener('click', () => {
  cambiarEstadoTorneo({ rosters_open: true }, 'Rosters abiertos correctamente.');
});

cerrarRostersButton?.addEventListener('click', () => {
  cambiarEstadoTorneo({ rosters_open: false }, 'Rosters cerrados correctamente.');
});

finalizarTorneoButton?.addEventListener('click', () => {
  if (!window.confirm('¿Quieres dar por finalizado este torneo? También se cerrarán los rosters.')) return;
  cambiarEstadoTorneo(
    {
      status: 'finished',
      registration_open: false,
      rosters_open: false,
      finished_at: new Date().toISOString()
    },
    'Torneo finalizado correctamente.'
  );
});

// --- Añadir partido ---------------------------------------------------------

/** Rondas de los torneos del usuario conectado (para el formulario de partidos). */
let rondasPartido = [];
/** Inscripciones de los torneos del usuario conectado. */
let inscripcionesPartido = [];
/** Nombre de usuario de cada jugador, para etiquetar las inscripciones. */
let usuariosPartidoPorId = new Map();

/** Devuelve la etiqueta con la que se muestra una inscripción en los selectores. */
function etiquetaParticipante(registration) {
  const username = usuariosPartidoPorId.get(registration.user_id) || 'Usuario';
  return registration.team_name ? `${username} - ${registration.team_name}` : username;
}

/** Rellena el selector de rondas con las del torneo elegido. */
function cargarRondasPartido(tournamentId = '') {
  rondaPartidoSelect.innerHTML = '<option value="">Selecciona una ronda</option>';

  rondasPartido
    .filter(round => String(round.tournament_id) === String(tournamentId))
    .forEach(round => {
      const option = document.createElement('option');
      option.value = round.id;
      option.textContent = `Ronda ${round.number}`;
      rondaPartidoSelect.appendChild(option);
    });
}

/** Rellena los selectores de jugadores con los inscritos en el torneo elegido. */
function cargarJugadoresPartido(tournamentId = '') {
  jugadorAPartidoSelect.innerHTML = '<option value="">Selecciona jugador A</option>';
  jugadorBPartidoSelect.innerHTML = '<option value="">Selecciona jugador B</option>';

  inscripcionesPartido
    .filter(registration => String(registration.tournament_id) === String(tournamentId))
    .forEach(registration => {
      const label = etiquetaParticipante(registration);
      [jugadorAPartidoSelect, jugadorBPartidoSelect].forEach(select => {
        const option = document.createElement('option');
        option.value = registration.id;
        option.textContent = label;
        select.appendChild(option);
      });
    });
}

/**
 * Rellena el selector de torneos del formulario de partidos y encadena los
 * demás: el torneo elegido carga sus rondas y la ronda elegida sus jugadores.
 */
async function cargarOpcionesPartido() {
  const [tournaments, rounds, registrations, users] = await Promise.all([
    obtenerDatos(`tournaments?select=id,name,year&creator_id=eq.${getSesion().user.id}&order=year.desc,name.asc`),
    obtenerDatos('rounds?select=id,number,tournament_id&order=tournament_id.asc,number.asc'),
    obtenerDatos('tournament_users?select=id,tournament_id,user_id,team_name'),
    obtenerDatos('users?select=id,username')
  ]);

  const tournamentIds = new Set(tournaments.map(tournament => String(tournament.id)));
  rondasPartido = rounds.filter(round => tournamentIds.has(String(round.tournament_id)));
  inscripcionesPartido = registrations.filter(
    registration => tournamentIds.has(String(registration.tournament_id))
  );
  usuariosPartidoPorId = new Map(users.map(user => [user.id, user.username]));

  torneoPartidoSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments.forEach(tournament => {
    const option = document.createElement('option');
    option.value = tournament.id;
    option.textContent = `${tournament.name} (${tournament.year})`;
    torneoPartidoSelect.appendChild(option);
  });

  cargarRondasPartido();
  cargarJugadoresPartido();
}

torneoPartidoSelect?.addEventListener('change', () => {
  cargarRondasPartido(torneoPartidoSelect.value);
  cargarJugadoresPartido();
});

rondaPartidoSelect?.addEventListener('change', () => {
  cargarJugadoresPartido(torneoPartidoSelect.value);
});

/** Guarda un partido nuevo entre dos inscripciones del mismo torneo. */
async function crearPartido(tournamentId, roundId, playerAId, playerBId) {
  await enviarDatos('matches', {
    body: {
      tournament_id: Number(tournamentId),
      round_id: Number(roundId),
      tournament_user_a_id: Number(playerAId),
      tournament_user_b_id: Number(playerBId),
      status: 'scheduled'
    }
  });
}

partidoForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const boton = botonFormulario(partidoForm);
  const tournamentId = torneoPartidoSelect.value;
  const roundId = rondaPartidoSelect.value;
  const playerAId = jugadorAPartidoSelect.value;
  const playerBId = jugadorBPartidoSelect.value;

  if (!tournamentId || !roundId || !playerAId || !playerBId) {
    mostrarPartidoMensaje('Completa todos los campos.', 'red');
    return;
  }

  if (playerAId === playerBId) {
    mostrarPartidoMensaje('Los jugadores deben ser distintos.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarPartidoMensaje('Añadiendo partido...', 'blue');

  try {
    await crearPartido(tournamentId, roundId, playerAId, playerBId);
    partidoForm.reset();
    cargarRondasPartido();
    cargarJugadoresPartido();
    mostrarPartidoMensaje('Partido añadido correctamente.', 'blue');
  } catch (error) {
    console.error('Error al crear el partido:', error);
    mostrarPartidoMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Próxima ronda (sistema suizo) ------------------------------------------

/**
 * Convierte una fecha 'YYYY-MM-DD' en 'DD/MM/YYYY'. Se trocea el texto a mano
 * para no depender de la zona horaria del navegador.
 */
function formatearFecha(fecha) {
  if (!fecha) return '';
  const [ano, mes, dia] = String(fecha).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Clave de un enfrentamiento entre dos inscripciones, sin importar el orden. */
function claveEmparejamiento(inscripcionA, inscripcionB) {
  return [String(inscripcionA), String(inscripcionB)].sort().join(' vs ');
}

/** Enfrentamientos ya programados en el torneo (los anulados no cuentan). */
function emparejamientosJugados(matches) {
  const jugados = new Set();

  matches
    .filter(match => match.status !== 'cancelled')
    .forEach(match => {
      jugados.add(claveEmparejamiento(match.tournament_user_a_id, match.tournament_user_b_id));
    });

  return jugados;
}

/** Primera ronda del torneo sin partidos programados; null si no queda ninguna. */
function rondaSiguiente(rounds, matches) {
  const rondasConPartidos = new Set(matches.map(match => String(match.round_id)));
  return rounds.find(round => !rondasConPartidos.has(String(round.id))) || null;
}

/**
 * Orden suizo, con los mismos criterios que la vista de clasificación: puntos,
 * diferencia de touchdowns, touchdowns a favor, bajas, victorias, partidos
 * jugados y alias.
 */
function ordenarSuizo(jugadores) {
  return [...jugadores].sort((a, b) =>
    b.points - a.points ||
    b.touchdownDifference - a.touchdownDifference ||
    b.touchdownsFor - a.touchdownsFor ||
    b.casualtiesFor - a.casualtiesFor ||
    b.wins - a.wins ||
    a.played - b.played ||
    a.username.localeCompare(b.username)
  );
}

/**
 * Empareja a los jugadores vecinos en la clasificación evitando repetir
 * enfrentamientos, igual que la página de pairings. Si a un jugador solo le
 * quedan rivales ya jugados se acepta el primero libre y se avisa con `repite`.
 * @returns {{ emparejamientos: object[], descansa: object|null, repite: boolean }}
 */
function emparejarSuizo(jugadores, jugados) {
  const usados = new Set();
  const emparejamientos = [];
  let descansa = null;
  let repite = false;

  for (let i = 0; i < jugadores.length; i++) {
    if (usados.has(i)) continue;

    let rival = -1;
    for (let j = i + 1; j < jugadores.length; j++) {
      if (usados.has(j)) continue;

      if (!jugados.has(claveEmparejamiento(jugadores[i].id, jugadores[j].id))) {
        rival = j;
        break;
      }
    }

    if (rival === -1) {
      // No quedan rivales sin enfrentarse: se acepta el primero libre.
      for (let j = i + 1; j < jugadores.length; j++) {
        if (usados.has(j)) continue;
        rival = j;
        repite = true;
        break;
      }
    }

    if (rival === -1) {
      // Sin rival disponible: este jugador descansa.
      descansa = jugadores[i];
      continue;
    }

    usados.add(i);
    usados.add(rival);
    emparejamientos.push({ jugadorA: jugadores[i], jugadorB: jugadores[rival] });
  }

  return { emparejamientos, descansa, repite };
}

/** Nombre con el que se muestra un jugador en los emparejamientos. */
function nombreJugador(jugador) {
  return jugador.teamName ? `${jugador.username} - ${jugador.teamName}` : jugador.username;
}

/** Pinta los emparejamientos propuestos como en la página de pairings. */
function renderEmparejamientos(emparejamientos, descansa) {
  let html = emparejamientos.map((emparejamiento, index) => `
    <table class="match-table">
      <tr>
        <td class="match-label match-header">Match ${index + 1}</td>
        <td class="match-line">${nombreJugador(emparejamiento.jugadorA)} (${emparejamiento.jugadorA.points} pts) vs ${nombreJugador(emparejamiento.jugadorB)} (${emparejamiento.jugadorB.points} pts)</td>
      </tr>
    </table>
  `).join('');

  if (descansa) {
    html += `
      <table class="match-table">
        <tr>
          <td class="match-label match-header">Sin rival</td>
          <td class="match-line">${nombreJugador(descansa)} (${descansa.points} pts): descansa</td>
        </tr>
      </table>
    `;
  }

  return html;
}

/** Vacía el bloque de próxima ronda (título, emparejamientos y avisos). */
function ocultarProximaRonda() {
  proximaRondaContenedor?.classList.add('hide');
  proximaRondaTitulo.textContent = '';
  proximaRondaEmparejamientos.innerHTML = '';
  mostrarProximaRondaMensaje('', 'blue');
}

/** Rellena el selector de torneos del bloque de próxima ronda. */
async function cargarOpcionesProximaRonda() {
  const tournaments = await obtenerDatos(
    `tournaments?select=id,name,year&creator_id=eq.${getSesion().user.id}&order=year.desc,name.asc`
  );

  torneoProximaRondaSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments.forEach(tournament => {
    const option = document.createElement('option');
    option.value = tournament.id;
    option.textContent = `${tournament.name} (${tournament.year})`;
    torneoProximaRondaSelect.appendChild(option);
  });

  // Al recargar la lista se descarta el cálculo que hubiera en pantalla.
  ocultarProximaRonda();
}

/**
 * Calcula y muestra los emparejamientos de la próxima ronda del torneo elegido:
 * la primera ronda sin partidos programados, con los jugadores ordenados por la
 * clasificación y emparejados por proximidad sin repetir enfrentamientos.
 */
async function cargarProximaRonda(tournamentId = '') {
  ocultarProximaRonda();

  if (!tournamentId) {
    mostrarProximaRondaMensaje('Selecciona un torneo.', 'blue');
    return;
  }

  mostrarProximaRondaMensaje('Calculando la próxima ronda...', 'blue');

  try {
    const [rounds, matches, results, clasificacion, inscripciones] = await Promise.all([
      obtenerDatos(`rounds?select=id,number,start_date,end_date&tournament_id=eq.${tournamentId}&order=number.asc`),
      obtenerDatos(`matches?select=id,round_id,status,tournament_user_a_id,tournament_user_b_id&tournament_id=eq.${tournamentId}`),
      obtenerDatos('results?select=match_id,status'),
      obtenerDatos(`classification?select=tournament_user_id,username,played,wins,points,touchdowns_for,casualties_for,touchdown_difference&tournament_id=eq.${tournamentId}`),
      obtenerDatos(`tournament_users?select=id,team_name&tournament_id=eq.${tournamentId}`)
    ]);

    if (rounds.length === 0) {
      mostrarProximaRondaMensaje('Este torneo no tiene rondas.', 'red');
      return;
    }

    const ronda = rondaSiguiente(rounds, matches);

    if (!ronda) {
      mostrarProximaRondaMensaje('Todas las rondas del torneo ya tienen partidos programados.', 'blue');
      return;
    }

    if (clasificacion.length === 0) {
      mostrarProximaRondaMensaje(
        `La ronda ${ronda.number} está pendiente, pero el torneo no tiene jugadores inscritos.`,
        'red'
      );
      return;
    }

    const equiposPorInscripcion = new Map(
      inscripciones.map(inscripcion => [String(inscripcion.id), inscripcion.team_name])
    );

    const jugadores = ordenarSuizo(clasificacion.map(fila => ({
      id: fila.tournament_user_id,
      username: fila.username || 'Jugador',
      teamName: equiposPorInscripcion.get(String(fila.tournament_user_id)) || '',
      played: Number(fila.played) || 0,
      wins: Number(fila.wins) || 0,
      points: Number(fila.points) || 0,
      touchdownsFor: Number(fila.touchdowns_for) || 0,
      casualtiesFor: Number(fila.casualties_for) || 0,
      touchdownDifference: Number(fila.touchdown_difference) || 0
    })));

    const { emparejamientos, descansa, repite } = emparejarSuizo(
      jugadores,
      emparejamientosJugados(matches)
    );

    const numeroPorRonda = new Map(rounds.map(round => [String(round.id), round.number]));
    const estadoPorPartido = new Map(results.map(result => [String(result.match_id), result.status]));
    const rondasSinResultado = [...new Set(
      matches
        .filter(match =>
          match.status !== 'cancelled' &&
          (numeroPorRonda.get(String(match.round_id)) || 0) < ronda.number &&
          estadoPorPartido.get(String(match.id)) !== 'confirmed'
        )
        .map(match => numeroPorRonda.get(String(match.round_id)))
    )].sort((a, b) => a - b);

    const fechas = [formatearFecha(ronda.start_date), formatearFecha(ronda.end_date)].filter(Boolean);
    proximaRondaTitulo.textContent = `Ronda ${ronda.number}`
      + (fechas.length ? ` (${fechas.join(' - ')})` : '');
    proximaRondaEmparejamientos.innerHTML = renderEmparejamientos(emparejamientos, descansa);
    proximaRondaContenedor.classList.remove('hide');

    const avisos = [];
    if (rondasSinResultado.length) {
      avisos.push('Todavía hay partidos sin resultado en las rondas '
        + `${rondasSinResultado.join(', ')}: la clasificación puede no estar actualizada.`);
    }
    if (repite) {
      avisos.push('Algún emparejamiento repite un enfrentamiento anterior porque no quedan rivales sin jugar.');
    }
    mostrarProximaRondaMensaje(avisos.join(' '), avisos.length ? 'red' : 'blue');
  } catch (error) {
    mostrarProximaRondaMensaje(`No se pudo calcular la próxima ronda: ${error.message}`, 'red');
  }
}

torneoProximaRondaSelect?.addEventListener('change', () => {
  cargarProximaRonda(torneoProximaRondaSelect.value).catch(error => {
    mostrarProximaRondaMensaje(`No se pudo calcular la próxima ronda: ${error.message}`, 'red');
  });
});

// --- Bases del torneo -------------------------------------------------------

/** Rellena el selector del formulario de bases con los torneos del usuario. */
async function cargarOpcionesBases() {
  const tournaments = await obtenerDatos(
    `tournaments?select=id,name,year&creator_id=eq.${getSesion().user.id}&order=year.desc,name.asc`
  );

  torneoBasesSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments.forEach(tournament => {
    const option = document.createElement('option');
    option.value = tournament.id;
    option.textContent = `${tournament.name} (${tournament.year})`;
    torneoBasesSelect.appendChild(option);
  });
}

/**
 * Sube el PDF de bases del torneo indicado y guarda su ficha.
 *
 * La ruta empieza por el id numérico del torneo porque la política RLS de
 * Storage hace split_part(name,'/',1)::bigint: si el primer segmento no es un
 * número, PostgreSQL falla al convertir el nombre del torneo a bigint.
 */
async function subirBases(tournamentId, archivo) {
  const ruta = `${tournamentId}/bases.pdf`;
  await subirArchivo('tournament-documents', ruta, archivo);
  await enviarDatos('tournament_bases?on_conflict=tournament_id', {
    prefer: 'resolution=merge-duplicates',
    body: {
      tournament_id: Number(tournamentId),
      file_name: archivo.name,
      storage_path: ruta,
      mime_type: 'application/pdf'
    }
  });
}

basesForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const archivo = archivoBases.files[0];
  const boton = botonFormulario(basesForm);

  if (!torneoBasesSelect.value || !archivo || archivo.type !== 'application/pdf') {
    mostrarBasesMensaje('Selecciona un torneo y un PDF.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarBasesMensaje('Subiendo bases...', 'blue');

  try {
    await subirBases(Number(torneoBasesSelect.value), archivo);
    basesForm.reset();
    mostrarBasesMensaje('Bases subidas correctamente.', 'blue');
  } catch (error) {
    mostrarBasesMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Crear torneo (formulario) ----------------------------------------------

formTorneo?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!formTorneo.checkValidity()) {
    formTorneo.reportValidity();
    return;
  }

  const nombre = document.getElementById('nombreTorneo').value.trim();
  const ano = Number(document.getElementById('anoTorneo').value);
  const rondas = obtenerRondasFormulario();

  if (!nombre || !Number.isInteger(ano) || ano < 2000 || ano > 2100
    || rondas.some(ronda => ronda.end_date < ronda.start_date)) {
    mostrarTorneoMensaje('Revisa el nombre, el año y las fechas de las rondas.', 'red');
    return;
  }

  if (botonCrearTorneo) botonCrearTorneo.disabled = true;
  mostrarTorneoMensaje('Creando torneo...', 'blue');

  try {
    const torneo = await crearTorneo(nombre, ano);
    if (!torneo?.id) {
      throw new Error('Supabase no devolvió el identificador del torneo.');
    }

    await crearRondas(torneo.id, rondas);
    mostrarTorneoMensaje('Torneo creado correctamente.', 'blue');
    formTorneo.reset();
    reiniciarRondas();
    await prepararPagina();
  } catch (error) {
    console.error('Error al crear el torneo:', error);
    mostrarTorneoMensaje(`No se pudo crear el torneo: ${error.message}`, 'red');
  } finally {
    if (botonCrearTorneo) botonCrearTorneo.disabled = false;
  }
});

// --- Arranque ---------------------------------------------------------------

/** Carga los selectores que necesita master.html tras iniciar sesión. */
async function prepararPagina() {
  await Promise.all([
    cargarGestionTorneos().catch(error => {
      mostrarGestionMensaje(`No se pudieron cargar los torneos: ${error.message}`, 'red');
    }),
    cargarOpcionesPartido().catch(error => {
      mostrarPartidoMensaje(`No se pudieron cargar los torneos: ${error.message}`, 'red');
    }),
    cargarOpcionesBases().catch(error => {
      mostrarBasesMensaje(`No se pudieron cargar los torneos: ${error.message}`, 'red');
    }),
    cargarOpcionesProximaRonda().catch(error => {
      mostrarProximaRondaMensaje(`No se pudieron cargar los torneos: ${error.message}`, 'red');
    })
  ]);
}

conectarSesion({
  alEntrar: prepararPagina,
  alSalir: () => formTorneo?.reset()
});
