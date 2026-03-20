
// clasificacion.js
// Importa constantes y utilidades globales

import * as constants from './constants.js';
import { fetchSheet } from './main.js';

async function loadClasificacionParejas() {
  await procesarClasificacion();
  await loadClasificacionNormal();
  const json = await fetchSheet(constants.TABLA_ORDENADA_EQUIPOS);
  const rows = json.table.rows;
  const tbody = document.querySelector("#clasificacionParejas tbody");
  tbody.innerHTML = "";
  rows.forEach((row, index) => {
    if (!row.c) return;
    const tr = document.createElement("tr");
    const pos = document.createElement("td");
    pos.textContent = index + 1;
    tr.appendChild(pos);
    const get = (i) => row.c[i] ? row.c[i].v : "";
    const cols = [
      get(0) + '-' + get(1), get(2), get(3), get(4), get(5), get(6), get(7), get(8), get(9), get(10), get(9) - get(10), get(11)
    ];
    cols.forEach(v => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function loadClasificacionNormal() {
  const json = await fetchSheet(constants.TABLA_ORDENADA);
  const rows = json.table.rows;
  const tbody = document.querySelector("#clasificacion tbody");
  tbody.innerHTML = "";
  rows.forEach((row, index) => {
    if (!row.c) return;
    const tr = document.createElement("tr");
    const pos = document.createElement("td");
    pos.textContent = index + 1;
    tr.appendChild(pos);
    const get = (i) => row.c[i] ? row.c[i].v : "";
    const cols = [
      get(0), get(1), get(2), get(3), get(4), get(5), get(6), get(7), get(8), get(9), get(8) - get(9), get(10)
    ];
    cols.forEach(v => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
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

// ===============================
// 5. Ordenar clasificación con tus criterios
// ===============================
function ordenarClasificacion(clasificacion, resultados) {
  return [...clasificacion].sort((a, b) => {

    // 1. Puntos
    if (b.puntos !== a.puntos) {
      return b.puntos - a.puntos;
    }

    // 2. Enfrentamiento directo
    const ed = enfrentamientoDirecto(a.equipo, b.equipo, resultados);
    if (ed !== 0) {
      return -ed; // positivo → gana A
    }

    // 3. TD netos
    const tdA = a.tdPlus - a.tdMinus;
    const tdB = b.tdPlus - b.tdMinus;
    if (tdA !== tdB) {
      return tdB - tdA;
    }

    // 4. Bajas netas
    const bajasA = a.bajasPlus - a.bajasMinus;
    const bajasB = b.bajasPlus - b.bajasMinus;
    if (bajasA !== bajasB) {
      return bajasB - bajasA;
    }

    return 0;
  });
}

// ===============================
// 6. Ejemplo de uso con tus lecturas del Sheet
// ===============================
async function procesarClasificacion() {
  // Leer equipos (tal como ya lo haces)
  const json = await fetchSheet(constants.CLASIFICACION_EQUIPOS);
  const rows = json.table.rows;
  const equipos = rows
    .map(r => r.c?.[1]?.v + '-' + r.c?.[2]?.v)
    .filter(Boolean);

  // Leer resultados
  const jsonResul = await fetchSheet(constants.RESULTADOS);
  const rowsResul = jsonResul.table.rows;

  const resultadosRaw = parseResultados(rowsResul);
  const resultadosParejas = mapResultadosAParejas(resultadosRaw, equipos);

  // Leer clasificación
  const clasificacion = rows.map(r => ({
    equipo: r.c?.[1]?.v + "-" + r.c?.[2]?.v,
    puntos: Number(r.c?.[10]?.v),
    tdPlus: Number(r.c?.[6]?.v),
    tdMinus: Number(r.c?.[7]?.v),
    bajasPlus: Number(r.c?.[8]?.v),
    bajasMinus: Number(r.c?.[9]?.v)
  }));

  // Orden final
  const clasificacionOrdenada = ordenarClasificacion(clasificacion, resultadosParejas);

  console.table(clasificacionOrdenada);
  return clasificacionOrdenada;
}

document.addEventListener("DOMContentLoaded", loadClasificacionParejas);