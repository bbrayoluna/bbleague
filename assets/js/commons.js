/**
 * commons.js
 * Código compartido por las páginas nuevas: indexNew, registroNew,
 * jugadoresNew, torneosNew y master.
 *
 * Aquí viven:
 *  - el estado de la sesión de Supabase (una única copia por página),
 *  - las peticiones a la API de Supabase (REST y Storage),
 *  - el formulario de login con la restauración de la sesión al cargar,
 *  - utilidades de interfaz: mensajes de estado, botones de formulario,
 *    mostrar/ocultar el área privada y descargas firmadas.
 *
 * El menú lateral lo carga menuNew.js, que se importa desde este módulo, así
 * que cada página solo necesita incluir su propio script.
 *
 * Cada página decide qué hacer cuando hay sesión pasando `alEntrar` a
 * conectarSesion().
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
import { iniciarSesion, obtenerSesion } from './auth.js';
import { setMenuLoggedIn } from './menuNew.js';

// --- Sesión -----------------------------------------------------------------

let sesionActual = null;

/** Devuelve la sesión de Supabase activa (o null si no hay). */
function getSesion() {
  return sesionActual;
}

/** Guarda en memoria la sesión activa. */
function setSesion(sesion) {
  sesionActual = sesion;
}

/** Token con el que se firman las peticiones; sin sesión vale la anon key. */
function tokenAcceso() {
  return sesionActual?.access_token || SUPABASE_ANON_KEY;
}

/** Comprueba que supabase-config.js tiene datos reales y no las plantillas. */
function validarConfiguracion() {
  if (SUPABASE_URL.includes('TU-PROYECTO') || SUPABASE_ANON_KEY.includes('TU-CLAVE')) {
    throw new Error('Configura la URL y la anon key de Supabase en supabase-config.js.');
  }
}

/** Comprueba que hay sesión antes de escribir o de descargar archivos privados. */
function validarSesion() {
  if (!sesionActual?.access_token) {
    throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');
  }
}

// --- Peticiones a Supabase --------------------------------------------------

/** Traduce la respuesta de error de Supabase a un mensaje legible. */
async function describirError(response, mensajePorDefecto) {
  try {
    const error = await response.clone().json();
    return error.message || error.details || error.hint || error.msg
      || error.error_description || error.error || mensajePorDefecto;
  } catch {
    return mensajePorDefecto;
  }
}

/**
 * Lee datos de Supabase (PostgREST) con las cabeceras de sesión.
 * @param {string} endpoint ruta relativa, p.ej. 'tournaments?select=id,name'
 * @returns {Promise<any>} JSON devuelto por Supabase
 */
async function obtenerDatos(endpoint) {
  validarConfiguracion();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tokenAcceso()}`
    }
  });

  if (!response.ok) {
    throw new Error(await describirError(response, `No se pudieron cargar los datos (${response.status}).`));
  }

  return response.json();
}

/**
 * Escribe datos en Supabase (insert, update o upsert).
 * @param {string} endpoint ruta relativa, p.ej. 'tournaments'
 * @param {{ method?: string, body?: object, prefer?: string }} opciones
 * @returns {Promise<any>} filas devueltas por Supabase (o null si no devuelve nada)
 */
async function enviarDatos(endpoint, { method = 'POST', body, prefer = 'return=representation' } = {}) {
  validarConfiguracion();
  validarSesion();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tokenAcceso()}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await describirError(response, 'No se pudieron guardar los datos.'));
  }

  // Con un Prefer sin 'return=representation' Supabase responde 204 sin cuerpo.
  const texto = await response.text();
  return texto ? JSON.parse(texto) : null;
}

/**
 * Sube (o reemplaza) un archivo en un bucket de Supabase Storage.
 * @param {string} bucket 'rosters' o 'tournament-documents'
 * @param {string} ruta ruta dentro del bucket, p.ej. '12/bases.pdf'
 * @param {File} archivo archivo elegido en el formulario
 * @param {{ method?: string, contentType?: string }} opciones
 */
async function subirArchivo(bucket, ruta, archivo, { method = 'POST', contentType = 'application/pdf' } = {}) {
  validarConfiguracion();
  validarSesion();

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${ruta}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tokenAcceso()}`,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: archivo
  });

  if (!response.ok) {
    throw new Error(await describirError(response, `No se pudo subir el archivo (HTTP ${response.status}).`));
  }
}

/**
 * Firma un archivo privado de Storage y lo abre en una pestaña nueva.
 * @param {string} bucket 'rosters' o 'tournament-documents'
 * @param {string} ruta ruta del archivo (puede empezar por el nombre del bucket)
 * @param {{ validar?: (ruta: string) => void }} opciones
 */
