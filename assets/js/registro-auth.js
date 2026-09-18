import { registrarUsuario } from './auth.js';

const form = document.getElementById('formRegistroPublico');
const mensaje = document.getElementById('registroMensaje');

form.addEventListener('submit', async event => {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmation = document.getElementById('passwordConfirmacion').value;
  const button = form.querySelector('button');
  if (password !== confirmation) { mensaje.textContent = 'Las contraseñas no coinciden.'; return; }
  button.disabled = true;
  try { await registrarUsuario(username, email, password); form.reset(); mensaje.textContent = 'Usuario registrado correctamente.'; }
  catch (error) { mensaje.textContent = `No se pudo registrar: ${error.message}`; }
  finally { button.disabled = false; }
});
