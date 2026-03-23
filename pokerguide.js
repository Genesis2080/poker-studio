/* ===========================
   POKER GUIDE — JAVASCRIPT
   =========================== */

'use strict';

const STATE_KEY = 'poker_guide_v1';
let state = {};

/* ===== STATE: LOAD / SAVE ===== */
function loadState() {
  try {
    state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
  } catch (e) {
    state = {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) { /* silently ignore quota errors */ }
  updateProgress();
}

/* ===== UNIQUE KEY PER ITEM =====
   FIX: el key anterior fallaba si el <ul> no tenía id (listas en acordeones).
   Ahora asignamos un id automático a toda <ul class="concept-list"> sin id.
*/
function ensureListIds() {
  let counter = 0;
  document.querySelectorAll('ul.concept-list').forEach(ul => {
    if (!ul.id) {
      ul.id = 'cl-auto-' + (counter++);
    }
  });
}

function getItemKey(el) {
  const ul = el.closest('ul.concept-list');
  if (!ul || !ul.id) return null;
  const idx = Array.from(ul.children).indexOf(el);
  return ul.id + '_' + idx;
}

/* ===== TOGGLE CONCEPT ===== */
function toggle(el) {
  const key = getItemKey(el);
  if (!key) return;

  if (state[key]) {
    delete state[key];
    el.classList.remove('done');
  } else {
    state[key] = true;
    el.classList.add('done');
  }
  saveState();
}

/* ===== RESTORE STATE ===== */
function restoreState() {
  document.querySelectorAll('.concept-item').forEach(el => {
    const key = getItemKey(el);
    if (key && state[key]) {
      el.classList.add('done');
    }
  });
}

/* ===== PROGRESS ===== */
function updateProgress() {
  const allItems = document.querySelectorAll('.concept-item');
  const total = allItems.length;
  const done  = document.querySelectorAll('.concept-item.done').length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const fill = document.getElementById('global-fill');
  const pctEl = document.getElementById('global-pct');
  if (fill)  fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';

  /* per-section counter in sidebar */
  document.querySelectorAll('.section').forEach(sec => {
    const id = sec.id.replace('section-', '');
    const items     = sec.querySelectorAll('.concept-item');
    const doneItems = sec.querySelectorAll('.concept-item.done');
    const sp = document.getElementById('sp-' + id);
    if (sp && items.length) {
      sp.textContent = doneItems.length + '/' + items.length;
    }
  });
}

/* ===== SECTION NAVIGATION =====
   FIX: la versión anterior recibía `tab` como el elemento clicado desde el nav
   y `sidebarEl` desde el sidebar. Cuando uno llamaba al otro pasaba null y la
   sincronización podía romperse. Ahora siempre sincronizamos ambos por id.
*/
function showSection(id) {
  /* hide all sections */
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + id);
  if (target) {
    target.classList.add('active');
  }

  /* sync nav tabs */
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.section === id);
  });

  /* sync sidebar */
  document.querySelectorAll('.sidebar-item').forEach(s => {
    s.classList.toggle('active', s.dataset.section === id);
  });

  /* scroll to top of content smoothly */
  const content = document.querySelector('.content');
  if (content) content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ===== ACCORDION ===== */
function toggleAcc(header) {
  const body   = header.nextElementSibling;
  const isOpen = header.classList.contains('open');

  header.classList.toggle('open', !isOpen);
  if (body) body.classList.toggle('open', !isOpen);
}

/* ===== QUIZ =====
   FIX: antes se usaba onclick inline con `answer(this, ...)`. Esto está bien,
   pero al deshabilitar el onclick poniendo null, el :hover CSS seguía activo.
   Ahora añadimos la clase .disabled a todas las opciones sobrantes para
   bloquear el puntero mediante CSS también.
*/
function answer(opt, qid, correct, feedback) {
  const card = document.getElementById(qid);
  if (!card) return;

  const opts = card.querySelectorAll('.quiz-opt');
  /* disable all options */
  opts.forEach(o => {
    o.onclick = null;
    o.classList.add('disabled');
  });

  opt.classList.remove('disabled');
  opt.classList.add(correct ? 'correct' : 'wrong');

  const fb = document.getElementById('fb-' + qid);
  if (fb) {
    fb.textContent = feedback;
    fb.className = 'quiz-feedback show ' + (correct ? 'ok' : 'ko');
  }
}

