
// clasificacion.js
// Importa constantes y utilidades globales

import * as constants from './constants.js';
import { fetchSheet } from './main.js';

async function loadClasificacionParejas() {
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

document.addEventListener("DOMContentLoaded", loadClasificacionParejas);