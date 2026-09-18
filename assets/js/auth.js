import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const SESSION_KEY = 'bbleague_supabase_session';

function validarConfiguracion() {
  if (SUPABASE_URL.includes('TU-PROYECTO') || SUPABASE_ANON_KEY.includes('TU-CLAVE')) {
    throw new Error('Configura la URL y la anon key de Supabase en supabase-config.js.');
  }
}

async function iniciarSesion(username, password) {
  validarConfiguracion();

  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername || !password) {
    throw new Error('Introduce el usuario y la contraseña.');
  }

  const emailResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_auth_email`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ login_username: normalizedUsername })
  });

  if (!emailResponse.ok) {
    let detail = '';
    try {
      const error = await emailResponse.json();
      detail = error.message || error.details || error.hint || '';
    } catch {
      detail = await emailResponse.text();
    }
    throw new Error(detail || `No se pudo validar el usuario (HTTP ${emailResponse.status}).`);
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
    if (response.status === 429) {
      throw new Error('Demasiados intentos. Espera unos minutos antes de volver a intentarlo.');
    }
    throw new Error(data.error_description || data.msg || data.message || 'Usuario o contraseña incorrectos.');
  }

  if (!data.access_token) {
    throw new Error('El login no devolvió una sesión válida. Comprueba la confirmación del email en Supabase.');
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

  validarConfiguracion();

  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`
      }
    });
  } catch {
    return session;
  }

  if (response.ok) {
    return session;
  }

  if (session.refresh_token && (response.status === 401 || response.status === 403)) {
    const refreshResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });

    if (refreshResponse.ok) {
      const refreshedSession = await refreshResponse.json();
      localStorage.setItem(SESSION_KEY, JSON.stringify(refreshedSession));
      return refreshedSession;
    }

    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  // Mantener la sesión ante errores transitorios del servidor o de red.
  return session;
}

function cerrarSesion() {
  localStorage.removeItem(SESSION_KEY);
}

export { iniciarSesion, registrarUsuario, obtenerSesion, cerrarSesion };
