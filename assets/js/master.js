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

  return response.json();
}

async function obtenerDatos(endpoint) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    throw new Error(`No se pudieron cargar los datos (${response.status}).`);
  }

  return response.json();
}

async function cargarOpcionesInscripcion() {
  const [torneos, razas] = await Promise.all([
    obtenerDatos('tournaments?select=id,name,year&order=year.desc,name.asc'),
    obtenerDatos('races?select=id,name&active=eq.true&order=name.asc')
  ]);

  torneoSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  torneos.forEach(torneo => {
    const option = document.createElement('option');
    option.value = torneo.id;
    option.textContent = `${torneo.name} (${torneo.year})`;
    torneoSelect.appendChild(option);
  });

  razaSelect.innerHTML = '<option value="">Selecciona una raza</option>';
  razas.forEach(raza => {
    const option = document.createElement('option');
    option.value = raza.id;
    option.textContent = raza.name;
    razaSelect.appendChild(option);
  });
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
    await cargarOpcionesInscripcion();
    mostrarLoginMensaje('', 'blue');
  } catch (error) {
    mostrarLoginMensaje(error.message, 'red');
  } finally {
    loginButton.disabled = false;
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

  const nombre = document.getElementById('nombreTorneo').value.trim();
  const ano = Number(document.getElementById('anoTorneo').value);

  if (!nombre || !Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    mostrarMensaje('Revisa el nombre y el año del torneo.', 'red');
    return;
  }

  boton.disabled = true;
  mostrarMensaje('Creando torneo...', 'blue');

  try {
    await crearTorneo(nombre, ano);
    mostrarMensaje('Torneo creado correctamente.', 'blue');
    form.reset();
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
      await cargarOpcionesInscripcion();
    }
  } catch (error) {
    mostrarAreaMaster(false);
    mostrarLoginMensaje(error.message, 'red');
  }
});
