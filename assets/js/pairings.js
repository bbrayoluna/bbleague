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
            <th>Equipo A</th>
            <th>TD</th>
            <th>TD</th>
            <th>Equipo B</th>
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

// Construye un id único de pareja
function pairId(row) {
  return `${row.c[0].v}::${row.c[1].v}`;
}

// Mapa jugador -> id de pareja
function buildPlayerToPairMap(rankingRows) {
  const map = new Map();
  for (const row of rankingRows) {
    const id = pairId(row);
    map.set(row.c[0].v, id);
    map.set(row.c[1].v, id);
  }
  return map;
}

// Conjunto de emparejamientos ya jugados (por pareja)
function buildPlayedPairsSet(rankingRows, resultadosRows) {
  const playerToPair = buildPlayerToPairMap(rankingRows);
  const played = new Set();

  for (const r of resultadosRows) {
    if (!r.c) continue;

    const equipoA = r.c[2]?.v; // Columna C
    const equipoB = r.c[3]?.v; // Columna D
    if (!equipoA || !equipoB) continue;

    const pairA = playerToPair.get(equipoA);
    const pairB = playerToPair.get(equipoB);
    if (!pairA || !pairB || pairA === pairB) continue;

    const key = [pairA, pairB].sort().join(" vs ");
    played.add(key);
  }

  return played;
}


function getVal(row, idx) {
  return row.c?.[idx]?.v ?? 0;
}

// Orden suizo usando solo RankingSuizo (columnas gviz)
function sortSwiss(rankingRows) {
  return [...rankingRows].sort((a, b) =>
    getVal(b, 2) - getVal(a, 2) || // Puntos
    getVal(b, 3) - getVal(a, 3) || // TD Diff
    getVal(b, 4) - getVal(a, 4) || // TD+
    getVal(b, 5) - getVal(a, 5) || // Bajas+
    getVal(b, 6) - getVal(a, 6) || // %Victorias
    getVal(b, 7) - getVal(a, 7) || // OMW%
    getVal(b, 8) - getVal(a, 8) || // SOS
    getVal(b, 9) - getVal(a, 9)    // SOSOS
  );
}


// Generar emparejamientos suizos evitando repetidos
function generarEmparejamientos(rankingRows, resultadosRows) {
  const ordenadas = sortSwiss(rankingRows);
  const played = buildPlayedPairsSet(rankingRows, resultadosRows);

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
      const key = [pairId(p1), pairId(p2)].sort().join(" vs ");

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
        parejaA: ordenadas[i],
        parejaB: ordenadas[rivalIndex]
      });
    } else {
      // ESTA PAREJA QUEDA LIBRE
      desparejado = ordenadas[i];
    }
  }

  return { emparejamientos, desparejado };
}
function renderDesparejado(p) {
  const maestro = p.c[0].v;
  const padawan = p.c[1].v;

  return `
    <table class="match-table">
      <tr>
        <td class="match-label match-header" rowspan="2">
          Sin rival
        </td>
        <td class="match-line">
          ${maestro}
        </td>
      </tr>
      <tr>
        <td class="match-line">
          ${padawan}
        </td>
      </tr>
    </table>
    <br>
  `;
}


// Pintar tabla HTML
function renderEmparejamientosTable(emparejamientos) {
  let html = "";

  emparejamientos.forEach((emp, index) => {
    const maestroA = emp.parejaA.c[0].v;
    const padawanA = emp.parejaA.c[1].v;
    const maestroB = emp.parejaB.c[0].v;
    const padawanB = emp.parejaB.c[1].v;

    let linea1 = "";
    let linea2 = "";

    // 🔥 LÓGICA SEGÚN JORNADA
    if (JORNADA === 1 || JORNADA === 2) {
      linea1 = `${maestroA} vs ${padawanB}`;
      linea2 = `${maestroB} vs ${padawanA}`;
    } else if (JORNADA === 3 || JORNADA === 4) {
      linea1 = `${maestroA} vs ${maestroB}`;
      linea2 = `${padawanA} vs ${padawanB}`;
    } else {
      // fallback por si acaso
      linea1 = `${maestroA} vs ${padawanB}`;
      linea2 = `${maestroB} vs ${padawanA}`;
    }

    html += `
      <table class="match-table">
        <tr>
          <td class="match-label match-header" rowspan="2">
            Match ${index + 1}
          </td>
          <td class="match-line">${linea1}</td>
        </tr>
        <tr>
          <td class="match-line">${linea2}</td>
        </tr>
      </table>
      <br>
    `;
  });

  return html;
}


function loadPairings(resultados, rankingSuizo) {
  const { emparejamientos, desparejado } = generarEmparejamientos(rankingSuizo, resultados);

  let html = renderEmparejamientosTable(emparejamientos);

  if (desparejado) {
    html += renderDesparejado(desparejado);
  }

  document.getElementById("emparejamientos").innerHTML = html;
}


function loadCurrent(equiposRows) {
  let html = "";

  equiposRows.forEach((r, index) => {
    const maestroA = r.c[0].v;
    const padawanA = r.c[1].v;
    const maestroB = r.c[2].v;
    const padawanB = r.c[3].v;

    let linea1 = "";
    let linea2 = "";

    // 🔥 LÓGICA SEGÚN JORNADA
    if (JORNADA === 1 || JORNADA === 2) {
      linea1 = `${maestroA} vs ${padawanB}`;
      linea2 = `${maestroB} vs ${padawanA}`;
    } else if (JORNADA === 3 || JORNADA === 4) {
      linea1 = `${maestroA} vs ${maestroB}`;
      linea2 = `${padawanA} vs ${padawanB}`;
    } else {
      // fallback por si acaso
      linea1 = `${maestroA} vs ${padawanB}`;
      linea2 = `${maestroB} vs ${padawanA}`;
    }

    html += `
      <table class="match-table">
        <tr>
          <td class="match-label match-header" rowspan="2">
            Match ${index + 1}
          </td>
          <td class="match-line">${linea1}</td>
        </tr>
        <tr>
          <td class="match-line">${linea2}</td>
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
  const jsonRS = await fetchSheet(constants.RANKING_SUIZO);
  const rowsRs = jsonRS.table.rows;
  const jsonConf = await fetchSheet(constants.CONFIG);
  const rowsConf = jsonConf.table.rows;
  const jsonEquipos = await fetchSheet(constants.EQUIPOS);
  const rowsEquipos = jsonEquipos.table.rows;
  await loadResultados(rowsResultados);
  JORNADA = rowsConf[0].c[1].v;
  if (mostrarNextMatch(rowsConf)) {
    await loadPairings(rowsResultados, rowsRs);
    document.getElementById("nextMatch").classList.remove("hide");
  }
  if (mostrarCurrentMatch(rowsConf)) {
    await loadCurrent(rowsEquipos);
    document.getElementById("currentMatch").classList.remove("hide");
  }
  await loadRonda();
  ocultarOverlay();
});