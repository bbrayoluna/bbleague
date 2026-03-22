
// index.js
// Importa constantes y utilidades globales

import { loadRonda } from './main.js';

async function loadIndex() {
  await loadRonda();
}


document.addEventListener("DOMContentLoaded", loadIndex);