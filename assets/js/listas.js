import {
  conectarSesion,
  crearMensaje,
  enviarDatos,
  getSesion,
  obtenerDatos,
  subirArchivo
} from './commons.js';

const rosterDataUrl = 'assets/data/rosters.json';
const playerStatsUrl = 'assets/data/player-stats.json';
const maxPlayers = 16;
const defaultMaxSkillsPerPlayer = 2;
const defaultSkillPrices = { primary: 20000, secondary: 40000, elite: 10000, secondSkill: 10000 };
const playerStatFields = [
  { id: 'ma', label: 'MA' },
  { id: 'st', label: 'ST' },
  { id: 'ag', label: 'AG' },
  { id: 'pa', label: 'PA' },
  { id: 'av', label: 'AV' }
];
const playerStatPrices = { ma: 20000, st: 80000, ag: 40000, pa: 20000, av: 10000 };
const playerStatMaximums = { ma: 9, st: 8, ag: 1, pa: 1, av: 11 };
const maxImprovementsPerStat = 2;
let skillPrices = { ...defaultSkillPrices };
let maxSkillsPerPlayer = defaultMaxSkillsPerPlayer;
const rosterExtraCatalog = [
  {
    id: 'team-rerolls',
    name: 'Segundas oportunidades (rerolls)',
    group: 'Cuadro técnico',
    price: 70000,
    teamPrices: {
      'Alianza del Viejo Mundo': 70000,
      'Altos Elfos': 50000,
      Amazonas: 60000,
      Bretonia: 60000,
      'Elegidos del Caos': 50000,
      'Elfos Oscuros': 50000,
      'Elfos Silvanos': 50000,
      Enanos: 60000,
      'Enanos del Caos': 70000,
      Gnomos: 50000,
      Goblins: 60000,
      Halflings: 60000,
      'Hombres Lagarto': 70000,
      Humanos: 50000,
      Inframundo: 70000,
      Khorne: 60000,
      Nigromantes: 70000,
      'No Muertos': 70000,
      'Nobles Imperiales': 60000,
      Nurgle: 60000,
      Nórdicos: 60000,
      Ogros: 70000,
      Orcos: 60000,
      'Orcos Negros': 60000,
      'Renegados del Caos': 70000,
      'Reyes Funerarios': 60000,
      Skaven: 50000,
      Slann: 50000,
      Snotlings: 70000,
      'Unión Élfica': 50000,
      Vampiros: 60000
    },
    max: 8
  },
  { id: 'cheerleaders', name: 'Animadoras', group: 'Cuadro técnico', price: 10000, max: 6 },
  { id: 'assistant-coaches', name: 'Ayudantes del entrenador', group: 'Cuadro técnico', price: 10000, max: 6 },
  { id: 'fans', name: 'Hinchas', group: 'Cuadro técnico', price: 5000, max: 3 },
  { id: 'temporary-cheerleaders', name: 'Animadoras temporales', group: 'Incentivos', price: 5000, max: 5 },
  { id: 'prayers-to-nuffle', name: 'Plegarias a Nuffle', group: 'Incentivos', price: 10000, max: 3 },
  { id: 'part-time-assistants', name: 'Ayudantes a tiempo parcial', group: 'Incentivos', price: 20000, max: 5 },
  { id: 'team-mascot', name: 'Mascota del equipo', group: 'Incentivos', price: 25000, max: 1 },
  { id: 'weather-mage', name: 'Cambiaclimas', group: 'Incentivos', price: 25000, max: 1 },
  { id: 'beer-barrels', name: 'Barriles de cerveza Estrella Blitzer', group: 'Incentivos', price: 50000, max: 2 },
  { id: 'extra-training', name: 'Entrenamientos adicionales', group: 'Incentivos', price: 100000, max: 8 },
  { id: 'bribes', name: 'Sobornos', group: 'Incentivos', price: 100000, max: 3 },
  {
    id: 'halfling-master-chef',
    name: 'Chef Maestro Halfling',
    group: 'Incentivos',
    price: 300000,
    teamPrices: { Halflings: 100000 },
    max: 1
  }
];
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

const tournamentSelect = document.getElementById('tournamentSelect');
const teamSelect = document.getElementById('teamSelect');
const rosterNameInput = document.getElementById('rosterName');
const teamBudgetInput = document.getElementById('teamBudget');
const addPlayerForm = document.getElementById('addPlayerForm');
const positionSelect = document.getElementById('positionSelect');
const addPlayerButton = document.getElementById('addPlayerButton');
const playersContainer = document.getElementById('rosterPlayers');
const addRosterExtraForm = document.getElementById('addRosterExtraForm');
const rosterExtraSelect = document.getElementById('rosterExtraSelect');
const addRosterExtraButton = document.getElementById('addRosterExtraButton');
const rosterExtrasContainer = document.getElementById('rosterExtras');
const downloadButton = document.getElementById('downloadRosterButton');
const uploadButton = document.getElementById('uploadRosterButton');
const mostrarMensaje = crearMensaje('listasMensaje');

