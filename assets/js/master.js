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
    mostrarLoginMensaje('', 'blue');
  } catch (error) {
    mostrarLoginMensaje(error.message, 'red');
  } finally {
    loginButton.disabled = false;
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
  } catch (error) {
    mostrarAreaMaster(false);
    mostrarLoginMensaje(error.message, 'red');
  }
});
