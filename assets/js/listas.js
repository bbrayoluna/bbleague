import { conectarSesion, crearMensaje } from './commons.js';

const rosterDataUrl = 'assets/data/rosters.json';
const maxPlayers = 16;
const skillPrices = { primary: 20000, secondary: 40000, elite: 10000, secondSkill: 10000 };
const skillCategories = {
  G: {
    name: 'Generales',
    skills: [
      'Agallas', 'Equilibrio firme', 'Forcejear', 'Furia', 'Manos seguras', 'Patada',
      'Placaje defensivo', 'Placar', 'Profesional', 'Provocar', 'Robar balón', 'Zafarse'
    ]
  },
  A: {
    name: 'Agilidad',
    skills: [
      'Atrapar', 'Echarse a un lado', 'En pie de un salto', 'Esprintar', 'Esquivar',
      'Golpe a la carrera / Atacar y huir', 'Pies firmes', 'Placaje heroico',
      'Proteger el cuero', 'Recepción heroica', 'Romper defensas', 'Saltar'
    ]
  },
  F: {
    name: 'Fuerza',
    skills: [
      'Abrirse paso', 'Apartar', 'Brazo fuerte', 'Defensa', 'Golpe mortífero',
      'Imparable', 'Llave de brazo', 'Luchador', 'Mantenerse firme', 'Ojo de halcón',
      'Placaje múltiple'
    ]
  },
  P: {
    name: 'Pase',
    skills: [
      'Atento al balón', 'Cañonero', 'Nervios de acero', 'Partenubes', 'Pasar',
      'Pasar y seguir', 'Pase a lo loco', 'Pase precipitado', 'Pase seguro',
      'Patada de despeje', 'Precisión'
    ]
  },
  M: {
    name: 'Mutaciones',
    skills: [
      'Boca monstruosa', 'Brazos adicionales', 'Cola prensil', 'Cuernos',
      'Dos cabezas', 'Mano grande', 'Piernas muy largas', 'Tentáculos'
    ]
  },
  T: {
    name: 'Rasgos',
    skills: [
      'Animosidad (X)', 'Apuñalar', 'Arma secreta', 'Bombardero', 'Borracho',
      'Bola con cadena', 'Canijo', 'Chutar compañero', 'Descomposición', 'Echar raíces',
      'El balón es mío', 'El balón ni verlo', 'Embustero', 'Escurridizo', 'Estúpido',
      'Exhalar fuego', 'Ferocidad animal', 'Humanoide bala', 'Infectado', 'Insignificante',
      'Ira descontrolada', 'Lanzar compañero', 'Levantar compañero', 'Mirada hipnótica',
      'Motosierra', 'Odio (X)', 'Planear', 'Pogo saltarín', 'Proyectil de vómito',
      'Realmente estúpido', 'Regeneración', 'Siempre hambriento', 'Solitario (X+)',
      'Tembloroso', '¡Tronco va!'
    ]
  }
};
const eliteSkills = new Set(['Placar', 'Esquivar', 'Defensa', 'Golpe mortífero'].map(normalizarHabilidad));

const teamSelect = document.getElementById('teamSelect');
const rosterNameInput = document.getElementById('rosterName');
const teamBudgetInput = document.getElementById('teamBudget');
const addPlayerForm = document.getElementById('addPlayerForm');
const positionSelect = document.getElementById('positionSelect');
const addPlayerButton = document.getElementById('addPlayerButton');
const playersContainer = document.getElementById('rosterPlayers');
const downloadButton = document.getElementById('downloadRosterButton');
const mostrarMensaje = crearMensaje('listasMensaje');

let teams = [];
let selectedTeam = null;
let rosterPlayers = [];
let nextPlayerId = 1;