let teams = [];
let tournaments = [];
let selectedTournament = null;
let genericListSelected = false;
let selectedTeam = null;
let rosterPlayers = [];
let rosterExtras = [];
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
  return `${Number(value).toLocaleString('es-ES', { useGrouping: 'always', maximumFractionDigits: 0 })} m.o.`;
}

function formatearCaracteristica(stat, value) {
  if (value === null) return '—';
  return stat === 'ag' || stat === 'pa' || stat === 'av' ? `${value}+` : String(value);
}

function obtenerEstadisticas(player) {
  return Object.fromEntries(playerStatFields.map(({ id }) => {
    const baseValue = player.position.stats[id];
    if (baseValue === null) return [id, null];
    const improvements = player.statImprovements[id] || 0;
    const direction = id === 'ag' || id === 'pa' ? -1 : 1;
    return [id, baseValue + direction * improvements];
  }));
}

function obtenerCosteMejoras(player) {
  return playerStatFields.reduce(
    (total, { id }) => total + (player.statImprovements[id] || 0) * playerStatPrices[id],
    0
  );
}

function obtenerCosteHabilidades(player) {
  return player.skills.reduce((total, skill, index) => total
    + (skill.primary ? skillPrices.primary : skillPrices.secondary)
    + (skill.elite ? skillPrices.elite : 0)
    + (index > 0 ? skillPrices.secondSkill : 0), 0);
}

function puedeMejorarCaracteristica(player, stat) {
  const currentValue = obtenerEstadisticas(player)[stat];
  if (currentValue === null || (player.statImprovements[stat] || 0) >= maxImprovementsPerStat) return false;
  return stat === 'ag' || stat === 'pa'
    ? currentValue > playerStatMaximums[stat]
    : currentValue < playerStatMaximums[stat];
}

function textoEstadisticas(stats) {
  return playerStatFields
    .map(({ id, label }) => `${label} ${formatearCaracteristica(id, stats[id])}`)
    .join(' · ');
}

function etiquetaMaxHabilidades() {
  const noun = maxSkillsPerPlayer === 1 ? 'habilidad añadida' : 'habilidades añadidas';
  return `${maxSkillsPerPlayer} ${noun}`;
}

