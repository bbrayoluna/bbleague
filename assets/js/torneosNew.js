/**
 * torneosNew.js
 * Lógica exclusiva de torneosNew.html: el selector único de torneo y los cuatro
 * bloques que alimenta (clasificación, resultados, rosters y bases), además de
 * la descarga de los PDF.
 * Todo lo compartido está en commons.js.
 */
import {
  abrirArchivoFirmado,
  conectarSesion,
  crearMensaje,
  getSesion,
  obtenerDatos
} from './commons.js';

// --- Elementos de la página -------------------------------------------------

const torneoSeleccionSelect = document.getElementById('torneoSeleccion');
const mostrarTorneoSeleccionMensaje = crearMensaje('torneoSeleccionMensaje');

const clasificacionContenedor = document.getElementById('clasificacionContenedor');
const mostrarClasificacionMensaje = crearMensaje('clasificacionMensaje');
const clasificacionBody = document.querySelector('#tablaClasificacion tbody');

const resultadosTorneoContenedor = document.getElementById('resultadosTorneoContenedor');
const mostrarResultadosTorneoMensaje = crearMensaje('resultadosTorneoMensaje');
const resultadosTorneoBody = document.querySelector('#tablaResultadosTorneo tbody');

const rostersContenedor = document.getElementById('rostersContenedor');
const mostrarRostersMensaje = crearMensaje('rostersMensaje');
const rostersBody = document.querySelector('#tablaRosters tbody');

const basesJugadorContenedor = document.getElementById('basesJugadorContenedor');
const mostrarBasesJugadorMensaje = crearMensaje('basesJugadorMensaje');
const basesJugadorBody = document.querySelector('#tablaBasesJugador tbody');

// --- Selector único de torneo -----------------------------------------------

/** Lista los torneos en los que el jugador está inscrito. */
async function cargarSelectorTorneo() {
  const [registrations, tournaments] = await Promise.all([
    obtenerDatos(`tournament_users?select=tournament_id&user_id=eq.${getSesion().user.id}`),
    obtenerDatos('tournaments?select=id,name,year&order=year.desc,name.asc')
  ]);

  const enrolledTournamentIds = new Set(
    registrations.map(registration => String(registration.tournament_id))
  );

  torneoSeleccionSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments
    .filter(tournament => enrolledTournamentIds.has(String(tournament.id)))
    .forEach(tournament => {
      const option = document.createElement('option');
      option.value = tournament.id;
      option.textContent = `${tournament.name} (${tournament.year})`;
      torneoSeleccionSelect.appendChild(option);
    });

  if (torneoSeleccionSelect.options.length === 1) {
    torneoSeleccionSelect.innerHTML = '<option value="">No estás inscrito en ningún torneo</option>';
    mostrarTorneoSeleccionMensaje('No estás inscrito en ningún torneo.', 'red');
    return;
  }

  mostrarTorneoSeleccionMensaje('', 'blue');
}

// --- Clasificación ----------------------------------------------------------

