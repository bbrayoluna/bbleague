import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
import { iniciarSesion, registrarUsuario, obtenerSesion, cerrarSesion } from './auth.js';

const loginSection = document.getElementById('loginSection');
const masterSection = document.getElementById('masterSection');
const loginForm = document.getElementById('formLogin');
const loginMensaje = document.getElementById('loginMensaje');
const registroForm = document.getElementById('formRegistroUsuario');
const registroMensaje = document.getElementById('registroMensaje');
const logoutButton = document.getElementById('logoutButton');
const form = document.getElementById('formTorneo');
const mensaje = document.getElementById('mensaje');
const boton = form?.querySelector('button[type="submit"]');
const inscripcionForm = document.getElementById('formInscripcion');
const inscripcionMensaje = document.getElementById('inscripcionMensaje');
const torneoSelect = document.getElementById('torneoInscripcion');
const razaSelect = document.getElementById('razaInscripcion');
const resultadoForm = document.getElementById('formResultado');
const resultadoMensaje = document.getElementById('resultadoMensaje');
const partidoSelect = document.getElementById('partidoResultado');
const partidoForm = document.getElementById('formPartido');
const partidoMensaje = document.getElementById('partidoMensaje');
const rondaPartidoSelect = document.getElementById('rondaPartido');
const jugadorAPartidoSelect = document.getElementById('jugadorAPartido');
const jugadorBPartidoSelect = document.getElementById('jugadorBPartido');
const torneoClasificacionSelect = document.getElementById('torneoClasificacion');
const clasificacionContenedor = document.getElementById('clasificacionContenedor');
const clasificacionMensaje = document.getElementById('clasificacionMensaje');
const clasificacionBody = document.querySelector('#tablaClasificacion tbody');
const torneoResultadosSelect = document.getElementById('torneoResultados');
const resultadosTorneoContenedor = document.getElementById('resultadosTorneoContenedor');
const resultadosTorneoMensaje = document.getElementById('resultadosTorneoMensaje');
const resultadosTorneoBody = document.querySelector('#tablaResultadosTorneo tbody');
const rosterForm = document.getElementById('formRoster');
const rosterMensaje = document.getElementById('rosterMensaje');
const inscripcionRosterSelect = document.getElementById('inscripcionRoster');
const archivoRoster = document.getElementById('archivoRoster');
const torneoRostersSelect = document.getElementById('torneoRosters');
const rostersMensaje = document.getElementById('rostersMensaje');
const rostersBody = document.querySelector('#tablaRosters tbody');
const rondasTorneo = document.getElementById('rondasTorneo');
const anadirRondaButton = document.getElementById('anadirRonda');
const torneoGestionSelect = document.getElementById('torneoGestion');
const estadoTorneo = document.getElementById('estadoTorneo');
const gestionMensaje = document.getElementById('gestionMensaje');
const abrirInscripcionesButton = document.getElementById('abrirInscripciones');
const cerrarInscripcionesButton = document.getElementById('cerrarInscripciones');
const finalizarTorneoButton = document.getElementById('finalizarTorneo');
let session = null;

function mostrarMensaje(texto, clase) {
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.className = `${clase} centered`;
}

function mostrarLoginMensaje(texto, clase) {
  if (!loginMensaje) return;
  loginMensaje.textContent = texto;
  loginMensaje.className = `${clase} centered`;
}

function mostrarRegistroMensaje(texto, clase) {
  if (!registroMensaje) return;
  registroMensaje.textContent = texto;
  registroMensaje.className = `${clase} centered`;
}

function mostrarInscripcionMensaje(texto, clase) {
  if (!inscripcionMensaje) return;
  inscripcionMensaje.textContent = texto;
  inscripcionMensaje.className = `${clase} centered`;
}

function mostrarResultadoMensaje(texto, clase) {
  if (!resultadoMensaje) return;
  resultadoMensaje.textContent = texto;
  resultadoMensaje.className = `${clase} centered`;
}

function mostrarPartidoMensaje(texto, clase) {
  if (!partidoMensaje) return;
  partidoMensaje.textContent = texto;
  partidoMensaje.className = `${clase} centered`;
}

