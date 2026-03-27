import { useState, useCallback } from 'react'

// ── Constantes ────────────────────────────────────────────────────
const ANTHROPIC_MODEL   = 'claude-sonnet-4-20250514'
const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages'
const OLLAMA_DEFAULT_URL = 'http://localhost:11434'

// Proveedor activo: 'anthropic' | 'ollama'
const PROVIDER_KEY     = 'poker_ai_provider'
const ANTHROPIC_KEY    = 'poker_ai_key'
const OLLAMA_URL_KEY   = 'poker_ollama_url'
const OLLAMA_MODEL_KEY = 'poker_ollama_model'

export const AI_PROVIDERS = {
  anthropic: { label: 'Anthropic (Claude)',   description: 'Requiere API key de console.anthropic.com' },
  ollama:    { label: 'Ollama (local)',        description: 'Modelo local en tu máquina, sin coste' },
}

// ── Error types ───────────────────────────────────────────────────
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

// ── Normalización de manos ────────────────────────────────────────
export function normalizeHand(raw) {
  if (!raw) return null
  let s = raw.trim().toUpperCase()
  s = s.replace(/[♠♥♦♣]/g, '').replace(/\s+/g, '')
  let suffix = ''
  if (s.endsWith('S') || s.toLowerCase().includes('suit')) {
    suffix = 's'; s = s.replace(/S$/, '').replace(/SUITED/i, '')
  } else if (s.endsWith('O') || s.toLowerCase().includes('off')) {
    suffix = 'o'; s = s.replace(/O$/, '').replace(/OFF/i, '')
  }
  s = s.replace(/[^AKQJT2-9]/g, '')
  if (s.length < 2) return null
  const rank1 = s[0], rank2 = s[1] || s[0]
  const ORDER = 'AKQJT98765432'
  const i1 = ORDER.indexOf(rank1), i2 = ORDER.indexOf(rank2)
  if (i1 === -1 || i2 === -1) return null
  if (rank1 === rank2) return rank1 + rank2
  const [high, low] = i1 < i2 ? [rank1, rank2] : [rank2, rank1]
  return high + low + (suffix || 'o')
}

// ── Helpers de contexto ───────────────────────────────────────────
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
  return sorted.map(([hand, d]) =>
    `${hand}: ${d.total} manos, ${((d.wins / d.total) * 100).toFixed(0)}% win rate`
  ).join('\n')
}

function serializeHands(hands) {
  return hands.slice(-40).map((h, i) => {
    const parts = [
      `[${i + 1}] ${h.date}`,
      `Pos: ${h.position || '?'}`,
      `Resultado: ${h.result}`,
      h.heroHand      ? `Hero: ${h.heroHand}`              : null,
      h.villainRange  ? `Villano: ${h.villainRange}`        : null,
      h.preflopAction ? `Preflop: ${h.preflopAction}`       : null,
      h.street        ? `Calle: ${h.street}`                : null,
      h.board         ? `Board: ${h.board}`                 : null,
      h.amount        ? `Importe: ${h.amount}€`             : null,
      h.tags?.length  ? `Tags: ${h.tags.join(', ')}`        : null,
      h.aiAnalysis?.errorTypes?.length
        ? `Errores IA: ${h.aiAnalysis.errorTypes.join(', ')}` : null,
      h.notes         ? `Notas: ${h.notes.slice(0, 100)}`  : null,
    ].filter(Boolean)
    return parts.join(' | ')
  }).join('\n')
}

// ── Prompts ───────────────────────────────────────────────────────
function buildSingleHandPrompt(hand, mode) {
  const ctx = [
    `Fecha: ${hand.date}`,
    `Posición: ${hand.position || 'desconocida'}`,
    `Resultado: ${hand.result === 'win' ? 'Victoria' : hand.result === 'loss' ? 'Derrota' : 'Break-even'}`,
    `Importe: ${hand.amount ? hand.amount + '€' : 'no especificado'}`,
    `Hero hand: ${hand.heroHand || 'no especificada'}`,
    `Rango villano: ${hand.villainRange || 'no especificado'}`,
    `Acción preflop: ${hand.preflopAction || 'no especificada'}`,
    `Calle decisiva: ${hand.street || 'no especificada'}`,
    `Board: ${hand.board || 'no especificado'}`,
    `Tags: ${(hand.tags || []).join(', ') || 'ninguno'}`,
    `Descripción: ${hand.notes || '(sin descripción)'}`,
  ].join('\n')

  const jsonInstruction = `Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después, sin bloques de código, sin backticks.`

  const prompts = {
    analyze: `Eres un coach de póker profesional. Analiza esta mano.
${jsonInstruction}
Estructura exacta:
{"summary":"Resumen 1-2 frases","errors":["error1"],"errorTypes":["tipo_enum"],"suggestedLine":"Línea óptima","alternativeLines":["alt1"],"keyConceptsApplied":["concepto1"],"score":7,"scoreReason":"Explicación"}
Tipos errorTypes válidos: fold_equity, pot_odds, position, bet_sizing, bluff_frequency, value_thin, tilt, range_imbalance, icm, other.

MANO:
${ctx}`,

    suggest: `Eres coach de póker. Sugiere líneas de juego ordenadas por EV.
${jsonInstruction}
Estructura exacta:
{"lines":[{"action":"nombre","reason":"explicación","ev":"alto/medio/bajo/negativo"}],"recommended":"Acción recomendada","gtoNote":"Nota GTO vs exploitative"}

MANO:
${ctx}`,

    errors: `Eres coach de póker. Detecta y clasifica todos los errores de esta mano.
${jsonInstruction}
Estructura exacta:
{"errorsFound":[{"type":"tipo_enum","description":"descripción","severity":"alta/media/baja","fix":"cómo corregirlo"}],"patternWarning":"advertencia o null","positiveAspects":["aspecto positivo"]}
Tipos válidos: fold_equity, pot_odds, position, bet_sizing, bluff_frequency, value_thin, tilt, range_imbalance, icm, other.

MANO:
${ctx}`,
  }
  return prompts[mode]
}

