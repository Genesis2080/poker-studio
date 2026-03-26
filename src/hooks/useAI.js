import { useState, useCallback } from 'react'

// ── Constantes ────────────────────────────────────────────────────
const MODEL   = 'claude-sonnet-4-20250514'
const API_URL = 'https://api.anthropic.com/v1/messages'

export const ERROR_TYPES = {
  'fold_equity':     'Fold equity ignorada',
  'pot_odds':        'Pot odds incorrectos',
  'position':        'Error de posición',
  'bet_sizing':      'Sizing incorrecto',
  'bluff_frequency': 'Frecuencia de bluff',
  'value_thin':      'Value bet thin perdida',
  'tilt':            'Decisión emocional (tilt)',
  'range_imbalance': 'Rango desbalanceado',
  'icm':             'Error de ICM',
  'other':           'Otro error',
}

// ── Normalización de manos para el heatmap ────────────────────────
// Convierte "AKs", "ak suited", "A♠K♥" → formato canónico "AKs"
export function normalizeHand(raw) {
  if (!raw) return null
  let s = raw.trim().toUpperCase()

  // Quitar palos Unicode (♠♥♦♣)
  s = s.replace(/[♠♥♦♣]/g, '')

  // Quitar espacios
  s = s.replace(/\s+/g, '')

  // Detectar sufijo suited/offsuit
  let suffix = ''
  if (s.endsWith('S') || s.toLowerCase().includes('suit')) { suffix = 's'; s = s.replace(/S$/, '').replace(/SUITED/i, '') }
  else if (s.endsWith('O') || s.toLowerCase().includes('off')) { suffix = 'o'; s = s.replace(/O$/, '').replace(/OFF/i, '') }

  // Quitar caracteres no alfa
  s = s.replace(/[^AKQJT2-9]/g, '')

  if (s.length < 2) return null

  const rank1 = s[0], rank2 = s[1] || s[0]
  const ORDER = 'AKQJT98765432'
  const i1 = ORDER.indexOf(rank1), i2 = ORDER.indexOf(rank2)

  if (i1 === -1 || i2 === -1) return null

  // Par
  if (rank1 === rank2) return rank1 + rank2

  // Ordenar por rango (mayor primero)
  const [high, low] = i1 < i2 ? [rank1, rank2] : [rank2, rank1]
  return high + low + (suffix || 'o')  // default offsuit si no se especifica
}

// ── Construir contexto de rangos para la IA ────────────────────────
function buildRangeContext(hands) {
  const rangeMap = {}
  hands.forEach(h => {
    if (!h.heroHand) return
    const key = normalizeHand(h.heroHand)
    if (!key) return
    if (!rangeMap[key]) rangeMap[key] = { wins: 0, losses: 0, total: 0 }
    rangeMap[key].total++
    if (h.result === 'win')  rangeMap[key].wins++
    if (h.result === 'loss') rangeMap[key].losses++
  })

  const sorted = Object.entries(rangeMap)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15)

  if (!sorted.length) return 'No hay datos de rangos específicos aún.'

  return sorted.map(([hand, d]) => {
    const wr = ((d.wins / d.total) * 100).toFixed(0)
    return `${hand}: ${d.total} manos, ${wr}% win rate`
  }).join('\n')
}

// ── Serializar manos para la IA (sin datos innecesarios) ──────────
function serializeHands(hands) {
  return hands.slice(-40).map((h, i) => {
    const parts = [
      `[${i + 1}] ${h.date}`,
      `Pos: ${h.position || '?'}`,
      `Resultado: ${h.result}`,
      h.heroHand      ? `Hero: ${h.heroHand}` : null,
      h.villainRange  ? `Villano estimado: ${h.villainRange}` : null,
      h.preflopAction ? `Preflop: ${h.preflopAction}` : null,
      h.street        ? `Calle decisiva: ${h.street}` : null,
      h.board         ? `Board: ${h.board}` : null,
      h.amount        ? `Importe: ${h.amount}€` : null,
      h.tags?.length  ? `Tags: ${h.tags.join(', ')}` : null,
      h.aiAnalysis?.errorTypes?.length ? `Errores IA: ${h.aiAnalysis.errorTypes.join(', ')}` : null,
      h.notes         ? `Notas: ${h.notes.slice(0, 120)}` : null,
    ].filter(Boolean)
    return parts.join(' | ')
  }).join('\n')
}

