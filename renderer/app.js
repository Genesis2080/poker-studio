'use strict';

/* ═══════════════════════════════════════════════════════════
   POKER STUDY APP — app.js
   ═══════════════════════════════════════════════════════════ */

// ── Estado global ────────────────────────────────────────────
let APP = {
  progress:  {},   // { listId_idx: true }
  notes:     [],   // [{ id, title, body, tag, createdAt, updatedAt }]
  sessions:  [],   // [{ id, date, duration, topics, notes, rating }]
  flashcards: {    // { custom: [], results: { cardId: { good,ok,bad } } }
    custom:  [],
    results: {}
  }
};

let currentNoteId   = null;
let currentDeck     = 'all';
let currentFcIndex  = 0;
let fcDeck          = [];
let fcSessionRating = 0;
let sessionRatingVal = 0;
let isFlipped = false;

// ── Persistencia (Electron IPC) ──────────────────────────────
async function loadApp() {
  try {
    const data = await window.electronAPI.loadData();
    if (data && typeof data === 'object') {
      APP = { ...APP, ...data };
      APP.flashcards = APP.flashcards || { custom: [], results: {} };
      APP.flashcards.custom   = APP.flashcards.custom   || [];
      APP.flashcards.results  = APP.flashcards.results  || {};
    }
  } catch (e) {
    console.warn('No se pudo cargar datos:', e);
  }

  // Mostrar ruta del archivo de datos
  try {
    const p = await window.electronAPI.getDataPath();
    document.getElementById('data-path-label').textContent = p;
  } catch {}
}

async function saveApp() {
  try { await window.electronAPI.saveData(APP); }
  catch (e) { console.warn('Error guardando:', e); }
}

// ── Vista navigation ─────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + view).classList.add('active');
      if (view === 'stats') renderStats();
    });
  });
}

// ════════════════════════════════════════════════════════════
// GUÍA DE ESTUDIO
// ════════════════════════════════════════════════════════════

const GUIDE_DATA = [
  {
    id: 'fundamentos', label: '♠ Fundamentos',
    title: '♠ Fundamentos Generales',
    subtitle: 'Los pilares conceptuales del póker moderno',
    render: renderFundamentos
  },
  {
    id: 'preflop', label: '♥ Preflop',
    title: '♥ Preflop',
    subtitle: 'Rangos, sizings y construcción de tu estrategia antes del flop',
    render: renderPreflop
  },
  {
    id: 'flop', label: '♣ Flop',
    title: '♣ Flop',
    subtitle: 'Tipos de board, c-bet y construcción de rangos',
    render: renderFlop
  },
  {
    id: 'turn', label: '♦ Turn',
    title: '♦ Turn',
    subtitle: 'Segunda calle — presión, polarización y control del bote',
    render: renderTurn
  },
  {
    id: 'river', label: '♠ River',
    title: '♠ River',
    subtitle: 'Decisión final — valor, bluff y blockers',
    render: renderRiver
  },
  {
    id: 'spots', label: '♥ Spots',
    title: '♥ Spots Clave',
    subtitle: 'Situaciones de alta frecuencia que debes dominar',
    render: renderSpots
  },
  {
    id: 'torneos', label: '♣ MTT',
    title: '♣ Torneos MTT',
    subtitle: 'Estrategia específica para torneos multi-mesa',
    render: renderTorneos
  },
  {
    id: 'icm', label: '♦ ICM',
    title: '♦ ICM Avanzado',
    subtitle: 'Independent Chip Model — valor real de tus fichas',
    render: renderICM
  },
  {
    id: 'reglas', label: '★ Reglas',
    title: '★ Reglas de Oro',
    subtitle: 'Los principios que lo gobiernan todo',
    render: renderReglas
  }
];

function initGuide() {
  const tabs = document.querySelectorAll('.sub-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showGuideSection(tab.dataset.section);
    });
  });
  // Render all sections hidden
  const body = document.getElementById('guide-body');
  body.innerHTML = '';
  GUIDE_DATA.forEach(s => {
    const div = document.createElement('div');
    div.className = 'g-section';
    div.id = 'gs-' + s.id;
    div.innerHTML = `<div class="g-title">${s.title}</div><p class="g-subtitle">${s.subtitle}</p>`;
    const content = document.createElement('div');
    s.render(content);
    div.appendChild(content);
    body.appendChild(div);
  });
  showGuideSection('fundamentos');
}

function showGuideSection(id) {
  document.querySelectorAll('.g-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('gs-' + id);
  if (el) el.classList.add('active');
}

// ── Helpers HTML ─────────────────────────────────────────────
function conceptList(id, items) {
  const ul = document.createElement('ul');
  ul.className = 'concept-list';
  ul.id = id;
  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'concept-item' + (APP.progress[id + '_' + i] ? ' done' : '');
    li.innerHTML = `<div class="concept-check"></div>
      <span class="concept-text">${item.text}</span>
      ${item.tag ? `<span class="concept-tag">${item.tag}</span>` : ''}`;
    li.addEventListener('click', () => toggleConcept(li, id + '_' + i));
    ul.appendChild(li);
  });
  return ul;
}

function toggleConcept(el, key) {
  if (APP.progress[key]) {
    delete APP.progress[key];
    el.classList.remove('done');
  } else {
    APP.progress[key] = true;
    el.classList.add('done');
  }
  saveApp();
  updateGlobalProgress();
}

function card(title, inner) {
  const d = document.createElement('div');
  d.className = 'g-card';
  d.innerHTML = `<div class="g-card-title">${title}</div>`;
  if (typeof inner === 'string') d.innerHTML += inner;
  else d.appendChild(inner);
  return d;
}

function grid2(...children) {
  const d = document.createElement('div');
  d.className = 'g-grid';
  children.forEach(c => d.appendChild(c));
  return d;
}

function grid3(...children) {
  const d = document.createElement('div');
  d.className = 'g-grid-3';
  children.forEach(c => d.appendChild(c));
  return d;
}

function tip(html)  { const d = document.createElement('div'); d.className='g-tip';  d.innerHTML=html; return d; }
function warn(html) { const d = document.createElement('div'); d.className='g-warn'; d.innerHTML=html; return d; }