/** Rellena la tabla de clasificación del torneo elegido. */
async function cargarClasificacion(tournamentId = '', aviso = 'Selecciona un torneo.') {
  clasificacionContenedor?.classList.add('hide');
  if (clasificacionBody) clasificacionBody.innerHTML = '';

  if (!tournamentId) {
    mostrarClasificacionMensaje(aviso, 'blue');
    return;
  }

  mostrarClasificacionMensaje('Cargando clasificación...', 'blue');

  try {
    const rows = await obtenerDatos(
      `classification_for_user?select=rank,username,race_name,played,wins,draws,losses,points,touchdown_difference,casualty_difference&tournament_id=eq.${tournamentId}&order=rank.asc`
    );

    if (rows.length === 0) {
      mostrarClasificacionMensaje('Este torneo todavía no tiene clasificación.', 'red');
      return;
    }

    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.rank}</td>
        <td>${row.username}</td>
        <td>${row.race_name}</td>
        <td>${row.points}</td>
        <td>${row.played}</td>
        <td>${row.wins}</td>
        <td>${row.draws}</td>
        <td>${row.losses}</td>
        <td>${row.touchdown_difference}</td>
        <td>${row.casualty_difference}</td>
      `;
      clasificacionBody.appendChild(tr);
    });

    clasificacionContenedor.classList.remove('hide');
    mostrarClasificacionMensaje('', 'blue');
  } catch (error) {
    mostrarClasificacionMensaje(`No se pudo cargar la clasificación: ${error.message}`, 'red');
  }
}

// --- Resultados -------------------------------------------------------------

/** Rellena la tabla de resultados confirmados del torneo elegido. */
async function cargarResultadosTorneo(tournamentId = '', aviso = 'Selecciona un torneo.') {
  resultadosTorneoContenedor?.classList.add('hide');
  if (resultadosTorneoBody) resultadosTorneoBody.innerHTML = '';

  if (!tournamentId) {
    mostrarResultadosTorneoMensaje(aviso, 'blue');
    return;
  }

  mostrarResultadosTorneoMensaje('Cargando resultados...', 'blue');

  try {
    const [matches, results, rounds, registrations, users] = await Promise.all([
      obtenerDatos(`matches?select=id,round_id,tournament_user_a_id,tournament_user_b_id&tournament_id=eq.${tournamentId}`),
      obtenerDatos('results?select=match_id,touchdowns_a,touchdowns_b,casualties_a,casualties_b,status'),
      obtenerDatos(`rounds?select=id,number&tournament_id=eq.${tournamentId}`),
      obtenerDatos(`tournament_users?select=id,user_id,team_name&tournament_id=eq.${tournamentId}`),
      obtenerDatos('users?select=id,username')
    ]);

    const matchById = new Map(matches.map(match => [String(match.id), match]));
    const roundById = new Map(rounds.map(round => [String(round.id), round.number]));
    const registrationById = new Map(
      registrations.map(registration => [String(registration.id), registration])
    );
    const usernameById = new Map(users.map(user => [user.id, user.username]));
    const resultRows = results
      .filter(result => result.status === 'confirmed')
      .map(result => ({ result, match: matchById.get(String(result.match_id)) }))
      .filter(row => row.match);

    if (resultRows.length === 0) {
      mostrarResultadosTorneoMensaje('Este torneo todavía no tiene resultados.', 'red');
      return;
    }

    resultRows.sort((a, b) => {
      const roundA = roundById.get(String(a.match.round_id)) || 0;
      const roundB = roundById.get(String(b.match.round_id)) || 0;
      return roundA - roundB || Number(a.match.id) - Number(b.match.id);
    });

    resultRows.forEach(({ result, match }) => {
      const playerA = registrationById.get(String(match.tournament_user_a_id));
      const playerB = registrationById.get(String(match.tournament_user_b_id));
      const nameA = usernameById.get(playerA?.user_id) || 'Jugador A';
      const nameB = usernameById.get(playerB?.user_id) || 'Jugador B';
      const labelA = playerA?.team_name ? `${nameA} - ${playerA.team_name}` : nameA;
      const labelB = playerB?.team_name ? `${nameB} - ${playerB.team_name}` : nameB;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${roundById.get(String(match.round_id)) || ''}</td>
        <td>${labelA}</td>
        <td>${result.touchdowns_a}</td>
        <td>${result.casualties_a}</td>
        <td>${result.touchdowns_b}</td>
        <td>${result.casualties_b}</td>
        <td>${labelB}</td>
      `;
      resultadosTorneoBody.appendChild(row);
    });

    resultadosTorneoContenedor.classList.remove('hide');
    mostrarResultadosTorneoMensaje('', 'blue');
  } catch (error) {
    mostrarResultadosTorneoMensaje(`No se pudieron cargar los resultados: ${error.message}`, 'red');
  }
}

// --- Rosters -----------------------------------------------------------------

/** Rellena la tabla de rosters subidos en el torneo elegido. */
async function cargarRosters(tournamentId = '', aviso = 'Selecciona un torneo.') {
  rostersContenedor?.classList.add('hide');
  if (rostersBody) rostersBody.innerHTML = '';

  if (!tournamentId) {
    mostrarRostersMensaje(aviso, 'blue');
    return;
  }

  mostrarRostersMensaje('Cargando rosters...', 'blue');

  const [rosters, registrations, users, tournaments] = await Promise.all([
    obtenerDatos('rosters?select=id,tournament_user_id,file_name,storage_path,uploaded_at&order=uploaded_at.desc'),
    obtenerDatos('tournament_users?select=id,tournament_id,user_id,team_name'),
    obtenerDatos('users?select=id,username'),
    obtenerDatos('tournaments?select=id,name,year')
  ]);

  const registrationById = new Map(registrations.map(registration => [String(registration.id), registration]));
  const usernameById = new Map(users.map(user => [user.id, user.username]));
  const tournamentById = new Map(tournaments.map(tournament => [String(tournament.id), tournament]));
  const filteredRosters = rosters.filter(roster => {
    const registration = registrationById.get(String(roster.tournament_user_id));
    return String(registration?.tournament_id) === String(tournamentId);
  });

  filteredRosters.forEach(roster => {
    const registration = registrationById.get(String(roster.tournament_user_id));
    const tournament = tournamentById.get(String(registration?.tournament_id));
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tournament ? `${tournament.name} (${tournament.year})` : ''}</td>
      <td>${usernameById.get(registration?.user_id) || ''}</td>
      <td>${registration?.team_name || ''}</td>
      <td>${roster.file_name}</td>
      <td>${new Date(roster.uploaded_at).toLocaleString('es-ES')}</td>
      <td><button type="button" class="master-action descargar-roster" data-path="${roster.storage_path}">Descargar</button></td>
    `;
    rostersBody.appendChild(row);
  });

  if (filteredRosters.length) rostersContenedor?.classList.remove('hide');

  mostrarRostersMensaje(
    filteredRosters.length ? '' : 'No hay rosters disponibles.',
    filteredRosters.length ? 'blue' : 'red'
  );
}

// --- Bases de los torneos ---------------------------------------------------

/** Rellena la tabla de bases publicadas en el torneo elegido. */
async function cargarBasesJugador(tournamentId = '', aviso = 'Selecciona un torneo.') {
  if (!basesJugadorBody) return;

  basesJugadorContenedor?.classList.add('hide');
  basesJugadorBody.innerHTML = '';

  if (!tournamentId) {
    mostrarBasesJugadorMensaje(aviso, 'blue');
    return;
  }

  mostrarBasesJugadorMensaje('Cargando bases...', 'blue');

  const [bases, tournaments] = await Promise.all([
    obtenerDatos(`tournament_bases?select=tournament_id,file_name,storage_path,uploaded_at&tournament_id=eq.${tournamentId}&order=uploaded_at.desc`),
    obtenerDatos('tournaments?select=id,name,year')
  ]);

  const tournamentById = new Map(tournaments.map(row => [String(row.id), row]));

  bases.forEach(base => {
    const tournament = tournamentById.get(String(base.tournament_id));
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tournament ? `${tournament.name} (${tournament.year})` : ''}</td>
      <td>${base.file_name}</td>
      <td>${new Date(base.uploaded_at).toLocaleString('es-ES')}</td>
      <td><button type="button" class="master-action descargar-bases" data-path="${base.storage_path}">Descargar</button></td>
    `;
    basesJugadorBody.appendChild(row);
  });

  if (bases.length) basesJugadorContenedor?.classList.remove('hide');

  mostrarBasesJugadorMensaje(
    bases.length ? '' : 'No hay bases disponibles.',
    bases.length ? 'blue' : 'red'
  );
}

