import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const SESSION_KEY = 'bbleague_supabase_session';

function validarConfiguracion() {
  if (SUPABASE_URL.includes('TU-PROYECTO') || SUPABASE_ANON_KEY.includes('TU-CLAVE')) {
    throw new Error('Configura la URL y la anon key de Supabase en supabase-config.js.');
  }
}

async function iniciarSesion(username, password) {
  validarConfiguracion();

  const emailResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_auth_email`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ login_username: username })
  });

  if (!emailResponse.ok) {
    throw new Error('No se pudo validar el usuario.');
  }

  const email = await emailResponse.json();
  if (!email) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.message || 'No se pudo iniciar sesión.');
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

async function registrarUsuario(username, email, password) {
  validarConfiguracion();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      data: { username }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.msg || data.message || data.error_description || 'No se pudo registrar el usuario.');
  }

  return data;
}

async function obtenerSesion() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  let session;
  try {
    session = JSON.parse(stored);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  if (!session.access_token) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  try {
    validarConfiguracion();
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  } catch {
    return null;
  }

  return session;
}

function cerrarSesion() {
  localStorage.removeItem(SESSION_KEY);
}

export { iniciarSesion, registrarUsuario, obtenerSesion, cerrarSesion };