function mostrarClasificacionMensaje(texto, clase) {
  if (!clasificacionMensaje) return;
  clasificacionMensaje.textContent = texto;
  clasificacionMensaje.className = `${clase} centered`;
}

function mostrarResultadosTorneoMensaje(texto, clase) {
  if (!resultadosTorneoMensaje) return;
  resultadosTorneoMensaje.textContent = texto;
  resultadosTorneoMensaje.className = `${clase} centered`;
}

function mostrarRosterMensaje(texto, clase) {
  if (!rosterMensaje) return;
  rosterMensaje.textContent = texto;
  rosterMensaje.className = `${clase} centered`;
}

function mostrarRostersMensaje(texto, clase) {
  if (!rostersMensaje) return;
  rostersMensaje.textContent = texto;
  rostersMensaje.className = `${clase} centered`;
}

function mostrarGestionMensaje(texto, clase) {
  if (!gestionMensaje) return;
  gestionMensaje.textContent = texto;
  gestionMensaje.className = `${clase} centered`;
}

function mostrarAreaMaster(visible) {
  loginSection?.classList.toggle('hide', visible);
  masterSection?.classList.toggle('hide', !visible);
}

async function crearTorneo(name, year) {
  if (SUPABASE_URL.includes('TU-PROYECTO') || SUPABASE_ANON_KEY.includes('TU-CLAVE')) {
    throw new Error('Configura la URL y la anon key de Supabase en supabase-config.js.');
  }

  if (!session?.access_token) {
    throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/tournaments`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      name,
      year,
      creator_id: session.user.id,
      registration_open: true,
      status: 'active'
    })
  });

  if (!response.ok) {
    let detail = '';
    try {
      const error = await response.json();
      detail = error.message || error.details || error.hint || '';
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `Supabase respondió con HTTP ${response.status}.`);
  }

  const data = await response.json();
  return data[0];
}

function actualizarEstadoGestion(tournament) {
  if (!tournament) {
    estadoTorneo.textContent = '';
    abrirInscripcionesButton.disabled = true;
    cerrarInscripcionesButton.disabled = true;
    finalizarTorneoButton.disabled = true;
    return;
  }

  estadoTorneo.textContent = tournament.status === 'finished'
    ? 'Estado: finalizado'
    : `Estado: activo. Inscripciones: ${tournament.registration_open ? 'abiertas' : 'cerradas'}`;
  abrirInscripcionesButton.disabled = tournament.status === 'finished' || tournament.registration_open;
  cerrarInscripcionesButton.disabled = tournament.status === 'finished' || !tournament.registration_open;
  finalizarTorneoButton.disabled = tournament.status === 'finished';
}

async function cargarGestionTorneos() {
  const tournaments = await obtenerDatos(
    `tournaments?select=id,name,year,creator_id,registration_open,status,finished_at&creator_id=eq.${session.user.id}&order=year.desc,name.asc`
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

async function cambiarEstadoTorneo(changes, message) {
  const tournamentId = torneoGestionSelect.value;
  if (!tournamentId) {
    mostrarGestionMensaje('Selecciona un torneo.', 'red');
    return;
  }

  const button = document.activeElement;
  if (button) button.disabled = true;
  mostrarGestionMensaje('Guardando cambios...', 'blue');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tournaments?id=eq.${tournamentId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(changes)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.details || 'No se pudo actualizar el torneo.');
    }

    mostrarGestionMensaje(message, 'blue');
    await cargarGestionTorneos();
  } catch (error) {
    mostrarGestionMensaje(error.message, 'red');
    actualizarEstadoGestion(JSON.parse(torneoGestionSelect.selectedOptions[0]?.dataset.tournament || 'null'));
  }
}

function obtenerRondasFormulario() {
  return [...rondasTorneo.querySelectorAll('.ronda-form')].map((ronda, index) => ({
    number: index + 1,
    start_date: ronda.querySelector('[data-field="start-date"]').value,
    end_date: ronda.querySelector('[data-field="end-date"]').value,
    status: index === 0 ? 'active' : 'pending'
  }));
}

async function crearRondas(tournamentId, rounds) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rounds`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(rounds.map(round => ({
      tournament_id: tournamentId,
      ...round
    })))
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.details || 'No se pudieron crear las rondas.');
  }
}

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

