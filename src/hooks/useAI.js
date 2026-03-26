import { useState, useCallback } from 'react'

// ── Constantes ────────────────────────────────────────────────────
const MODEL   = 'claude-sonnet-4-20250514'
const API_URL = 'https://api.anthropic.com/v1/messages'

// Errores más comunes en póker que la IA detecta/clasifica
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

// ── Prompt base para análisis de manos ───────────────────────────
function buildPrompt(hand, mode) {
  const handContext = `
Mano de póker:
- Fecha: ${hand.date}
- Posición: ${hand.position || 'desconocida'}
- Resultado: ${hand.result === 'win' ? 'Victoria' : hand.result === 'loss' ? 'Derrota' : 'Break-even'}
- Importe: ${hand.amount ? hand.amount + '€' : 'no especificado'}
- Tags: ${(hand.tags || []).join(', ') || 'ninguno'}
- Descripción del jugador: ${hand.notes || '(sin descripción)'}
- Análisis previo guardado: ${hand.aiAnalysis?.summary || '(ninguno)'}
`.trim()

  const prompts = {
    analyze: `
Eres un coach de póker profesional. Analiza esta mano y responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta, sin texto adicional ni backticks:
{
  "summary": "Resumen conciso del spot en 1-2 frases",
  "errors": ["error1", "error2"],
  "errorTypes": ["tipo_del_enum"],
  "suggestedLine": "La línea de juego óptima explicada claramente",
  "alternativeLines": ["línea alternativa 1", "línea alternativa 2"],
  "keyConceptsApplied": ["concepto1", "concepto2"],
  "score": 7,
  "scoreReason": "Explicación del score del 1 al 10"
}

Para errorTypes usa solo valores del listado: fold_equity, pot_odds, position, bet_sizing, bluff_frequency, value_thin, tilt, range_imbalance, icm, other.

${handContext}
    `.trim(),

    suggest: `
Eres un coach de póker. Basándote en esta situación, sugiere las posibles líneas de juego de mejor a peor. Responde ÚNICAMENTE con JSON sin texto ni backticks:
{
  "lines": [
    { "action": "Nombre de la acción", "reason": "Explicación concisa", "ev": "alto/medio/bajo/negativo" },
    { "action": "...", "reason": "...", "ev": "..." }
  ],
  "recommended": "Acción recomendada en una frase corta",
  "gtoNote": "Nota sobre GTO vs exploitative en este spot"
}

${handContext}
    `.trim(),

    errors: `
Eres un coach de póker. Detecta y clasifica todos los errores en esta mano. Responde ÚNICAMENTE con JSON sin texto ni backticks:
{
  "errorsFound": [
    { "type": "tipo_del_enum", "description": "Descripción del error", "severity": "alta/media/baja", "fix": "Cómo corregirlo" }
  ],
  "patternWarning": "Advertencia si hay un patrón repetitivo (o null si no hay)",
  "positiveAspects": ["aspecto positivo 1", "aspecto positivo 2"]
}

Para type usa solo: fold_equity, pot_odds, position, bet_sizing, bluff_frequency, value_thin, tilt, range_imbalance, icm, other.

${handContext}
    `.trim(),
  }

  return prompts[mode]
}

// ── Hook principal ────────────────────────────────────────────────
export function useAI() {
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [apiKey,   setApiKey]   = useState(() => localStorage.getItem('poker_ai_key') || '')

  const saveApiKey = useCallback((key) => {
    setApiKey(key)
    localStorage.setItem('poker_ai_key', key)
  }, [])

  // Llamada genérica a la API
  const callAPI = useCallback(async (prompt) => {
    if (!apiKey) throw new Error('Necesitas configurar tu API key de Anthropic en Ajustes.')

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message || `Error HTTP ${res.status}`)
    }

    const data = await res.json()
    const text = data.content?.find(b => b.type === 'text')?.text || ''

    // Parsear JSON con limpieza defensiva de posibles backticks
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(clean)
  }, [apiKey])

  // ── Analizar una mano completa ──────────────────────────────
  const analyzeHand = useCallback(async (hand) => {
    setLoading(true)
    setError(null)
    try {
      const result = await callAPI(buildPrompt(hand, 'analyze'))
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [callAPI])

  // ── Sugerir líneas de juego ─────────────────────────────────
  const suggestLines = useCallback(async (hand) => {
    setLoading(true)
    setError(null)
    try {
      const result = await callAPI(buildPrompt(hand, 'suggest'))
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [callAPI])

  // ── Detectar errores ────────────────────────────────────────
  const detectErrors = useCallback(async (hand) => {
    setLoading(true)
    setError(null)
    try {
      const result = await callAPI(buildPrompt(hand, 'errors'))
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [callAPI])

  return {
    loading,
    error,
    apiKey,
    saveApiKey,
    analyzeHand,
    suggestLines,
    detectErrors,
  }
}