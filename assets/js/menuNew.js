import { obtenerSesion, cerrarSesion } from './auth.js';

const MENU_CONFIG_URL = 'assets/config/menu.yml';

const menuContainer = document.getElementById('menu-container');
const currentPath = window.location.pathname.split('/').pop();

/**
 * Parsea YAML simple (solo soporta la estructura de menu.yml).
 * @param {string} text
 * @returns {{ items: Array<{ texto: string, path: string }> }}
 */
function parseMenuYaml(text) {
  const items = [];
  const lines = text.split('\n');
  let inItems = false;

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
      const item = {};
      const content = trimmed.slice(2).trim();
      const parts = content.split(/\s+/);
      for (const part of parts) {
        const [key, ...valueParts] = part.split(':');
        if (key && valueParts.length > 0) {
          item[key] = valueParts.join(':').trim();
        }
      }
      if (item.texto && item.path) {
        items.push({ texto: item.texto, path: item.path });
      }
    } else if (trimmed.includes(':')) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        const [key, ...valueParts] = trimmed.split(':');
        if (key && valueParts.length > 0) {
          lastItem[key.trim()] = valueParts.join(':').trim();
        }
      }
    }
  }

  return { items };
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
