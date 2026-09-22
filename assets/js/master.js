/**
 * master.js
 * Lógica exclusiva de master.html: crear torneos con sus rondas, gestionar su
 * estado (abrir y cerrar inscripciones y finalizarlo), subir las bases en PDF
 * y añadir partidos. Todo lo compartido está en commons.js.
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

// --- Elementos de la página -------------------------------------------------

const formTorneo = document.getElementById('formTorneo');
const botonCrearTorneo = botonFormulario(formTorneo);
const mostrarTorneoMensaje = crearMensaje('mensaje');
const rondasTorneo = document.getElementById('rondasTorneo');
const anadirRondaButton = document.getElementById('anadirRonda');

const torneoGestionSelect = document.getElementById('torneoGestion');
const estadoTorneo = document.getElementById('estadoTorneo');
const mostrarGestionMensaje = crearMensaje('gestionMensaje');
const abrirInscripcionesButton = document.getElementById('abrirInscripciones');
const cerrarInscripcionesButton = document.getElementById('cerrarInscripciones');
const finalizarTorneoButton = document.getElementById('finalizarTorneo');

const partidoForm = document.getElementById('formPartido');
const mostrarPartidoMensaje = crearMensaje('partidoMensaje');
const rondaPartidoSelect = document.getElementById('rondaPartido');
const jugadorAPartidoSelect = document.getElementById('jugadorAPartido');
const jugadorBPartidoSelect = document.getElementById('jugadorBPartido');

const basesForm = document.getElementById('formBasesTorneo');
const torneoBasesSelect = document.getElementById('torneoBases');
const archivoBases = document.getElementById('archivoBases');
const mostrarBasesMensaje = crearMensaje('basesMensaje');

// --- Crear torneo -----------------------------------------------------------

/** Crea el torneo en Supabase y devuelve la fila creada. */
async function crearTorneo(name, year) {
  const [torneo] = await enviarDatos('tournaments', {
    body: {
      name,
      year,
      creator_id: getSesion().user.id,
      registration_open: true,
      status: 'active'
    }
  });
  return torneo;
}

/** Guarda en Supabase las rondas de un torneo recién creado. */
async function crearRondas(tournamentId, rounds) {
  await enviarDatos('rounds', {
    body: rounds.map(round => ({ tournament_id: tournamentId, ...round }))
  });
}

/** Lee las fechas de las rondas que hay ahora mismo en el formulario. */
function obtenerRondasFormulario() {
  return [...rondasTorneo.querySelectorAll('.ronda-form')].map((ronda, index) => ({
    number: index + 1,
    start_date: ronda.querySelector('[data-field="start-date"]').value,
    end_date: ronda.querySelector('[data-field="end-date"]').value,
    status: index === 0 ? 'active' : 'pending'
  }));
}

/** Construye el bloque de fechas de una ronda nueva. */
function nuevaRondaForm(number) {
  const ronda = document.createElement('div');
  ronda.className = 'ronda-form';
  ronda.dataset.ronda = number;
  ronda.innerHTML = `
    <h3>Ronda ${number}</h3>
    <label for="inicioRonda${number}">Fecha de inicio</label>
    <input type="date" id="inicioRonda${number}" data-field="start-date" required>

    <label for="finRonda${number}">Fecha de fin</label>
    <input type="date" id="finRonda${number}" data-field="end-date" required>
  `;
  return ronda;
}

/** Deja el formulario de rondas con una única ronda vacía. */
function reiniciarRondas() {
  rondasTorneo.innerHTML = '<legend>Rondas</legend>';
  rondasTorneo.appendChild(nuevaRondaForm(1));
}

anadirRondaButton?.addEventListener('click', () => {
  const number = rondasTorneo.querySelectorAll('.ronda-form').length + 1;
  rondasTorneo.appendChild(nuevaRondaForm(number));
});

// --- Gestionar torneo -------------------------------------------------------

/** Devuelve los datos del torneo elegido en el selector de gestión. */
function torneoSeleccionado() {
  return JSON.parse(torneoGestionSelect.selectedOptions[0]?.dataset.tournament || 'null');
}

/** Refresca el texto de estado y los botones disponibles del torneo elegido. */
function actualizarEstadoGestion(tournament) {
  if (!tournament) {
    estadoTorneo.textContent = '';
    abrirInscripcionesButton.disabled = true;
    cerrarInscripcionesButton.disabled = true;
    finalizarTorneoButton.disabled = true;
    return;
  }

  estadoTorneo.textContent = tournament.status === 'finished'
    ? 'Estado: finalizado'
    : `Estado: activo. Inscripciones: ${tournament.registration_open ? 'abiertas' : 'cerradas'}`;
  abrirInscripcionesButton.disabled = tournament.status === 'finished' || tournament.registration_open;
  cerrarInscripcionesButton.disabled = tournament.status === 'finished' || !tournament.registration_open;
  finalizarTorneoButton.disabled = tournament.status === 'finished';
}

