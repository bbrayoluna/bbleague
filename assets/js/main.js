

// main.js
// Archivo principal para lógica global

import * as constants from './constants.js';

// Utilidad para obtener datos de Google Sheets
async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${constants.SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  return JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

// Utilidad para obtener hash SHA-256
async function sha256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Overlay reutilizable
function mostrarOverlay() {
  const el = document.getElementById('overlay');
  if (el) el.classList.remove('hide');
}

function ocultarOverlay() {
  const el = document.getElementById('overlay');
  if (el) el.classList.add('hide');
}
function parseFechaEuropea(fechaStr) {
  // fechaStr viene como "06/04/2026"
  const [dia, mes, año] = fechaStr.split("/").map(Number);
  return new Date(año, mes - 1, dia);
}
async function loadRonda() {
  const data = await fetchSheet(constants.RONDAS);

  // La estructura de Google Sheets en modo gviz devuelve los datos en data.table.rows
  const rows = data.table.rows;

  // Fecha actual (sin horas)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let rondaActual = null;

  for (const row of rows) {
    const numRonda = row.c[0]?.v;
    const fechaInicio = row.c[1]?.f || row.c[1]?.v;
    const fechaFin = row.c[2]?.f || row.c[2]?.v;

    const inicio = parseFechaEuropea(fechaInicio);
    const fin = parseFechaEuropea(fechaFin);

    if (hoy >= inicio && hoy <= fin) {
      rondaActual = {
        numero: numRonda,
        inicio: fechaInicio,
        fin: fechaFin
      };
      break;
    }
  }

  const div = document.getElementById("ronda-actual");

  if (rondaActual) {
    div.textContent = `Ronda actual: ${rondaActual.numero} (${rondaActual.inicio} - ${rondaActual.fin})`;
    div.classList.remove('hide');
  } else {
    div.textContent = "No se esta jugando ninguna competición en este momento.";
  }
}
export { fetchSheet, sha256, mostrarOverlay, ocultarOverlay, loadRonda };
