const form = document.getElementById('formTorneo');
const mensaje = document.getElementById('mensaje');

form.addEventListener('submit', event => {
  event.preventDefault();

  const nombre = document.getElementById('nombreTorneo').value.trim();
  const ano = Number(document.getElementById('anoTorneo').value);

  if (!nombre || !Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    mensaje.textContent = 'Revisa el nombre y el año del torneo.';
    mensaje.className = 'red centered';
    return;
  }

  mensaje.textContent = 'Formulario correcto. La creación persistente se conectará a Supabase en el siguiente paso.';
  mensaje.className = 'blue centered';
});
