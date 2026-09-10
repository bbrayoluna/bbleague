import { fetchSheet } from './main.js';
import * as constants from './constants.js';

function renderTable(container, rows) {
  if (!rows || rows.length === 0) {
    container.textContent = 'No hay datos.';
    return;
  }
  const table = document.createElement('table');
  table.className = 'simple-table';
  rows.forEach((r, ri) => {
    const tr = document.createElement('tr');
    const cols = r.c || [];
    cols.forEach((c) => {
      const cell = document.createElement(ri === 0 ? 'th' : 'td');
      cell.textContent = c ? (c.v ?? c.f ?? '') : '';
      tr.appendChild(cell);
    });
    table.appendChild(tr);
  });
  container.innerHTML = '';
  container.appendChild(table);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const ua = document.getElementById('usuarios-aceptados');
    const res = document.getElementById('resultados');
    const cls = document.getElementById('clasificacion');
    const cle = document.getElementById('clasificacion-equipos');

    const usuariosData = await fetchSheet(constants.USUARIOS_ACEPTADOS_PRIMAVERA2026);
    renderTable(ua, usuariosData.table.rows);

    const resultadosData = await fetchSheet(constants.RESULTADOS_PRIMAVERA2026);
    renderTable(res, resultadosData.table.rows);

    const clasificacionData = await fetchSheet(constants.CLASIFICACION_PRIMAVERA2026);
    renderTable(cls, clasificacionData.table.rows);

    const clasEquiposData = await fetchSheet(constants.CLASIFICACION_EQUIPOS_PRIMAVERA2026);
    renderTable(cle, clasEquiposData.table.rows);
  } catch (err) {
    console.error('Error cargando datos del torneo:', err);
    const main = document.querySelector('main');
    if (main) {
      const p = document.createElement('p');
      p.textContent = 'No se pudieron cargar los datos. Comprueba que las pestañas del Sheet existen y son públicas.';
      main.appendChild(p);
    }
  }
});
