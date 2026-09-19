import { obtenerSesion, cerrarSesion } from './auth.js';

const MENU_CONFIG_URL = 'assets/config/menu.yml';

const menuContainer = document.getElementById('menu-container');
const currentPath = window.location.pathname.split('/').pop();

/**
 * Extrae la primera pareja key: value de una línea (el separador son los
 * dos puntos; el valor es todo lo que hay a continuación, incluyendo
 * espacios). Así "texto: Master" se parsea como { texto: "Master" }.
 * @param {string} text
 * @returns {{ key: string, value: string } | null}
 */
function parseSimpleKeyValue(text) {
  const colonIndex = text.indexOf(':');
  if (colonIndex === -1) return null;
  const key = text.slice(0, colonIndex).trim();
  const value = text.slice(colonIndex + 1).trim();
  if (!key) return null;
  return { key, value };
}

/**
 * Parsea YAML simple (solo soporta la estructura de menu.yml).
 * @param {string} text
 * @returns {{ items: Array<{ texto: string, path: string }> }}
 */
function parseMenuYaml(text) {
  const items = [];
  const lines = text.split('\n');
  let inItems = false;
  let currentItem = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (trimmed.startsWith('#') || trimmed === '') continue;

    if (trimmed === 'items:') {
      inItems = true;
      continue;
    }

    if (!inItems) continue;

    if (trimmed.startsWith('- ')) {
      // Nueva entrada: el resto de la línea contiene la primera pareja
      // key: value (p.ej. "texto: Master"). Se crea la entrada y se guarda
      // como referencia activa para que las siguientes líneas le añadan
      // las demás propiedades (p.ej. "path: master.html").
      currentItem = {};
      const content = trimmed.slice(2).trim();
      const kv = parseSimpleKeyValue(content);
      if (kv) {
        currentItem[kv.key] = kv.value;
      }
      items.push(currentItem);
      continue;
    }

    if (trimmed.includes(':')) {
      // Propiedad adicional de la entrada actual (p.ej. "path: master.html")
      const kv = parseSimpleKeyValue(trimmed);
      if (kv && currentItem) {
        currentItem[kv.key] = kv.value;
      }
    }
  }

  // Solo se devuelven las entradas completas (texto y path).
  return { items: items.filter(item => item.texto && item.path) };
}

async function cargarMenu() {
  try {
    const response = await fetch(MENU_CONFIG_URL);
    if (!response.ok) {
      throw new Error(`No se pudo cargar la configuración del menú (${response.status}).`);
    }
    const text = await response.text();
    return parseMenuYaml(text);
  } catch (error) {
    console.error('Error cargando el menú:', error);
    return { items: [] };
  }
}

function renderMenu(items) {
  if (!menuContainer) return;

  let menuHtml = '<ul>';
  items.forEach(({ texto, path }) => {
    if (path === currentPath) {
      menuHtml += `<li class="nuffle yellow menu">${texto}</li>`;
    } else {
      menuHtml += `<li><a href="${path}" class="nuffle yellow menu">${texto}</a></li>`;
    }
  });
  menuHtml += '<li id="logoutMenuItem" class="hide"><button type="button" id="logoutButton" class="nuffle yellow menu">Cerrar sesión</button></li>';
  menuHtml += '</ul>';
  menuContainer.innerHTML = menuHtml;

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    cerrarSesion();
    setMenuLoggedIn(false);
    window.dispatchEvent(new Event('bbleague:logout'));
  });
}

function setMenuLoggedIn(loggedIn) {
  document.getElementById('logoutMenuItem')?.classList.toggle('hide', !loggedIn);
}

cargarMenu().then(config => renderMenu(config.items));

obtenerSesion()
  .then(session => setMenuLoggedIn(Boolean(session)))
  .catch(() => setMenuLoggedIn(false));

export { setMenuLoggedIn };