function crearElemento(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function obtenerCostes() {
  let playersCost = 0;
  let playerStatCost = 0;
  let primarySkillCost = 0;
  let secondarySkillCost = 0;
  let eliteCost = 0;
  let secondSkillCost = 0;
  let staffCost = 0;
  let inducementCost = 0;

  rosterPlayers.forEach(player => {
    playersCost += player.position.cost;
    playerStatCost += obtenerCosteMejoras(player);
    player.skills.forEach((skill, index) => {
      if (skill.primary) primarySkillCost += skillPrices.primary;
      else secondarySkillCost += skillPrices.secondary;
      if (skill.elite) eliteCost += skillPrices.elite;
      if (index > 0) secondSkillCost += skillPrices.secondSkill;
    });
  });

  rosterExtras.forEach(extra => {
    const definition = obtenerDefinicionExtra(extra.id);
    const cost = obtenerCosteExtra(definition) * extra.quantity;
    if (definition.group === 'Cuadro técnico') staffCost += cost;
    else inducementCost += cost;
  });

  return {
    playersCost,
    playerStatCost,
    primarySkillCost,
    secondarySkillCost,
    eliteCost,
    secondSkillCost,
    staffCost,
    inducementCost,
    total: playersCost + playerStatCost + primarySkillCost + secondarySkillCost + eliteCost + secondSkillCost
      + staffCost + inducementCost
  };
}

function actualizarResumen() {
  const costs = obtenerCostes();
  const budget = Math.max(0, Number(teamBudgetInput.value) || 0);
  const remaining = budget - costs.total;

  document.getElementById('summaryTournament').textContent = selectedTournament
    ? `${selectedTournament.name} (${selectedTournament.year})`
    : genericListSelected ? 'Lista genérica (sin torneo)' : 'Selecciona un torneo';
  document.getElementById('summaryRace').textContent = selectedTeam?.name || 'Selecciona un equipo';
  document.getElementById('summaryTeamName').textContent = rosterNameInput.value.trim() || 'Sin nombre';
  document.getElementById('summaryPlayersCost').textContent = formatearCoste(costs.playersCost);
  document.getElementById('summaryPlayerStatsCost').textContent = formatearCoste(costs.playerStatCost);
  document.getElementById('summaryPrimaryCost').textContent = formatearCoste(costs.primarySkillCost);
  document.getElementById('summarySecondaryCost').textContent = formatearCoste(costs.secondarySkillCost);
  document.getElementById('summaryEliteCost').textContent = formatearCoste(costs.eliteCost);
  document.getElementById('summarySecondSkillCost').textContent = formatearCoste(costs.secondSkillCost);
  document.getElementById('summaryStaffCost').textContent = formatearCoste(costs.staffCost);
  document.getElementById('summaryInducementCost').textContent = formatearCoste(costs.inducementCost);
  document.getElementById('summaryTotalCost').textContent = formatearCoste(costs.total);
  document.getElementById('summaryBudget').textContent = formatearCoste(budget);
  const remainingElement = document.getElementById('summaryRemaining');
  remainingElement.textContent = formatearCoste(remaining);
  remainingElement.classList.toggle('over-budget', remaining < 0);
  document.getElementById('summaryPlayerCount').textContent = `${rosterPlayers.length} jugadores (máximo ${maxPlayers}).`;
  document.getElementById('budgetWarning').textContent = remaining < 0
    ? 'El coste supera el presupuesto. Reduce gastos o aumenta el presupuesto para descargar o subir.'
    : '';
  document.getElementById('skillPricingNote').textContent = selectedTournament
    ? `Tarifas de ${selectedTournament.name}: ${formatearCoste(skillPrices.primary)} primaria, `
      + `${formatearCoste(skillPrices.secondary)} secundaria; suplemento élite de `
      + `${formatearCoste(skillPrices.elite)} y ${formatearCoste(skillPrices.secondSkill)} `
      + 'por la segunda habilidad. Habilidades élite: Placar, Esquivar, Defensa y Golpe mortífero. '
      + `Máximo: ${etiquetaMaxHabilidades()} por jugador.`
    : genericListSelected
      ? `Lista genérica: tarifas predeterminadas de ${formatearCoste(skillPrices.primary)} primaria, `
        + `${formatearCoste(skillPrices.secondary)} secundaria, suplemento élite de `
        + `${formatearCoste(skillPrices.elite)} y ${formatearCoste(skillPrices.secondSkill)} `
        + `por segunda habilidad. Máximo: ${etiquetaMaxHabilidades()} por jugador.`
      : 'Selecciona un modo de lista para consultar sus tarifas de habilidades.';
  const rosterReady = Boolean(
    (selectedTournament || genericListSelected)
    && selectedTeam
    && rosterPlayers.length
    && rosterNameInput.value.trim()
    && remaining >= 0
  );
  downloadButton.disabled = false;
  const canUploadRoster = Boolean(
    selectedTournament
    && selectedTournament.rosters_open === true
    && selectedTournament.status === 'active'
  );
  uploadButton.classList.toggle('hide', !canUploadRoster);
  uploadButton.disabled = !rosterReady || !canUploadRoster;
}

function obtenerDefinicionExtra(id) {
  return rosterExtraCatalog.find(extra => extra.id === id);
}

function obtenerCosteExtra(extra) {
  return extra.teamPrices?.[selectedTeam?.name] ?? extra.price;
}

function obtenerCantidadExtra(id) {
  return rosterExtras.find(extra => extra.id === id)?.quantity || 0;
}

function actualizarSelectorExtras() {
  rosterExtraSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = selectedTeam ? 'Selecciona un elemento' : 'Selecciona primero un equipo';
  rosterExtraSelect.appendChild(placeholder);

  rosterExtraCatalog.forEach(extra => {
    const quantity = obtenerCantidadExtra(extra.id);
    const option = document.createElement('option');
    option.value = extra.id;
    option.textContent = `${extra.name} — ${formatearCoste(obtenerCosteExtra(extra))} (${quantity}/${extra.max})`;
    option.disabled = !(selectedTournament || genericListSelected) || !selectedTeam || quantity >= extra.max;
    rosterExtraSelect.appendChild(option);
  });
  rosterExtraSelect.disabled = !(selectedTournament || genericListSelected) || !selectedTeam;
  addRosterExtraButton.disabled = !(selectedTournament || genericListSelected) || !selectedTeam;
}

function renderizarExtras() {
  rosterExtrasContainer.replaceChildren();
  ['Cuadro técnico', 'Incentivos'].forEach(groupName => {
    const groupExtras = rosterExtras
      .map(extra => ({ ...extra, definition: obtenerDefinicionExtra(extra.id) }))
      .filter(extra => extra.definition.group === groupName);
    if (!groupExtras.length) return;

    rosterExtrasContainer.appendChild(crearElemento('h4', 'roster-extra-heading', groupName));
    const list = crearElemento('ul', 'roster-extra-group');
    groupExtras.forEach(extra => {
      const item = crearElemento('li', 'roster-extra');
      const total = obtenerCosteExtra(extra.definition) * extra.quantity;
      item.appendChild(crearElemento(
        'span',
        '',
        `${extra.definition.name} × ${extra.quantity} (${formatearCoste(obtenerCosteExtra(extra.definition))} c/u) — ${formatearCoste(total)}`
      ));

      const controls = crearElemento('div', 'roster-extra-controls');
      const removeButton = crearElemento('button', 'roster-remove-skill', '−');
      removeButton.type = 'button';
      removeButton.setAttribute('aria-label', `Quitar una unidad de ${extra.definition.name}`);
      removeButton.disabled = extra.quantity <= 0;
      removeButton.addEventListener('click', () => cambiarCantidadExtra(extra.id, -1));
      const addButton = crearElemento('button', 'roster-remove-skill', '+');
      addButton.type = 'button';
      addButton.setAttribute('aria-label', `Añadir una unidad de ${extra.definition.name}`);
      addButton.disabled = extra.quantity >= extra.definition.max;
      addButton.addEventListener('click', () => cambiarCantidadExtra(extra.id, 1));
      controls.append(removeButton, addButton);
      item.appendChild(controls);
      list.appendChild(item);
    });
    rosterExtrasContainer.appendChild(list);
  });
  actualizarSelectorExtras();
  actualizarResumen();
}

function cambiarCantidadExtra(id, amount) {
  const definition = obtenerDefinicionExtra(id);
  const existing = rosterExtras.find(extra => extra.id === id);
  const nextQuantity = (existing?.quantity || 0) + amount;
  if (!definition || nextQuantity < 0 || nextQuantity > definition.max) return;

  const costDifference = obtenerCosteExtra(definition) * amount;
  const budget = Math.max(0, Number(teamBudgetInput.value) || 0);
  if (costDifference > 0 && obtenerCostes().total + costDifference > budget) {
    mostrarMensaje('El elemento supera el presupuesto disponible.', 'red');
    return;
  }

  if (nextQuantity === 0) {
    rosterExtras = rosterExtras.filter(extra => extra.id !== id);
  } else if (existing) {
    existing.quantity = nextQuantity;
  } else {
    rosterExtras.push({ id, quantity: nextQuantity });
  }
  renderizarExtras();
  mostrarMensaje('', 'blue');
}

function agregarExtra(event) {
  event.preventDefault();
  if ((!selectedTournament && !genericListSelected) || !selectedTeam) {
    mostrarMensaje('Selecciona un modo de lista y un equipo antes de añadir elementos.', 'red');
    return;
  }
  if (!obtenerDefinicionExtra(rosterExtraSelect.value)) {
    mostrarMensaje('Selecciona un elemento válido del cuadro técnico o los incentivos.', 'red');
    return;
  }
  cambiarCantidadExtra(rosterExtraSelect.value, 1);
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

  if (!selectedTeam || (!selectedTournament && !genericListSelected)) {
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
    option.textContent = `${position.name} — ${formatearCoste(position.cost)} (${count}/${position.max})`
      + ` · ${textoEstadisticas(position.stats)}`;
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

function actualizarEstadisticas(player, container) {
  const stats = obtenerEstadisticas(player);
  const list = crearElemento('div', 'roster-stat-grid');

  playerStatFields.forEach(({ id, label }) => {
    const item = crearElemento('div', 'roster-stat');
    item.appendChild(crearElemento('span', 'roster-stat-label', label));
    item.appendChild(crearElemento(
      'strong',
      'roster-stat-value',
      formatearCaracteristica(id, stats[id])
    ));

    const controls = crearElemento('div', 'roster-stat-controls');
    const improvementCount = player.statImprovements[id] || 0;
    const removeButton = crearElemento('button', 'roster-stat-button', '−');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Quitar mejora de ${label}`);
    removeButton.disabled = improvementCount === 0;
    removeButton.addEventListener('click', () => cambiarMejoraCaracteristica(player, id, -1));

    const addButton = crearElemento('button', 'roster-stat-button', '+');
    addButton.type = 'button';
    addButton.setAttribute('aria-label', `Mejorar ${label} por ${formatearCoste(playerStatPrices[id])}`);
    addButton.disabled = !puedeMejorarCaracteristica(player, id);
    addButton.addEventListener('click', () => cambiarMejoraCaracteristica(player, id, 1));
    controls.append(removeButton, addButton);
    item.appendChild(controls);
    item.appendChild(crearElemento(
      'small',
      'roster-stat-price',
      stats[id] === null ? 'No disponible' : formatearCoste(playerStatPrices[id])
    ));
    list.appendChild(item);
  });

  container.appendChild(list);
}

function cambiarMejoraCaracteristica(player, stat, amount) {
  if (!playerStatFields.some(field => field.id === stat)) {
    mostrarMensaje('La característica seleccionada no es válida.', 'red');
    return;
  }
  if (amount < 0 && !(player.statImprovements[stat] || 0)) return;
  if (amount > 0 && !puedeMejorarCaracteristica(player, stat)) {
    mostrarMensaje('Esta característica ha alcanzado el límite permitido por las reglas.', 'red');
    return;
  }

  const costDifference = playerStatPrices[stat] * amount;
  const budget = Math.max(0, Number(teamBudgetInput.value) || 0);
  if (costDifference > 0 && obtenerCostes().total + costDifference > budget) {
    mostrarMensaje('La mejora supera el presupuesto disponible.', 'red');
    return;
  }

  player.statImprovements[stat] = (player.statImprovements[stat] || 0) + amount;
  renderizarPlantilla();
  mostrarMensaje('', 'blue');
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
  if (player.skills.length >= maxSkillsPerPlayer) {
    const message = player.skills.length > maxSkillsPerPlayer
      ? `Este jugador supera el límite actual de ${etiquetaMaxHabilidades()}; quita alguna habilidad para ajustarte al torneo.`
      : `Máximo del torneo: ${etiquetaMaxHabilidades()} por jugador.`;
    skillForm.appendChild(crearElemento('p', 'roster-player-note', message));
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

    const playerNameLabel = crearElemento('label', 'roster-player-note', `Nombre del jugador ${index + 1}`);
    const playerNameInput = crearElemento('input', 'roster-player-name-input');
    playerNameInput.type = 'text';
    playerNameInput.maxLength = 40;
    playerNameInput.value = player.name;
    playerNameInput.placeholder = `${player.position.name} (opcional)`;
    playerNameInput.setAttribute('aria-label', `Nombre del jugador ${index + 1}`);
    playerNameInput.addEventListener('input', () => {
      player.name = playerNameInput.value;
    });
    playerNameLabel.appendChild(playerNameInput);
    card.appendChild(playerNameLabel);

    const statCost = obtenerCosteMejoras(player);
    const skillCost = obtenerCosteHabilidades(player);
    const totalCost = player.position.cost + statCost + skillCost;
    card.appendChild(crearElemento(
      'p',
      'roster-player-cost',
      `Coste: ${formatearCoste(totalCost)}`
        + ` (base ${formatearCoste(player.position.cost)}`
        + (statCost ? ` + mejoras ${formatearCoste(statCost)}` : '')
        + (skillCost ? ` + habilidades ${formatearCoste(skillCost)}` : '')
        + ')'
    ));
    card.appendChild(crearElemento('p', 'roster-player-note', textoEstadisticas(obtenerEstadisticas(player))));
    actualizarEstadisticas(player, card);
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

function obtenerNombreJugador(player) {
  return player.name.trim() || player.position.name;
}

function seleccionarEquipo() {
  selectedTeam = teams.find(team => team.name === teamSelect.value) || null;
  rosterPlayers = [];
  rosterExtras = [];
  nextPlayerId = 1;
  actualizarSelectorPosiciones();
  actualizarSelectorExtras();
  renderizarPlantilla();
  renderizarExtras();
  mostrarMensaje('', 'blue');
}

function seleccionarTorneo() {
  selectedTournament = tournaments.find(tournament => String(tournament.id) === tournamentSelect.value) || null;
  genericListSelected = !tournamentSelect.value;
  if (selectedTournament && !rosterNameInput.value.trim()) {
    rosterNameInput.value = selectedTournament.team_name;
  }
  skillPrices = selectedTournament
    ? {
      primary: Number(selectedTournament.primary_skill_cost),
      secondary: Number(selectedTournament.secondary_skill_cost),
      elite: Number(selectedTournament.elite_skill_surcharge),
      secondSkill: Number(selectedTournament.second_skill_surcharge)
    }
    : { ...defaultSkillPrices };
  maxSkillsPerPlayer = selectedTournament
    ? Number(selectedTournament.max_added_skills_per_player)
    : defaultMaxSkillsPerPlayer;
  teamSelect.disabled = !(selectedTournament || genericListSelected);
  actualizarSelectorPosiciones();
  actualizarSelectorExtras();
  actualizarResumen();
  renderizarPlantilla();
  renderizarExtras();
  mostrarMensaje('', 'blue');
}

async function cargarCatalogo() {
  const [response, statsResponse, registrations, tournamentCatalog] = await Promise.all([
    fetch(rosterDataUrl),
    fetch(playerStatsUrl),
    obtenerDatos(
      `tournament_users?select=id,tournament_id,team_name&user_id=eq.${encodeURIComponent(getSesion().user.id)}`
    ),
    obtenerDatos(
      'tournaments?select=id,name,year,status,rosters_open,primary_skill_cost,secondary_skill_cost,elite_skill_surcharge,second_skill_surcharge,max_added_skills_per_player&order=year.desc,name.asc'
    )
  ]);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el catálogo de equipos (HTTP ${response.status}).`);
  }
  if (!statsResponse.ok) {
    throw new Error(`No se pudieron cargar las características de jugadores (HTTP ${statsResponse.status}).`);
  }
  const catalog = await response.json();
  const statsCatalog = await statsResponse.json();
  if (!Array.isArray(catalog) || !catalog.length) {
    throw new Error('El catálogo de equipos está vacío o tiene un formato no válido.');
  }
  if (!statsCatalog || typeof statsCatalog !== 'object' || Array.isArray(statsCatalog)) {
    throw new Error('El catálogo de características de jugadores tiene un formato no válido.');
  }
  teams = catalog.map(team => ({
    ...team,
    positions: team.positions.map(position => {
      const stats = statsCatalog[`${team.name}|${position.name}`] || statsCatalog[position.name];
      const validStats = stats && playerStatFields.every(({ id }) => (
        stats[id] === null || (Number.isInteger(stats[id]) && stats[id] >= 1)
      ));
      if (!validStats) {
        throw new Error(`No hay características válidas para el tipo de jugador "${position.name}".`);
      }
      return { ...position, stats };
    })
  }));
  if (!Array.isArray(registrations) || !Array.isArray(tournamentCatalog)) {
    throw new Error('No se pudieron cargar las inscripciones del usuario.');
  }
  const registrationByTournamentId = new Map(
    registrations.map(registration => [String(registration.tournament_id), registration])
  );
  tournaments = tournamentCatalog
    .filter(tournament => registrationByTournamentId.has(String(tournament.id)))
    .map(tournament => {
      const registration = registrationByTournamentId.get(String(tournament.id));
      return {
        ...tournament,
        registrationId: registration.id,
        team_name: registration.team_name
      };
    });
  tournamentSelect.replaceChildren();
  const tournamentPlaceholder = document.createElement('option');
  tournamentPlaceholder.value = '';
  tournamentPlaceholder.textContent = 'Lista genérica (sin torneo; tarifas predeterminadas)';
  tournamentSelect.appendChild(tournamentPlaceholder);
  tournaments.forEach(tournament => {
    const option = document.createElement('option');
    option.value = String(tournament.id);
    option.textContent = `${tournament.name} (${tournament.year}) — ${tournament.team_name}`
      + (tournament.rosters_open === false || tournament.status !== 'active' ? ' — rosters cerrados' : '');
    tournamentSelect.appendChild(option);
  });
  tournamentSelect.disabled = false;
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
  teamSelect.disabled = false;
  seleccionarTorneo();
  if (!tournaments.length) {
    mostrarMensaje(
      'Puedes crear una lista genérica con las tarifas predeterminadas. Para subirla a un torneo, primero debes estar inscrito.',
      'blue'
    );
  }
}

function agregarJugador(event) {
  event.preventDefault();
  if (!selectedTournament && !genericListSelected) {
    mostrarMensaje('Selecciona un modo de lista para aplicar las tarifas de habilidades.', 'red');
    return;
  }
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

  rosterPlayers.push({ id: nextPlayerId++, name: '', position, skills: [], statImprovements: {} });
  renderizarPlantilla();
  mostrarMensaje('', 'blue');
}

function envolverSegmentos(context, segments, maxWidth) {
  const lines = [[]];
  let lineWidth = 0;

  segments.forEach(segment => {
    segment.text.split(/\s+/).filter(Boolean).forEach(word => {
      const currentLine = lines[lines.length - 1];
      const separator = currentLine.length && !/^[,.;:!?)]/.test(word) ? ' ' : '';
      const wordWidth = context.measureText(`${separator}${word}`).width;
      if (lineWidth + wordWidth > maxWidth && currentLine.length) {
        lines.push([]);
        lineWidth = 0;
      }

      const nextLine = lines[lines.length - 1];
      const nextSeparator = nextLine.length && !/^[,.;:!?)]/.test(word) ? ' ' : '';
      const lastSegment = nextLine[nextLine.length - 1];
      if (lastSegment?.color === segment.color) {
        lastSegment.text += `${nextSeparator}${word}`;
      } else {
        nextLine.push({ text: `${nextSeparator}${word}`, color: segment.color });
      }
      lineWidth += context.measureText(`${nextSeparator}${word}`).width;
    });
  });

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
    const skillSegments = [{ text: 'Habilidades:', color: '#444444' }];
    const baseSkills = player.position.baseSkills;
    if (baseSkills.length) {
      skillSegments.push({ text: baseSkills.join(', '), color: '#444444' });
    }
    player.skills.forEach(skill => {
      const type = skill.primary ? 'primaria' : 'secundaria';
      skillSegments.push({
        text: `${baseSkills.length || player.skills.indexOf(skill) ? ', ' : ''}`
          + `${skill.name} (${type}${skill.elite ? ', élite' : ''})`,
        color: '#ac342f'
      });
    });
    if (!baseSkills.length && !player.skills.length) {
      skillSegments.push({ text: 'Ninguna', color: '#444444' });
    }
    const skillLines = envolverSegmentos(measurementContext, skillSegments, 505);
    return {
      type: 'player',
      player,
      index,
      skillLines,
      height: 17 + skillLines.length * 12 + 6
    };
  });
  ['Cuadro técnico', 'Incentivos'].forEach(groupName => {
    const extras = rosterExtras
      .map(extra => ({ ...extra, definition: obtenerDefinicionExtra(extra.id) }))
      .filter(extra => extra.definition.group === groupName);
    if (!extras.length) return;
    rows.push({ type: 'section', heading: groupName, height: 22, keepWithNext: true });
    extras.forEach(extra => {
      rows.push({
        type: 'extra',
        heading: `${extra.definition.name} × ${extra.quantity}`,
        cost: obtenerCosteExtra(extra.definition) * extra.quantity,
        height: 20
      });
    });
  });

  let currentPage = [];
  let currentY = 310;
  rows.forEach((row, index) => {
    const nextRowHeight = row.keepWithNext ? rows[index + 1]?.height || 0 : 0;
    if (currentY + row.height + nextRowHeight > 790) {
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
    context.fillText(
      selectedTournament ? `${selectedTournament.name} (${selectedTournament.year})` : 'Lista genérica (sin torneo)',
      42,
      88
    );
    context.fillText(`Página ${pageIndex + 1} de ${pageRowsList.length}`, 460, 48);

    if (pageIndex === 0) {
      context.fillStyle = '#ac342f';
      context.fillRect(42, 100, 511, 1.5);
      context.font = 'bold 12px Arial';
      context.fillStyle = '#25396c';
      context.fillText('Resumen de costes', 42, 124);
      const costLines = [
        ['Jugadores', costs.playersCost],
        ['Mejoras de características', costs.playerStatCost],
        ['Habilidades primarias', costs.primarySkillCost],
        ['Habilidades secundarias', costs.secondarySkillCost],
        ['Habilidades élite', costs.eliteCost],
        ['Segunda habilidad por jugador', costs.secondSkillCost],
        ['Cuadro técnico', costs.staffCost],
        ['Incentivos', costs.inducementCost],
        ['Coste total', costs.total],
        ['Presupuesto', budget],
        ['Restante', budget - costs.total]
      ];
      context.font = '10px Arial';
      costLines.forEach(([label, amount], index) => {
        const x = index % 2 === 0 ? 42 : 305;
        const y = 140 + Math.floor(index / 2) * 16;
        context.fillStyle = label === 'Coste total' ? '#ac342f' : '#25396c';
        context.fillText(`${label}: ${formatearCoste(amount)}`, x, y);
      });
      context.fillStyle = '#ac342f';
      context.fillRect(42, 244, 511, 1);
      context.font = 'bold 12px Arial';
      context.fillStyle = '#25396c';
      context.fillText(`Plantilla (${rosterPlayers.length}/${maxPlayers})`, 42, 267);
    }

    let y = pageIndex === 0 ? 292 : 108;
    pageRows.forEach(row => {
      if (row.type === 'section') {
        context.font = 'bold 11px Arial';
        context.fillStyle = '#ac342f';
        context.fillText(row.heading, 42, y);
      } else if (row.type === 'extra') {
        context.font = '10px Arial';
        context.fillStyle = '#25396c';
        context.fillText(row.heading, 48, y);
        context.textAlign = 'right';
        context.fillText(formatearCoste(row.cost), 553, y);
        context.textAlign = 'left';
      } else {
        const heading = `Jugador ${row.index + 1} — ${obtenerNombreJugador(row.player)}`;
        const stats = obtenerEstadisticas(row.player);
        const statLabels = playerStatFields.map(({ id, label }) => ({
          id,
          text: stats[id] === null
            ? `${label}—`
            : `${label}${id === 'ag' || id === 'pa' || id === 'av' ? '+' : ''}${stats[id]}`
        }));
        const contentWidth = 400;
        let fontSize = 10;
        while (fontSize >= 7) {
          measurementContext.font = `bold ${fontSize}px Arial`;
          const headingWidth = measurementContext.measureText(heading).width;
          measurementContext.font = `${fontSize}px Arial`;
          const statsWidth = statLabels.reduce(
            (width, stat) => width + measurementContext.measureText(`  ${stat.text}`).width,
            0
          );
          if (headingWidth + statsWidth <= contentWidth) break;
          fontSize -= 0.5;
        }
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = '#25396c';
        context.fillText(heading, 42, y);
        let statX = 42 + context.measureText(heading).width + 8;
        context.font = `${fontSize}px Arial`;
        statLabels.forEach(({ id, text }) => {
          context.fillStyle = row.player.statImprovements[id] ? '#ac342f' : '#25396c';
          context.fillText(text, statX, y);
          statX += context.measureText(`${text}  `).width;
        });
        context.textAlign = 'right';
        context.font = '10px Arial';
        context.fillStyle = '#25396c';
        context.fillText(
          formatearCoste(
            row.player.position.cost
            + obtenerCosteMejoras(row.player)
            + obtenerCosteHabilidades(row.player)
          ),
          553,
          y
        );
        context.textAlign = 'left';
        context.font = '9px Arial';
        row.skillLines.forEach((line, lineIndex) => {
          let skillX = 48;
          line.forEach(segment => {
            context.fillStyle = segment.color;
            context.fillText(segment.text, skillX, y + 13 + lineIndex * 12);
            skillX += context.measureText(segment.text).width;
          });
        });
      }
      y += row.height;
      context.strokeStyle = '#dddddd';
      context.beginPath();
      context.moveTo(42, y - 12);
      context.lineTo(553, y - 12);
      context.stroke();
    });

    context.font = '8px Arial';
    context.fillStyle = '#666666';
    context.fillText(
      `${selectedTournament ? `Tarifas ${selectedTournament.name}` : 'Tarifas predeterminadas'}: `
      + `${formatearCoste(skillPrices.primary)} primaria / `
      + `${formatearCoste(skillPrices.secondary)} secundaria; +${formatearCoste(skillPrices.elite)} élite.`,
      42,
      810
    );
    context.fillText(
      `+${formatearCoste(skillPrices.secondSkill)} por segunda habilidad. Máximo: `
      + `${etiquetaMaxHabilidades()} por jugador.`,
      42,
      821
    );
    context.fillText(
      `Mejoras de características: MA/PA ${formatearCoste(playerStatPrices.ma)}, AG `
      + `${formatearCoste(playerStatPrices.ag)}, ST ${formatearCoste(playerStatPrices.st)}, `
      + `AV ${formatearCoste(playerStatPrices.av)}; máximo 2 por característica.`,
      42,
      832
    );
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

function validarRoster() {
  if (!selectedTournament && !genericListSelected) {
    mostrarMensaje('Selecciona un torneo o el modo de lista genérica antes de continuar.', 'red');
    return false;
  }
  if (!selectedTeam || !rosterPlayers.length) {
    mostrarMensaje('Selecciona un equipo y añade al menos un jugador antes de continuar.', 'red');
    return false;
  }
  if (!rosterNameInput.value.trim()) {
    rosterNameInput.focus();
    mostrarMensaje('Introduce un nombre para el equipo.', 'red');
    return false;
  }
  if (obtenerCostes().total > Math.max(0, Number(teamBudgetInput.value) || 0)) {
    mostrarMensaje('El coste supera el presupuesto del roster.', 'red');
    return false;
  }
  return true;
}

async function crearArchivoRoster() {
  const safeName = rosterNameInput.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
  const fileName = `roster-${safeName || 'equipo'}.pdf`;
  const pdf = await crearPdf(crearPaginasRoster());
  return new File([pdf], fileName, { type: 'application/pdf' });
}

async function descargarRoster() {
  if (!validarRoster()) return;

  downloadButton.disabled = true;
  mostrarMensaje('Generando el PDF...', 'blue');
  try {
    const archivo = await crearArchivoRoster();
    const link = document.createElement('a');
    const url = URL.createObjectURL(archivo);
    link.href = url;
    link.download = archivo.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarMensaje('Roster descargado correctamente.', 'blue');
  } catch (error) {
    console.error('Error generando el roster PDF:', error);
    mostrarMensaje(`No se pudo generar el PDF: ${error.message}`, 'red');
  } finally {
    actualizarResumen();
  }
}

async function subirRoster() {
  if (!selectedTournament) {
    mostrarMensaje('Selecciona un torneo para subir el roster.', 'red');
    return;
  }
  if (!validarRoster()) return;
  if (selectedTournament.rosters_open !== true || selectedTournament.status !== 'active') {
    mostrarMensaje('El torneo ha cerrado los rosters. Contacta con el organizador.', 'red');
    return;
  }

  uploadButton.disabled = true;
  downloadButton.disabled = true;
  mostrarMensaje('Generando y subiendo el roster...', 'blue');
  try {
    const archivo = await crearArchivoRoster();
    const ruta = `${selectedTournament.registrationId}/roster.pdf`;
    await subirArchivo('rosters', ruta, archivo, { method: 'PUT' });
    await enviarDatos('rosters?on_conflict=tournament_user_id', {
      prefer: 'resolution=merge-duplicates,return=representation',
      body: {
        tournament_user_id: Number(selectedTournament.registrationId),
        file_name: archivo.name,
        storage_path: ruta,
        mime_type: 'application/pdf'
      }
    });
    mostrarMensaje('Roster subido correctamente al torneo.', 'blue');
  } catch (error) {
    console.error('Error al subir el roster:', error);
    mostrarMensaje(`No se pudo subir el roster: ${error.message}`, 'red');
  } finally {
    actualizarResumen();
  }
}

tournamentSelect.addEventListener('change', seleccionarTorneo);
teamSelect.addEventListener('change', seleccionarEquipo);
rosterNameInput.addEventListener('input', actualizarResumen);
teamBudgetInput.addEventListener('input', actualizarResumen);
addPlayerForm.addEventListener('submit', agregarJugador);
addRosterExtraForm.addEventListener('submit', agregarExtra);
downloadButton.addEventListener('click', descargarRoster);
uploadButton.addEventListener('click', subirRoster);

async function inicializarPagina() {
  try {
    await cargarCatalogo();
    actualizarSelectorPosiciones();
    renderizarPlantilla();
    renderizarExtras();
  } catch (error) {
    console.error('Error cargando el catálogo para el generador de listas:', error);
    mostrarMensaje(`No se pudo cargar el catálogo de equipos: ${error.message}`, 'red');
  }
}

conectarSesion({
  alEntrar: inicializarPagina,
  alSalir: () => {
    teams = [];
    selectedTeam = null;
    selectedTournament = null;
    genericListSelected = false;
    tournaments = [];
    rosterPlayers = [];
    rosterExtras = [];
    tournamentSelect.replaceChildren();
    teamSelect.replaceChildren();
    tournamentSelect.disabled = true;
    teamSelect.disabled = true;
    uploadButton.disabled = true;
    skillPrices = { ...defaultSkillPrices };
    maxSkillsPerPlayer = defaultMaxSkillsPerPlayer;
    renderizarPlantilla();
    renderizarExtras();
  }
});