/** Rellena el selector con los torneos creados por el usuario conectado. */
async function cargarGestionTorneos() {
  const tournaments = await obtenerDatos(
    `tournaments?select=id,name,year,creator_id,registration_open,status,finished_at&creator_id=eq.${getSesion().user.id}&order=year.desc,name.asc`
  );

  torneoGestionSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments.forEach(tournament => {
    const option = document.createElement('option');
    option.value = tournament.id;
    option.textContent = `${tournament.name} (${tournament.year})`;
    option.dataset.tournament = JSON.stringify(tournament);
    torneoGestionSelect.appendChild(option);
  });

  actualizarEstadoGestion(null);
}

/**
 * Cambia el estado del torneo elegido (abrir/cerrar inscripciones, finalizar).
 * @param {object} changes campos que se actualizan en la tabla tournaments
 * @param {string} mensajeExito texto que se muestra si el cambio va bien
 */
async function cambiarEstadoTorneo(changes, mensajeExito) {
  const tournamentId = torneoGestionSelect.value;
  if (!tournamentId) {
    mostrarGestionMensaje('Selecciona un torneo.', 'red');
    return;
  }

  const button = document.activeElement;
  if (button) button.disabled = true;
  mostrarGestionMensaje('Guardando cambios...', 'blue');

  try {
    await enviarDatos(`tournaments?id=eq.${tournamentId}`, { method: 'PATCH', body: changes });
    mostrarGestionMensaje(mensajeExito, 'blue');
    await cargarGestionTorneos();
  } catch (error) {
    mostrarGestionMensaje(error.message, 'red');
    actualizarEstadoGestion(torneoSeleccionado());
  }
}

torneoGestionSelect?.addEventListener('change', () => {
  actualizarEstadoGestion(torneoSeleccionado());
});

abrirInscripcionesButton?.addEventListener('click', () => {
  cambiarEstadoTorneo({ registration_open: true }, 'Inscripciones abiertas correctamente.');
});

cerrarInscripcionesButton?.addEventListener('click', () => {
  cambiarEstadoTorneo({ registration_open: false }, 'Inscripciones cerradas correctamente.');
});

finalizarTorneoButton?.addEventListener('click', () => {
  if (!window.confirm('¿Quieres dar por finalizado este torneo?')) return;
  cambiarEstadoTorneo(
    { status: 'finished', registration_open: false, finished_at: new Date().toISOString() },
    'Torneo finalizado correctamente.'
  );
});

// --- Añadir partido ---------------------------------------------------------

/**
 * Rellena el selector de rondas y, al elegir una, los jugadores del torneo
 * al que pertenece.
 */
async function cargarOpcionesPartido() {
  const [rounds, registrations, users] = await Promise.all([
    obtenerDatos('rounds?select=id,number,tournament_id&order=tournament_id.asc,number.asc'),
    obtenerDatos('tournament_users?select=id,tournament_id,user_id,team_name'),
    obtenerDatos('users?select=id,username')
  ]);

  const usernameById = new Map(users.map(user => [user.id, user.username]));
  const etiquetaParticipante = registration => {
    const username = usernameById.get(registration.user_id) || 'Usuario';
    return registration.team_name ? `${username} - ${registration.team_name}` : username;
  };

  rondaPartidoSelect.innerHTML = '<option value="">Selecciona una ronda</option>';
  rounds.forEach(round => {
    const option = document.createElement('option');
    option.value = round.id;
    option.dataset.tournamentId = round.tournament_id;
    option.textContent = `Torneo ${round.tournament_id} - Ronda ${round.number}`;
    rondaPartidoSelect.appendChild(option);
  });

  function cargarJugadores(tournamentId) {
    jugadorAPartidoSelect.innerHTML = '<option value="">Selecciona jugador A</option>';
    jugadorBPartidoSelect.innerHTML = '<option value="">Selecciona jugador B</option>';

    registrations
      .filter(registration => String(registration.tournament_id) === String(tournamentId))
      .forEach(registration => {
        const label = etiquetaParticipante(registration);
        [jugadorAPartidoSelect, jugadorBPartidoSelect].forEach(select => {
          const option = document.createElement('option');
          option.value = registration.id;
          option.textContent = label;
          select.appendChild(option);
        });
      });
  }

  rondaPartidoSelect.onchange = () => {
    const selected = rondaPartidoSelect.selectedOptions[0];
    cargarJugadores(selected?.dataset.tournamentId);
  };
}

/** Guarda un partido nuevo entre dos inscripciones del mismo torneo. */
async function crearPartido(roundId, playerAId, playerBId) {
  const selectedRound = rondaPartidoSelect.selectedOptions[0];
  await enviarDatos('matches', {
    body: {
      tournament_id: Number(selectedRound.dataset.tournamentId),
      round_id: Number(roundId),
      tournament_user_a_id: Number(playerAId),
      tournament_user_b_id: Number(playerBId),
      status: 'scheduled'
    }
  });
}

partidoForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const boton = botonFormulario(partidoForm);
  const roundId = rondaPartidoSelect.value;
  const playerAId = jugadorAPartidoSelect.value;
  const playerBId = jugadorBPartidoSelect.value;

  if (!roundId || !playerAId || !playerBId) {
    mostrarPartidoMensaje('Completa todos los campos.', 'red');
    return;
  }

  if (playerAId === playerBId) {
    mostrarPartidoMensaje('Los jugadores deben ser distintos.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarPartidoMensaje('Añadiendo partido...', 'blue');

  try {
    await crearPartido(roundId, playerAId, playerBId);
    partidoForm.reset();
    jugadorAPartidoSelect.innerHTML = '<option value="">Selecciona jugador A</option>';
    jugadorBPartidoSelect.innerHTML = '<option value="">Selecciona jugador B</option>';
    mostrarPartidoMensaje('Partido añadido correctamente.', 'blue');
  } catch (error) {
    console.error('Error al crear el partido:', error);
    mostrarPartidoMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Bases del torneo -------------------------------------------------------

/** Rellena el selector del formulario de bases con los torneos del usuario. */
async function cargarOpcionesBases() {
  const tournaments = await obtenerDatos(
    `tournaments?select=id,name,year&creator_id=eq.${getSesion().user.id}&order=year.desc,name.asc`
  );

  torneoBasesSelect.innerHTML = '<option value="">Selecciona un torneo</option>';
  tournaments.forEach(tournament => {
    const option = document.createElement('option');
    option.value = tournament.id;
    option.textContent = `${tournament.name} (${tournament.year})`;
    torneoBasesSelect.appendChild(option);
  });
}

/**
 * Sube el PDF de bases del torneo indicado y guarda su ficha.
 *
 * La ruta empieza por el id numérico del torneo porque la política RLS de
 * Storage hace split_part(name,'/',1)::bigint: si el primer segmento no es un
 * número, PostgreSQL falla al convertir el nombre del torneo a bigint.
 */
async function subirBases(tournamentId, archivo) {
  const ruta = `${tournamentId}/bases.pdf`;
  await subirArchivo('tournament-documents', ruta, archivo);
  await enviarDatos('tournament_bases?on_conflict=tournament_id', {
    prefer: 'resolution=merge-duplicates',
    body: {
      tournament_id: Number(tournamentId),
      file_name: archivo.name,
      storage_path: ruta,
      mime_type: 'application/pdf'
    }
  });
}

basesForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const archivo = archivoBases.files[0];
  const boton = botonFormulario(basesForm);

  if (!torneoBasesSelect.value || !archivo || archivo.type !== 'application/pdf') {
    mostrarBasesMensaje('Selecciona un torneo y un PDF.', 'red');
    return;
  }

  if (boton) boton.disabled = true;
  mostrarBasesMensaje('Subiendo bases...', 'blue');

  try {
    await subirBases(Number(torneoBasesSelect.value), archivo);
    basesForm.reset();
    mostrarBasesMensaje('Bases subidas correctamente.', 'blue');
  } catch (error) {
    mostrarBasesMensaje(error.message, 'red');
  } finally {
    if (boton) boton.disabled = false;
  }
});

// --- Crear torneo (formulario) ----------------------------------------------

formTorneo?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!formTorneo.checkValidity()) {
    formTorneo.reportValidity();
    return;
  }

  const nombre = document.getElementById('nombreTorneo').value.trim();
  const ano = Number(document.getElementById('anoTorneo').value);
  const rondas = obtenerRondasFormulario();

  if (!nombre || !Number.isInteger(ano) || ano < 2000 || ano > 2100
    || rondas.some(ronda => ronda.end_date < ronda.start_date)) {
    mostrarTorneoMensaje('Revisa el nombre, el año y las fechas de las rondas.', 'red');
    return;
  }

  if (botonCrearTorneo) botonCrearTorneo.disabled = true;
  mostrarTorneoMensaje('Creando torneo...', 'blue');

  try {
    const torneo = await crearTorneo(nombre, ano);
    if (!torneo?.id) {
      throw new Error('Supabase no devolvió el identificador del torneo.');
    }

    await crearRondas(torneo.id, rondas);
    mostrarTorneoMensaje('Torneo creado correctamente.', 'blue');
    formTorneo.reset();
    reiniciarRondas();
    await prepararPagina();
  } catch (error) {
    console.error('Error al crear el torneo:', error);
    mostrarTorneoMensaje(`No se pudo crear el torneo: ${error.message}`, 'red');
  } finally {
    if (botonCrearTorneo) botonCrearTorneo.disabled = false;
  }
});

// --- Arranque ---------------------------------------------------------------

/** Carga los selectores que necesita master.html tras iniciar sesión. */
async function prepararPagina() {
  await Promise.all([
    cargarGestionTorneos().catch(error => {
      mostrarGestionMensaje(`No se pudieron cargar los torneos: ${error.message}`, 'red');
    }),
    cargarOpcionesPartido().catch(error => {
      mostrarPartidoMensaje(`No se pudieron cargar las rondas: ${error.message}`, 'red');
    }),
    cargarOpcionesBases().catch(error => {
      mostrarBasesMensaje(`No se pudieron cargar los torneos: ${error.message}`, 'red');
    })
  ]);
}

conectarSesion({
  alEntrar: prepararPagina,
  alSalir: () => formTorneo?.reset()
});