function gTable(headers, rows) {
  let h = headers.map(h => `<th>${h}</th>`).join('');
  let r = rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<table class="g-table"><thead><tr>${h}</tr></thead><tbody>${r}</tbody></table>`;
}

function accordion(title, bodyFn) {
  const wrap = document.createElement('div');
  wrap.className = 'accordion';
  const header = document.createElement('div');
  header.className = 'acc-header';
  header.innerHTML = `${title} <span class="acc-arrow">▼</span>`;
  const body = document.createElement('div');
  body.className = 'acc-body';
  bodyFn(body);
  header.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    body.classList.toggle('open', open);
  });
  wrap.appendChild(header);
  wrap.appendChild(body);
  return wrap;
}

// ── Section renderers ─────────────────────────────────────────

function renderFundamentos(el) {
  const c1 = card('📐 Matemáticas Básicas');
  c1.appendChild(conceptList('fund-mat', [
    { text: 'Equity — % de veces que ganas el bote', tag: 'core' },
    { text: 'EV (Expected Value) — valor esperado de una acción', tag: 'core' },
    { text: 'Pot Odds — ratio bote vs apuesta para hacer un call', tag: 'core' },
    { text: 'Implied Odds — potencial ganancia futura si llegas', tag: 'avanzado' }
  ]));
  c1.appendChild(tip('<strong>Ejemplo Pot Odds:</strong> Bote=100€, rival apuesta 50€ → pagas 50 para ganar 150. Necesitas ≥33% equity.'));

  const c2 = card('🎯 Rangos y Ventajas');
  c2.appendChild(conceptList('fund-rang', [
    { text: 'Rangos vs manos concretas — pensar en conjuntos', tag: 'core' },
    { text: 'Ventaja de rango (range advantage)', tag: 'avanzado' },
    { text: 'Ventaja de nuts — tener las mejores manos posibles', tag: 'avanzado' },
    { text: 'Posición IP (In Position) vs OOP (Out Of Position)', tag: 'core' }
  ]));
  c2.appendChild(tip('<strong>Regla clave:</strong> La posición es la ventaja más constante en póker.'));

  el.appendChild(grid2(c1, c2));

  const c3 = card('⚖️ Estrategia: GTO vs Exploitative');
  c3.appendChild(conceptList('fund-gto', [
    { text: 'GTO (Game Theory Optimal) — estrategia no explotable', tag: 'avanzado' },
    { text: 'Exploitative — ajustar al estilo del rival para maximizar EV', tag: 'avanzado' },
    { text: 'Balance entre GTO y exploitative según el rival', tag: 'avanzado' }
  ]));
  c3.innerHTML += `<hr style="border:none;border-top:1px solid var(--border);margin:0.8rem 0">
    <div class="g-grid">
      <div><p style="font-family:'Space Mono',monospace;font-size:0.62rem;color:var(--muted);margin-bottom:0.3rem">GTO</p>
        <p style="font-size:0.8rem;line-height:1.6;color:#c8c8dc">Estrategia mixta que hace indiferente al rival. Ideal vs buenos jugadores.</p></div>
      <div><p style="font-family:'Space Mono',monospace;font-size:0.62rem;color:var(--muted);margin-bottom:0.3rem">EXPLOITATIVE</p>
        <p style="font-size:0.8rem;line-height:1.6;color:#c8c8dc">Explotas errores específicos del rival. Máximo EV vs malos jugadores.</p></div>
    </div>`;
  el.appendChild(c3);
}

function renderPreflop(el) {
  // Range grid
  const rc = card('🃏 Rangos Preflop por Posición (UTG)');
  const grid = document.createElement('div');
  grid.className = 'range-grid';
  buildRangeGrid(grid);
  rc.appendChild(grid);
  const legend = document.createElement('div');
  legend.className = 'range-legend';
  legend.innerHTML = `
    <div class="rl-item"><div class="rl-dot" style="background:rgba(201,168,76,0.7)"></div>Premium</div>
    <div class="rl-item"><div class="rl-dot" style="background:rgba(41,128,185,0.5)"></div>Broadway</div>
    <div class="rl-item"><div class="rl-dot" style="background:rgba(39,174,96,0.5)"></div>Especulativas</div>
    <div class="rl-item"><div class="rl-dot" style="background:rgba(155,89,182,0.5)"></div>Suited Aces</div>
    <div class="rl-item"><div class="rl-dot" style="background:rgba(230,126,34,0.35)"></div>Marginales</div>
    <div class="rl-item"><div class="rl-dot" style="background:rgba(255,255,255,0.06)"></div>Fold</div>`;
  rc.appendChild(legend);
  el.appendChild(rc);

  const c1 = card('Tipos de Manos');
  c1.appendChild(conceptList('pre-manos', [
    { text: 'Premium: AA, KK, QQ, JJ, AKs — siempre abrir/reraise' },
    { text: 'Broadways: AQ, KQ, QJ, KJs — valor en posición' },
    { text: 'Suited connectors: 87s, 76s — implied odds' },
    { text: 'Small pairs: 22-55 — set mining' }
  ]));

  const c2 = card('Acciones y Sizings');
  c2.appendChild(conceptList('pre-siz', [
    { text: 'Open raise: 2.5x BB estándar (3x OOP)' },
    { text: '3-bet: 3x el open (IP) / 4x (OOP)' },
    { text: '4-bet: ~2.5x el 3-bet (o shove)' },
    { text: 'Defensa de ciegas: BB defiende más ancho que SB' }
  ]));
  el.appendChild(grid2(c1, c2));

  const c3 = card('SPR — Stack to Pot Ratio');
  c3.innerHTML += gTable(
    ['SPR', 'Situación', 'Implicación'],
    [
      ['<span class="badge badge-red">&lt;2</span>', 'Stack muy corto', 'All-in con top pair o mejor'],
      ['<span class="badge badge-gold">2–6</span>', 'Stack medio', 'Comprometerse con good top pair+'],
      ['<span class="badge badge-green">&gt;6</span>', 'Stack profundo', 'Necesitas sets o two pair para stackear']
    ]
  );
  c3.appendChild(conceptList('pre-spr', [
    { text: 'SPR bajo → manos de valor más simples son suficientes' },
    { text: 'SPR alto → implied odds y manos especulativas ganan valor' }
  ]));
  el.appendChild(c3);
}

function renderFlop(el) {
  const bc = card('Tipos de Board');
  bc.innerHTML += `<div class="g-grid-3">
    <div style="text-align:center;padding:0.7rem;background:var(--surface);border:1px solid var(--border);border-radius:8px">
      <div style="font-size:1.4rem;margin-bottom:0.3rem">🏜️</div>
      <p style="font-family:'Space Mono',monospace;font-size:0.62rem;color:var(--accent);margin-bottom:0.25rem">DRY</p>
      <p style="font-size:0.72rem;color:var(--muted);line-height:1.4">K♠ 7♣ 2♥<br>Pocos draws<br>C-bet grande</p></div>
    <div style="text-align:center;padding:0.7rem;background:var(--surface);border:1px solid var(--border);border-radius:8px">
      <div style="font-size:1.4rem;margin-bottom:0.3rem">🌊</div>
      <p style="font-family:'Space Mono',monospace;font-size:0.62rem;color:var(--blue-soft);margin-bottom:0.25rem">WET</p>
      <p style="font-size:0.72rem;color:var(--muted);line-height:1.4">9♥ 8♥ 6♣<br>Muchos draws<br>C-bet pequeña</p></div>
    <div style="text-align:center;padding:0.7rem;background:var(--surface);border:1px solid var(--border);border-radius:8px">
      <div style="font-size:1.4rem;margin-bottom:0.3rem">🌑</div>
      <p style="font-family:'Space Mono',monospace;font-size:0.62rem;color:var(--red-soft);margin-bottom:0.25rem">MONOTONE</p>
      <p style="font-size:0.72rem;color:var(--muted);line-height:1.4">A♠ T♠ 5♠<br>Flush visible<br>Mucho cuidado</p></div>
  </div>`;
  el.appendChild(bc);

  const c1 = card('Continuation Bet (C-bet)');
  c1.appendChild(conceptList('flop-cbet', [
    { text: 'C-bet small (25-33%): boards wet, multiway' },
    { text: 'C-bet medium (50-66%): boards mixtos, heads-up' },
    { text: 'C-bet large (75-100%): boards secos, polarized' },
    { text: 'Check con rango: no c-bet el 100% del rango' },
    { text: 'Overbet en boards que favorecen tu rango' }
  ]));

  const c2 = card('Tipos de Mano en Flop');
  c2.appendChild(conceptList('flop-manos', [
    { text: 'Top Pair Top Kicker — valor fuerte, bet' },
    { text: 'Sets (trío oculto) — slowplay o fast-play' },
    { text: 'Flush draw — semi-bluff, equity' },
    { text: 'OESD (open-ended straight draw) — 8 outs' },
    { text: 'Gutshot — 4 outs, necesita implied odds' }
  ]));
  el.appendChild(grid2(c1, c2));

  const c3 = card('Objetivos en el Flop');
  c3.appendChild(conceptList('flop-obj', [
    { text: 'Valor: cobrar a manos inferiores que pagan' },
    { text: 'Bluff: hacer foldar manos con equity (protección)' },
    { text: 'Protección: evitar que draws rivales lleguen gratis' },
    { text: 'Control: manejar el tamaño del bote con manos medias' }
  ]));
  c3.appendChild(warn('<strong>Atención:</strong> Apostar siempre puede ser explotable. Check-raise y trap son armas válidas con manos muy fuertes.'));
  el.appendChild(c3);
}

function renderTurn(el) {
  const c1 = card('Cartas del Turn');
  c1.appendChild(conceptList('turn-cartas', [
    { text: 'Scare cards — cartas que cambian el equity (e.g. As cuando hay draw)' },
    { text: 'Blanks — cartas que no cambian rangos (generalmente continuar)' },
    { text: 'Completions de flush/straight — decisiones críticas' }
  ]));

  const c2 = card('Estrategia Turn');
  c2.appendChild(conceptList('turn-strat', [
    { text: 'Second barrel: continuar el bluff del flop en turn' },
    { text: 'Delayed c-bet: check flop, apuesta turn (deceptivo)' },
    { text: 'Polarización de rangos: valor alto vs bluff, sin medias' },
    { text: 'Control del bote con manos medias (check/call)' }
  ]));
  el.appendChild(grid2(c1, c2));

  const c3 = card('Polarización — Concepto Clave');
  c3.innerHTML += `<p style="font-size:0.82rem;line-height:1.7;color:#c8c8dc;margin-bottom:0.7rem">
    Un rango polarizado contiene manos muy fuertes (valor) y manos muy débiles (bluffs), pero pocas intermedias. Esto maximiza la presión sobre el rival.
  </p>`;
  c3.innerHTML += gTable(
    ['Tipo', 'Tamaño apuesta', 'Por qué'],
    [
      ['Polarizado', '75-150% del bote', 'Máxima presión, no da odds a draws'],
      ['Depolarizado (merged)', '25-50% del bote', 'Cobrar con manos medias-fuertes'],
      ['Control', 'Check', 'Proteger rango débil, pot control']
    ]
  );
  el.appendChild(c3);
}

function renderRiver(el) {
  const c0 = card('Polarización Total en River');
  c0.innerHTML += `<p style="font-size:0.82rem;line-height:1.7;color:#c8c8dc">
    En river no hay draws — tu rango debe estar completamente polarizado. O apuestas para valor o apuestas como bluff. Las manos medias se convierten en check.
  </p>`;
  c0.appendChild(tip('<strong>Regla GTO:</strong> Ratio bluff:valor ≈ 1 bluff por cada 2 value bets con apuestas medianas.'));
  el.appendChild(c0);

  const c1 = card('Value vs Bluff');
  c1.appendChild(conceptList('river-vb', [
    { text: 'Value bet: apostar para cobrar a manos peores que te llaman' },
    { text: 'Bluff: apostar para hacer foldar manos mejores' },
    { text: 'Thin value: apostar con manos borderline (arriesgado)' },
    { text: 'Overbet: apostar >100% bote para máxima presión' }
  ]));

  const c2 = card('Bluff Catching & Blockers');
  c2.appendChild(conceptList('river-bl', [
    { text: 'Bluff catch: call con manos medias vs posible bluff' },
    { text: 'Blockers: tener cartas que reducen combos del rival' },
    { text: 'Blocker al nuts: bluffear cuando tienes su carta clave' },
    { text: 'All-in polarizado: máxima presión, sin medias tintas' }
  ]));
  el.appendChild(grid2(c1, c2));

  const c3 = card('Ejemplo de Blockers');
  c3.innerHTML += gTable(
    ['Board', 'Tu mano', 'Efecto blocker'],
    [
      ['A♠ K♠ Q♠ J♥ 2♠', 'T♠ cualquier', 'Bloqueas royal flush → buen spot de bluff'],
      ['A♥ 8♥ 3♥ K♦ 7♥', 'A♥ x', 'Bloqueas nuts flush → buen bluff catch'],
      ['5♣ 6♣ 7♦ 8♥ Q♣', '9♣ x', 'Straight + blocker al flush → valor puro']
    ]
  );
  el.appendChild(c3);
}

function renderSpots(el) {
  const spotsData = [
    {
      title: 'BTN vs BB — El spot más jugado',
      body: 'El BTN tiene ventaja de rango (abre muy ancho ~40-50%) y ventaja posicional (siempre IP postflop).',
      items: [
        'BTN debe abrir muy amplio (40-50% de manos)',
        'BB debe defender amplio para no ser explotado',
        '3-bet del BB: linear con premiums, polar con bluffs'
      ],
      listId: 'spots-btnbb'
    },
    {
      title: 'Blind vs Blind — El spot OOP vs OOP',
      body: 'SB vs BB es único: ambos están OOP, pero SB actúa primero postflop.',
      items: [
        'SB debe completar amplio o raise (raramente fold puro)',
        'BB puede 3-bet agresivo; SB no tiene ventaja posicional',
        'Postflop: SB como OOP debe check más frecuente'
      ],
      listId: 'spots-bvb'
    },
    {
      title: '3-bet Pots — Rango polarizado',
      body: 'Bote más grande preflop → SPR más bajo postflop → decisiones más comprometidas.',
      items: [
        'SPR bajo → top pair suele ser suficiente para stack off',
        'El 3-bettor tiene ventaja de rango en boards altos',
        'Boards bajos (2-5-8) favorecen al caller (manos especulativas)'
      ],
      listId: 'spots-3bet'
    },
    {
      title: '4-bet Pots — Alta tensión preflop',
      body: 'Rangos muy reducidos. Ambos muestran fuerza extrema.',
      items: [
        '4-bet call: solo con AA, KK (a veces QQ, AKs)',
        '4-bet bluff: manos con blockers (Ax, Kx suited)',
        'Postflop: suele ser SPR <1 → push/fold territory'
      ],
      listId: 'spots-4bet'
    },
    {
      title: 'Multiway Pots — Complejidad máxima',
      body: 'Más jugadores = equity repartida. Bluffs funcionan peor. Necesitas manos más fuertes.',
      items: [
        'Bluffear multiway es muy arriesgado (más callers)',
        'Jugar principalmente para valor con manos fuertes',
        'Pot odds mejoran para draws (más contribuyentes)'
      ],
      listId: 'spots-multi'
    }
  ];

  spotsData.forEach(s => {
    const acc = accordion(s.title, body => {
      body.innerHTML = `<p style="margin-bottom:0.6rem">${s.body}</p>`;
      body.appendChild(conceptList(s.listId, s.items.map(t => ({ text: t }))));
    });
    el.appendChild(acc);
  });
}

function renderTorneos(el) {
  const phases = [
    { badge: 'badge-green', label: 'EARLY', text: 'Juego sólido. Acumula sin riesgos innecesarios. Mucho stack depth → manos especulativas tienen valor.' },
    { badge: 'badge-blue',  label: 'MID',   text: 'Las ciegas suben. Robar ciegas constantemente. Agresión selectiva. Re-steal vs openers débiles.' },
    { badge: 'badge-red',   label: 'BURBUJA', text: 'Presión ICM máxima. Big stacks acotan a medios. Aprovecha la tensión de los jugadores cortos.' },
    { badge: 'badge-gold',  label: 'ITM',   text: 'In The Money. Explotar la relajación post-burbuja. Muchos jugadores se relajan → ataca.' },
    { badge: 'badge-gold',  label: 'FINAL TABLE', text: 'Saltos de premio enormes. ICM crítico. Tight-aggressive según stack.' }
  ];

  const c0 = card('Fases del Torneo');
  phases.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:0.8rem;padding:0.6rem 0.8rem;background:var(--surface);border:1px solid var(--border);border-radius:7px;margin-bottom:0.4rem';
    row.innerHTML = `<span class="badge ${p.badge}">${p.label}</span><span style="font-size:0.8rem;color:#c8c8dc;line-height:1.4">${p.text}</span>`;
    c0.appendChild(row);
  });
  el.appendChild(c0);

  const c1 = card('Stack Depth Strategy');
  [
    { label: '50bb+ → Juego estándar', sub: 'Control de varianza', color: '#27ae60,#2ecc71', w: '100%' },
    { label: '20–50bb → Re-steal y agresión', sub: 'Selectivo', color: '#c9a84c,#e8c97a', w: '66%' },
    { label: '0–20bb → Push/Fold obligatorio', sub: 'Sin postflop', color: '#c0392b,#e74c3c', w: '33%' }
  ].forEach(row => {
    const wrap = document.createElement('div');
    wrap.className = 'stack-bar-row';
    wrap.innerHTML = `<div class="sbl"><span>${row.label}</span><span style="color:var(--accent)">${row.sub}</span></div>
      <div class="sb" style="background:linear-gradient(90deg,${row.color});width:${row.w}">${row.label.split('→')[0].trim()}</div>`;
    c1.appendChild(wrap);
  });
  c1.appendChild(conceptList('torn-stack', [
    { text: 'Adaptar estrategia constantemente según stack efectivo' },
    { text: 'Fold equity desaparece con stack muy corto → shove o fold' },
    { text: 'Supervivencia vs acumulación: equilibrio según fase' }
  ]));
  el.appendChild(c1);

  const c2 = card('Spots Críticos en MTT');
  c2.appendChild(conceptList('torn-spots', [
    { text: 'Re-steal (3-bet shove): vs abridor débil con stack 15-25bb' },
    { text: 'Push/fold spots: <15bb, usar charts de Nash equilibrium' },
    { text: 'BTN vs BB: hiper agresivo en torneos, ciegas son dinero' },
    { text: 'Ataque a stacks medios: más sensibles al ICM que tú' },
    { text: 'Juego vs recreacionales: exploitative puro, maximizar EV chip' }
  ]));
  el.appendChild(c2);
}

function renderICM(el) {
  const c0 = card('¿Qué es el ICM?');
  c0.innerHTML += `<p style="font-size:0.82rem;line-height:1.7;color:#c8c8dc;margin-bottom:0.7rem">
    El ICM convierte tu stack de fichas en valor monetario real basándose en la estructura de pagos.
    <strong style="color:var(--accent2)">Las fichas no tienen valor lineal en torneos</strong>: ganar fichas vale menos que perderlas.
  </p>`;
  c0.appendChild(warn('<strong>Principio fundamental:</strong> Fichas perdidas &gt; fichas ganadas en valor real. No puedes comprar más fichas → supervivencia es dinero.'));
  el.appendChild(c0);

  const c1 = card('Presión ICM');
  c1.appendChild(conceptList('icm-pres', [
    { text: 'Big stacks presionan a medios y cortos con ICM' },
    { text: 'Stacks medios son los más afectados por ICM' },
    { text: 'Evitar calls marginales aunque sean chip-EV positivos' },
    { text: 'Presión de burbuja: fold equity es máxima' }
  ]));

  const c2 = card('Ajustes Exploitativos MTT');
  c2.appendChild(conceptList('icm-ajust', [
    { text: 'Jugadores foldan demasiado en burbuja → roba más' },
    { text: 'Defensa débil de ciegas en torneos → steal frecuente' },
    { text: 'Sobrevaloran manos medias → presiona con range amplio' },
    { text: 'Mesa final: saltos de premios justifican plays ultra-tight' }
  ]));
  el.appendChild(grid2(c1, c2));

  const c3 = card('ICM en Mesa Final');
  c3.innerHTML += gTable(
    ['Situación', 'Chip EV', 'ICM Ajuste'],
    [
      ['Flip con stack media (50/50)', 'Neutral', '<span class="badge badge-red">Fold</span> — no vale el riesgo'],
      ['Shove con 20bb, líder chip', 'Positivo', '<span class="badge badge-gold">Depende</span> del premio siguiente'],
      ['Call all-in con TPTK vs short', 'Positivo', '<span class="badge badge-green">Call</span> — eliminar a corto'],
      ['Call vs big stack, mismo premio', '+EV chip', '<span class="badge badge-red">Fold</span> si hay salto grande']
    ]
  );
  c3.appendChild(conceptList('icm-tools', [
    { text: 'Estudiar ICM calculators: HRC (Hold\'em Resources Calculator)' },
    { text: 'Entender ICMIZER y Nash push/fold ranges' }
  ]));
  el.appendChild(c3);
}

function renderReglas(el) {
  [
    { n: '01', title: 'Las ciegas son tu principal ingreso.', body: 'En torneos, las ciegas suben constantemente. Robar ciegas de forma consistente es lo que mantiene y aumenta tu stack. Nunca dejes de presionar las ciegas cuando la situación lo permite.' },
    { n: '02', title: 'La fold equity gana torneos.', body: 'Tu capacidad de hacer foldar al rival con shoves y 3-bets es más valiosa que tu equity en muchos spots. Defiende tu fold equity apostando cuando tienes stack suficiente.' },
    { n: '03', title: 'Presiona cuando puedas, sobrevive cuando toque.', body: 'El equilibrio entre acumulación y supervivencia es el arte del torneo. Saber cuándo es el momento de cada uno define a los buenos jugadores.' },
    { n: '04', title: 'Piensa siempre en rangos, nunca en manos concretas.', body: 'Tu rival tiene un rango de manos, no una mano específica. Construye tu estrategia contra su rango completo, no contra lo que crees que tiene en ese momento.' }
  ].forEach(r => {
    const d = document.createElement('div');
    d.className = 'rule-card';
    d.innerHTML = `<div class="rule-num">${r.n}</div>
      <div class="rule-text"><strong>${r.title}</strong> ${r.body}</div>`;
    el.appendChild(d);
  });

  const c = card('Resumen Final');
  c.innerHTML += gTable(
    ['Calle', 'Foco Principal', 'Concepto clave'],
    [
      ['<span class="badge badge-gold">PREFLOP</span>', 'Rangos sólidos por posición', 'Sizings y SPR'],
      ['<span class="badge badge-blue">FLOP</span>', 'Estrategia según tipo de board', 'C-bet frecuencia y sizing'],
      ['<span class="badge badge-green">TURN</span>', 'Presión y polarización', 'Second barrel / delayed cbet'],
      ['<span class="badge badge-red">RIVER</span>', 'Decisión final value vs bluff', 'Blockers y overbet'],
      ['<span class="badge badge-gold">MTT</span>', 'Adaptación constante + ICM', 'Fold equity es todo']
    ]
  );
  el.appendChild(c);
}

// ── Range grid builder ───────────────────────────────────────
function buildRangeGrid(grid) {
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const classMap = {
    'AA':'premium','KK':'premium','QQ':'premium','JJ':'premium',
    'TT':'broadway','99':'broadway','88':'broadway',
    '77':'speculative','66':'marginal','55':'marginal','44':'fold','33':'fold','22':'fold',
    'AKs':'premium','AQs':'premium','AJs':'broadway','ATs':'broadway',
    'A9s':'suited','A8s':'suited','A7s':'suited','A6s':'suited','A5s':'suited','A4s':'suited','A3s':'suited','A2s':'suited',
    'AKo':'premium','AQo':'broadway','AJo':'broadway','ATo':'broadway',
    'A9o':'marginal','A8o':'fold','A7o':'fold','A6o':'fold','A5o':'fold','A4o':'fold','A3o':'fold','A2o':'fold',
    'KQs':'broadway','KJs':'broadway','KTs':'broadway','K9s':'suited','K8s':'marginal',
    'K7s':'fold','K6s':'fold','K5s':'fold','K4s':'fold','K3s':'fold','K2s':'fold',
    'KQo':'broadway','KJo':'broadway','KTo':'marginal','K9o':'fold','K8o':'fold','K7o':'fold','K6o':'fold','K5o':'fold','K4o':'fold','K3o':'fold','K2o':'fold',
    'QJs':'broadway','QTs':'broadway','Q9s':'marginal','Q8s':'fold','Q7s':'fold','Q6s':'fold','Q5s':'fold','Q4s':'fold','Q3s':'fold','Q2s':'fold',
    'QJo':'broadway','QTo':'marginal','Q9o':'fold','Q8o':'fold','Q7o':'fold','Q6o':'fold','Q5o':'fold','Q4o':'fold','Q3o':'fold','Q2o':'fold',
    'JTs':'broadway','J9s':'speculative','J8s':'speculative','J7s':'fold','J6s':'fold','J5s':'fold','J4s':'fold','J3s':'fold','J2s':'fold',
    'JTo':'marginal','J9o':'fold','J8o':'fold','J7o':'fold','J6o':'fold','J5o':'fold','J4o':'fold','J3o':'fold','J2o':'fold',
    'T9s':'speculative','T8s':'speculative','T7s':'marginal','T6s':'fold','T5s':'fold','T4s':'fold','T3s':'fold','T2s':'fold',
    'T9o':'fold','T8o':'fold','T7o':'fold','T6o':'fold','T5o':'fold','T4o':'fold','T3o':'fold','T2o':'fold',
    '98s':'speculative','97s':'speculative','96s':'marginal','95s':'fold','94s':'fold','93s':'fold','92s':'fold',
    '98o':'fold','97o':'fold','96o':'fold','95o':'fold','94o':'fold','93o':'fold','92o':'fold',
    '87s':'speculative','86s':'speculative','85s':'fold','84s':'fold','83s':'fold','82s':'fold',
    '87o':'fold','86o':'fold','85o':'fold','84o':'fold','83o':'fold','82o':'fold',
    '76s':'speculative','75s':'fold','74s':'fold','73s':'fold','72s':'fold',
    '76o':'fold','75o':'fold','74o':'fold','73o':'fold','72o':'fold',
    '65s':'speculative','64s':'fold','63s':'fold','62s':'fold','65o':'fold','64o':'fold','63o':'fold','62o':'fold',
    '54s':'marginal','53s':'fold','52s':'fold','54o':'fold','53o':'fold','52o':'fold',
    '43s':'fold','42s':'fold','43o':'fold','42o':'fold','32s':'fold','32o':'fold'
  };
  ranks.forEach((r1, i) => {
    ranks.forEach((r2, j) => {
      const cell = document.createElement('div');
      cell.className = 'range-cell';
      let label, key;
      if (i === j) { label = key = r1+r1; }
      else if (i < j) { label = key = r1+r2+'s'; }
      else { label = key = r2+r1+'o'; }
      cell.textContent = label;
      cell.title = label;
      cell.classList.add(classMap[key] || 'fold');
      grid.appendChild(cell);
    });
  });
}

// ── Progress ─────────────────────────────────────────────────
function updateGlobalProgress() {
  const allItems = document.querySelectorAll('.concept-item');
  const total = allItems.length;
  const done  = document.querySelectorAll('.concept-item.done').length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('sf-fill').style.width = pct + '%';
  document.getElementById('sf-pct').textContent = pct + '%';
}

// ════════════════════════════════════════════════════════════
// FLASHCARDS
// ════════════════════════════════════════════════════════════

const BUILTIN_CARDS = [
  // Preflop
  { id:'fc001', deck:'preflop', q:'¿Qué son los pot odds y cómo se calculan?', a:'Son la ratio entre el tamaño del bote y la apuesta a pagar. Si el bote es 100 y pagas 50, tienes odds de 3:1, necesitando 25% equity mínima.' },
  { id:'fc002', deck:'preflop', q:'¿Cuál es el sizing estándar de un open raise en posición?', a:'2.5x BB desde BTN/CO, subiendo a 3x desde EP/MP. OOP generalmente se sube ligeramente el sizing.' },
  { id:'fc003', deck:'preflop', q:'¿Qué manos forman el rango premium de aperturas UTG?', a:'AA, KK, QQ, JJ, AKs y a veces AKo y TT. El rango UTG debe ser el más ajustado de la mesa.' },
  { id:'fc004', deck:'preflop', q:'¿Qué es el SPR y qué implica un SPR bajo (<2)?', a:'Stack to Pot Ratio. SPR bajo (<2) significa que puedes ir all-in con top pair o mejor. Reduce la complejidad postflop.' },
  { id:'fc005', deck:'preflop', q:'¿Cuál es la diferencia entre un 3-bet lineal y uno polarizado?', a:'Lineal: solo value (KK+, AK). Polarizado: value (KK+) + bluffs (A5s, A4s con bloquers). El polarizado es GTO, el lineal explota al rival.' },
  // Postflop
  { id:'fc006', deck:'postflop', q:'¿Cuándo debes hacer una c-bet pequeña (25-33%) en el flop?', a:'En boards wet o monotone con muchos draws, y en multiway pots. Pequeño sizing con rango amplio para proteger y obtener información barata.' },
  { id:'fc007', deck:'postflop', q:'¿Qué es un delayed c-bet y cuándo es efectivo?', a:'Check en flop, apuesta en turn. Efectivo cuando el turn mejora tu rango (blank o scare card que beneficia tu rango) o cuando el rival verifica atrás en flop.' },
  { id:'fc008', deck:'postflop', q:'¿Qué son los blockers y cómo afectan al bluff en river?', a:'Son cartas en tu mano que reducen los combos fuertes del rival. Tener el As en un board con flush posible hace que el rival tenga menos combos de flush → mejor spot de bluff.' },
  { id:'fc009', deck:'postflop', q:'¿Cuál es la ratio GTO aproximada de bluff:valor en river con overbet?', a:'Con 2x pot bet, necesitas ganar el 67% del tiempo. Ratio aproximada: 1 bluff por cada 2 value bets (33% bluffs, 67% value).' },
  { id:'fc010', deck:'postflop', q:'¿Qué significa polarizar tu rango en el turn?', a:'Mantener solo manos muy fuertes (valor) y bluffs en tu rango de apuesta, eliminando las manos medias (que pasan a check/call). Maximiza presión sobre el rival.' },
  // Torneos/ICM
  { id:'fc011', deck:'torneos', q:'¿Qué es el ICM y por qué importa en torneos?', a:'Independent Chip Model: convierte fichas en valor monetario real según la estructura de pagos. Las fichas tienen valor decreciente (no lineal), por lo que perder fichas duele más que ganarlas.' },
  { id:'fc012', deck:'torneos', q:'¿Qué es la fold equity y por qué es crucial en torneos?', a:'Es la % de veces que el rival foldea ante tu apuesta. Con poco stack, necesitas fold equity para ganar sin showdown. Con <15bb, el shove gana por fold equity cuando el rival foldea.' },
  { id:'fc013', deck:'torneos', q:'¿Cuándo debes entrar en modo push/fold?', a:'Con menos de 15bb de stack efectivo. Por debajo de este umbral, no tienes stack suficiente para jugar postflop efectivamente y debes usar charts de Nash equilibrium.' },
  { id:'fc014', deck:'torneos', q:'¿Qué son los stacks medios en burbuja y por qué son los más afectados por el ICM?', a:'Los stacks que no pueden eliminar a nadie ni ser eliminados sin consecuencias. Tienen mucho que perder (no llegan al dinero) y poco que ganar. El ICM los hace muy vulnerables.' },
  { id:'fc015', deck:'torneos', q:'¿Qué ajuste exploitativo debes hacer en la burbuja de un torneo?', a:'Aumentar drásticamente la agresión contra stacks medios (máxima presión ICM), robar ciegas casi sin límite, y evitar calls marginales aunque sean +EV en fichas.' }
];

function getActiveDeck() {
  const custom = APP.flashcards.custom || [];
  let cards = [...BUILTIN_CARDS, ...custom];
  if (currentDeck !== 'all') cards = cards.filter(c => c.deck === currentDeck);
  return cards;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initFlashcards() {
  // Deck selector
  document.querySelectorAll('.deck-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.deck-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentDeck = chip.dataset.deck;
      startFcSession();
    });
  });

  // Card flip
  document.getElementById('fc-card').addEventListener('click', () => flipCard());

  // Navigation
  document.getElementById('fc-next').addEventListener('click', () => nextCard(1));
  document.getElementById('fc-prev').addEventListener('click', () => nextCard(-1));

  // Rating buttons
  document.getElementById('fc-good').addEventListener('click', () => rateCard('good'));
  document.getElementById('fc-ok').addEventListener('click',   () => rateCard('ok'));
  document.getElementById('fc-bad').addEventListener('click',  () => rateCard('bad'));

  // Shuffle / reset
  document.getElementById('fc-shuffle').addEventListener('click', () => {
    fcDeck = shuffleArray(fcDeck);
    currentFcIndex = 0;
    showCard();
  });

  document.getElementById('fc-reset-session').addEventListener('click', startFcSession);
  document.getElementById('fc-restart').addEventListener('click', () => {
    document.getElementById('fc-summary').style.display = 'none';
    document.getElementById('fc-arena').style.display = 'flex';
    startFcSession();
  });

  // Add card modal
  document.getElementById('fc-add-btn').addEventListener('click', () => {
    document.getElementById('fc-modal').style.display = 'flex';
  });
  document.getElementById('fc-modal-close').addEventListener('click',  () => { document.getElementById('fc-modal').style.display = 'none'; });
  document.getElementById('fc-modal-cancel').addEventListener('click', () => { document.getElementById('fc-modal').style.display = 'none'; });
  document.getElementById('fc-modal-save').addEventListener('click', saveNewCard);

  startFcSession();
}

function startFcSession() {
  fcDeck = shuffleArray(getActiveDeck());
  currentFcIndex = 0;
  isFlipped = false;
  document.getElementById('fc-card-inner').classList.remove('flipped');
  document.getElementById('fc-controls').style.display = 'none';
  document.getElementById('fc-next-wrap').style.display = 'flex';
  document.getElementById('fc-summary').style.display = 'none';
  document.getElementById('fc-arena').style.display = 'flex';
  showCard();
}

function showCard() {
  if (!fcDeck.length) {
    document.getElementById('fc-question').textContent = 'No hay tarjetas en este mazo.';
    document.getElementById('fc-answer').textContent = '';
    document.getElementById('fc-counter').textContent = '0 / 0';
    return;
  }
  const card = fcDeck[currentFcIndex];
  document.getElementById('fc-question').textContent = card.q;
  document.getElementById('fc-answer').textContent   = card.a;
  document.getElementById('fc-counter').textContent  = (currentFcIndex + 1) + ' / ' + fcDeck.length;
  // Reset flip
  isFlipped = false;
  document.getElementById('fc-card-inner').classList.remove('flipped');
  document.getElementById('fc-controls').style.display = 'none';
  document.getElementById('fc-next-wrap').style.display = 'flex';
}

function flipCard() {
  isFlipped = !isFlipped;
  document.getElementById('fc-card-inner').classList.toggle('flipped', isFlipped);
  if (isFlipped) {
    document.getElementById('fc-controls').style.display = 'flex';
    document.getElementById('fc-next-wrap').style.display = 'none';
  } else {
    document.getElementById('fc-controls').style.display = 'none';
    document.getElementById('fc-next-wrap').style.display = 'flex';
  }
}

function nextCard(dir) {
  currentFcIndex = (currentFcIndex + dir + fcDeck.length) % fcDeck.length;
  showCard();
}

function rateCard(rating) {
  const card = fcDeck[currentFcIndex];
  if (!APP.flashcards.results[card.id]) APP.flashcards.results[card.id] = { good:0, ok:0, bad:0 };
  APP.flashcards.results[card.id][rating]++;
  saveApp();

  // Go next or show summary
  if (currentFcIndex < fcDeck.length - 1) {
    currentFcIndex++;
    showCard();
  } else {
    showFcSummary();
  }
}

function showFcSummary() {
  document.getElementById('fc-arena').style.display = 'none';
  const summary = document.getElementById('fc-summary');
  summary.style.display = 'flex';

  let good = 0, ok = 0, bad = 0;
  fcDeck.forEach(c => {
    const r = APP.flashcards.results[c.id];
    if (!r) return;
    good += r.good; ok += r.ok; bad += r.bad;
  });

  document.getElementById('fc-summary-stats').innerHTML = `
    <div class="fc-stat"><div class="fc-stat-val" style="color:var(--green-soft)">${good}</div><div class="fc-stat-lbl">Fácil</div></div>
    <div class="fc-stat"><div class="fc-stat-val" style="color:#e67e22">${ok}</div><div class="fc-stat-lbl">Regular</div></div>
    <div class="fc-stat"><div class="fc-stat-val" style="color:var(--red-soft)">${bad}</div><div class="fc-stat-lbl">Difícil</div></div>
  `;
}

function saveNewCard() {
  const q = document.getElementById('fc-new-q').value.trim();
  const a = document.getElementById('fc-new-a').value.trim();
  const deck = document.getElementById('fc-new-deck').value;
  if (!q || !a) return;
  const card = { id: 'cu' + Date.now(), deck, q, a };
  APP.flashcards.custom.push(card);
  saveApp();
  document.getElementById('fc-modal').style.display = 'none';
  document.getElementById('fc-new-q').value = '';
  document.getElementById('fc-new-a').value = '';
  startFcSession();
}

// ════════════════════════════════════════════════════════════
// NOTAS
// ════════════════════════════════════════════════════════════

function initNotes() {
  document.getElementById('note-add-btn').addEventListener('click', newNote);
  document.getElementById('note-save-btn').addEventListener('click', saveNote);
  document.getElementById('note-delete-btn').addEventListener('click', deleteNote);
  document.getElementById('notes-search').addEventListener('input', renderNotesList);
  renderNotesList();
}

function renderNotesList() {
  const q = (document.getElementById('notes-search').value || '').toLowerCase();
  const filtered = (APP.notes || []).filter(n =>
    n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  const container = document.getElementById('notes-list-items');
  container.innerHTML = '';

  if (!filtered.length) {
    container.innerHTML = `<p style="font-family:'Space Mono',monospace;font-size:0.65rem;color:var(--muted);text-align:center;padding:1.5rem">No hay notas</p>`;
    return;
  }

  filtered.forEach(note => {
    const d = document.createElement('div');
    d.className = 'note-list-item' + (note.id === currentNoteId ? ' active' : '');
    const date = new Date(note.updatedAt).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
    d.innerHTML = `<div class="nli-title">${note.title || 'Sin título'}</div>
      <div class="nli-meta"><span class="nli-tag">${note.tag || 'general'}</span><span>${date}</span></div>`;
    d.addEventListener('click', () => openNote(note.id));
    container.appendChild(d);
  });
}

function newNote() {
  const note = {
    id: 'note' + Date.now(),
    title: '',
    body: '',
    tag: 'general',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  APP.notes.push(note);
  openNote(note.id);
  renderNotesList();
}

function openNote(id) {
  currentNoteId = id;
  const note = APP.notes.find(n => n.id === id);
  if (!note) return;

  document.getElementById('note-empty').style.display = 'none';
  document.getElementById('note-form').style.display = 'flex';
  document.getElementById('note-title').value = note.title;
  document.getElementById('note-body').value  = note.body;
  document.getElementById('note-tag').value   = note.tag || 'general';
  renderNotesList();
}

function saveNote() {
  const note = APP.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  note.title     = document.getElementById('note-title').value;
  note.body      = document.getElementById('note-body').value;
  note.tag       = document.getElementById('note-tag').value;
  note.updatedAt = Date.now();
  saveApp();
  renderNotesList();
  const ind = document.getElementById('note-saved-indicator');
  ind.textContent = '✓ Guardado';
  ind.classList.add('show');
  setTimeout(() => ind.classList.remove('show'), 2000);
}

function deleteNote() {
  if (!currentNoteId) return;
  APP.notes = APP.notes.filter(n => n.id !== currentNoteId);
  currentNoteId = null;
  document.getElementById('note-empty').style.display = 'flex';
  document.getElementById('note-form').style.display = 'none';
  saveApp();
  renderNotesList();
}

// ════════════════════════════════════════════════════════════
// HISTORIAL DE SESIONES
// ════════════════════════════════════════════════════════════

function initHistory() {
  document.getElementById('session-add-btn').addEventListener('click', () => {
    // Set today's date
    document.getElementById('session-date').value = new Date().toISOString().split('T')[0];
    sessionRatingVal = 0;
    document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.topic-chip input').forEach(cb => { cb.checked = false; });
    document.getElementById('session-notes').value = '';
    document.getElementById('session-duration').value = '';
    document.getElementById('session-modal').style.display = 'flex';
  });

  document.getElementById('session-modal-close').addEventListener('click',  () => { document.getElementById('session-modal').style.display = 'none'; });
  document.getElementById('session-modal-cancel').addEventListener('click', () => { document.getElementById('session-modal').style.display = 'none'; });
  document.getElementById('session-modal-save').addEventListener('click', saveSession);

  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionRatingVal = parseInt(btn.dataset.val);
      document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  renderSessions();
}

function saveSession() {
  const topics = [...document.querySelectorAll('.topic-chip input:checked')].map(cb => cb.value);
  const session = {
    id: 'ses' + Date.now(),
    date: document.getElementById('session-date').value,
    duration: parseInt(document.getElementById('session-duration').value) || 0,
    topics,
    notes: document.getElementById('session-notes').value,
    rating: sessionRatingVal,
    createdAt: Date.now()
  };
  APP.sessions.push(session);
  saveApp();
  document.getElementById('session-modal').style.display = 'none';
  renderSessions();
}

function renderSessions() {
  const container = document.getElementById('sessions-list');
  const sessions = [...(APP.sessions || [])].sort((a, b) => b.createdAt - a.createdAt);

  if (!sessions.length) {
    container.innerHTML = `<div class="no-sessions">No hay sesiones registradas aún.<br>¡Registra tu primera sesión de estudio!</div>`;
    return;
  }

  container.innerHTML = sessions.map(s => {
    const d = new Date(s.date + 'T12:00:00');
    const dayStr = d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' });
    const topics = (s.topics || []).map(t => `<span class="sc-topic-tag">${t}</span>`).join('');
    const stars  = '★'.repeat(s.rating || 0) + '☆'.repeat(5 - (s.rating || 0));
    return `<div class="session-card">
      <div>
        <div class="sc-date">${d.getDate()} ${d.toLocaleDateString('es-ES',{month:'short'})}</div>
        <div class="sc-date-sub">${d.toLocaleDateString('es-ES',{weekday:'long'})}</div>
      </div>
      <div class="sc-body">
        <div class="sc-topics">${topics || '<span class="sc-topic-tag" style="opacity:0.5">Sin temas</span>'}</div>
        ${s.notes ? `<div class="sc-notes">${s.notes}</div>` : ''}
      </div>
      <div class="sc-meta">
        <div class="sc-duration">${s.duration ? s.duration + ' min' : '—'}</div>
        <div class="sc-rating">${stars}</div>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ════════════════════════════════════════════════════════════

function renderStats() {
  const sessions = APP.sessions || [];

  // KPIs
  const totalSessions = sessions.length;
  const totalMinutes  = sessions.reduce((s, ses) => s + (ses.duration || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins  = totalMinutes % 60;

  const allItems = document.querySelectorAll('.concept-item');
  const doneItems = document.querySelectorAll('.concept-item.done');
  const pct = allItems.length ? Math.round((doneItems.length / allItems.length) * 100) : 0;

  // Streak calculation
  const streak = calcStreak(sessions);

  document.getElementById('kpi-sessions').textContent = totalSessions;
  document.getElementById('kpi-hours').textContent    = hours + 'h' + (mins ? mins + 'm' : '');
  document.getElementById('kpi-concepts').textContent = pct + '%';
  document.getElementById('kpi-streak').textContent   = streak;

  // Section progress bars
  const sectionIds = ['fundamentos','preflop','flop','turn','river','spots','torneos','icm','reglas'];
  const sectionLabels = { fundamentos:'Fundamentos', preflop:'Preflop', flop:'Flop', turn:'Turn', river:'River', spots:'Spots', torneos:'MTT', icm:'ICM', reglas:'Reglas' };
  const colors = ['#c9a84c','#e74c3c','#3498db','#27ae60','#8e44ad','#e67e22','#c9a84c','#e74c3c','#3498db'];

  const spContainer = document.getElementById('section-progress-bars');
  spContainer.innerHTML = '';
  sectionIds.forEach((id, i) => {
    const section = document.getElementById('gs-' + id);
    if (!section) return;
    const total = section.querySelectorAll('.concept-item').length;
    const done  = section.querySelectorAll('.concept-item.done').length;
    const p = total ? Math.round((done / total) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'sp-row';
    row.innerHTML = `<div class="sp-label-row"><span>${sectionLabels[id]}</span><span>${done}/${total}</span></div>
      <div class="sp-track"><div class="sp-fill" style="width:${p}%;background:${colors[i]}"></div></div>`;
    spContainer.appendChild(row);
  });

  // FC performance
  const results = APP.flashcards.results || {};
  let totalGood = 0, totalOk = 0, totalBad = 0;
  Object.values(results).forEach(r => { totalGood += r.good||0; totalOk += r.ok||0; totalBad += r.bad||0; });
  const totalRated = totalGood + totalOk + totalBad;
  const fcContainer = document.getElementById('fc-performance');
  fcContainer.innerHTML = `
    <div class="fc-perf-row"><span class="fc-perf-label">Tarjetas evaluadas</span><span class="fc-perf-val">${totalRated}</span></div>
    <div class="fc-perf-row"><span class="fc-perf-label">✓ Fácil</span><span class="fc-perf-val" style="color:var(--green-soft)">${totalGood}</span></div>
    <div class="fc-perf-row"><span class="fc-perf-label">~ Regular</span><span class="fc-perf-val" style="color:#e67e22">${totalOk}</span></div>
    <div class="fc-perf-row"><span class="fc-perf-label">✗ Difícil</span><span class="fc-perf-val" style="color:var(--red-soft)">${totalBad}</span></div>
    <div class="fc-perf-row"><span class="fc-perf-label">Tarjetas personalizadas</span><span class="fc-perf-val">${(APP.flashcards.custom||[]).length}</span></div>
  `;

  // Topics bar chart
  const topicCount = {};
  sessions.forEach(s => (s.topics||[]).forEach(t => { topicCount[t] = (topicCount[t]||0)+1; }));
  const maxCount = Math.max(...Object.values(topicCount), 1);
  const topicEl = document.getElementById('topic-bar-chart');
  const topicLabels = { preflop:'Preflop', flop:'Flop', turn:'Turn', river:'River', icm:'ICM', torneos:'Torneos', flashcards:'Flashcards', hh:'HH Review' };
  topicEl.innerHTML = Object.entries(topicLabels).map(([k,l]) => {
    const cnt = topicCount[k] || 0;
    const w = Math.round((cnt / maxCount) * 100);
    return `<div class="tbc-row">
      <div class="tbc-label">${l}</div>
      <div class="tbc-track"><div class="tbc-fill" style="width:${w}%"></div></div>
      <div class="tbc-count">${cnt}</div>
    </div>`;
  }).join('');

  // Activity grid (56 days)
  const agEl = document.getElementById('activity-grid');
  const sessionDates = new Set(sessions.map(s => s.date));
  const today = new Date();
  const days = [];
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  agEl.innerHTML = days.map(date => {
    const hasSession = sessionDates.has(date);
    const daySessions = sessions.filter(s => s.date === date);
    const totalMin = daySessions.reduce((a, s) => a + (s.duration||0), 0);
    let level = 0;
    if (totalMin > 0)   level = 1;
    if (totalMin >= 30) level = 2;
    if (totalMin >= 60) level = 3;
    if (totalMin >= 90) level = 4;
    return `<div class="ag-day${level ? ' l'+level : ''}" title="${date}: ${totalMin} min"></div>`;
  }).join('');
}

function calcStreak(sessions) {
  if (!sessions.length) return 0;
  const dates = new Set(sessions.map(s => s.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    if (dates.has(ds)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadApp();
  initNav();
  initGuide();
  initFlashcards();
  initNotes();
  initHistory();
  updateGlobalProgress();
});