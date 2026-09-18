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
const boton = form.querySelector('button[type="submit"]');
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
const rondasTorneo = document.getElementById('rondasTorneo');
const anadirRondaButton = document.getElementById('anadirRonda');
let session = null;

function mostrarMensaje(texto, clase) {
  mensaje.textContent = texto;
  mensaje.className = `${clase} centered`;
}

function mostrarLoginMensaje(texto, clase) {
  loginMensaje.textContent = texto;
  loginMensaje.className = `${clase} centered`;
}

function mostrarRegistroMensaje(texto, clase) {
  registroMensaje.textContent = texto;
  registroMensaje.className = `${clase} centered`;
}

function mostrarInscripcionMensaje(texto, clase) {
  inscripcionMensaje.textContent = texto;
  inscripcionMensaje.className = `${clase} centered`;
}

function mostrarResultadoMensaje(texto, clase) {
  resultadoMensaje.textContent = texto;
  resultadoMensaje.className = `${clase} centered`;
}

function mostrarPartidoMensaje(texto, clase) {
  partidoMensaje.textContent = texto;
  partidoMensaje.className = `${clase} centered`;
}

function mostrarClasificacionMensaje(texto, clase) {
  clasificacionMensaje.textContent = texto;
  clasificacionMensaje.className = `${clase} centered`;
}

function mostrarAreaMaster(visible) {
  loginSection.classList.toggle('hide', visible);
  masterSection.classList.toggle('hide', !visible);
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
    body: JSON.stringify({ name, year })
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

anadirRondaButton.addEventListener('click', () => {
  const number = rondasTorneo.querySelectorAll('.ronda-form').length + 1;
  rondasTorneo.appendChild(nuevaRondaForm(number));
});

async function obtenerDatos(endpoint) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
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
    obtenerDatos('tournaments?select=id,name,year&order=year.desc,name.asc'),
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
      `classification?select=rank,username,race_name,played,wins,draws,losses,points,touchdown_difference,casualty_difference&tournament_id=eq.${tournamentId}&order=rank.asc`
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

function cargarSelectorClasificacion() {
  torneoClasificacionSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  [...torneoSelect.options]
    .filter(option => option.value)
    .forEach(option => torneoClasificacionSelect.appendChild(option.cloneNode(true)));
}

async function prepararInscripcion() {
  try {
    await cargarOpcionesInscripcion();
    cargarSelectorClasificacion();
    await cargarPartidosPendientes();
    await cargarOpcionesPartido();
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

loginForm.addEventListener('submit', async event => {
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

torneoClasificacionSelect.addEventListener('change', () => {
  cargarClasificacion(torneoClasificacionSelect.value);
});

partidoForm.addEventListener('submit', async event => {
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

inscripcionForm.addEventListener('submit', async event => {
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

resultadoForm.addEventListener('submit', async event => {
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

registroForm.addEventListener('submit', async event => {
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

logoutButton.addEventListener('click', () => {
  cerrarSesion();
  session = null;
  form.reset();
  mostrarAreaMaster(false);
});

form.addEventListener('submit', async event => {
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
