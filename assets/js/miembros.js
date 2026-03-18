// pairings.js
// Importa constantes y utilidades globales
import * as constants from './constants.js';
import { fetchSheet, sha256, mostrarOverlay, ocultarOverlay } from './main.js';
let SHOW_ROSTER = false;

/* FUNCTIONS */
async function listarRoster() {
  const token = localStorage.getItem("token");

  const payload = {
    action: "listarArchivos",
    token,
    type: "roster"   // ← IMPORTANTE
  };

  const res = await fetch(constants.URL_SCRIPT, {
    method: "POST",
    body: new URLSearchParams({ data: JSON.stringify(payload) })
  });

  return await res.json();
}

async function descargarRoster(fileId) {
	mostrarOverlay();
  const token = localStorage.getItem("token");

  const payload = {
    action: "descargarArchivo",
    token,
    fileId
  };

  const res = await fetch(constants.URL_SCRIPT, {
    method: "POST",
    body: new URLSearchParams({ data: JSON.stringify(payload) })
  });

  const json = await res.json();

  if (!json.ok) {
    alert("Error: " + json.error);
    return;
  }

  const bytes = Uint8Array.from(atob(json.base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: json.mime });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = json.name;
  a.click();
  URL.revokeObjectURL(url);
  ocultarOverlay();
}


async function cargarEquipos() {
  const json = await fetchSheet(constants.USUARIOS_ACEPTADOS);
  const rows = json.table.rows;
  const jsonResul = await fetchSheet(constants.RESULTADOS);
  const rowsResul = jsonResul.table.rows;
  const equipos = rows.map(r => r.c?.[1]?.v+'-'+r.c?.[2]?.v).filter(Boolean);

  const selA = document.getElementById("equipoA");
  const selB = document.getElementById("equipoB");
  const selAacta = document.getElementById("equipoAacta");
  const selBacta = document.getElementById("equipoBacta");
  const selBroster = document.getElementById("equipoRoster");

  for (const eq of equipos) {

    const optA = document.createElement("option");
    optA.value = eq;
    optA.textContent = eq;
    selA.appendChild(optA);

    const optB = document.createElement("option");
    optB.value = eq;
    optB.textContent = eq;
    selB.appendChild(optB);

    const optAacta = document.createElement("option");
    optAacta.value = eq;
    optAacta.textContent = eq;
    selAacta.appendChild(optAacta);

    const optBacta = document.createElement("option");
    optBacta.value = eq;
    optBacta.textContent = eq;
    selBacta.appendChild(optBacta);

    if (await checkPlayer(eq, rowsResul)) {
      const optBroster = document.createElement("option");
      optBroster.value = eq;
      optBroster.textContent = eq;
      selBroster.appendChild(optBroster);
      SHOW_ROSTER = true;
    }
  }
}

async function checkPlayer(eq, rowsResul) {
  const valor = rowsResul?.[0]?.c?.[0]?.v ?? "";

  if (valor === "ignorar") return true;

  const [entrenador] = eq.split("-").map(p => p.trim());

  const encontrado = rowsResul.some(r => {
    if (!r.c) return false;
    const equipoA = r.c[2]?.v;
    const equipoB = r.c[3]?.v;
    return entrenador === equipoA || entrenador === equipoB;
  });

  return !encontrado;
}

  
function validarFormulario() {
  const a = document.getElementById("equipoA").value;
  const b = document.getElementById("equipoB").value;

  if (a === b) {
    alert("Equipo A y Equipo B deben ser distintos.");
    return false;
  }
  return true;
}
async function subirArchivo(token, file, type, propName) {
  const reader = new FileReader();

  return new Promise((resolve) => {
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];

      const payload = {
        action: "subirArchivo",
        token,
        propName: propName,
		type: type,
        filename: file.name,
        mime_type: file.type,
        file_base64: base64
      };

      const res = await fetch(constants.URL_SCRIPT, {
        method: "POST",
        body: new URLSearchParams({ data: JSON.stringify(payload) })
      });

      resolve(await res.json());
    };

    reader.readAsDataURL(file);
  });
}
async function destaparSeccionesPorConfig(){
  const jsonConfig = await fetchSheet(constants.CONFIG);
  const rowsConfig = jsonConfig.table.rows;

  const jornada = rowsConfig[0].c[1]?.v; // B1
  const resultadosActivo = rowsConfig[1].c[1]?.v; // B1
  const actasActivo = rowsConfig[5].c[1]?.v; // B6
  const rostersActivo = rowsConfig[4].c[1]?.v; // B5
  const downloadRostersActivo = rowsConfig[6].c[1]?.v; // B7
  if(resultadosActivo===1){
	document.getElementById("form-wrapper").classList.remove("hide");
  }else{
	document.getElementById("form-wrapper").classList.add("hide");
  }
  if(actasActivo===1){
	document.getElementById("subirActas").classList.remove("hide");
  }else{
	document.getElementById("subirActas").classList.add("hide");
  }
  if(rostersActivo===1){
	document.getElementById("subirRoster").classList.remove("hide");
  }else{
	document.getElementById("subirRoster").classList.add("hide");
  }
  if(downloadRostersActivo===1){
	document.getElementById("listaRoster").classList.remove("hide");
  }else{
	document.getElementById("listaRoster").classList.add("hide");
  }
  
  document.getElementById("jornada").value = jornada;
}
async function mostrarLogado() {
  await cargarEquipos();
  await destaparSeccionesPorConfig();
  document.getElementById("loginSection").classList.add("hide");
  cargarRosters();
}