async function abrirArchivoFirmado(bucket, ruta, { validar } = {}) {
  validarConfiguracion();
  validarSesion();

  const rutaNormalizada = quitarPrefijoBucket(bucket, ruta);
  validar?.(rutaNormalizada);

  const rutaCodificada = rutaNormalizada.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${rutaCodificada}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tokenAcceso()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn: 3600 })
  });

  if (!response.ok) {
    throw new Error(await describirError(response, `No se pudo preparar la descarga (HTTP ${response.status}).`));
  }

  const { signedURL } = await response.json();
  window.open(urlAbsoluta(signedURL), '_blank', 'noopener');
}

/** Quita las barras iniciales y el nombre del bucket del principio de la ruta. */
function quitarPrefijoBucket(bucket, ruta) {
  const sinBarrasIniciales = String(ruta).replace(/^\/+/, '');
  const prefijo = `${bucket}/`;
  return sinBarrasIniciales.startsWith(prefijo)
    ? sinBarrasIniciales.slice(prefijo.length)
    : sinBarrasIniciales;
}

/** Convierte el signedURL relativo de Supabase en una URL absoluta. */
function urlAbsoluta(signedURL) {
  if (signedURL.startsWith('http')) return signedURL;
  if (signedURL.startsWith('/storage/v1/')) return `${SUPABASE_URL}${signedURL}`;
  return `${SUPABASE_URL}/storage/v1${signedURL}`;
}

// --- Utilidades de interfaz -------------------------------------------------

/**
 * Escribe un mensaje de estado en un elemento.
 * @param {HTMLElement|null} elemento
 * @param {string} texto
 * @param {'red'|'blue'} clase rojo para errores, azul para avisos
 */
function mostrarMensaje(elemento, texto, clase = 'blue') {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.className = `${clase} centered`;
}

/**
 * Crea la función que escribe los mensajes de estado de un bloque de la página.
 * @param {string|HTMLElement|null} destino id del elemento o el propio elemento
 * @returns {(texto: string, clase?: 'red'|'blue') => void}
 */
function crearMensaje(destino) {
  const elemento = typeof destino === 'string' ? document.getElementById(destino) : destino;
  return (texto, clase = 'blue') => mostrarMensaje(elemento, texto, clase);
}

/** Devuelve el botón de envío de un formulario para deshabilitarlo mientras guarda. */
function botonFormulario(formulario) {
  return formulario?.querySelector('button[type="submit"], button:not([type])');
}

/** Muestra la sección privada (#masterSection) y oculta la de login. */
function mostrarAreaPrivada(visible) {
  document.getElementById('loginSection')?.classList.toggle('hide', visible);
  document.getElementById('masterSection')?.classList.toggle('hide', !visible);
}

/**
 * Conecta el formulario de login, la restauración de la sesión al cargar y el
 * cierre de sesión del menú.
 * @param {{ alEntrar?: () => Promise<void>|void, alSalir?: () => void }} opciones
 *   alEntrar: se ejecuta cuando hay sesión (tras mostrar el área privada).
 *   alSalir: se ejecuta al cerrar sesión, para limpiar formularios, etc.
 */
function conectarSesion({ alEntrar = () => {}, alSalir = () => {} } = {}) {
  const loginForm = document.getElementById('formLogin');
  const mostrarLoginMensaje = crearMensaje('loginMensaje');

  loginForm?.querySelector('button')?.setAttribute('type', 'submit');

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const boton = botonFormulario(loginForm);

    if (boton) boton.disabled = true;
    mostrarLoginMensaje('Iniciando sesión...', 'blue');

    try {
      setSesion(await iniciarSesion(username, password));
      mostrarAreaPrivada(true);
      setMenuLoggedIn(true);
      await alEntrar();
      mostrarLoginMensaje('', 'blue');
    } catch (error) {
      mostrarLoginMensaje(error.message, 'red');
    } finally {
      if (boton) boton.disabled = false;
    }
  });

  window.addEventListener('bbleague:logout', () => {
    setSesion(null);
    mostrarAreaPrivada(false);
    alSalir();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      setSesion(await obtenerSesion());
      mostrarAreaPrivada(Boolean(sesionActual));
      setMenuLoggedIn(Boolean(sesionActual));
      if (sesionActual) await alEntrar();
    } catch (error) {
      setSesion(null);
      mostrarAreaPrivada(false);
      setMenuLoggedIn(false);
      mostrarLoginMensaje(error.message, 'red');
    }
  });
}

export {
  getSesion,
  setSesion,
  obtenerDatos,
  enviarDatos,
  subirArchivo,
  abrirArchivoFirmado,
  mostrarMensaje,
  crearMensaje,
  botonFormulario,
  mostrarAreaPrivada,
  conectarSesion
};

