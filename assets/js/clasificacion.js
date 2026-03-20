
// clasificacion.js
// Importa constantes y utilidades globales

import * as constants from './constants.js';
import { fetchSheet } from './main.js';

async function loadClasificacion() {
  const jsonCEquipos = await fetchSheet(constants.CLASIFICACION_EQUIPOS);
  const rowsCEquipos = jsonCEquipos.table.rows;
  const jsonEquipos = await fetchSheet(constants.CLASIFICACION);
  const rowsEquipos = jsonEquipos.table.rows;
  const jsonResul = await fetchSheet(constants.RESULTADOS);
  const rowsResul = jsonResul.table.rows;

  await procesarClasificacionParejas(rowsCEquipos,rowsResul);
  await procesarClasificacionNormal(rowsEquipos,rowsResul);
}

async function procesarClasificacionNormal(rowsInd,rowsResul) {
  const clasificacionInd = rowsInd.map(r => {
    const c = r.c || [];

    return {
      equipo: c[0]?.v || "",
      pj: Number(c[1]?.v || 0),
      pg: Number(c[2]?.v || 0),
      pe: Number(c[3]?.v || 0),
      pp: Number(c[4]?.v || 0),
      tdPlus: Number(c[5]?.v || 0),
      tdMinus: Number(c[6]?.v || 0),
      bajasPlus: Number(c[8]?.v || 0),
      bajasMinus: Number(c[9]?.v || 0),
      puntos: Number(c[10]?.v || 0)
    };
  });

  const resultadosRaw = parseResultados(rowsResul);

  // Ordenación individual
  const clasificacionOrdenada = ordenarClasificacion(clasificacionInd, resultadosRaw, false);
  const clasificacionOrdenadaEmpates = asignarPosiciones(clasificacionOrdenada, resultadosRaw, true);

  pintarClasificacion(clasificacionOrdenadaEmpates,"#clasificacion tbody");
}

// ===============================
// 1. Obtener equipo (pareja) de un jugador
// ===============================
function getEquipoDeJugador(jugador, equipos) {
  return equipos.find(eq => {
    const [vet, nov] = eq.split("-");
    return vet === jugador || nov === jugador;
  });
}

// ===============================
// 2. Parsear resultados desde Google Sheets
// ===============================
function parseResultados(rowsResul) {
  return rowsResul.map(r => ({
    equipoA: r.c?.[2]?.v,
    equipoB: r.c?.[3]?.v,
    tda: Number(r.c?.[4]?.v || 0),
    tdb: Number(r.c?.[5]?.v || 0),
    bajasA: Number(r.c?.[6]?.v || 0),
    bajasB: Number(r.c?.[7]?.v || 0)
  }));
}

// ===============================
// 3. Convertir resultados individuales → resultados por pareja
// ===============================
function mapResultadosAParejas(resultados, equipos) {
  return resultados.map(r => {
    const eqA = getEquipoDeJugador(r.equipoA, equipos);
    const eqB = getEquipoDeJugador(r.equipoB, equipos);

    return {
      equipoA: eqA,
      equipoB: eqB,
      tda: r.tda,
      tdb: r.tdb,
      bajasA: r.bajasA,
      bajasB: r.bajasB
    };
  });
}

// ===============================
// 4. Enfrentamiento directo entre parejas
// ===============================
function enfrentamientoDirecto(equipo1, equipo2, resultados) {
  let diff = 0;

  resultados.forEach(r => {
    if (r.equipoA === equipo1 && r.equipoB === equipo2) {
      diff += r.tda - r.tdb;
    }
    if (r.equipoA === equipo2 && r.equipoB === equipo1) {
      diff -= r.tda - r.tdb;
    }
  });

  return diff;
}
function enfrentamientoDirectoJugadores(j1, j2, resultados) {
  let diff = 0;

  resultados.forEach(r => {
    if (r.equipoA === j1 && r.equipoB === j2) {
      diff += r.tda - r.tdb;
    }
    if (r.equipoA === j2 && r.equipoB === j1) {
      diff -= r.tda - r.tdb;
    }
  });

  return diff;
}