/* ===== RANGE GRID =====
   FIX: la lógica de label era correcta pero el texto se truncaba mal.
   Para pares (AA) la label tiene 2 chars → sin cambios.
   Para suited (AKs) → 3 chars → sin cambios.
   Para offsuit (AKo) → 3 chars → sin cambios.
   El slice(-1) anterior eliminaba la 's'/'o' en manos de 3 chars; ahora
   mostramos siempre el label completo (cabe bien en la celda con font pequeño).
*/
function buildRangeGrid() {
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const grid  = document.getElementById('range-grid');
  if (!grid) return;

  const classMap = {
    'AA':'premium','KK':'premium','QQ':'premium','JJ':'premium',
    'TT':'broadway','99':'broadway','88':'broadway',
    '77':'speculative','66':'marginal','55':'marginal',
    '44':'fold','33':'fold','22':'fold',

    'AKs':'premium','AQs':'premium','AJs':'broadway','ATs':'broadway',
    'A9s':'suited','A8s':'suited','A7s':'suited','A6s':'suited',
    'A5s':'suited','A4s':'suited','A3s':'suited','A2s':'suited',
    'AKo':'premium','AQo':'broadway','AJo':'broadway','ATo':'broadway',
    'A9o':'marginal','A8o':'fold','A7o':'fold','A6o':'fold',
    'A5o':'fold','A4o':'fold','A3o':'fold','A2o':'fold',

    'KQs':'broadway','KJs':'broadway','KTs':'broadway','K9s':'suited',
    'K8s':'marginal','K7s':'fold','K6s':'fold','K5s':'fold',
    'K4s':'fold','K3s':'fold','K2s':'fold',
    'KQo':'broadway','KJo':'broadway','KTo':'marginal','K9o':'fold',
    'K8o':'fold','K7o':'fold','K6o':'fold','K5o':'fold',
    'K4o':'fold','K3o':'fold','K2o':'fold',

    'QJs':'broadway','QTs':'broadway','Q9s':'marginal','Q8s':'fold',
    'Q7s':'fold','Q6s':'fold','Q5s':'fold','Q4s':'fold',
    'Q3s':'fold','Q2s':'fold',
    'QJo':'broadway','QTo':'marginal','Q9o':'fold','Q8o':'fold',
    'Q7o':'fold','Q6o':'fold','Q5o':'fold','Q4o':'fold',
    'Q3o':'fold','Q2o':'fold',

    'JTs':'broadway','J9s':'speculative','J8s':'speculative',
    'J7s':'fold','J6s':'fold','J5s':'fold','J4s':'fold',
    'J3s':'fold','J2s':'fold',
    'JTo':'marginal','J9o':'fold','J8o':'fold','J7o':'fold',
    'J6o':'fold','J5o':'fold','J4o':'fold','J3o':'fold','J2o':'fold',

    'T9s':'speculative','T8s':'speculative','T7s':'marginal',
    'T6s':'fold','T5s':'fold','T4s':'fold','T3s':'fold','T2s':'fold',
    'T9o':'fold','T8o':'fold','T7o':'fold','T6o':'fold',
    'T5o':'fold','T4o':'fold','T3o':'fold','T2o':'fold',

    '98s':'speculative','97s':'speculative','96s':'marginal',
    '95s':'fold','94s':'fold','93s':'fold','92s':'fold',
    '98o':'fold','97o':'fold','96o':'fold','95o':'fold',
    '94o':'fold','93o':'fold','92o':'fold',

    '87s':'speculative','86s':'speculative','85s':'fold',
    '84s':'fold','83s':'fold','82s':'fold',
    '87o':'fold','86o':'fold','85o':'fold',
    '84o':'fold','83o':'fold','82o':'fold',

    '76s':'speculative','75s':'fold','74s':'fold','73s':'fold','72s':'fold',
    '76o':'fold','75o':'fold','74o':'fold','73o':'fold','72o':'fold',

    '65s':'speculative','64s':'fold','63s':'fold','62s':'fold',
    '65o':'fold','64o':'fold','63o':'fold','62o':'fold',

    '54s':'marginal','53s':'fold','52s':'fold',
    '54o':'fold','53o':'fold','52o':'fold',

    '43s':'fold','42s':'fold','43o':'fold','42o':'fold',
    '32s':'fold','32o':'fold'
  };

  ranks.forEach((r1, i) => {
    ranks.forEach((r2, j) => {
      const cell = document.createElement('div');
      cell.className = 'range-cell';

      let label, key;
      if (i === j) {
        label = r1 + r1;
        key   = r1 + r1;
      } else if (i < j) {
        /* top-right triangle = suited */
        label = r1 + r2 + 's';
        key   = r1 + r2 + 's';
      } else {
        /* bottom-left triangle = offsuit */
        label = r2 + r1 + 'o';
        key   = r2 + r1 + 'o';
      }

      cell.textContent = label;
      cell.title       = label;
      cell.classList.add(classMap[key] || 'fold');
      grid.appendChild(cell);
    });
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  ensureListIds();   /* must run before restoreState */
  buildRangeGrid();
  restoreState();
  updateProgress();
});