// ── Prompts ───────────────────────────────────────────────────────
function buildSingleHandPrompt(hand, mode) {
  const ctx = `
Mano de póker:
- Fecha: ${hand.date}
- Posición: ${hand.position || 'desconocida'}
- Resultado: ${hand.result === 'win' ? 'Victoria' : hand.result === 'loss' ? 'Derrota' : 'Break-even'}
- Importe: ${hand.amount ? hand.amount + '€' : 'no especificado'}
- Hero hand: ${hand.heroHand || 'no especificada'}
- Rango villano estimado: ${hand.villainRange || 'no especificado'}
- Acción preflop: ${hand.preflopAction || 'no especificada'}
- Calle decisiva: ${hand.street || 'no especificada'}
- Board: ${hand.board || 'no especificado'}
- Tags: ${(hand.tags || []).join(', ') || 'ninguno'}
- Descripción: ${hand.notes || '(sin descripción)'}
`.trim()

  const prompts = {
    analyze: `Eres un coach de póker profesional. Analiza esta mano. Responde ÚNICAMENTE con JSON válido sin backticks:
{
  "summary": "Resumen conciso 1-2 frases",
  "errors": ["error1"],
  "errorTypes": ["tipo_enum"],
  "suggestedLine": "Línea óptima",
  "alternativeLines": ["alternativa1"],
  "keyConceptsApplied": ["concepto1"],
  "score": 7,
  "scoreReason": "Explicación score 1-10"
}
Tipos válidos: fold_equity, pot_odds, position, bet_sizing, bluff_frequency, value_thin, tilt, range_imbalance, icm, other.
${ctx}`,

    suggest: `Eres coach de póker. Sugiere líneas de juego. Responde ÚNICAMENTE con JSON sin backticks:
{
  "lines": [{ "action": "...", "reason": "...", "ev": "alto/medio/bajo/negativo" }],
  "recommended": "Acción recomendada",
  "gtoNote": "Nota GTO vs exploitative"
}
${ctx}`,

    errors: `Eres coach de póker. Detecta errores. Responde ÚNICAMENTE con JSON sin backticks:
{
  "errorsFound": [{ "type": "tipo_enum", "description": "...", "severity": "alta/media/baja", "fix": "..." }],
  "patternWarning": "Advertencia patrón o null",
  "positiveAspects": ["aspecto1"]
}
Tipos válidos: fold_equity, pot_odds, position, bet_sizing, bluff_frequency, value_thin, tilt, range_imbalance, icm, other.
${ctx}`,
  }
  return prompts[mode]
}

function buildHistoryPrompt(hands, sessions) {
  const handsText    = serializeHands(hands)
  const rangeContext = buildRangeContext(hands)
  const sessionStats = sessions.length
    ? `Sesiones: ${sessions.length} · Horas: ${sessions.reduce((a, s) => a + (s.duration || 0), 0)}h · Resultado neto: ${sessions.reduce((a, s) => a + ((s.cashOut || 0) - (s.buyIn || 0)), 0)}€`
    : 'Sin sesiones registradas.'

  const winRate = hands.length
    ? ((hands.filter(h => h.result === 'win').length / hands.length) * 100).toFixed(1)
    : 0

  return `Eres un coach de póker de élite. Analiza el historial COMPLETO de este jugador y genera un informe diagnóstico profundo.

ESTADÍSTICAS GENERALES:
- Total manos: ${hands.length}
- Win rate global: ${winRate}%
- ${sessionStats}

HISTORIAL DE MANOS (más recientes primero):
${handsText}

RENDIMIENTO POR RANGO ESPECÍFICO:
${rangeContext}

Genera un informe de coaching detallado. Responde ÚNICAMENTE con JSON válido sin texto adicional ni backticks:
{
  "executiveSummary": "Diagnóstico de 2-3 frases del nivel actual y principales áreas de mejora",
  "topLeaks": [
    {
      "category": "Nombre del leak",
      "description": "Descripción detallada con ejemplos específicos del historial",
      "frequency": "alta/media/baja",
      "estimatedLoss": "Estimación del impacto (ej: -2bb/100)",
      "fix": "Cómo corregirlo con ejercicios concretos",
      "exampleHands": ["referencia a mano #N si aplica"]
    }
  ],
  "positivePatterns": [
    "Patrón positivo que el jugador hace bien y debe mantener"
  ],
  "studyPlan": [
    {
      "topic": "Tema a estudiar",
      "reason": "Por qué es prioritario basado en el historial",
      "resource": "Recurso específico (ej: GTO Wizard drill, libro, concepto)"
    }
  ],
  "highImpactSpots": [
    {
      "spot": "Situación específica (ej: BTN vs BB 3-bet pot turn)",
      "suggestion": "Ajuste concreto a hacer"
    }
  ],
  "benchmarkComparison": "Comparación con nivel de juego esperado para este winrate y volumen",
  "rangeInsights": "Observaciones sobre el rendimiento por rangos específicos si hay datos"
}

Sé específico y usa referencias a manos concretas del historial cuando sea relevante. No seas genérico.`
}

// ── Hook principal ────────────────────────────────────────────────
export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [apiKey,  setApiKey]  = useState(() => localStorage.getItem('poker_ai_key') || '')

  const saveApiKey = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem('poker_ai_key', key)
  }, [])

  const callAPI = useCallback(async (prompt, maxTokens = 1024) => {
    if (!apiKey) throw new Error('Configura tu API key de Anthropic en Ajustes → API Key IA.')

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message || `Error HTTP ${res.status}`)
    }

    const data = await res.json()
    const text = data.content?.find(b => b.type === 'text')?.text || ''
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(clean)
  }, [apiKey])

  const analyzeHand = useCallback(async (hand) => {
    setLoading(true); setError(null)
    try { return await callAPI(buildSingleHandPrompt(hand, 'analyze')) }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAPI])

  const suggestLines = useCallback(async (hand) => {
    setLoading(true); setError(null)
    try { return await callAPI(buildSingleHandPrompt(hand, 'suggest')) }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAPI])

  const detectErrors = useCallback(async (hand) => {
    setLoading(true); setError(null)
    try { return await callAPI(buildSingleHandPrompt(hand, 'errors')) }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAPI])

  // ── Análisis cruzado de historial ─────────────────────────────
  const analyzeHistory = useCallback(async (hands, sessions) => {
    setLoading(true); setError(null)
    try {
      // Historial necesita más tokens para procesar todas las manos
      return await callAPI(buildHistoryPrompt(hands, sessions), 2048)
    }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAPI])

  return { loading, error, apiKey, saveApiKey, analyzeHand, suggestLines, detectErrors, analyzeHistory }
}