// ===============================
// 5. Ordenar clasificación con tus criterios
// ===============================
function ordenarClasificacion(clasificacion, resultados, isCouples) {
  return [...clasificacion].sort((a, b) => {

    const idA = isCouples ? a.equipo : a.jugador;
    const idB = isCouples ? b.equipo : b.jugador;

    const enfrentamiento = isCouples
      ? enfrentamientoDirecto(idA, idB, resultados)
      : enfrentamientoDirectoJugadores(idA, idB, resultados);

    const tdA = a.tdPlus - a.tdMinus;
    const tdB = b.tdPlus - b.tdMinus;

    const bajasA = a.bajasPlus - a.bajasMinus;
    const bajasB = b.bajasPlus - b.bajasMinus;

    const scoreA =
      a.puntos * 1_000_000 +
      enfrentamiento * 10_000 +
      tdA * 100 +
      bajasA;

    const scoreB =
      b.puntos * 1_000_000 +
      (-enfrentamiento) * 10_000 + // invertido para el otro
      tdB * 100 +
      bajasB;

    return scoreB - scoreA;
  });
}
function asignarPosiciones(clasificacionOrdenada, resultados, isCouples) {
  let lastRank = 1;
  let lastScore = null;

  return clasificacionOrdenada.map((item, index) => {

    const id = isCouples ? item.equipo : item.jugador;

    const tdNeto = item.tdPlus - item.tdMinus;
    const bajasNetas = item.bajasPlus - item.bajasMinus;

    const score =
      item.puntos * 1_000_000 +
      tdNeto * 100 +
      bajasNetas;

    if (lastScore !== null && score === lastScore) {
      item.rank = lastRank;
    } else {
      lastRank = index + 1;
      item.rank = lastRank;
    }

    lastScore = score;
    return item;
  });
}


// ===============================
// 6. Pintar resultados en html
// ===============================
function pintarClasificacion(clasificacionOrdenada,body) {
  const tbody = document.querySelector(body);
  tbody.innerHTML = ""; // limpiar tabla

  clasificacionOrdenada.forEach((team, index) => {
    const tdDiff = team.tdPlus - team.tdMinus;
    const bajasDiff = team.bajasPlus - team.bajasMinus;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${team.equipo}</td>
      <td>${team.pj}</td>
      <td>${team.pg}</td>
      <td>${team.pe}</td>
      <td>${team.pp}</td>
      <td>${team.tdPlus}</td>
      <td>${team.tdMinus}</td>
      <td>${tdDiff}</td>
      <td>${team.bajasPlus}</td>
      <td>${team.bajasMinus}</td>
      <td>${bajasDiff}</td>
      <td>${team.puntos}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ===============================
// 6. Obtener ry procesar toda la info para mostrar clasificación ordenada
// ===============================
async function procesarClasificacionParejas(rows,rowsResul) {
  const equipos = rows
    .map(r => r.c?.[0]?.v + '-' + r.c?.[1]?.v)
    .filter(Boolean);

  const resultadosRaw = parseResultados(rowsResul);
  const resultadosParejas = mapResultadosAParejas(resultadosRaw, equipos);

  // Leer clasificación
  const clasificacion = rows.map(r => ({
    equipo: r.c?.[0]?.v + "-" + r.c?.[1]?.v,
    puntos: Number(r.c?.[11]?.v),
    pj: Number(r.c?.[2]?.v),
    pg: Number(r.c?.[3]?.v),
    pe: Number(r.c?.[4]?.v),
    pp: Number(r.c?.[5]?.v),
    tdPlus: Number(r.c?.[6]?.v),
    tdMinus: Number(r.c?.[7]?.v),
    bajasPlus: Number(r.c?.[9]?.v),
    bajasMinus: Number(r.c?.[10]?.v)
  }));

  // Orden final
  const clasificacionOrdenada = ordenarClasificacion(clasificacion, resultadosParejas, true);
  const clasificacionOrdenadaEmpates = asignarPosiciones(clasificacionOrdenada, resultadosParejas, true);
  pintarClasificacion(clasificacionOrdenadaEmpates,"#clasificacionParejas tbody");
}

document.addEventListener("DOMContentLoaded", loadClasificacion);