function buildHistoryPrompt(hands, sessions) {
  const winRate = hands.length
    ? ((hands.filter(h => h.result === 'win').length / hands.length) * 100).toFixed(1)
    : 0
  const sessionStats = sessions.length
    ? `Sesiones: ${sessions.length} | Horas: ${sessions.reduce((a, s) => a + (s.duration || 0), 0)}h | Resultado neto: ${sessions.reduce((a, s) => a + ((s.cashOut || 0) - (s.buyIn || 0)), 0)}€`
    : 'Sin sesiones registradas.'

  return `Eres un coach de póker de élite. Analiza el historial completo de este jugador.

ESTADÍSTICAS:
- Total manos: ${hands.length}
- Win rate global: ${winRate}%
- ${sessionStats}

HISTORIAL (últimas 40 manos):
${serializeHands(hands)}

RENDIMIENTO POR RANGO:
${buildRangeContext(hands)}

Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después, sin bloques de código, sin backticks.
Estructura exacta:
{"executiveSummary":"diagnóstico 2-3 frases","topLeaks":[{"category":"nombre","description":"descripción detallada","frequency":"alta/media/baja","estimatedLoss":"impacto estimado","fix":"cómo corregirlo","exampleHands":["#N"]}],"positivePatterns":["patrón positivo"],"studyPlan":[{"topic":"tema","reason":"por qué es prioritario","resource":"recurso concreto"}],"highImpactSpots":[{"spot":"situación","suggestion":"ajuste"}],"benchmarkComparison":"comparativa con nivel esperado","rangeInsights":"observaciones por rangos"}`
}

