import { obtenerSesion, obtenerRoles, cerrarSesion } from './auth.js';

const MENU_CONFIG_URL = 'assets/config/menu.yml';

const menuContainer = document.getElementById('menu-container');
const currentPath = window.location.pathname.split('/').pop();
let menuConfig = { player_items: [], master_items: [] };
let menuRoles = [];
let menuLoggedIn = false;

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
 * @returns {{ player_items: Array<{ texto: string, path: string }>, master_items: Array<{ texto: string, path: string }> }}
 */
function parseMenuYaml(text) {
  const config = { player_items: [], master_items: [] };
  const lines = text.split('\n');
  let currentSection = null;
  let currentItem = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (trimmed.startsWith('#') || trimmed === '') continue;

    if (trimmed === 'player_items:' || trimmed === 'master_items:') {
      currentSection = trimmed.slice(0, -1);
      currentItem = null;
      continue;
    }

    if (!currentSection) continue;

    if (trimmed.startsWith('- ')) {
      currentItem = {};
      const content = trimmed.slice(2).trim();
      const kv = parseSimpleKeyValue(content);
      if (kv) {
        currentItem[kv.key] = kv.value;
      }
      config[currentSection].push(currentItem);
      continue;
    }

    if (trimmed.includes(':')) {
      const kv = parseSimpleKeyValue(trimmed);
      if (kv && currentItem) {
        currentItem[kv.key] = kv.value;
      }
    }
  }

  for (const section of Object.keys(config)) {
    config[section] = config[section].filter(item => item.texto && item.path);
  }
  return config;
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
    return { player_items: [], master_items: [] };
  }
}

function renderMenu() {
  if (!menuContainer) return;

  const canSeePlayerLinks = !menuLoggedIn
    || menuRoles.includes('player')
    || menuRoles.includes('master');
  const items = [
    ...(menuRoles.includes('master') ? menuConfig.master_items : []),
    ...(canSeePlayerLinks ? menuConfig.player_items : [])
  ];

  let menuHtml = '<ul>';
  items.forEach(({ texto, path }) => {
    if (path === currentPath) {
      menuHtml += `<li class="nuffle yellow menu">${texto}</li>`;
    } else {
      menuHtml += `<li><a href="${path}" class="nuffle yellow menu">${texto}</a></li>`;
    }
  });
  menuHtml += `<li id="logoutMenuItem" class="${menuLoggedIn ? '' : 'hide'}"><button type="button" id="logoutButton" class="nuffle yellow menu">Cerrar sesión</button></li>`;
  menuHtml += '</ul>';
  menuContainer.innerHTML = menuHtml;

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    cerrarSesion();
    setMenuLoggedIn(false);
    window.dispatchEvent(new Event('bbleague:logout'));
  });
}

function setMenuLoggedIn(loggedIn) {
  menuLoggedIn = loggedIn;
  renderMenu();
}

function setMenuRoles(roles) {
  menuRoles = roles;
  renderMenu();
}

cargarMenu().then(config => {
  menuConfig = config;
  renderMenu();
});

obtenerSesion().then(async session => {
  menuLoggedIn = Boolean(session);
  menuRoles = [];
  if (session) {
    try {
      menuRoles = await obtenerRoles(session);
    } catch (error) {
      console.error('Error comprobando los roles del menú:', error);
    }
  }
  renderMenu();
}).catch(error => {
  console.error('Error comprobando la sesión del menú:', error);
  menuLoggedIn = false;
  menuRoles = [];
  renderMenu();
});

export { setMenuLoggedIn, setMenuRoles };
