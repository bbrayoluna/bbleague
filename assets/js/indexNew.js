import { iniciarSesion, obtenerSesion } from './auth.js';
import { setMenuLoggedIn } from './menuNew.js';

const loginSection = document.getElementById('loginSection');
const loginForm = document.getElementById('formLogin');
const loginMensaje = document.getElementById('loginMensaje');

function mostrarLogin(visible) {
  loginSection?.classList.toggle('hide', !visible);
}

function mostrarLoginMensaje(texto, clase) {
  if (!loginMensaje) return;
  loginMensaje.textContent = texto;
  loginMensaje.className = `${clase} centered`;
}

loginForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const loginButton = loginForm.querySelector('button');

  if (loginButton) loginButton.disabled = true;
  mostrarLoginMensaje('Iniciando sesión...', 'blue');

  try {
    await iniciarSesion(username, password);
    mostrarLogin(false);
    setMenuLoggedIn(true);
    mostrarLoginMensaje('', 'blue');
  } catch (error) {
    mostrarLoginMensaje(error.message, 'red');
  } finally {
    if (loginButton) loginButton.disabled = false;
  }
});

window.addEventListener('bbleague:logout', () => {
  mostrarLogin(true);
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const session = await obtenerSesion();
    mostrarLogin(!session);
  } catch (error) {
    mostrarLogin(true);
    mostrarLoginMensaje(error.message, 'red');
  }
});