function mostrarLogin() {
  document.getElementById("loginSection").classList.remove("hide");
  document.getElementById("form-wrapper").classList.add("hide");
  document.getElementById("subirActas").classList.add("hide");
  mostrarRoster();
  document.getElementById("listaRoster").classList.add("hide");
}
function mostrarRoster(){
	if(SHOW_ROSTER){
		document.getElementById("subirRoster").classList.add("hide");
	}  
}

async function cargarRosters() {
  const tabla = document.querySelector("#tablaRoster tbody");
  tabla.innerHTML = "";
  document.getElementById("mensajeRoster").textContent = "Cargando...";

  const res = await listarRoster();

  if (!res.ok) {
    document.getElementById("mensajeRoster").textContent = "Error: " + res.error;
    return;
  }

  document.getElementById("mensajeRoster").textContent = "";

  res.archivos.forEach(f => {
    const tr = document.createElement("tr");

    const fecha = new Date(f.date).toLocaleString("es-ES");

    tr.innerHTML = `
      <td>${f.name}</td>
      <td>${fecha}</td>
      <td><button onclick="descargarRoster('${f.id}')">Descargar</button></td>
    `;

    tabla.appendChild(tr);
  });
}

/* LISTENERS */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const user_id = localStorage.getItem("user_id");
	mostrarOverlay();
  if (!token) {
	ocultarOverlay();
    mostrarLogin();
    return;
  }

  const data = {
    action: "validar",
    token,
    user_id
  };

  const formData = new FormData();
  formData.append("data", JSON.stringify(data));

  const res = await fetch(constants.URL_SCRIPT, {
    method: "POST",
    body: formData
  });

  const json = await res.json();

  if (json.ok) {
    await mostrarLogado();
	ocultarOverlay();
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
	ocultarOverlay();
    mostrarLogin();
  }
});


document.getElementById("resultadoForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");

  const jornada=document.getElementById("jornada").value;
  const equipoA=document.getElementById("equipoA").value.split('-')[0];
  const equipoB=document.getElementById("equipoB").value.split('-')[0];
  const tdA=document.getElementById("tdA").value;
  const tdB=document.getElementById("tdB").value;
  const bajasA=document.getElementById("bajasA").value;
  const bajasB=document.getElementById("bajasB").value;
  const data = {
				action: "resultado",
				jornada,
				equipoA,
				equipoB,
				tdA,
				tdB,
				bajasA,
				bajasB,
				token
			  };

			  const formData = new FormData();
			  formData.append("data", JSON.stringify(data));
  await fetch(constants.URL_SCRIPT, {
    method: "POST",
    body: formData
  });
  
  document.getElementById("mensaje").textContent = "Resultado enviado correctamente ✔";
});


document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
 mostrarOverlay();
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;
    if (username === "cheerme" && password === "please") {
		ocultarOverlay();
        document.getElementById("cheerme").classList.remove("hide");   
        return false;                  
    }
  const password_hash = await sha256(password);

  const data = {
    action: "login",
    username,
    password_hash,
    user_agent: 'nodata'
  };

  const formData = new FormData();
  formData.append("data", JSON.stringify(data));

  const res = await fetch(constants.URL_SCRIPT, {
    method: "POST",
    body: formData
  });

  const json = await res.json();
	ocultarOverlay();
  if (json.ok) {
    // Guardar sesión
    localStorage.setItem("token", json.token);
    localStorage.setItem("user_id", json.user_id);
	alert("Sesión iniciada correctamente");
    document.getElementById("loginMensaje").innerText = "Sesión iniciada";

    mostrarLogado();
  } else {
	alert("Error: " + json.error);
    document.getElementById("loginMensaje").innerText = json.error;
  }
});


document.getElementById("uploadRosterForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = document.getElementById("fileInput").files[0];
  const status = document.getElementById("status");
  const team = document.getElementById("equipoRoster");
  const type = "roster";
  const progress = document.getElementById("progressContainer");
  const bar = document.getElementById("progressBar");

  const token = localStorage.getItem("token");

  if (!token) {
    status.textContent = "No hay sesión activa";
    return;
  }

  progress.style.display = "block";
  bar.style.width = "30%";
  status.textContent = "Preparando archivo...";

  const res = await subirArchivo(token, file, type, team.value);

  bar.style.width = "100%";

  if (res.ok) {
    status.innerHTML = `Archivo subido correctamente<br>`;
  } else {
    status.textContent = "Error: " + res.error;
  }
});

document.getElementById("uploadActaForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = document.getElementById("fileInputActa").files[0];
  const status = document.getElementById("statusActa");
  const teamA = document.getElementById("equipoAacta");
  const teamB = document.getElementById("equipoBacta");
  const type = "actas";
  const progress = document.getElementById("progressContainerActa");
  const bar = document.getElementById("progressBarActa");

  const token = localStorage.getItem("token");

  if (!token) {
    status.textContent = "No hay sesión activa";
    return;
  }

  progress.style.display = "block";
  bar.style.width = "30%";
  status.textContent = "Preparando archivo...";

  const res = await subirArchivo(token, file, type, teamA.value+'VS'+teamB.value);

  bar.style.width = "100%";

  if (res.ok) {
    status.innerHTML = `Archivo subido correctamente<br>`;
  } else {
    status.textContent = "Error: " + res.error;
  }
});