// ── Parseo robusto de JSON (Ollama a veces añade texto extra) ─────
function parseJSON(text) {
  if (!text) throw new Error('Respuesta vacía del modelo')

  // Limpiar bloques de código
  let clean = text
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/```\s*$/im, '')
    .trim()

  // Intentar parsear directamente
  try { return JSON.parse(clean) } catch (_) {}

  // Extraer primer objeto JSON del texto (útil si Ollama añade texto antes/después)
  const match = clean.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch (_) {}
  }

  throw new Error(`No se pudo parsear la respuesta del modelo. Respuesta recibida: "${clean.slice(0, 200)}…"`)
}

// ── Llamada a Anthropic ───────────────────────────────────────────
async function callAnthropic(prompt, apiKey, maxTokens = 1024) {
  if (!apiKey) throw new Error('Configura tu API key de Anthropic en Ajustes → Proveedor de IA.')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Anthropic HTTP ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.find(b => b.type === 'text')?.text || ''
  return parseJSON(text)
}

// ── Llamada a Ollama ──────────────────────────────────────────────
async function callOllama(prompt, ollamaUrl, model) {
  const base  = (ollamaUrl || OLLAMA_DEFAULT_URL).replace(/\/$/, '')
  const url   = `${base}/api/chat`
  const mdl   = model || 'llama3'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:    mdl,
      messages: [{ role: 'user', content: prompt }],
      stream:   false,       // respuesta completa de una vez
      options:  {
        temperature: 0.1,    // baja temperatura para respuestas más deterministas
        num_predict: 2048,
      },
    }),
  }).catch(() => {
    throw new Error(`No se pudo conectar con Ollama en ${base}. ¿Está ejecutándose? Prueba: ollama serve`)
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const msg  = body.includes('model') && body.includes('not found')
      ? `Modelo "${mdl}" no encontrado. Instálalo con: ollama pull ${mdl}`
      : `Ollama HTTP ${res.status}: ${body.slice(0, 150)}`
    throw new Error(msg)
  }

  const data = await res.json()
  // Ollama /api/chat devuelve { message: { role, content } }
  const text = data?.message?.content || data?.response || ''
  if (!text) throw new Error('Ollama devolvió una respuesta vacía')
  return parseJSON(text)
}

// ── Test de conexión con Ollama ───────────────────────────────────
export async function testOllamaConnection(url, model) {
  const base = (url || OLLAMA_DEFAULT_URL).replace(/\/$/, '')
  try {
    // Primero: verificar que Ollama responde en /api/tags
    const tagsRes = await fetch(`${base}/api/tags`)
    if (!tagsRes.ok) throw new Error(`Ollama no responde (HTTP ${tagsRes.status})`)

    const tags = await tagsRes.json()
    const models = tags?.models?.map(m => m.name) || []

    // Verificar que el modelo está instalado
    const mdl = model || 'llama3'
    const hasModel = models.some(m => m.startsWith(mdl.split(':')[0]))

    if (!hasModel) {
      return {
        ok: false,
        message: `Modelo "${mdl}" no encontrado. Modelos disponibles: ${models.join(', ') || 'ninguno'}. Instala con: ollama pull ${mdl}`,
        models,
      }
    }

    return { ok: true, message: `Conexión OK · Modelo "${mdl}" disponible`, models }
  } catch (e) {
    return {
      ok: false,
      message: e.message.includes('fetch')
        ? `No se puede conectar con Ollama en ${base}. Asegúrate de que está ejecutándose con: ollama serve`
        : e.message,
      models: [],
    }
  }
}

// ── Hook principal ────────────────────────────────────────────────
export function useAI() {
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // Proveedor activo
  const [provider, setProviderState] = useState(
    () => localStorage.getItem(PROVIDER_KEY) || 'anthropic'
  )

  // Anthropic
  const [apiKey, setApiKeyState] = useState(
    () => localStorage.getItem(ANTHROPIC_KEY) || ''
  )

  // Ollama
  const [ollamaUrl, setOllamaUrlState] = useState(
    () => localStorage.getItem(OLLAMA_URL_KEY) || OLLAMA_DEFAULT_URL
  )
  const [ollamaModel, setOllamaModelState] = useState(
    () => localStorage.getItem(OLLAMA_MODEL_KEY) || 'llama3'
  )

  // ── Setters con persistencia ──────────────────────────────────
  const saveProvider = useCallback((p) => {
    setProviderState(p)
    localStorage.setItem(PROVIDER_KEY, p)
  }, [])

  const saveApiKey = useCallback((k) => {
    setApiKeyState(k)
    localStorage.setItem(ANTHROPIC_KEY, k)
  }, [])

  const saveOllamaUrl = useCallback((u) => {
    setOllamaUrlState(u)
    localStorage.setItem(OLLAMA_URL_KEY, u)
  }, [])

  const saveOllamaModel = useCallback((m) => {
    setOllamaModelState(m)
    localStorage.setItem(OLLAMA_MODEL_KEY, m)
  }, [])

  // ── Dispatcher: llama al proveedor activo ─────────────────────
  const callAI = useCallback(async (prompt, maxTokens = 1024) => {
    if (provider === 'ollama') {
      return callOllama(prompt, ollamaUrl, ollamaModel)
    }
    return callAnthropic(prompt, apiKey, maxTokens)
  }, [provider, apiKey, ollamaUrl, ollamaModel])

  // ── Métodos públicos ──────────────────────────────────────────
  const analyzeHand = useCallback(async (hand) => {
    setLoading(true); setError(null)
    try   { return await callAI(buildSingleHandPrompt(hand, 'analyze')) }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAI])

  const suggestLines = useCallback(async (hand) => {
    setLoading(true); setError(null)
    try   { return await callAI(buildSingleHandPrompt(hand, 'suggest')) }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAI])

  const detectErrors = useCallback(async (hand) => {
    setLoading(true); setError(null)
    try   { return await callAI(buildSingleHandPrompt(hand, 'errors')) }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAI])

  const analyzeHistory = useCallback(async (hands, sessions) => {
    setLoading(true); setError(null)
    try   { return await callAI(buildHistoryPrompt(hands, sessions), 2048) }
    catch (e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [callAI])

  // Indica si el proveedor activo está configurado (listo para usar)
  const isConfigured = provider === 'ollama'
    ? !!ollamaUrl
    : !!apiKey

  return {
    loading, error,
    provider, saveProvider,
    apiKey,   saveApiKey,
    ollamaUrl, saveOllamaUrl,
    ollamaModel, saveOllamaModel,
    isConfigured,
    analyzeHand, suggestLines, detectErrors, analyzeHistory,
  }
}