/**
 * jugadoresNew.js
 * Lógica exclusiva de jugadoresNew.html: inscribirse en un torneo, subir el
 * resultado de los partidos propios y subir el roster del equipo.
 * Todo lo compartido está en commons.js.
 */
import {
  botonFormulario,
  conectarSesion,
  crearMensaje,
  enviarDatos,
  getSesion,
  obtenerDatos,
  subirArchivo
} from './commons.js';
import { inicializarFormularioResultados } from './resultados.js';

// --- Elementos de la página -------------------------------------------------

const inscripcionForm = document.getElementById('formInscripcion');
const mostrarInscripcionMensaje = crearMensaje('inscripcionMensaje');
const torneoSelect = document.getElementById('torneoInscripcion');
const razaSelect = document.getElementById('razaInscripcion');

const mostrarResultadoMensaje = crearMensaje('resultadoMensaje');
const cargarPartidosPendientes = inicializarFormularioResultados({ alcance: 'participante' });

const rosterForm = document.getElementById('formRoster');
const mostrarRosterMensaje = crearMensaje('rosterMensaje');
const inscripcionRosterSelect = document.getElementById('inscripcionRoster');
const archivoRoster = document.getElementById('archivoRoster');

/** Indica, por inscripción, si el torneo admite subir o sustituir el roster. */
const rostersAbiertosPorInscripcion = new Map();

/** Añade opciones a un selector a partir de una lista de valores. */
function rellenarSelect(select, opciones, textoPorDefecto, textoVacio) {
  select.innerHTML = `<option value="">${opciones.length ? textoPorDefecto : textoVacio}</option>`;
  opciones.forEach(({ value, text }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  });
}

// --- Inscripción ------------------------------------------------------------

/** Rellena los selectores de torneo (inscripción abierta) y de raza. */
async function cargarOpcionesInscripcion() {
  const [torneos, razas] = await Promise.all([
    obtenerDatos('tournaments?select=id,name,year&status=eq.active&registration_open=eq.true&order=year.desc,name.asc'),
    obtenerDatos('races?select=id,name&active=eq.true&order=name.asc')
  ]);

  rellenarSelect(
    torneoSelect,
    torneos.map(torneo => ({ value: torneo.id, text: `${torneo.name} (${torneo.year})` })),
    'Selecciona un torneo',
    'No hay torneos disponibles'
  );

  rellenarSelect(
    razaSelect,
    razas.map(raza => ({ value: raza.id, text: raza.name })),
    'Selecciona una raza',
    'No hay razas disponibles'
  );
}

/** Inscribe al usuario conectado en un torneo con una raza y un equipo. */
async function inscribirUsuario(tournamentId, raceId, teamName) {
  await enviarDatos('tournament_users', {
    body: {
      tournament_id: Number(tournamentId),
      user_id: getSesion().user.id,
      race_id: Number(raceId),
      team_name: teamName
    }
  });
}

inscripcionForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const boton = botonFormulario(inscripcionForm);
  const torneoId = torneoSelect.value;
  const razaId = razaSelect.value;
  const teamName = document.getElementById('nombreEquipo').value.trim();

  if (!torneoId || !razaId || !teamName) {
    mostrarInscripcionMensaje('Completa todos los campos.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarInscripcionMensaje('Formalizando inscripción...', 'blue');

  try {
    await inscribirUsuario(torneoId, razaId, teamName);
    inscripcionForm.reset();
    mostrarInscripcionMensaje('Inscripción realizada correctamente.', 'blue');
  } catch (error) {
    console.error('Error al inscribirse:', error);
    mostrarInscripcionMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Subir roster -----------------------------------------------------------

/**
 * Rellena el selector con las inscripciones del usuario conectado. Los torneos
 * que han cerrado los rosters se marcan en la etiqueta y no se pueden subir.
 */
async function cargarOpcionesRosters() {
  const [registrations, tournaments] = await Promise.all([
    obtenerDatos('tournament_users?select=id,tournament_id,user_id,team_name'),
    obtenerDatos('tournaments?select=id,name,year,rosters_open&order=year.desc,name.asc')
  ]);

  const tournamentById = new Map(tournaments.map(tournament => [String(tournament.id), tournament]));

  rostersAbiertosPorInscripcion.clear();
  inscripcionRosterSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  registrations
    .filter(registration => registration.user_id === getSesion().user.id)
    .forEach(registration => {
      const tournament = tournamentById.get(String(registration.tournament_id));
      if (!tournament) return;

      const rostersAbiertos = tournament.rosters_open !== false;
      rostersAbiertosPorInscripcion.set(String(registration.id), rostersAbiertos);

      const option = document.createElement('option');
      option.value = registration.id;
      option.textContent = `${tournament.name} (${tournament.year}) - ${registration.team_name}`
        + (rostersAbiertos ? '' : ' - rosters cerrados');
      inscripcionRosterSelect.appendChild(option);
    });
}

/** Sube el PDF del roster y guarda su ficha en Supabase. */
async function subirRoster(registrationId, archivo) {
  const ruta = `${registrationId}/roster.pdf`;
  await subirArchivo('rosters', ruta, archivo, { method: 'PUT' });
  await enviarDatos('rosters?on_conflict=tournament_user_id', {
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      tournament_user_id: Number(registrationId),
      file_name: archivo.name,
      storage_path: ruta,
      mime_type: 'application/pdf'
    }
  });
}

rosterForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const boton = botonFormulario(rosterForm);
  const registrationId = inscripcionRosterSelect.value;
  const archivo = archivoRoster.files[0];

  if (!registrationId || !archivo) {
    mostrarRosterMensaje('Selecciona un torneo y un archivo PDF.', 'red');
    return;
  }

  if (archivo.type !== 'application/pdf') {
    mostrarRosterMensaje('El roster debe estar en formato PDF.', 'red');
    return;
  }

  if (rostersAbiertosPorInscripcion.get(String(registrationId)) === false) {
    mostrarRosterMensaje('El torneo ha cerrado los rosters. Contacta con el organizador.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarRosterMensaje('Subiendo roster...', 'blue');

  try {
    await subirRoster(registrationId, archivo);
    rosterForm.reset();
    mostrarRosterMensaje('Roster subido correctamente.', 'blue');
  } catch (error) {
    console.error('Error al subir el roster:', error);
    mostrarRosterMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Arranque ---------------------------------------------------------------

/** Carga los selectores que necesita jugadoresNew.html tras iniciar sesión. */
async function prepararPagina() {
  await Promise.all([
    cargarOpcionesInscripcion().catch(error => {
      mostrarInscripcionMensaje(`No se pudieron cargar torneos y razas: ${error.message}`, 'red');
    }),
    cargarPartidosPendientes().catch(error => {
      mostrarResultadoMensaje(`No se pudieron cargar los partidos: ${error.message}`, 'red');
    }),
    cargarOpcionesRosters().catch(error => {
      mostrarRosterMensaje(`No se pudieron cargar tus inscripciones: ${error.message}`, 'red');
    })
  ]);
}

conectarSesion({ alEntrar: prepararPagina });
