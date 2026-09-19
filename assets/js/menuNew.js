import { obtenerSesion, cerrarSesion } from './auth.js';

const MENU_ITEMS = [
  { texto: 'Master', path: 'master.html' },
  { texto: 'Jugadores', path: 'jugadoresNew.html' },
  { texto: 'Registro', path: 'registroNew.html' }
];

const menuContainer = document.getElementById('menu-container');
const currentPath = window.location.pathname.split('/').pop();

function renderMenu() {
  if (!menuContainer) return;

  let menuHtml = '<ul>';
  MENU_ITEMS.forEach(({ texto, path }) => {
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

renderMenu();

obtenerSesion()
  .then(session => setMenuLoggedIn(Boolean(session)))
  .catch(() => setMenuLoggedIn(false));

export { setMenuLoggedIn };
