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

// Render results like in pairings: grouped by jornada, collapsible sections
function loadResultadosBlock(rows, container) {
  const valor = rows?.[0]?.c?.[0]?.v ?? "";
  if (valor === "ignorar") return;

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

  container.innerHTML = "";

  Object.keys(jornadas)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(j => {
      const header = document.createElement('div');
      header.className = 'jornada-header';

      const contenido = document.createElement('div');
      contenido.className = 'jornada-contenido';
      // Mostrar desplegado por defecto
      contenido.style.display = 'block';
      header.textContent = `Jornada ${j} ▲`;

      const table = document.createElement('table');
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
      const tbody = table.querySelector('tbody');

      jornadas[j].forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.equipoA ?? ''}</td>
          <td>${p.tdA ?? ''}</td>
          <td>${p.tdB ?? ''}</td>
          <td>${p.equipoB ?? ''}</td>
        `;
        tbody.appendChild(tr);
      });

      contenido.appendChild(table);
      header.addEventListener('click', () => {
        const visible = contenido.style.display === 'block';
        contenido.style.display = visible ? 'none' : 'block';
        header.textContent = visible ? `Jornada ${j} ▼` : `Jornada ${j} ▲`;
      });

      container.appendChild(header);
      container.appendChild(contenido);
    });
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
    loadResultadosBlock(resultadosData.table.rows, res);

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
