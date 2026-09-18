// pairings.js
// Importa constantes y utilidades globales
import * as constants from './constants.js';
import { fetchSheet, mostrarOverlay, ocultarOverlay, loadRonda  } from './main.js';
let JORNADA = 0;

async function loadResultados(rows) {
  const valor = rows?.[0]?.c?.[0]?.v ?? "";

	if (valor === "ignorar") {
		return;
	} 

  const jornadas = {};

  rows.forEach(r => {
    if (!r.c) return;

    const jornada = r.c[1]?.v;   // Columna B
    const equipoA = r.c[2]?.v;   // Columna C
    const equipoB = r.c[3]?.v;   // Columna D
    const tdA = r.c[4]?.v;       // Columna E
    const tdB = r.c[5]?.v;       // Columna F

    if (!jornada) return;

    if (!jornadas[jornada]) jornadas[jornada] = [];
    jornadas[jornada].push({ equipoA, equipoB, tdA, tdB });
  });

  const cont = document.getElementById("resultados");
  cont.innerHTML = "";

  Object.keys(jornadas)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(j => {

      // Cabecera plegable
      const header = document.createElement("div");
      header.className = "jornada-header";
      header.textContent = `Jornada ${j} ▼`;

      // Contenedor plegable
      const contenido = document.createElement("div");
      contenido.className = "jornada-contenido";

      // Tabla de resultados
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Jugador A</th>
            <th>TD</th>
            <th>TD</th>
            <th>Jugador B</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody");

      jornadas[j].forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.equipoA ?? ""}</td>
          <td>${p.tdA ?? ""}</td>
          <td>${p.tdB ?? ""}</td>
          <td>${p.equipoB ?? ""}</td>
        `;
        tbody.appendChild(tr);
      });

      contenido.appendChild(table);

      // Evento de plegado/desplegado
      header.addEventListener("click", () => {
        const visible = contenido.style.display === "block";
        contenido.style.display = visible ? "none" : "block";
        header.textContent = visible ? `Jornada ${j} ▼` : `Jornada ${j} ▲`;
      });

      cont.appendChild(header);
      cont.appendChild(contenido);
    });
}

function getValue(row, index) {
  return row.c?.[index]?.v ?? 0;
}

// La clasificación ya contiene un jugador por fila.
function buildPlayers(classificationRows) {
  return classificationRows
    .map(row => ({
      name: getValue(row, 0),
      matches: getValue(row, 1),
      wins: getValue(row, 2),
      draws: getValue(row, 3),
      tdFor: getValue(row, 5),
      tdDiff: getValue(row, 7),
      casualties: getValue(row, 8),
      points: getValue(row, 10)
    }))
    .filter(player => player.name);
}

function playerKey(playerA, playerB) {
  return [playerA, playerB].sort().join(" vs ");
}

// Conjunto de enfrentamientos individuales ya jugados.
function buildPlayedPairsSet(resultadosRows) {
  const played = new Set();

  for (const r of resultadosRows) {
    if (!r.c) continue;

    const equipoA = r.c[2]?.v; // Columna C
    const equipoB = r.c[3]?.v; // Columna D
    if (!equipoA || !equipoB) continue;

    if (equipoA === equipoB) continue;
    played.add(playerKey(equipoA, equipoB));
  }

  return played;
}


// Orden suizo con los criterios disponibles en Clasificacion.
function sortSwiss(classificationRows) {
  return buildPlayers(classificationRows).sort((a, b) =>
    Number(b.points) - Number(a.points) ||
    Number(b.tdDiff) - Number(a.tdDiff) ||
    Number(b.tdFor) - Number(a.tdFor) ||
    Number(b.casualties) - Number(a.casualties) ||
    Number(b.wins) - Number(a.wins) ||
    Number(a.matches) - Number(b.matches) ||
    String(a.name).localeCompare(String(b.name))
  );
}


// Generar emparejamientos suizos evitando repetidos
function generarEmparejamientos(classificationRows, resultadosRows) {
  const ordenadas = sortSwiss(classificationRows);
  const played = buildPlayedPairsSet(resultadosRows);

  const usadas = new Set();
  const emparejamientos = [];
  let desparejado = null;

  for (let i = 0; i < ordenadas.length; i++) {
    if (usadas.has(i)) continue;

    const p1 = ordenadas[i];
    let rivalIndex = -1;

    for (let j = i + 1; j < ordenadas.length; j++) {
      if (usadas.has(j)) continue;

      const p2 = ordenadas[j];
      const key = playerKey(p1.name, p2.name);

      if (!played.has(key)) {
        rivalIndex = j;
        break;
      }
    }

    if (rivalIndex === -1) {
      for (let j = i + 1; j < ordenadas.length; j++) {
        if (!usadas.has(j)) {
          rivalIndex = j;
          break;
        }
      }
    }

    if (rivalIndex !== -1) {
      usadas.add(i);
      usadas.add(rivalIndex);
      emparejamientos.push({
        jugadorA: ordenadas[i],
        jugadorB: ordenadas[rivalIndex]
      });
    } else {
      // ESTA PAREJA QUEDA LIBRE
      desparejado = ordenadas[i];
    }
  }

  return { emparejamientos, desparejado };
}
function renderDesparejado(p) {
  return `
    <table class="match-table">
      <tr>
        <td class="match-label match-header">Sin rival</td>
        <td class="match-line">${p.name}</td>
      </tr>
    </table>
    <br>
  `;
}


// Pintar tabla HTML
function renderEmparejamientosTable(emparejamientos) {
  let html = "";

  emparejamientos.forEach((emp, index) => {
    html += `
      <table class="match-table">
        <tr>
          <td class="match-label match-header">Match ${index + 1}</td>
          <td class="match-line">${emp.jugadorA.name} vs ${emp.jugadorB.name}</td>
        </tr>
      </table>
      <br>
    `;
  });

  return html;
}


function loadPairings(resultados, clasificacion) {
  const { emparejamientos, desparejado } = generarEmparejamientos(clasificacion, resultados);

  let html = renderEmparejamientosTable(emparejamientos);

  if (desparejado) {
    html += renderDesparejado(desparejado);
  }

  document.getElementById("emparejamientos").innerHTML = html;
}


function loadCurrent(equiposRows) {
  let html = "";

  const partidos = [];
  equiposRows.forEach(row => {
    const jugadores = row.c?.map(cell => cell?.v).filter(Boolean) ?? [];
    for (let i = 0; i + 1 < jugadores.length; i += 2) {
      partidos.push([jugadores[i], jugadores[i + 1]]);
    }
  });

  partidos.forEach(([jugadorA, jugadorB], index) => {
    html += `
      <table class="match-table">
        <tr>
          <td class="match-label match-header">Match ${index + 1}</td>
          <td class="match-line">${jugadorA} vs ${jugadorB}</td>
        </tr>
      </table>
      <br>
    `;
  });

  document.getElementById("emparejamientoActual").innerHTML = html;
}

function mostrarNextMatch(config) {
	const showNextMatch=config[2].c[1].v;
	if(showNextMatch===1){
		return true;
	}
	return false;
}
function mostrarCurrentMatch(config) {
	const showCurrentMatch=config[7].c[1].v;
	if(showCurrentMatch===1){
		return true;
	}
	return false;
}

// Hacer mostrarOverlay y ocultarOverlay accesibles globalmente
window.mostrarOverlay = mostrarOverlay;
window.ocultarOverlay = ocultarOverlay;

document.addEventListener("DOMContentLoaded", async () => {
  mostrarOverlay();
  const jsonResultados = await fetchSheet(constants.RESULTADOS);
  const rowsResultados = jsonResultados.table.rows;
  const jsonClasificacion = await fetchSheet(constants.CLASIFICACION);
  const rowsClasificacion = jsonClasificacion.table.rows;
  const jsonConf = await fetchSheet(constants.CONFIG);
  const rowsConf = jsonConf.table.rows;
  const jsonEquipos = await fetchSheet(constants.EQUIPOS);
  const rowsEquipos = jsonEquipos.table.rows;
  await loadResultados(rowsResultados);
  JORNADA = rowsConf[0].c[1].v;
  if (mostrarNextMatch(rowsConf)) {
    await loadPairings(rowsResultados, rowsClasificacion);
    document.getElementById("nextMatch").classList.remove("hide");
  }
  if (mostrarCurrentMatch(rowsConf)) {
    await loadCurrent(rowsEquipos);
    document.getElementById("currentMatch").classList.remove("hide");
  }
  await loadRonda();
  ocultarOverlay();
});