function reiniciarRondas() {
  rondasTorneo.innerHTML = `
    <legend>Rondas</legend>
    <div class="ronda-form" data-ronda="1">
      <h3>Ronda 1</h3>
      <label for="inicioRonda1">Fecha de inicio</label>
      <input type="date" id="inicioRonda1" data-field="start-date" required>

      <label for="finRonda1">Fecha de fin</label>
      <input type="date" id="finRonda1" data-field="end-date" required>
    </div>
  `;
}

anadirRondaButton?.addEventListener('click', () => {
  const number = rondasTorneo.querySelectorAll('.ronda-form').length + 1;
  rondasTorneo.appendChild(nuevaRondaForm(number));
});

async function obtenerDatos(endpoint) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.details || `No se pudieron cargar los datos (${response.status}).`);
  }

  return response.json();
}

async function cargarOpcionesInscripcion() {
  const [torneos, razas] = await Promise.all([
    obtenerDatos('tournaments?select=id,name,year&status=eq.active&registration_open=eq.true&order=year.desc,name.asc'),
    obtenerDatos('races?select=id,name&active=eq.true&order=name.asc')
  ]);

  torneoSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  if (torneos.length === 0) {
    torneoSelect.innerHTML = '<option value="">No hay torneos disponibles</option>';
  }
  torneos.forEach(torneo => {
    const option = document.createElement('option');
    option.value = torneo.id;
    option.textContent = `${torneo.name} (${torneo.year})`;
    torneoSelect.appendChild(option);
  });

  razaSelect.innerHTML = '<option value="">Selecciona una raza</option>';
  if (razas.length === 0) {
    razaSelect.innerHTML = '<option value="">No hay razas disponibles</option>';
  }
  razas.forEach(raza => {
    const option = document.createElement('option');
    option.value = raza.id;
    option.textContent = raza.name;
    razaSelect.appendChild(option);
  });
}

