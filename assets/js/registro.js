// Script modular para registro.html
// Depende de main.js para fetchSheet y constantes

const SELECT_EQUIPOS = "SelectEquipos";
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbx6XHHZKjrZlgxIJh7znjCwn0W2riM1z-P80Mg1bH6apq5OLsw9TUV9gIm0CKlKSJtyfw/exec";

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

async function sha256(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

document.getElementById("formRegistro").addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarOverlay();
  const username = document.getElementById("username").value.trim();
  const equipo   = document.getElementById("equipo").value.trim();
  const password = document.getElementById("password").value;
  const raza = document.getElementById("raza");
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
  const res  = await fetch(URL_SCRIPT, {
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
  const jsonConfig = await fetchSheet(CONFIG);
  const rowsConfig = jsonConfig.table.rows;
  const jsonTeams = await fetchSheet(SELECT_EQUIPOS);
  const rowsTeams = jsonTeams.table.rows;
  cargarEquipos(rowsTeams);
  const registroActivo = rowsConfig[3].c[1]?.v;
  if(registroActivo===1){
    mostrarFormulario();
    ocultarNoRegistro();
  }else{
    ocultarFormulario();
    mostrarNoRegistro();
  }
  ocultarOverlay();
});
