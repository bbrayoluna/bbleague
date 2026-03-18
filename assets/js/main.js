
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

export { fetchSheet, sha256, mostrarOverlay, ocultarOverlay };