function normalizarHabilidad(value) {
  return String(value)
    .replace(/\([^)]*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function formatearCoste(value) {
  return `${Number(value).toLocaleString('es-ES')} m.o.`;
}

function crearElemento(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function obtenerCostes() {
  let playersCost = 0;
  let primarySkillCost = 0;
  let secondarySkillCost = 0;
  let eliteCost = 0;
  let secondSkillCost = 0;

  rosterPlayers.forEach(player => {
    playersCost += player.position.cost;
    player.skills.forEach((skill, index) => {
      if (skill.primary) primarySkillCost += skillPrices.primary;
      else secondarySkillCost += skillPrices.secondary;
      if (skill.elite) eliteCost += skillPrices.elite;
      if (index > 0) secondSkillCost += skillPrices.secondSkill;
    });
  });

  return {
    playersCost,
    primarySkillCost,
    secondarySkillCost,
    eliteCost,
    secondSkillCost,
    total: playersCost + primarySkillCost + secondarySkillCost + eliteCost + secondSkillCost
  };
}

function actualizarResumen() {
  const costs = obtenerCostes();
  const budget = Math.max(0, Number(teamBudgetInput.value) || 0);
  const remaining = budget - costs.total;

  document.getElementById('summaryRace').textContent = selectedTeam?.name || 'Selecciona un equipo';
  document.getElementById('summaryTeamName').textContent = rosterNameInput.value.trim() || 'Sin nombre';
  document.getElementById('summaryPlayersCost').textContent = formatearCoste(costs.playersCost);
  document.getElementById('summaryPrimaryCost').textContent = formatearCoste(costs.primarySkillCost);
  document.getElementById('summarySecondaryCost').textContent = formatearCoste(costs.secondarySkillCost);
  document.getElementById('summaryEliteCost').textContent = formatearCoste(costs.eliteCost);
  document.getElementById('summarySecondSkillCost').textContent = formatearCoste(costs.secondSkillCost);
  document.getElementById('summaryTotalCost').textContent = formatearCoste(costs.total);
  document.getElementById('summaryBudget').textContent = formatearCoste(budget);
  const remainingElement = document.getElementById('summaryRemaining');
  remainingElement.textContent = formatearCoste(remaining);
  remainingElement.classList.toggle('over-budget', remaining < 0);
  document.getElementById('summaryPlayerCount').textContent = `${rosterPlayers.length} jugadores (máximo ${maxPlayers}).`;
  document.getElementById('budgetWarning').textContent = remaining < 0
    ? 'El coste supera el presupuesto. Reduce gastos o aumenta el presupuesto para descargar.'
    : '';
  downloadButton.disabled = rosterPlayers.length === 0 || remaining < 0;
}

function contarPosicion(position) {
  return rosterPlayers.filter(player => player.position.name === position.name).length;
}

function contarGrandullones() {
  return rosterPlayers.filter(player => player.position.bigGuy).length;
}

function actualizarSelectorPosiciones() {
  positionSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = selectedTeam ? 'Selecciona un tipo de jugador' : 'Selecciona primero un equipo';
  positionSelect.appendChild(placeholder);

  if (!selectedTeam) {
    positionSelect.disabled = true;
    addPlayerButton.disabled = true;
    return;
  }

  const atTeamLimit = rosterPlayers.length >= maxPlayers;
  const atBigGuyLimit = Number.isInteger(selectedTeam.maxBigGuys)
    && contarGrandullones() >= selectedTeam.maxBigGuys;

  selectedTeam.positions.forEach((position, index) => {
    const count = contarPosicion(position);
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${position.name} — ${formatearCoste(position.cost)} (${count}/${position.max})`;
    option.disabled = count >= position.max || atTeamLimit || (position.bigGuy && atBigGuyLimit);
    positionSelect.appendChild(option);
  });

  positionSelect.disabled = atTeamLimit || selectedTeam.positions.every((position, index) => {
    const option = positionSelect.options[index + 1];
    return option.disabled;
  });
  addPlayerButton.disabled = positionSelect.disabled;
}

function obtenerHabilidadesDisponibles(player) {
  const selectedSkills = new Set(player.skills.map(skill => normalizarHabilidad(skill.name)));
  const startingSkills = new Set(player.position.baseSkills.map(normalizarHabilidad));
  const available = [];

  Object.entries(skillCategories).forEach(([category, details]) => {
    const primary = player.position.primary.includes(category);
    const secondary = player.position.secondary.includes(category);
    if (!primary && !secondary) return;

    details.skills.forEach(name => {
      const normalized = normalizarHabilidad(name);
      if (startingSkills.has(normalized) || selectedSkills.has(normalized)) return;
      available.push({
        name,
        category,
        categoryName: details.name,
        primary,
        elite: eliteSkills.has(normalized)
      });
    });
  });

  return available;
}

function actualizarHabilidades(player, card) {
  const skillList = card.querySelector('.roster-skill-list');
  skillList.replaceChildren();

  player.skills.forEach((skill, index) => {
    const item = crearElemento('li', 'roster-skill');
    const type = skill.primary ? 'Primaria' : 'Secundaria';
    const additions = [
      formatearCoste(skill.primary ? skillPrices.primary : skillPrices.secondary),
      ...(skill.elite ? [`+ ${formatearCoste(skillPrices.elite)} élite`] : []),
      ...(index > 0 ? [`+ ${formatearCoste(skillPrices.secondSkill)} segunda habilidad`] : [])
    ];
    item.appendChild(crearElemento('span', '', `${skill.name} — ${type} (${additions.join(' ')})`));
    const removeButton = crearElemento('button', 'roster-remove-skill', 'Quitar');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Quitar ${skill.name}`);
    removeButton.addEventListener('click', () => {
      player.skills.splice(index, 1);
      renderizarPlantilla();
      mostrarMensaje('', 'blue');
    });
    item.appendChild(removeButton);
    skillList.appendChild(item);
  });

  const skillForm = card.querySelector('.roster-skill-form');
  skillForm.replaceChildren();
  if (player.skills.length >= 2) {
    skillForm.appendChild(crearElemento('p', 'roster-player-note', 'Máximo: 2 habilidades añadidas por jugador.'));
    return;
  }

  const available = obtenerHabilidadesDisponibles(player);
  if (!available.length) {
    skillForm.appendChild(crearElemento('p', 'roster-player-note', 'No hay más habilidades elegibles para este jugador.'));
    return;
  }

  const select = document.createElement('select');
  select.setAttribute('aria-label', `Habilidad para ${player.position.name}`);
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona una habilidad';
  select.appendChild(placeholder);

  ['Primarias', 'Secundarias'].forEach(groupName => {
    const group = document.createElement('optgroup');
    group.label = groupName;
    const groupSkills = available.filter(skill => (skill.primary ? 'Primarias' : 'Secundarias') === groupName);
    groupSkills.forEach(skill => {
      const option = document.createElement('option');
      option.value = `${skill.category}|${skill.name}`;
      const baseCost = skill.primary ? skillPrices.primary : skillPrices.secondary;
      const cost = baseCost + (skill.elite ? skillPrices.elite : 0)
        + (player.skills.length > 0 ? skillPrices.secondSkill : 0);
      option.textContent = `${skill.name} — ${skill.categoryName}, ${formatearCoste(cost)}`
        + (skill.elite ? ' (élite)' : '');
      group.appendChild(option);
    });
    if (group.children.length) select.appendChild(group);
  });

  const addSkillButton = crearElemento('button', 'master-action', 'Añadir habilidad');
  addSkillButton.type = 'submit';
  skillForm.addEventListener('submit', event => {
    event.preventDefault();
    const [category, name] = select.value.split('|');
    const choice = available.find(skill => skill.category === category && skill.name === name);
    if (!choice) {
      mostrarMensaje('Selecciona una habilidad válida para este jugador.', 'red');
      return;
    }
    const skillCost = (choice.primary ? skillPrices.primary : skillPrices.secondary)
      + (choice.elite ? skillPrices.elite : 0)
      + (player.skills.length > 0 ? skillPrices.secondSkill : 0);
    const budget = Math.max(0, Number(teamBudgetInput.value) || 0);
    if (obtenerCostes().total + skillCost > budget) {
      mostrarMensaje('La habilidad supera el presupuesto disponible.', 'red');
      return;
    }
    player.skills.push({ name: choice.name, category: choice.category, primary: choice.primary, elite: choice.elite });
    renderizarPlantilla();
    mostrarMensaje('', 'blue');
  });
  skillForm.append(select, addSkillButton);
}

function renderizarPlantilla() {
  playersContainer.replaceChildren();

  if (!rosterPlayers.length) {
    playersContainer.appendChild(crearElemento('p', 'roster-empty', 'Aún no has añadido jugadores.'));
  }

  rosterPlayers.forEach((player, index) => {
    const card = crearElemento('article', 'roster-player');
    const header = crearElemento('div', 'roster-player-header');
    const title = crearElementHeading(index, player.position);
    header.appendChild(title);

    const removePlayerButton = crearElemento('button', 'roster-remove-player', 'Eliminar');
    removePlayerButton.type = 'button';
    removePlayerButton.setAttribute('aria-label', `Eliminar jugador ${index + 1}: ${player.position.name}`);
    removePlayerButton.addEventListener('click', () => {
      rosterPlayers = rosterPlayers.filter(item => item.id !== player.id);
      renderizarPlantilla();
      mostrarMensaje('', 'blue');
    });
    header.appendChild(removePlayerButton);
    card.appendChild(header);

    card.appendChild(crearElemento('p', 'roster-player-cost', formatearCoste(player.position.cost)));
    if (player.position.baseSkills.length) {
      card.appendChild(crearElemento('p', 'roster-player-note', `Habilidades iniciales: ${player.position.baseSkills.join(', ')}`));
    }
    card.appendChild(crearElemento('h4', 'roster-subheading', 'Habilidades añadidas'));
    card.appendChild(crearElemento('ul', 'roster-skill-list'));
    card.appendChild(crearElemento('form', 'roster-skill-form'));
    actualizarHabilidades(player, card);
    playersContainer.appendChild(card);
  });

  actualizarSelectorPosiciones();
  actualizarResumen();
}

function crearElementHeading(index, position) {
  const heading = document.createElement('h4');
  heading.textContent = `Jugador ${index + 1} — ${position.name}`;
  return heading;
}

function seleccionarEquipo() {
  selectedTeam = teams.find(team => team.name === teamSelect.value) || null;
  rosterPlayers = [];
  nextPlayerId = 1;
  actualizarSelectorPosiciones();
  renderizarPlantilla();
  mostrarMensaje('', 'blue');
}

async function cargarCatalogo() {
  const response = await fetch(rosterDataUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el catálogo de equipos (HTTP ${response.status}).`);
  }
  const catalog = await response.json();
  if (!Array.isArray(catalog) || !catalog.length) {
    throw new Error('El catálogo de equipos está vacío o tiene un formato no válido.');
  }
  teams = catalog;
  teamSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona un equipo';
  teamSelect.appendChild(placeholder);
  teams.forEach(team => {
    const option = document.createElement('option');
    option.value = team.name;
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });
  actualizarResumen();
}

function agregarJugador(event) {
  event.preventDefault();
  if (!selectedTeam) {
    mostrarMensaje('Selecciona un equipo antes de añadir jugadores.', 'red');
    return;
  }
  const position = selectedTeam.positions[Number(positionSelect.value)];
  if (!position) {
    mostrarMensaje('Selecciona un tipo de jugador válido.', 'red');
    return;
  }
  if (rosterPlayers.length >= maxPlayers || contarPosicion(position) >= position.max) {
    mostrarMensaje('Has alcanzado el máximo permitido para la plantilla o este tipo de jugador.', 'red');
    return;
  }
  if (position.bigGuy && Number.isInteger(selectedTeam.maxBigGuys)
      && contarGrandullones() >= selectedTeam.maxBigGuys) {
    mostrarMensaje(`Este equipo solo puede incluir ${selectedTeam.maxBigGuys} jugador(es) Grandullón(es).`, 'red');
    return;
  }
  const budget = Math.max(0, Number(teamBudgetInput.value) || 0);
  if (obtenerCostes().total + position.cost > budget) {
    mostrarMensaje('El jugador supera el presupuesto disponible.', 'red');
    return;
  }

  rosterPlayers.push({ id: nextPlayerId++, position, skills: [] });
  renderizarPlantilla();
  mostrarMensaje('', 'blue');
}

function envolverTexto(context, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function crearPaginasRoster() {
  const pageWidth = 595;
  const pageHeight = 842;
  const scale = 2;
  const pageRowsList = [];
  const canvases = [];
  const measurementCanvas = document.createElement('canvas');
  const measurementContext = measurementCanvas.getContext('2d');
  if (!measurementContext) throw new Error('El navegador no permite generar la vista previa del PDF.');
  measurementContext.font = '10px Arial';

  const rows = rosterPlayers.map((player, index) => {
    const initialSkills = player.position.baseSkills.length
      ? player.position.baseSkills.join(', ')
      : 'Ninguna';
    const addedSkills = player.skills.length
      ? player.skills.map(skill => `${skill.name} (${skill.primary ? 'primaria' : 'secundaria'}${skill.elite ? ', élite' : ''})`).join(', ')
      : 'Ninguna';
    const detailLines = [
      ...envolverTexto(measurementContext, `Iniciales: ${initialSkills}`, 505),
      ...envolverTexto(measurementContext, `Añadidas: ${addedSkills}`, 505)
    ];
    return { player, index, detailLines, height: 23 + detailLines.length * 13 + 8 };
  });

  let currentPage = [];
  let currentY = 310;
  rows.forEach(row => {
    if (currentY + row.height > 790) {
      pageRowsList.push(currentPage);
      currentPage = [];
      currentY = 125;
    }
    currentPage.push(row);
    currentY += row.height;
  });
  if (currentPage.length) pageRowsList.push(currentPage);

  const costs = obtenerCostes();
  const budget = Math.max(0, Number(teamBudgetInput.value) || 0);
  pageRowsList.forEach((pageRows, pageIndex) => {
    const canvas = document.createElement('canvas');
    canvas.width = pageWidth * scale;
    canvas.height = pageHeight * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no permite dibujar las páginas del PDF.');
    context.scale(scale, scale);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, pageWidth, pageHeight);
    context.fillStyle = '#25396c';
    context.font = 'bold 22px Arial';
    context.fillText('Roster de Blood Bowl', 42, 48);
    context.font = 'bold 13px Arial';
    context.fillStyle = '#ac342f';
    context.fillText(`${selectedTeam.name} — ${rosterNameInput.value.trim()}`, 42, 73);
    context.font = '10px Arial';
    context.fillStyle = '#25396c';
    context.fillText(`Página ${pageIndex + 1} de ${pageRowsList.length}`, 460, 48);

    if (pageIndex === 0) {
      context.fillStyle = '#ac342f';
      context.fillRect(42, 92, 511, 1.5);
      context.font = 'bold 12px Arial';
      context.fillStyle = '#25396c';
      context.fillText('Resumen de costes', 42, 116);
      const costLines = [
        ['Jugadores', costs.playersCost],
        ['Habilidades primarias', costs.primarySkillCost],
        ['Habilidades secundarias', costs.secondarySkillCost],
        ['Habilidades élite', costs.eliteCost],
        ['Segunda habilidad por jugador', costs.secondSkillCost],
        ['Coste total', costs.total],
        ['Presupuesto', budget],
        ['Restante', budget - costs.total]
      ];
      context.font = '10px Arial';
      costLines.forEach(([label, amount], index) => {
        const x = index % 2 === 0 ? 42 : 305;
        const y = 138 + Math.floor(index / 2) * 22;
        context.fillStyle = label === 'Coste total' ? '#ac342f' : '#25396c';
        context.fillText(`${label}: ${formatearCoste(amount)}`, x, y);
      });
      context.fillStyle = '#ac342f';
      context.fillRect(42, 238, 511, 1);
      context.font = 'bold 12px Arial';
      context.fillStyle = '#25396c';
      context.fillText(`Plantilla (${rosterPlayers.length}/${maxPlayers})`, 42, 261);
    }

    let y = pageIndex === 0 ? 286 : 108;
    pageRows.forEach(row => {
      const heading = `Jugador ${row.index + 1} — ${row.player.position.name}`;
      context.font = 'bold 10px Arial';
      context.fillStyle = '#25396c';
      context.fillText(heading, 42, y);
      context.textAlign = 'right';
      context.fillText(formatearCoste(row.player.position.cost), 553, y);
      context.textAlign = 'left';
      context.font = '9px Arial';
      context.fillStyle = '#444444';
      row.detailLines.forEach((line, lineIndex) => {
        context.fillText(line, 48, y + 14 + lineIndex * 13);
      });
      y += row.height;
      context.strokeStyle = '#dddddd';
      context.beginPath();
      context.moveTo(42, y - 5);
      context.lineTo(553, y - 5);
      context.stroke();
    });

    context.font = '8px Arial';
    context.fillStyle = '#666666';
    context.fillText('Habilidades: 20.000 m.o. primaria / 40.000 m.o. secundaria; +10.000 élite y +10.000 por segunda habilidad.', 42, 818);
    canvases.push(canvas);
  });
  return canvases;
}

function unirBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  parts.forEach(part => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

async function crearPdf(pages) {
  const encoder = new TextEncoder();
  const images = [];
  for (const canvas of pages) {
    const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!imageBlob) throw new Error('No se pudo codificar una página del PDF.');
    images.push(new Uint8Array(await imageBlob.arrayBuffer()));
  }

  const objectBodies = [];
  const pageIds = images.map((_, index) => 3 + index * 3);
  objectBodies.push(encoder.encode('<< /Type /Catalog /Pages 2 0 R >>'));
  objectBodies.push(encoder.encode(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`));

  images.forEach((image, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    objectBodies.push(encoder.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    ));
    const content = encoder.encode('q 595 0 0 842 0 0 cm /Im0 Do Q');
    objectBodies.push(unirBytes([
      encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encoder.encode('\nendstream')
    ]));
    objectBodies.push(unirBytes([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),
      image,
      encoder.encode('\nendstream')
    ]));
  });

  const chunks = [encoder.encode('%PDF-1.4\n')];
  const offsets = [0];
  let byteLength = chunks[0].length;
  objectBodies.forEach((body, index) => {
    offsets.push(byteLength);
    const object = unirBytes([
      encoder.encode(`${index + 1} 0 obj\n`),
      body,
      encoder.encode('\nendobj\n')
    ]);
    chunks.push(object);
    byteLength += object.length;
  });

  const xrefOffset = byteLength;
  let xref = `xref\n0 ${objectBodies.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objectBodies.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  return new Blob(chunks, { type: 'application/pdf' });
}

async function descargarRoster() {
  if (!selectedTeam || !rosterPlayers.length) {
    mostrarMensaje('Selecciona un equipo y añade al menos un jugador antes de descargar.', 'red');
    return;
  }
  const rosterName = rosterNameInput.value.trim();
  if (!rosterName) {
    rosterNameInput.focus();
    mostrarMensaje('Introduce un nombre para el equipo.', 'red');
    return;
  }

  downloadButton.disabled = true;
  mostrarMensaje('Generando el PDF...', 'blue');
  try {
    const pdf = await crearPdf(crearPaginasRoster());
    const safeName = rosterName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
    const link = document.createElement('a');
    const url = URL.createObjectURL(pdf);
    link.href = url;
    link.download = `roster-${safeName || 'equipo'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarMensaje('Roster descargado correctamente.', 'blue');
  } catch (error) {
    console.error('Error generando el roster PDF:', error);
    mostrarMensaje(`No se pudo generar el PDF: ${error.message}`, 'red');
  } finally {
    downloadButton.disabled = false;
  }
}

teamSelect.addEventListener('change', seleccionarEquipo);
rosterNameInput.addEventListener('input', actualizarResumen);
teamBudgetInput.addEventListener('input', actualizarResumen);
addPlayerForm.addEventListener('submit', agregarJugador);
downloadButton.addEventListener('click', descargarRoster);

async function inicializarPagina() {
  try {
    await cargarCatalogo();
    actualizarSelectorPosiciones();
    renderizarPlantilla();
  } catch (error) {
    console.error('Error cargando el catálogo para el generador de listas:', error);
    mostrarMensaje(`No se pudo cargar el catálogo de equipos: ${error.message}`, 'red');
  }
}

conectarSesion({
  requiereRol: 'master',
  alEntrar: inicializarPagina,
  alSalir: () => {
    teams = [];
    selectedTeam = null;
    rosterPlayers = [];
    teamSelect.replaceChildren();
    renderizarPlantilla();
  }
});
