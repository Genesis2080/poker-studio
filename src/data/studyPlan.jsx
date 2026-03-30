export const STREET_ORDER = ['preflop', 'flop', 'turn', 'river']

export const STREET_COLORS = {
  preflop: { bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.3)',  text: '#a78bfa' },
  flop:    { bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.3)',   text: '#4ade80' },
  turn:    { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)',   text: '#fbbf24' },
  river:   { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
}

export const STREET_LABELS = {
  preflop: 'Preflop',
  flop:    'Flop',
  turn:    'Turn',
  river:   'River',
}

export const INITIAL_STUDY_PLAN = {
  preflop: [
    { id: 'pre-1',   topic: 'Rango de manos inicial',         description: 'Memorizar y entender las categorías de manos: premium, fuertes, suited connectors, gaps, suited broadway,offsuit broadway', category: 'fundamentos' },
    { id: 'pre-2',   topic: 'Posición en la mesa',           description: 'UTG, UTG+1, MP, CO, BTN, SB, BB — cómo cambia el rango según la posición relativa', category: 'fundamentos' },
    { id: 'pre-3',   topic: 'Tablas de apertura',             description: 'Saber qué manos abrir desde cada posición — rangos de open raise preflop', category: 'rangos' },
    { id: 'pre-4',   topic: 'Cold call ranges',              description: 'Cuándo hacer cold call y con qué manos vs 3-bet', category: 'rangos' },
    { id: 'pre-5',   topic: '3-bet ranges',                  description: 'Rangos de 3-bet: polarizados vs lineales, sizing, cuándo 3-betear', category: 'rangos' },
    { id: 'pre-6',   topic: '3-bet sizing',                  description: 'Tamaños óptimos de 3-bet según posición y stack depth', category: 'sizing' },
    { id: 'pre-7',   topic: '4-bet ranges',                  description: 'Rangos de 4-bet: polarizados, de valor, bluff catchers', category: 'rangos' },
    { id: 'pre-8',   topic: 'Defensa de ciega grande (BB)',   description: 'Cómo defender la BB — vs steal, vs 3-bet, mixto entre call y 3-bet', category: 'defensa' },
    { id: 'pre-9',   topic: 'Defensa de ciega pequeña (SB)', description: 'Consideraciones especiales de la SB — precio del pot, stack sizes', category: 'defensa' },
    { id: 'pre-10',  topic: 'Squeeze plays',                  description: 'Cuándo hacer squeeze — factores: tamaño del open, número de cold callers, sizing', category: 'explotativo' },
    { id: 'pre-11',  topic: 'Isolation raises',               description: 'Aislar limpers — con qué manos, sizing apropiado', category: 'explotativo' },
    { id: 'pre-12',  topic: 'Multiway pots preflop',          description: 'Diferencias en rangos y estrategia cuando hay 3+ jugadores', category: 'rangos' },
    { id: 'pre-13',  topic: 'Limp/reraise',                   description: 'Estrategia de limp-reraise (slowplay preflop)', category: 'avanzado' },
    { id: 'pre-14',  topic: 'Equidad y odds implícitas',      description: 'Calcular equity vs rangos, odds implícitas directas e inversas', category: 'matematicas' },
    { id: 'pre-15',  topic: 'SPR (Stack-to-Pot Ratio)',       description: 'Entender el SPR y cómo afecta las decisiones postflop', category: 'matematicas' },
    { id: 'pre-16',  topic: 'Hand reading preflop',          description: 'Leer los rangos del rival antes del flop — tendencies y stats', category: 'lectura' },
  ],

  flop: [
    { id: 'flop-1',  topic: 'Board textures',                 description: 'Clasificar boards: pareados, trippled, suited, connected, rainbow, monotone — implicaciones estratégicas', category: 'fundamentos' },
    { id: 'flop-2',  topic: 'Wet boards',                     description: 'Boards húmedos: draws fuertes, muchos combos, cuidado con overcards', category: 'fundamentos' },
    { id: 'flop-3',  topic: 'Dry boards',                     description: 'Boards secos: poco proyectos, más fácil de entender rangos', category: 'fundamentos' },
    { id: 'flop-4',  topic: 'Board pairings',                 description: 'Boards pareados — cómo afectan a los rangos de ambos jugadores', category: 'fundamentos' },
    { id: 'flop-5',  topic: 'Continuación bet (C-bet)',       description: 'Cuándo hacer C-bet, sizing, frecuencia — single raised vs 3-bet pots', category: 'apuestas' },
    { id: 'flop-6',  topic: 'C-bet sizing',                   description: 'Tamaños óptimos de C-bet — pequeños vs grandes, según board texture', category: 'sizing' },
    { id: 'flop-7',  topic: 'Check-raise',                    description: 'Cuándo hacer check-raise — de valor vs como bluff', category: 'apuestas' },
    { id: 'flop-8',  topic: 'Donk bet',                       description: 'Cuándo hacer donk bet — ventajas y desventajas vs check', category: 'apuestas' },
    { id: 'flop-9',  topic: 'Float bet',                      description: 'Float: llamar con manos air para robar en streets futuras', category: 'apuestas' },
    { id: 'flop-10', topic: 'Check-call',                     description: 'Check-call: cuándo usarlo — manos medias, protección de rango', category: 'apuestas' },
    { id: 'flop-11', topic: 'Check-behind',                    description: 'Check-behind: cuándo hacer check detrás — in pos y out of pos', category: 'apuestas' },
    { id: 'flop-12', topic: 'Rangos polarizados',             description: 'Entender polarización de rangos — qué manos son de valor vs bluff', category: 'rangos' },
    { id: 'flop-13', topic: 'Rangos lineales/merging',        description: 'Rangos lineales — mezcla de manos de valor y bluff catchers', category: 'rangos' },
    { id: 'flop-14', topic: 'Protección de rango',            description: 'Proteger tu rango de check-raise — cuándo balancear', category: 'rangos' },
    { id: 'flop-15', topic: 'Overcards en el flop',           description: 'Qué hacer cuando tienes overcards — equity, SPR, board texture', category: 'situaciones' },
    { id: 'flop-16', topic: 'Top pair — jugando el flop',     description: 'Estrategia con top pair: slowplay vs bet, sizing,kickers', category: 'manos' },
    { id: 'flop-17', topic: 'Middle pair y bottom pair',     description: 'Jugar middle/bottom pair — check-call vs bet para thin value', category: 'manos' },
    { id: 'flop-18', topic: 'Sets y trips',                  description: 'Jugando sets — cuánto extraer, evitar slowplay excesivo', category: 'manos' },
    { id: 'flop-19', topic: 'Draws — proyectos de color',     description: 'Flush draws: odds, cuándo pagar, semi-bluff, free card', category: 'draws' },
    { id: 'flop-20', topic: 'Draws — proyectos de escalera', description: 'Straight draws: open-ended, gutshot — odds y estrategia', category: 'draws' },
    { id: 'flop-21', topic: 'Backdoor draws',                 description: 'Backdoors: nut y no-nut, equity, cómo valorarlos', category: 'draws' },
    { id: 'flop-22', topic: 'HUD y estadísticas flop',       description: 'VPIP, PFR, CBet%, CheckRaise%, Float% — cómo usarlos en el flop', category: 'herramientas' },
    { id: 'flop-23', topic: 'GTO en el flop',                 description: 'Introducción a frecuencias GTO: C-bet 65-75%, check-raise 10-15%', category: 'gto' },
  ],

  turn: [
    { id: 'turn-1',  topic: 'Second barrel (doble barrel)',   description: 'Cuándo hacer 2nd barrel — board texture, sizing, frecuencia', category: 'apuestas' },
    { id: 'turn-2',  topic: '2nd barrel sizing',              description: 'Tamaños de second barrel — mismos que flop o ajustar', category: 'sizing' },
    { id: 'turn-3',  topic: 'Bluffing en el turn',            description: 'Cuándo bluffear en el turn — blockers, board texture, river plan', category: 'apuestas' },
    { id: 'turn-4',  topic: 'Check-raise en el turn',         description: 'Check-raise turn: qué manos lo justifican, sizing', category: 'apuestas' },
    { id: 'turn-5',  topic: 'Donk bet en el turn',            description: 'Cuándo hacer donk bet en el turn — vs check-call flop', category: 'apuestas' },
    { id: 'turn-6',  topic: 'Improving cards',                description: 'Cómo cambia la textura cuando cae el turn — nuevas nuts, kills', category: 'fundamentos' },
    { id: 'turn-7',  topic: 'Flush completing',               description: 'El flush se completa en el turn — juego correcto, value', category: 'situaciones' },
    { id: 'turn-8',  topic: 'Straight completing',            description: 'Escalera completada en el turn — tipos: nuts vs no-nut', category: 'situaciones' },
    { id: 'turn-9',  topic: 'Planning the river',             description: 'Planificar el river desde el turn — manos que nos protegen', category: 'estrategia' },
    { id: 'turn-10', topic: 'Pot commitment',                 description: 'Entender cuándo estamos committed — sizing vs pot odds', category: 'matematicas' },
    { id: 'turn-11', topic: 'Bluffcatching',                   description: 'Bluffcatching: cuándo pagar con manos medias, señales', category: 'situaciones' },
    { id: 'turn-12', topic: 'Thin value betting',            description: 'Bet fino para thin value — sizing, frecuencia, cuándo no', category: 'apuestas' },
    { id: 'turn-13', topic: 'Card removal effects',           description: 'Cómo afecta el removal de cartas a ranges y decisiones', category: 'matematicas' },
    { id: 'turn-14', topic: 'Overcards en el turn',           description: 'Overcards en el turn — equity vs rangos, cuándo seguir', category: 'situaciones' },
    { id: 'turn-15', topic: 'Pot odds en el turn',            description: 'Calcular pot odds en el turn para call con draws', category: 'matematicas' },
    { id: 'turn-16', topic: 'Backdoor turns',                 description: 'Backdoors que mejoran en el turn — valor y estrategia', category: 'draws' },
    { id: 'turn-17', topic: 'GTO en el turn',                 description: 'Frecuencias GTO turn: polarización, bluff-to-value ratio', category: 'gto' },
    { id: 'turn-18', topic: 'HUD y estadísticas turn',       description: 'Stats relevantes para el turn: WTSD, Won at SD, Aggression', category: 'herramientas' },
  ],

  river: [
    { id: 'river-1', topic: 'Thin value betting',            description: 'Bet fino para value — sizing pequeño, frecuencia, qué manos pagan', category: 'apuestas' },
    { id: 'river-2', topic: 'Thick value betting',          description: 'Bet grueso para value — cuándo y cuánto overbet', category: 'apuestas' },
    { id: 'river-3', topic: 'Bluffing en el river',         description: 'Bluff en el river: sizing, frequency, blockers', category: 'apuestas' },
    { id: 'river-4', topic: 'Over-bluffing',                 description: 'Cuándo sobre-bluffear — spots donde villain tiene muchos call folds', category: 'apuestas' },
    { id: 'river-5', topic: 'Check-calling',                 description: 'Check-call river: manos que pagan, señales de debilidad', category: 'apuestas' },
    { id: 'river-6', topic: 'Check-raising river',            description: 'Check-raise river: nuts vsbluff — sizing y polarización', category: 'apuestas' },
    { id: 'river-7', topic: 'Showdown value',                description: 'Determinar tu showdown value — manos que ganan por call bajo', category: 'fundamentos' },
    { id: 'river-8', topic: 'Blocking bets',                  description: 'Blocking bets: sizing, cuándo usarlos para no regret', category: 'sizing' },
    { id: 'river-9', topic: 'Size capping',                   description: 'Tamaño capped — cómo jugar manos medias vs grandes', category: 'sizing' },
    { id: 'river-10', topic: 'GTO river — bluff ratio',      description: 'Ratio óptimo bluff:value según pot size y sizing', category: 'gto' },
    { id: 'river-11', topic: 'Polarized vs merged river',    description: 'Cuándo polarizar vs mergear en el river', category: 'rangos' },
    { id: 'river-12', topic: 'Betting patterns river',        description: 'Leer patrones de betting — overpairs, draws missed, traps', category: 'lectura' },
    { id: 'river-13', topic: 'Rivered hands — juego óptimo', description: 'Manos complicadas river: trips, two pair, flush — decisión final', category: 'situaciones' },
    { id: 'river-14', topic: 'Hero calls',                    description: 'Cuándo hacer hero call — señales, blockers, pot odds', category: 'situaciones' },
    { id: 'river-15', topic: 'Shove vs thin value',          description: 'All-in vs small bet: qué es mejor según el spot', category: 'sizing' },
    { id: 'river-16', topic: 'HUD y estadísticas river',     description: 'Stats clave river: River CBet%, River AF, WTSD', category: 'herramientas' },
  ],

  general: [
    { id: 'gen-1',   topic: 'Conceptos básicos de póker',    description: 'Pot odds, equity, expected value, varianza, bankroll', category: 'fundamentos' },
    { id: 'gen-2',   topic: 'HUD y software de apoyo',      description: 'Configurar y usar HUD — PokerTracker, Hold em Manager, driveHUD', category: 'herramientas' },
    { id: 'gen-3',   topic: 'Gestión de bankroll',           description: 'Reglas de bankroll management, variance, downswing', category: 'mental' },
    { id: 'gen-4',   topic: 'Tilt management',               description: 'Reconocer y manejar el tilt — qué hacer cuando estás tilted', category: 'mental' },
    { id: 'gen-5',   topic: 'Selección de mesas',            description: 'Elegir mesas profitable — villians buenos, stakes adecuadas', category: 'mental' },
    { id: 'gen-6',   topic: 'Rakeback y promociones',       description: 'Maximizar rakeback, bonos, loyalty programs', category: 'mental' },
    { id: 'gen-7',   topic: 'Juego en mesas cortas',         description: 'Estrategia 6-max vs 9-max — diferencias clave', category: 'formato' },
    { id: 'gen-8',   topic: 'Juego deep stack',              description: 'Estrategia con stacks de 150+ big blinds', category: 'formato' },
    { id: 'gen-9',   topic: 'Juego short stack',             description: 'Estrategia con stacks <50bb — push/fold, gelbero', category: 'formato' },
    { id: 'gen-10',  topic: 'Juego heads-up',                description: 'Fundamentos de heads-up — rangos expandidos, bluffing', category: 'formato' },
    { id: 'gen-11',  topic: 'Exploitative play',             description: 'Ajustes explotativos vs tipos de villanos', category: 'estrategia' },
    { id: 'gen-12',  topic: 'GTO básico',                    description: 'Introducción a Game Theory Optimal — equilibrio, exploitability', category: 'estrategia' },
    { id: 'gen-13',  topic: 'ICM (Independent Chip Model)',  description: 'ICM en torneos — qué es y cómo afecta las decisiones', category: 'torneos' },
    { id: 'gen-14',  topic: 'Estrategia en torneos',        description: 'Fases de torneos: early, middle, bubble, ITM, final table', category: 'torneos' },
    { id: 'gen-15',  topic: 'Bounty tournaments',            description: 'Estrategia en torneos con bounties — cuándo buscar', category: 'torneos' },
    { id: 'gen-16',  topic: 'Fastforward / Speed Poker',     description: 'Ajusar estrategia en formatos superspeed — más manos, menos info', category: 'formato' },
    { id: 'gen-17',  topic: 'Zoom / Rush Poker',            description: 'Estrategia en tables dinámicas — no tienes reads, rotación constante', category: 'formato' },
    { id: 'gen-18',  topic: 'Mix games basics',             description: 'Introducción a HORSE, 8-Game,itzer — cambios de juego', category: 'formato' },
    { id: 'gen-19',  topic: 'Balance y mezcla',            description: 'Mezclar estrategias para no ser explotable', category: 'estrategia' },
    { id: 'gen-20',  topic: 'Review de manos',              description: 'Cómo analisar manos jugadas — solver, discusión, notas', category: 'herramientas' },
  ],
}

export const CATEGORY_COLORS = {
  fundamentos: { bg: 'rgba(96,165,250,0.1)',   text: '#60a5fa', label: 'Fundamentos' },
  rangos:     { bg: 'rgba(167,139,250,0.1)', text: '#a78bfa', label: 'Rangos' },
  sizing:     { bg: 'rgba(251,191,36,0.1)',  text: '#fbbf24', label: 'Sizing' },
  matematicas:{ bg: 'rgba(74,222,128,0.1)',  text: '#4ade80', label: 'Matemáticas' },
  defensa:    { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', label: 'Defensa' },
  apuestas:  { bg: 'rgba(248,113,113,0.1)', text: '#f87171', label: 'Apuestas' },
  draws:     { bg: 'rgba(14,165,233,0.1)',  text: '#38bdf8', label: 'Draws' },
  manos:     { bg: 'rgba(168,85,247,0.1)',  text: '#a855f7', label: 'Manos' },
  gto:       { bg: 'rgba(236,72,153,0.1)',  text: '#ec4899', label: 'GTO' },
  herramientas:{ bg: 'rgba(107,114,128,0.1)',text: '#6b7280', label: 'Herramientas' },
  estrategia:{ bg: 'rgba(20,184,166,0.1)',   text: '#14b8a6', label: 'Estrategia' },
  lectura:   { bg: 'rgba(132,204,22,0.1)',  text: '#84cc16', label: 'Lectura' },
  explotativo:{ bg: 'rgba(249,115,22,0.1)', text: '#f97316', label: 'Explotativo' },
  avanzado:  { bg: 'rgba(244,114,182,0.1)', text: '#f472b6', label: 'Avanzado' },
  mental:    { bg: 'rgba(99,102,241,0.1)',  text: '#6366f1', label: 'Mental' },
  formato:   { bg: 'rgba(0,0,0,0.2)',       text: '#9ca3af', label: 'Formato' },
  torneos:   { bg: 'rgba(161,98,7,0.1)',    text: '#d97706', label: 'Torneos' },
  situaciones:{ bg: 'rgba(5,150,105,0.1)',  text: '#059669', label: 'Situaciones' },
}

export function getOverallProgress(studyPlan) {
  let completed = 0
  let total = 0
  
  for (const street of STREET_ORDER) {
    if (studyPlan[street]) {
      for (const item of studyPlan[street]) {
        total++
        if (item.completed) completed++
      }
    }
  }
  
  if (studyPlan.general) {
    for (const item of studyPlan.general) {
      total++
      if (item.completed) completed++
    }
  }
  
  return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
}

export function getProgressByStreet(studyPlan) {
  const progress = {}
  
  for (const street of STREET_ORDER) {
    if (studyPlan[street]) {
      const total = studyPlan[street].length
      const completed = studyPlan[street].filter(i => i.completed).length
      progress[street] = { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
    }
  }
  
  if (studyPlan.general) {
    const total = studyPlan.general.length
    const completed = studyPlan.general.filter(i => i.completed).length
    progress.general = { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }
  
  return progress
}

export function getCategoryProgress(studyPlan) {
  const cats = {}
  
  for (const street of [...STREET_ORDER, 'general']) {
    if (studyPlan[street]) {
      for (const item of studyPlan[street]) {
        if (!cats[item.category]) {
          cats[item.category] = { completed: 0, total: 0 }
        }
        cats[item.category].total++
        if (item.completed) cats[item.category].completed++
      }
    }
  }
  
  return Object.fromEntries(
    Object.entries(cats).map(([k, v]) => [
      k,
      { ...v, percentage: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0 }
    ])
  )
}