// --- Descargas --------------------------------------------------------------

/** Abre en una pestaña nueva el PDF del roster indicado. */
async function descargarRoster(path) {
  await abrirArchivoFirmado('rosters', path, {
    validar: ruta => {
      if (!/^\d+\/[^/]+$/.test(ruta)) {
        throw new Error(`La ruta del roster no es válida: ${ruta}`);
      }
    }
  });
}

/** Abre en una pestaña nueva el PDF de las bases indicadas. */
async function descargarBases(path) {
  await abrirArchivoFirmado('tournament-documents', path);
}

/** Conecta los botones "Descargar" de las tablas de rosters y de bases. */
function conectarDescargas(tabla, claseBoton, descargar, mostrarMensaje) {
  tabla?.addEventListener('click', async event => {
    const boton = event.target.closest(`.${claseBoton}`);
    if (!boton) return;

    boton.disabled = true;
    try {
      await descargar(boton.dataset.path);
    } catch (error) {
      mostrarMensaje(error.message, 'red');
    } finally {
      boton.disabled = false;
    }
  });
}

conectarDescargas(rostersBody, 'descargar-roster', descargarRoster, mostrarRostersMensaje);
conectarDescargas(basesJugadorBody, 'descargar-bases', descargarBases, mostrarBasesJugadorMensaje);

// --- Arranque ---------------------------------------------------------------

/**
 * Carga los cuatro bloques del torneo. Se lanzan en paralelo y cada uno informa
 * de sus propios errores, de modo que un fallo no deja los demás en blanco.
 */
async function cargarBloquesTorneo(tournamentId = '') {
  const aviso = torneoSeleccionSelect?.options.length > 1
    ? 'Selecciona un torneo.'
    : 'No estás inscrito en ningún torneo.';

  await Promise.all([
    cargarClasificacion(tournamentId, aviso),
    cargarResultadosTorneo(tournamentId, aviso),
    cargarRosters(tournamentId, aviso).catch(error => {
      mostrarRostersMensaje(`No se pudieron cargar los rosters: ${error.message}`, 'red');
    }),
    cargarBasesJugador(tournamentId, aviso).catch(error => {
      mostrarBasesJugadorMensaje(`No se pudieron cargar las bases: ${error.message}`, 'red');
    })
  ]);
}

torneoSeleccionSelect?.addEventListener('change', () => {
  cargarBloquesTorneo(torneoSeleccionSelect.value).catch(error => {
    mostrarTorneoSeleccionMensaje(`No se pudieron cargar los datos del torneo: ${error.message}`, 'red');
  });
});

/** Carga el selector de torneo y los bloques del torneo seleccionado. */
async function prepararPagina() {
  try {
    await cargarSelectorTorneo();
    await cargarBloquesTorneo(torneoSeleccionSelect.value);
  } catch (error) {
    mostrarTorneoSeleccionMensaje(`No se pudieron cargar los torneos: ${error.message}`, 'red');
  }
}

conectarSesion({ alEntrar: prepararPagina });
