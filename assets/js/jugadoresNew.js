/**
 * jugadoresNew.js
 * Lógica exclusiva de jugadoresNew.html: inscribirse en un torneo, ver todos los
 * partidos de una ronda, subir el resultado de un partido pendiente y subir el
 * roster del equipo.
 * Todo lo compartido está en commons.js.
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

const inscripcionForm = document.getElementById('formInscripcion');
const mostrarInscripcionMensaje = crearMensaje('inscripcionMensaje');
const torneoSelect = document.getElementById('torneoInscripcion');
const razaSelect = document.getElementById('razaInscripcion');

const resultadoForm = document.getElementById('formResultado');
const mostrarResultadoMensaje = crearMensaje('resultadoMensaje');
const partidoSelect = document.getElementById('partidoResultado');

const rosterForm = document.getElementById('formRoster');
const mostrarRosterMensaje = crearMensaje('rosterMensaje');
const inscripcionRosterSelect = document.getElementById('inscripcionRoster');
const archivoRoster = document.getElementById('archivoRoster');

const torneoPartidosSelect = document.getElementById('torneoPartidos');
const rondaPartidosSelect = document.getElementById('rondaPartidos');
const mostrarPartidosMensaje = crearMensaje('partidosMensaje');
const partidosRondaContenedor = document.getElementById('partidosRondaContenedor');
const partidosRondaBody = document.querySelector('#tablaPartidosRonda tbody');

/** Indica, por inscripción, si el torneo admite subir o sustituir el roster. */
const rostersAbiertosPorInscripcion = new Map();

/** Rondas del torneo elegido en la vista de partidos, indexadas por id. */
const rondasPorId = new Map();

/** Estados de una ronda tal y como se muestran en la página. */
const ESTADOS_RONDA = { pending: 'Pendiente', active: 'En curso', closed: 'Cerrada' };

/** Añade opciones a un selector a partir de una lista de valores. */
function rellenarSelect(select, opciones, textoPorDefecto, textoVacio) {
  select.innerHTML = `<option value="">${opciones.length ? textoPorDefecto : textoVacio}</option>`;
  opciones.forEach(({ value, text }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  });
}

// --- Inscripción ------------------------------------------------------------

/** Rellena los selectores de torneo (inscripción abierta) y de raza. */
async function cargarOpcionesInscripcion() {
  const [torneos, razas] = await Promise.all([
    obtenerDatos('tournaments?select=id,name,year&status=eq.active&registration_open=eq.true&order=year.desc,name.asc'),
    obtenerDatos('races?select=id,name&active=eq.true&order=name.asc')
  ]);

  rellenarSelect(
    torneoSelect,
    torneos.map(torneo => ({ value: torneo.id, text: `${torneo.name} (${torneo.year})` })),
    'Selecciona un torneo',
    'No hay torneos disponibles'
  );

  rellenarSelect(
    razaSelect,
    razas.map(raza => ({ value: raza.id, text: raza.name })),
    'Selecciona una raza',
    'No hay razas disponibles'
  );
}

/** Inscribe al usuario conectado en un torneo con una raza y un equipo. */
async function inscribirUsuario(tournamentId, raceId, teamName) {
  await enviarDatos('tournament_users', {
    body: {
      tournament_id: Number(tournamentId),
      user_id: getSesion().user.id,
      race_id: Number(raceId),
      team_name: teamName
    }
  });
}

inscripcionForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const boton = botonFormulario(inscripcionForm);
  const torneoId = torneoSelect.value;
  const razaId = razaSelect.value;
  const teamName = document.getElementById('nombreEquipo').value.trim();

  if (!torneoId || !razaId || !teamName) {
    mostrarInscripcionMensaje('Completa todos los campos.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarInscripcionMensaje('Formalizando inscripción...', 'blue');

  try {
    await inscribirUsuario(torneoId, razaId, teamName);
    inscripcionForm.reset();
    mostrarInscripcionMensaje('Inscripción realizada correctamente.', 'blue');
  } catch (error) {
    console.error('Error al inscribirse:', error);
    mostrarInscripcionMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Subir resultado --------------------------------------------------------

/** Rellena el selector con los partidos del usuario que aún no tienen resultado. */
async function cargarPartidosPendientes() {
  const [matches, registrations, users, results] = await Promise.all([
    obtenerDatos('matches?select=id,round_id,tournament_user_a_id,tournament_user_b_id&order=round_id.asc,id.asc'),
    obtenerDatos('tournament_users?select=id,user_id,team_name'),
    obtenerDatos('users?select=id,username'),
    obtenerDatos('results?select=match_id')
  ]);

  const userRegistrations = registrations.filter(registration =>
    registration.user_id === getSesion().user.id
  );
  const registrationIds = new Set(userRegistrations.map(registration => registration.id));
  const registrationById = new Map(registrations.map(registration => [registration.id, registration]));
  const usernameById = new Map(users.map(user => [user.id, user.username]));
  const completedMatchIds = new Set(results.map(result => result.match_id));

  const pendingMatches = matches.filter(match =>
    !completedMatchIds.has(match.id)
    && (registrationIds.has(match.tournament_user_a_id)
      || registrationIds.has(match.tournament_user_b_id))
  );

  partidoSelect.innerHTML = '<option value="">Selecciona un partido</option>';
  if (pendingMatches.length === 0) {
    partidoSelect.innerHTML = '<option value="">No hay partidos pendientes</option>';
  }

  pendingMatches.forEach(match => {
    const playerA = registrationById.get(match.tournament_user_a_id);
    const playerB = registrationById.get(match.tournament_user_b_id);
    const nameA = usernameById.get(playerA?.user_id) || 'Jugador A';
    const nameB = usernameById.get(playerB?.user_id) || 'Jugador B';
    const option = document.createElement('option');
    option.value = match.id;
    option.textContent = `Ronda ${match.round_id}: ${nameA} vs ${nameB}`;
    partidoSelect.appendChild(option);
  });
}

/** Guarda el resultado de un partido (la base de datos lo confirma sola). */
async function enviarResultado(matchId, touchdownsA, touchdownsB, bajasA, bajasB) {
  await enviarDatos('results', {
    body: {
      match_id: Number(matchId),
      submitted_by: getSesion().user.id,
      touchdowns_a: Number(touchdownsA),
      touchdowns_b: Number(touchdownsB),
      casualties_a: Number(bajasA),
      casualties_b: Number(bajasB),
      status: 'confirmed'
    }
  });
}

resultadoForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const boton = botonFormulario(resultadoForm);
  const partidoId = partidoSelect.value;
  const touchdownsA = document.getElementById('touchdownsA').value;
  const touchdownsB = document.getElementById('touchdownsB').value;
  const bajasA = document.getElementById('bajasA').value;
  const bajasB = document.getElementById('bajasB').value;

  if (!partidoId || [touchdownsA, touchdownsB, bajasA, bajasB].some(value => value === '')) {
    mostrarResultadoMensaje('Completa todos los campos.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarResultadoMensaje('Enviando resultado...', 'blue');

  try {
    await enviarResultado(partidoId, touchdownsA, touchdownsB, bajasA, bajasB);
    resultadoForm.reset();
    await cargarPartidosPendientes();
    mostrarResultadoMensaje('Resultado enviado correctamente.', 'blue');

    // Si el jugador está mirando una ronda, se refresca para ver el marcador.
    if (rondaPartidosSelect?.value) {
      await cargarPartidosRonda(rondaPartidosSelect.value);
    }
  } catch (error) {
    console.error('Error al enviar el resultado:', error);
    mostrarResultadoMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Partidos de una ronda --------------------------------------------------

/** Convierte una fecha 'YYYY-MM-DD' en 'DD/MM/YYYY' sin depender de la zona horaria. */
function formatearFecha(fecha) {
  if (!fecha) return '';
  const [ano, mes, dia] = String(fecha).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Etiqueta de una ronda con sus fechas si las tiene: "Ronda 2 (08/10/2026 - 14/10/2026)". */
function etiquetaRonda(round) {
  const fechas = [formatearFecha(round.start_date), formatearFecha(round.end_date)].filter(Boolean);
  if (fechas.length === 2) return `Ronda ${round.number} (${fechas[0]} - ${fechas[1]})`;
  if (fechas.length === 1) return `Ronda ${round.number} (${fechas[0]})`;
  return `Ronda ${round.number}`;
}

/** Oculta y vacía la tabla de partidos de la ronda. */
function vaciarTablaPartidos() {
  partidosRondaContenedor?.classList.add('hide');
  if (partidosRondaBody) partidosRondaBody.innerHTML = '';
}

/** Rellena el selector con los torneos en los que el jugador conectado está inscrito. */
async function cargarSelectorTorneoPartidos() {
  const [registrations, tournaments] = await Promise.all([
    obtenerDatos(`tournament_users?select=tournament_id&user_id=eq.${getSesion().user.id}`),
    obtenerDatos('tournaments?select=id,name,year&order=year.desc,name.asc')
  ]);

  const enrolledTournamentIds = new Set(
    registrations.map(registration => String(registration.tournament_id))
  );

  rellenarSelect(
    torneoPartidosSelect,
    tournaments
      .filter(tournament => enrolledTournamentIds.has(String(tournament.id)))
      .map(tournament => ({ value: tournament.id, text: `${tournament.name} (${tournament.year})` })),
    'Selecciona un torneo',
    'No estás inscrito en ningún torneo'
  );
}

/**
 * Rellena el selector de rondas con las del torneo elegido y vacía la tabla de
 * partidos. Las rondas se guardan en `rondasPorId` para poder describirlas sin
 * volver a consultarlas cuando se elija una.
 * @param {string} tournamentId vacío para volver al estado inicial
 */
async function cargarRondasPartidos(tournamentId = '') {
  vaciarTablaPartidos();
  rondasPorId.clear();
  rellenarSelect(rondaPartidosSelect, [], '', 'Selecciona un torneo');

  if (!tournamentId) {
    mostrarPartidosMensaje('Selecciona un torneo para ver sus rondas.', 'blue');
    return;
  }

  mostrarPartidosMensaje('Cargando rondas...', 'blue');

  try {
    const rounds = await obtenerDatos(
      `rounds?select=id,number,start_date,end_date,status&tournament_id=eq.${tournamentId}&order=number.asc`
    );

    rounds.forEach(round => rondasPorId.set(String(round.id), round));

    rellenarSelect(
      rondaPartidosSelect,
      rounds.map(round => ({ value: round.id, text: etiquetaRonda(round) })),
      'Selecciona una ronda',
      'Este torneo no tiene rondas'
    );

    mostrarPartidosMensaje(
      rounds.length
        ? 'Selecciona una ronda para ver todos sus partidos.'
        : 'Este torneo todavía no tiene rondas.',
      rounds.length ? 'blue' : 'red'
    );
  } catch (error) {
    mostrarPartidosMensaje(`No se pudieron cargar las rondas: ${error.message}`, 'red');
  }
}

/**
 * Rellena la tabla con todos los partidos de la ronda elegida, no solo los del
 * jugador conectado. El partido propio se resalta con la clase 'partido-propio'
 * y cada fila indica si ya tiene resultado.
 * @param {string} roundId vacío para dejar la tabla vacía
 */
async function cargarPartidosRonda(roundId = '') {
  vaciarTablaPartidos();

  if (!roundId) {
    mostrarPartidosMensaje('Selecciona una ronda para ver todos sus partidos.', 'blue');
    return;
  }

  mostrarPartidosMensaje('Cargando partidos...', 'blue');

  const round = rondasPorId.get(String(roundId));
  const descripcionRonda = round
    ? `${etiquetaRonda(round)} · ${ESTADOS_RONDA[round.status] || round.status}`
    : '';

  try {
    const [matches, results, registrations, users] = await Promise.all([
      obtenerDatos(`matches?select=id,tournament_user_a_id,tournament_user_b_id&round_id=eq.${roundId}&order=id.asc`),
      obtenerDatos('results?select=match_id,touchdowns_a,touchdowns_b,casualties_a,casualties_b'),
      obtenerDatos('tournament_users?select=id,user_id,team_name'),
      obtenerDatos('users?select=id,username')
    ]);

    if (matches.length === 0) {
      mostrarPartidosMensaje(
        `${descripcionRonda ? `${descripcionRonda}: ` : ''}esta ronda todavía no tiene partidos.`,
        'red'
      );
      return;
    }

    const registrationById = new Map(registrations.map(registration => [String(registration.id), registration]));
    const usernameById = new Map(users.map(user => [user.id, user.username]));
    const resultByMatchId = new Map(results.map(result => [String(result.match_id), result]));
    const tusInscripciones = new Set(
      registrations
        .filter(registration => registration.user_id === getSesion().user.id)
        .map(registration => String(registration.id))
    );

    matches.forEach(match => {
      const playerA = registrationById.get(String(match.tournament_user_a_id));
      const playerB = registrationById.get(String(match.tournament_user_b_id));
      const result = resultByMatchId.get(String(match.id));
      const esTuPartido = tusInscripciones.has(String(match.tournament_user_a_id))
        || tusInscripciones.has(String(match.tournament_user_b_id));

      const row = document.createElement('tr');
      if (esTuPartido) row.className = 'partido-propio';
      row.innerHTML = `
        <td>${usernameById.get(playerA?.user_id) || 'Jugador A'}</td>
        <td>${playerA?.team_name || ''}</td>
        <td>${result ? result.touchdowns_a : '-'}</td>
        <td>${result ? result.casualties_a : '-'}</td>
        <td>${result ? result.touchdowns_b : '-'}</td>
        <td>${result ? result.casualties_b : '-'}</td>
        <td>${playerB?.team_name || ''}</td>
        <td>${usernameById.get(playerB?.user_id) || 'Jugador B'}</td>
        <td>${result ? 'Jugado' : 'Pendiente'}</td>
      `;
      partidosRondaBody.appendChild(row);
    });

    partidosRondaContenedor?.classList.remove('hide');
    mostrarPartidosMensaje(descripcionRonda, 'blue');
  } catch (error) {
    mostrarPartidosMensaje(`No se pudieron cargar los partidos: ${error.message}`, 'red');
  }
}

torneoPartidosSelect?.addEventListener('change', () => {
  cargarRondasPartidos(torneoPartidosSelect.value);
});

rondaPartidosSelect?.addEventListener('change', () => {
  cargarPartidosRonda(rondaPartidosSelect.value);
});

// --- Subir roster -----------------------------------------------------------

/**
 * Rellena el selector con las inscripciones del usuario conectado. Los torneos
 * que han cerrado los rosters se marcan en la etiqueta y no se pueden subir.
 */
async function cargarOpcionesRosters() {
  const [registrations, tournaments] = await Promise.all([
    obtenerDatos('tournament_users?select=id,tournament_id,user_id,team_name'),
    obtenerDatos('tournaments?select=id,name,year,rosters_open&order=year.desc,name.asc')
  ]);

  const tournamentById = new Map(tournaments.map(tournament => [String(tournament.id), tournament]));

  rostersAbiertosPorInscripcion.clear();
  inscripcionRosterSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  registrations
    .filter(registration => registration.user_id === getSesion().user.id)
    .forEach(registration => {
      const tournament = tournamentById.get(String(registration.tournament_id));
      if (!tournament) return;

      const rostersAbiertos = tournament.rosters_open !== false;
      rostersAbiertosPorInscripcion.set(String(registration.id), rostersAbiertos);

      const option = document.createElement('option');
      option.value = registration.id;
      option.textContent = `${tournament.name} (${tournament.year}) - ${registration.team_name}`
        + (rostersAbiertos ? '' : ' - rosters cerrados');
      inscripcionRosterSelect.appendChild(option);
    });
}

/** Sube el PDF del roster y guarda su ficha en Supabase. */
async function subirRoster(registrationId, archivo) {
  const ruta = `${registrationId}/roster.pdf`;
  await subirArchivo('rosters', ruta, archivo, { method: 'PUT' });
  await enviarDatos('rosters?on_conflict=tournament_user_id', {
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      tournament_user_id: Number(registrationId),
      file_name: archivo.name,
      storage_path: ruta,
      mime_type: 'application/pdf'
    }
  });
}

rosterForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const boton = botonFormulario(rosterForm);
  const registrationId = inscripcionRosterSelect.value;
  const archivo = archivoRoster.files[0];

  if (!registrationId || !archivo) {
    mostrarRosterMensaje('Selecciona un torneo y un archivo PDF.', 'red');
    return;
  }

  if (archivo.type !== 'application/pdf') {
    mostrarRosterMensaje('El roster debe estar en formato PDF.', 'red');
    return;
  }

  if (rostersAbiertosPorInscripcion.get(String(registrationId)) === false) {
    mostrarRosterMensaje('El torneo ha cerrado los rosters. Contacta con el organizador.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarRosterMensaje('Subiendo roster...', 'blue');

  try {
    await subirRoster(registrationId, archivo);
    rosterForm.reset();
    mostrarRosterMensaje('Roster subido correctamente.', 'blue');
  } catch (error) {
    console.error('Error al subir el roster:', error);
    mostrarRosterMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Arranque ---------------------------------------------------------------

/** Carga los selectores que necesita jugadoresNew.html tras iniciar sesión. */
async function prepararPagina() {
  await Promise.all([
    cargarOpcionesInscripcion().catch(error => {
      mostrarInscripcionMensaje(`No se pudieron cargar torneos y razas: ${error.message}`, 'red');
    }),
    cargarPartidosPendientes().catch(error => {
      mostrarResultadoMensaje(`No se pudieron cargar los partidos: ${error.message}`, 'red');
    }),
    cargarRondasPartidos(''),
    cargarSelectorTorneoPartidos().catch(error => {
      mostrarPartidosMensaje(`No se pudieron cargar tus torneos: ${error.message}`, 'red');
    }),
    cargarOpcionesRosters().catch(error => {
      mostrarRosterMensaje(`No se pudieron cargar tus inscripciones: ${error.message}`, 'red');
    })
  ]);
}

conectarSesion({ alEntrar: prepararPagina });
