// Script modular para pairings.html
// Depende de main.js para fetchSheet y constantes

let JORNADA = 0;

async function loadResultados(rows) {
  const valor = rows?.[0]?.c?.[0]?.v ?? "";
  if (valor === "ignorar") return;
  const jornadas = {};
  rows.forEach(r => {
    if (!r.c) return;
    const jornada = r.c[1]?.v;
    const equipoA = r.c[2]?.v;
    const equipoB = r.c[3]?.v;
    const tdA = r.c[4]?.v;
    const tdB = r.c[5]?.v;
    if (!jornada) return;
    if (!jornadas[jornada]) jornadas[jornada] = [];
    jornadas[jornada].push({ equipoA, equipoB, tdA, tdB });
  });
  const cont = document.getElementById("resultados");
  cont.innerHTML = "";
  Object.keys(jornadas)
    .sort((a, b) => Number(a) - Number(b))
    .forEach(j => {
      const header = document.createElement("div");
      header.className = "jornada-header";
      header.textContent = `Jornada ${j} ▼`;
      const contenido = document.createElement("div");
      contenido.className = "jornada-contenido";
      const table = document.createElement("table");
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
      const tbody = table.querySelector("tbody");
      jornadas[j].forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.equipoA ?? ""}</td>
          <td>${p.tdA ?? ""}</td>
          <td>${p.tdB ?? ""}</td>
          <td>${p.equipoB ?? ""}</td>
        `;
        tbody.appendChild(tr);
      });
      contenido.appendChild(table);
      header.addEventListener("click", () => {
        const visible = contenido.style.display === "block";
        contenido.style.display = visible ? "none" : "block";
        header.textContent = visible ? `Jornada ${j} ▼` : `Jornada ${j} ▲`;
      });
      cont.appendChild(header);
      cont.appendChild(contenido);
    });
}

// ... (el resto de funciones de emparejamientos, igual que en el HTML original, usando fetchSheet y constantes de main.js)
// Por brevedad, aquí solo se muestra la estructura inicial y loadResultados.

// Al final, el evento DOMContentLoaded:
document.addEventListener("DOMContentLoaded", async () => {
  mostrarOverlay();
  const jsonResultados = await fetchSheet(RESULTADOS);
  const rowsResultados = jsonResultados.table.rows;
  const jsonRS = await fetchSheet(RANKING_SUIZO);
  const rowsRs = jsonRS.table.rows;
  const jsonConf = await fetchSheet(CONFIG);
  const rowsConf = jsonConf.table.rows;
  const jsonEquipos = await fetchSheet(EQUIPOS);
  const rowsEquipos = jsonEquipos.table.rows;
  await loadResultados(rowsResultados);
  JORNADA = rowsConf[0].c[1].v;
  // ...resto de lógica de emparejamientos...
  ocultarOverlay();
});
