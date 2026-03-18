// Archivo principal para scripts JS globales

// Constantes globales
const SHEET_ID = "1O7yVvVJcC2afswIFlYi87J6JCgKaw-Sa18yuRBCoSdI";
const RANKING_SUIZO = "rankingSuizo";
const RESULTADOS = "Resultados";
const CONFIG = "Config";
const EQUIPOS = "CurrentMatch";

// Utilidad para obtener datos de Google Sheets
async function fetchSheet(sheetName) {
	const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}`;
	const res = await fetch(url);
	const text = await res.text();
	return JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1));
}

// Overlay reutilizable
function mostrarOverlay() {
	const el = document.getElementById("overlay");
	if (el) el.classList.remove("hide");
}
function ocultarOverlay() {
	const el = document.getElementById("overlay");
	if (el) el.classList.add("hide");
}
