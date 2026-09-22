/**
 * registroNew.js
 * Alta de usuario desde registroNew.html. El menú lateral y los mensajes de
 * estado vienen de commons.js.
 */
import { registrarUsuario } from './auth.js';
import { botonFormulario, crearMensaje } from './commons.js';

const formRegistro = document.getElementById('formRegistroPublico');
const mostrarRegistroMensaje = crearMensaje('registroMensaje');

formRegistro?.addEventListener('submit', async event => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmacion = document.getElementById('passwordConfirmacion').value;
  const boton = botonFormulario(formRegistro);

  if (password !== confirmacion) {
    mostrarRegistroMensaje('Las contraseñas no coinciden.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarRegistroMensaje('Registrando usuario...', 'blue');

  try {
    await registrarUsuario(username, email, password);
    formRegistro.reset();
    mostrarRegistroMensaje('Usuario registrado correctamente.', 'blue');
  } catch (error) {
    mostrarRegistroMensaje(`No se pudo registrar: ${error.message}`, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});