async function cargarPartidosPendientes() {
  const [matches, registrations, users, results] = await Promise.all([
    obtenerDatos('matches?select=id,round_id,tournament_user_a_id,tournament_user_b_id&order=round_id.asc,id.asc'),
    obtenerDatos('tournament_users?select=id,user_id,team_name'),
    obtenerDatos('users?select=id,username'),
    obtenerDatos('results?select=match_id')
  ]);

  const userRegistrations = registrations.filter(registration =>
    registration.user_id === session.user.id
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

async function cargarOpcionesPartido() {
  const [rounds, registrations, users] = await Promise.all([
    obtenerDatos('rounds?select=id,number,tournament_id&order=tournament_id.asc,number.asc'),
    obtenerDatos('tournament_users?select=id,tournament_id,user_id,team_name'),
    obtenerDatos('users?select=id,username')
  ]);

  const usernameById = new Map(users.map(user => [user.id, user.username]));
  const participantLabel = registration => {
    const username = usernameById.get(registration.user_id) || 'Usuario';
    return registration.team_name ? `${username} - ${registration.team_name}` : username;
  };

  rondaPartidoSelect.innerHTML = '<option value="">Selecciona una ronda</option>';
  rounds.forEach(round => {
    const option = document.createElement('option');
    option.value = round.id;
    option.dataset.tournamentId = round.tournament_id;
    option.textContent = `Torneo ${round.tournament_id} - Ronda ${round.number}`;
    rondaPartidoSelect.appendChild(option);
  });

  function cargarJugadores(tournamentId) {
    jugadorAPartidoSelect.innerHTML = '<option value="">Selecciona jugador A</option>';
    jugadorBPartidoSelect.innerHTML = '<option value="">Selecciona jugador B</option>';

    registrations
      .filter(registration => String(registration.tournament_id) === String(tournamentId))
      .forEach(registration => {
        const label = participantLabel(registration);
        [jugadorAPartidoSelect, jugadorBPartidoSelect].forEach(select => {
          const option = document.createElement('option');
          option.value = registration.id;
          option.textContent = label;
          select.appendChild(option);
        });
      });
  }

  rondaPartidoSelect.onchange = () => {
    const selected = rondaPartidoSelect.selectedOptions[0];
    cargarJugadores(selected?.dataset.tournamentId);
  };
}

async function crearPartido(roundId, playerAId, playerBId) {
  const selectedRound = rondaPartidoSelect.selectedOptions[0];
  const response = await fetch(`${SUPABASE_URL}/rest/v1/matches`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      tournament_id: Number(selectedRound.dataset.tournamentId),
      round_id: Number(roundId),
      tournament_user_a_id: Number(playerAId),
      tournament_user_b_id: Number(playerBId),
      status: 'scheduled'
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.details || 'No se pudo crear el partido.');
  }
}

async function cargarClasificacion(tournamentId) {
  clasificacionContenedor.classList.add('hide');
  clasificacionBody.innerHTML = '';

  if (!tournamentId) {
    mostrarClasificacionMensaje('', 'blue');
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
        <td>${row.played}</td>
        <td>${row.wins}</td>
        <td>${row.draws}</td>
        <td>${row.losses}</td>
        <td>${row.points}</td>
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

async function cargarResultadosTorneo(tournamentId) {
  resultadosTorneoContenedor.classList.add('hide');
  resultadosTorneoBody.innerHTML = '';

  if (!tournamentId) {
    mostrarResultadosTorneoMensaje('', 'blue');
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

function cargarSelectorResultados() {
  torneoResultadosSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  [...torneoClasificacionSelect.options]
    .filter(option => option.value)
    .forEach(option => torneoResultadosSelect.appendChild(option.cloneNode(true)));
}

function conectarBases() {
  if (document.getElementById('basesMasterSection') || document.getElementById('basesJugadorSection')) return;

  if (form) {
    masterSection.insertAdjacentHTML('beforeend', '<h2 class="nuffle red centered">Bases del torneo</h2><form class="formulario" id="formBasesTorneo"><label>Torneo</label><select id="torneoBases" required></select><label>Archivo PDF</label><input id="archivoBases" type="file" accept="application/pdf,.pdf" required><button>Subir bases</button></form><div id="basesMensaje"></div>');
    const select = document.getElementById('torneoBases');
    obtenerDatos(`tournaments?select=id,name,year&creator_id=eq.${session.user.id}&order=year.desc,name.asc`).then(tournaments => {
      select.innerHTML = '<option value="">Selecciona un torneo</option>';
      tournaments.forEach(tournament => { select.insertAdjacentHTML('beforeend', `<option value="${tournament.id}">${tournament.name} (${tournament.year})</option>`); });
    });
    document.getElementById('formBasesTorneo').addEventListener('submit', async event => {
      event.preventDefault();
      const file = document.getElementById('archivoBases').files[0];
      const message = document.getElementById('basesMensaje');
      const button = event.currentTarget.querySelector('button');
      if (!select.value || !file || file.type !== 'application/pdf') { message.textContent = 'Selecciona un torneo y un PDF.'; return; }
      button.disabled = true;
      try {
        const path = `${select.value}/bases.pdf`;
        const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/tournament-documents/${path}`, { method: 'PUT', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, body: file });
        if (!upload.ok) throw new Error('No se pudieron subir las bases.');
        const metadata = await fetch(`${SUPABASE_URL}/rest/v1/tournament_bases?on_conflict=tournament_id`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ tournament_id: Number(select.value), file_name: file.name, storage_path: path, mime_type: 'application/pdf' }) });
        if (!metadata.ok) throw new Error('No se guardaron los datos de las bases.');
        event.currentTarget.reset(); message.textContent = 'Bases subidas correctamente.';
      } catch (error) { message.textContent = error.message; } finally { button.disabled = false; }
    });
    return;
  }

  masterSection.insertAdjacentHTML('beforeend', '<section id="basesJugadorSection"><h2 class="nuffle red centered">Bases de los torneos</h2><div id="basesJugadorMensaje"></div><div class="classification-scroll"><table id="tablaBasesJugador"><thead><tr><th>Torneo</th><th>Archivo</th><th>Fecha</th><th>Descargar</th></tr></thead><tbody></tbody></table></div></section>');
  Promise.all([obtenerDatos(`tournament_users?select=tournament_id&user_id=eq.${session.user.id}`), obtenerDatos('tournament_bases?select=tournament_id,file_name,storage_path,uploaded_at'), obtenerDatos('tournaments?select=id,name,year')]).then(([registrations, bases, tournaments]) => {
    const enrolled = new Set(registrations.map(row => String(row.tournament_id)));
    const tournamentById = new Map(tournaments.map(row => [String(row.id), row]));
    const visible = bases.filter(base => enrolled.has(String(base.tournament_id)));
    const body = document.querySelector('#tablaBasesJugador tbody');
    visible.forEach(base => { const tournament = tournamentById.get(String(base.tournament_id)); body.insertAdjacentHTML('beforeend', `<tr><td>${tournament ? `${tournament.name} (${tournament.year})` : ''}</td><td>${base.file_name}</td><td>${new Date(base.uploaded_at).toLocaleString('es-ES')}</td><td><button type="button" class="master-action descargar-bases" data-path="${base.storage_path}">Descargar</button></td></tr>`); });
    document.getElementById('basesJugadorMensaje').textContent = visible.length ? '' : 'No hay bases disponibles.';
  });
  document.querySelector('#tablaBasesJugador tbody').addEventListener('click', async event => {
    const button = event.target.closest('.descargar-bases');
    if (!button) return;
    const path = button.dataset.path.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/tournament-documents/${path}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) });
    const data = await response.json();
    const url = data.signedURL.startsWith('http') ? data.signedURL : `${SUPABASE_URL}${data.signedURL.startsWith('/storage/v1/') ? data.signedURL : `/storage/v1${data.signedURL}`}`;
    window.open(url, '_blank', 'noopener');
  });
}

async function cargarOpcionesRosters() {
  const [registrations, users, tournaments] = await Promise.all([
    obtenerDatos('tournament_users?select=id,tournament_id,user_id,team_name'),
    obtenerDatos('users?select=id,username'),
    obtenerDatos('tournaments?select=id,name,year&order=year.desc,name.asc')
  ]);

  const usernameById = new Map(users.map(user => [user.id, user.username]));
  const tournamentById = new Map(tournaments.map(tournament => [String(tournament.id), tournament]));
  const enrolledTournamentIds = new Set(
    registrations
      .filter(registration => registration.user_id === session.user.id)
      .map(registration => String(registration.tournament_id))
  );

  inscripcionRosterSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  registrations
    .filter(registration => registration.user_id === session.user.id)
    .forEach(registration => {
      const tournament = tournamentById.get(String(registration.tournament_id));
      if (!tournament) return;
      const option = document.createElement('option');
      option.value = registration.id;
      option.textContent = `${tournament.name} (${tournament.year}) - ${registration.team_name}`;
      inscripcionRosterSelect.appendChild(option);
    });

  torneoRostersSelect.innerHTML = '<option value="">Todos los torneos</option>';
  tournaments.filter(tournament => enrolledTournamentIds.has(String(tournament.id))).forEach(tournament => {
    const option = document.createElement('option');
    option.value = tournament.id;
    option.textContent = `${tournament.name} (${tournament.year})`;
    torneoRostersSelect.appendChild(option);
  });

  return { registrations, usernameById, tournamentById };
}

async function cargarRosters(tournamentId = '') {
  mostrarRostersMensaje('Cargando rosters...', 'blue');
  rostersBody.innerHTML = '';

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
    if (!tournamentId) return true;
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

  mostrarRostersMensaje(
    filteredRosters.length ? '' : 'No hay rosters disponibles.',
    filteredRosters.length ? 'blue' : 'red'
  );
}

async function subirRoster(registrationId, file) {
  const path = `${registrationId}/roster.pdf`;
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/rosters/${path}`,
    {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true'
      },
      body: file
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'No se pudo subir el archivo.');
  }

  const metadataResponse = await fetch(`${SUPABASE_URL}/rest/v1/rosters?on_conflict=tournament_user_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      tournament_user_id: Number(registrationId),
      file_name: file.name,
      storage_path: path,
      mime_type: 'application/pdf'
    })
  });

  if (!metadataResponse.ok) {
    const error = await metadataResponse.json().catch(() => ({}));
    throw new Error(error.message || error.details || 'El archivo se subió, pero no se guardaron sus datos.');
  }
}

async function descargarRoster(path) {
  const normalizedPath = String(path)
    .replace(/^\/+/, '')
    .replace(/^rosters\//, '');

  if (!/^\d+\/[^/]+$/.test(normalizedPath)) {
    throw new Error(`La ruta del roster no es válida: ${path}`);
  }

  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/rosters/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn: 3600 })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || `No se pudo preparar la descarga (HTTP ${response.status}).`);
  }

  const data = await response.json();
  const signedUrl = data.signedURL.startsWith('http')
    ? data.signedURL
    : data.signedURL.startsWith('/storage/v1/')
      ? `${SUPABASE_URL}${data.signedURL}`
      : `${SUPABASE_URL}/storage/v1${data.signedURL}`;
  window.open(signedUrl, '_blank', 'noopener');
}

async function cargarSelectorClasificacion() {
  const [registrations, tournaments] = await Promise.all([
    obtenerDatos(`tournament_users?select=tournament_id&user_id=eq.${session.user.id}`),
    obtenerDatos('tournaments?select=id,name,year&order=year.desc,name.asc')
  ]);
  const enrolledTournamentIds = new Set(
    registrations.map(registration => String(registration.tournament_id))
  );

  torneoClasificacionSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments
    .filter(tournament => enrolledTournamentIds.has(String(tournament.id)))
    .forEach(tournament => {
      const option = document.createElement('option');
      option.value = tournament.id;
      option.textContent = `${tournament.name} (${tournament.year})`;
      torneoClasificacionSelect.appendChild(option);
    });

  if (torneoClasificacionSelect.options.length === 1) {
    torneoClasificacionSelect.innerHTML = '<option value="">No estás inscrito en ningún torneo</option>';
  }
}

async function prepararInscripcion() {
  try {
    if (torneoSelect) await cargarOpcionesInscripcion();
    if (torneoClasificacionSelect) {
      await cargarSelectorClasificacion();
      cargarSelectorResultados();
    }
    if (partidoSelect) await cargarPartidosPendientes();
    if (partidoForm) await cargarOpcionesPartido();
    if (rosterForm) {
      await cargarOpcionesRosters();
      await cargarRosters();
    }
    if (torneoGestionSelect) await cargarGestionTorneos();
    conectarBases();
  } catch (error) {
    mostrarInscripcionMensaje(`No se pudieron cargar torneos y razas: ${error.message}`, 'red');
    mostrarResultadoMensaje(`No se pudieron cargar los partidos: ${error.message}`, 'red');
  }
}

async function inscribirUsuario(tournamentId, raceId, teamName) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/tournament_users`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      tournament_id: Number(tournamentId),
      user_id: session.user.id,
      race_id: Number(raceId),
      team_name: teamName
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.details || 'No se pudo completar la inscripción.');
  }
}

async function enviarResultado(matchId, touchdownsA, touchdownsB, bajasA, bajasB) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/results`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      match_id: Number(matchId),
      submitted_by: session.user.id,
      touchdowns_a: Number(touchdownsA),
      touchdowns_b: Number(touchdownsB),
      casualties_a: Number(bajasA),
      casualties_b: Number(bajasB),
      status: 'confirmed'
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.details || 'No se pudo enviar el resultado.');
  }
}

loginForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const loginButton = loginForm.querySelector('button[type="submit"]');

  loginButton.disabled = true;
  mostrarLoginMensaje('Iniciando sesión...', 'blue');

  try {
    session = await iniciarSesion(username, password);
    mostrarAreaMaster(true);
    await prepararInscripcion();
    mostrarLoginMensaje('', 'blue');
  } catch (error) {
    mostrarLoginMensaje(error.message, 'red');
  } finally {
    loginButton.disabled = false;
  }
});

torneoClasificacionSelect?.addEventListener('change', () => {
  cargarClasificacion(torneoClasificacionSelect.value);
});

torneoResultadosSelect?.addEventListener('change', () => {
  cargarResultadosTorneo(torneoResultadosSelect.value);
});

torneoGestionSelect?.addEventListener('change', () => {
  const tournament = JSON.parse(
    torneoGestionSelect.selectedOptions[0]?.dataset.tournament || 'null'
  );
  actualizarEstadoGestion(tournament);
});

abrirInscripcionesButton?.addEventListener('click', () => {
  cambiarEstadoTorneo(
    { registration_open: true },
    'Inscripciones abiertas correctamente.'
  );
});

cerrarInscripcionesButton?.addEventListener('click', () => {
  cambiarEstadoTorneo(
    { registration_open: false },
    'Inscripciones cerradas correctamente.'
  );
});

finalizarTorneoButton?.addEventListener('click', () => {
  if (!window.confirm('¿Quieres dar por finalizado este torneo?')) return;
  cambiarEstadoTorneo(
    { status: 'finished', registration_open: false, finished_at: new Date().toISOString() },
    'Torneo finalizado correctamente.'
  );
});

torneoRostersSelect?.addEventListener('change', () => {
  cargarRosters(torneoRostersSelect.value).catch(error => {
    mostrarRostersMensaje(`No se pudieron cargar los rosters: ${error.message}`, 'red');
  });
});

rostersBody?.addEventListener('click', async event => {
  const button = event.target.closest('.descargar-roster');
  if (!button) return;

  button.disabled = true;
  try {
    await descargarRoster(button.dataset.path);
  } catch (error) {
    mostrarRostersMensaje(error.message, 'red');
  } finally {
    button.disabled = false;
  }
});

rosterForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const registrationId = inscripcionRosterSelect.value;
  const file = archivoRoster.files[0];
  const uploadButton = rosterForm.querySelector('button[type="submit"]');

  if (!registrationId || !file) {
    mostrarRosterMensaje('Selecciona un torneo y un archivo PDF.', 'red');
    return;
  }

  if (file.type !== 'application/pdf') {
    mostrarRosterMensaje('El roster debe estar en formato PDF.', 'red');
    return;
  }

  uploadButton.disabled = true;
  mostrarRosterMensaje('Subiendo roster...', 'blue');

  try {
    await subirRoster(registrationId, file);
    rosterForm.reset();
    await cargarRosters(torneoRostersSelect.value);
    mostrarRosterMensaje('Roster subido correctamente.', 'blue');
  } catch (error) {
    console.error('Error al subir el roster:', error);
    mostrarRosterMensaje(error.message, 'red');
  } finally {
    uploadButton.disabled = false;
  }
});

partidoForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const partidoButton = partidoForm.querySelector('button[type="submit"]');
  const roundId = rondaPartidoSelect.value;
  const playerAId = jugadorAPartidoSelect.value;
  const playerBId = jugadorBPartidoSelect.value;

  if (!roundId || !playerAId || !playerBId) {
    mostrarPartidoMensaje('Completa todos los campos.', 'red');
    return;
  }

  if (playerAId === playerBId) {
    mostrarPartidoMensaje('Los jugadores deben ser distintos.', 'red');
    return;
  }

  partidoButton.disabled = true;
  mostrarPartidoMensaje('Añadiendo partido...', 'blue');

  try {
    await crearPartido(roundId, playerAId, playerBId);
    partidoForm.reset();
    jugadorAPartidoSelect.innerHTML = '<option value="">Selecciona jugador A</option>';
    jugadorBPartidoSelect.innerHTML = '<option value="">Selecciona jugador B</option>';
    mostrarPartidoMensaje('Partido añadido correctamente.', 'blue');
    await cargarPartidosPendientes();
  } catch (error) {
    console.error('Error al crear el partido:', error);
    mostrarPartidoMensaje(error.message, 'red');
  } finally {
    partidoButton.disabled = false;
  }
});

inscripcionForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const inscripcionButton = inscripcionForm.querySelector('button[type="submit"]');
  const torneoId = torneoSelect.value;
  const razaId = razaSelect.value;
  const teamName = document.getElementById('nombreEquipo').value.trim();

  if (!torneoId || !razaId || !teamName) {
    mostrarInscripcionMensaje('Completa todos los campos.', 'red');
    return;
  }

  inscripcionButton.disabled = true;
  mostrarInscripcionMensaje('Formalizando inscripción...', 'blue');

  try {
    await inscribirUsuario(torneoId, razaId, teamName);
    inscripcionForm.reset();
    mostrarInscripcionMensaje('Inscripción realizada correctamente.', 'blue');
  } catch (error) {
    console.error('Error al inscribirse:', error);
    mostrarInscripcionMensaje(error.message, 'red');
  } finally {
    inscripcionButton.disabled = false;
  }
});

resultadoForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const resultadoButton = resultadoForm.querySelector('button[type="submit"]');
  const partidoId = partidoSelect.value;
  const touchdownsA = document.getElementById('touchdownsA').value;
  const touchdownsB = document.getElementById('touchdownsB').value;
  const bajasA = document.getElementById('bajasA').value;
  const bajasB = document.getElementById('bajasB').value;

  if (!partidoId || [touchdownsA, touchdownsB, bajasA, bajasB].some(value => value === '')) {
    mostrarResultadoMensaje('Completa todos los campos.', 'red');
    return;
  }

  resultadoButton.disabled = true;
  mostrarResultadoMensaje('Enviando resultado...', 'blue');

  try {
    await enviarResultado(partidoId, touchdownsA, touchdownsB, bajasA, bajasB);
    resultadoForm.reset();
    await cargarPartidosPendientes();
    mostrarResultadoMensaje('Resultado enviado correctamente.', 'blue');
  } catch (error) {
    console.error('Error al enviar el resultado:', error);
    mostrarResultadoMensaje(error.message, 'red');
  } finally {
    resultadoButton.disabled = false;
  }
});

registroForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const username = document.getElementById('registroUsername').value.trim();
  const email = document.getElementById('registroEmail').value.trim();
  const password = document.getElementById('registroPassword').value;
  const confirmacion = document.getElementById('registroPasswordConfirmacion').value;
  const registroButton = registroForm.querySelector('button[type="submit"]');

  if (password !== confirmacion) {
    mostrarRegistroMensaje('Las contraseñas no coinciden.', 'red');
    return;
  }

  registroButton.disabled = true;
  mostrarRegistroMensaje('Registrando usuario...', 'blue');

  try {
    await registrarUsuario(username, email, password);
    registroForm.reset();
    mostrarRegistroMensaje(
      'Usuario registrado. Revisa el email de confirmación si Supabase lo solicita y después inicia sesión.',
      'blue'
    );
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    mostrarRegistroMensaje(`No se pudo registrar el usuario: ${error.message}`, 'red');
  } finally {
    registroButton.disabled = false;
  }
});

logoutButton?.addEventListener('click', () => {
  cerrarSesion();
  session = null;
  form?.reset();
  mostrarAreaMaster(false);
});

form?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const nombre = document.getElementById('nombreTorneo').value.trim();
  const ano = Number(document.getElementById('anoTorneo').value);
  const rondas = obtenerRondasFormulario();

  if (!nombre || !Number.isInteger(ano) || ano < 2000 || ano > 2100
    || rondas.some(ronda => ronda.end_date < ronda.start_date)) {
    mostrarMensaje('Revisa el nombre, el año y las fechas de las rondas.', 'red');
    return;
  }

  boton.disabled = true;
  mostrarMensaje('Creando torneo...', 'blue');

  try {
    const torneo = await crearTorneo(nombre, ano);
    if (!torneo?.id) {
      throw new Error('Supabase no devolvió el identificador del torneo.');
    }
    await crearRondas(torneo.id, rondas);
    mostrarMensaje('Torneo creado correctamente.', 'blue');
    form.reset();
    reiniciarRondas();
    await prepararInscripcion();
  } catch (error) {
    console.error('Error al crear el torneo:', error);
    mostrarMensaje(`No se pudo crear el torneo: ${error.message}`, 'red');
  } finally {
    boton.disabled = false;
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    session = await obtenerSesion();
    mostrarAreaMaster(Boolean(session));
    if (session) {
      await prepararInscripcion();
    }
  } catch (error) {
    mostrarAreaMaster(false);
    mostrarLoginMensaje(error.message, 'red');
  }
});
