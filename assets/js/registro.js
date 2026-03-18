
// registro.js
// Importa constantes y utilidades globales
import * as constants from './constants.js';
import { fetchSheet, sha256, mostrarOverlay, ocultarOverlay } from './main.js';

async function cargarEquipos(rowsConfig) {
  const equipos = rowsConfig.map(r => r.c?.[0]?.v).filter(Boolean);
  const raza = document.getElementById("raza");
  equipos.forEach(eq => {
    const optA = document.createElement("option");
    optA.value = eq;
    optA.textContent = eq;
    raza.appendChild(optA);
  });
}

document.getElementById("formRegistro").addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarOverlay();
  const username = document.getElementById("username").value.trim();
  const equipo = document.getElementById("equipo").value.trim();
  const password = document.getElementById("password").value;
  const password_hash = await sha256(password);
  const data = {
    action: "registrar",
    username,
    equipo,
    raza: raza.value,
    password_hash
  };
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  const res = await fetch(constants.URL_SCRIPT, {
    method: "POST",
    body: formData
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { ok: false, error: "Respuesta no válida: " + text };
  }
  ocultarOverlay();
  alert("Resultado: " + (json.mensaje || json.error));
  document.getElementById("mensaje").innerText = json.mensaje || json.error;
});

function mostrarNoRegistro() {
  document.getElementById("noregistros").classList.remove("hide");
}

function ocultarNoRegistro() {
  document.getElementById("noregistros").classList.add("hide");
}

function mostrarFormulario() {
  document.getElementById("formRegistro").classList.remove("hide");
}

function ocultarFormulario() {
  document.getElementById("formRegistro").classList.add("hide");
}

document.addEventListener("DOMContentLoaded", async () => {
  mostrarOverlay();
  const jsonConfig = await fetchSheet(constants.CONFIG);
  const rowsConfig = jsonConfig.table.rows;
  const jsonTeams = await fetchSheet(constants.SELECT_EQUIPOS);
  const rowsTeams = jsonTeams.table.rows;
  cargarEquipos(rowsTeams);
  const registroActivo = rowsConfig[3].c[1]?.v; // B1
  if (registroActivo === 1) {
    mostrarFormulario();
    ocultarNoRegistro();
  } else {
    ocultarFormulario();
    mostrarNoRegistro();
  }
  ocultarOverlay();
});