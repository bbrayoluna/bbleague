import { fetchSheet } from './main.js';
import * as constants from './constants.js';

function debugRows(name, data) {
  try {
    const rows = data?.table?.rows || [];
    const header = rows[0]?.c?.map(c => c ? (c.v ?? c.f ?? '') : '') || [];
    console.log(`FETCH SHEET: ${name} — rows: ${rows.length} — header:`, header);
    // log up to first 3 data rows
    const sample = rows.slice(1, 4).map(r => (r.c || []).map(c => c ? (c.v ?? c.f ?? '') : ''));
    console.log(`SAMPLE ${name}:`, sample);
  } catch (e) {
    console.warn('debugRows error for', name, e);
  }
}

function renderTable(container, rows, maxCols) {
  if (!rows || rows.length === 0) {
    container.textContent = 'No hay datos.';
    return;
  }
  const table = document.createElement('table');
  table.className = 'simple-table';

  // Usar la primera fila como cabecera
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headerRow = rows[0];
  const headerCols = headerRow?.c || [];
  const visibleHeaderCols = (typeof maxCols === 'number') ? headerCols.slice(0, maxCols) : headerCols;
  const trHead = document.createElement('tr');
  visibleHeaderCols.forEach((c) => {
    const th = document.createElement('th');
    th.textContent = c ? (c.v ?? c.f ?? '') : '';
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  // Filas restantes como cuerpo
  rows.slice(1).forEach((r) => {
    const tr = document.createElement('tr');
    const cols = r.c || [];
    const colCount = visibleHeaderCols.length;
    // Rellenar según número de columnas visibles de la cabecera
    for (let i = 0; i < colCount; i++) {
      const c = cols[i];
      const td = document.createElement('td');
      td.textContent = c ? (c.v ?? c.f ?? '') : '';
      tr.appendChild(td);
    }
    // Si hay columnas extra y no hemos limitado, añadirlas también
    if (typeof maxCols !== 'number' && cols.length > headerCols.length) {
      for (let i = headerCols.length; i < cols.length; i++) {
        const c = cols[i];
        const td = document.createElement('td');
        td.textContent = c ? (c.v ?? c.f ?? '') : '';
        tr.appendChild(td);
      }
    }
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
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
    debugRows(constants.USUARIOS_ACEPTADOS_PRIMAVERA2026, usuariosData);
    renderTable(ua, usuariosData.table.rows, 4); // mostrar hasta columna D

    const resultadosData = await fetchSheet(constants.RESULTADOS_PRIMAVERA2026);
    debugRows(constants.RESULTADOS_PRIMAVERA2026, resultadosData);
    renderTable(res, resultadosData.table.rows);

    const clasificacionData = await fetchSheet(constants.CLASIFICACION_PRIMAVERA2026);
    debugRows(constants.CLASIFICACION_PRIMAVERA2026, clasificacionData);
    renderTable(cls, clasificacionData.table.rows);

    const clasEquiposData = await fetchSheet(constants.CLASIFICACION_EQUIPOS_PRIMAVERA2026);
    debugRows(constants.CLASIFICACION_EQUIPOS_PRIMAVERA2026, clasEquiposData);
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
