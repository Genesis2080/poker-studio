import { useState, useCallback } from 'react'

// ── Constantes y Configuración Local ──────────────────────────────
const OLLAMA_DEFAULT_URL = 'http://localhost:11434'
const DEFAULT_MODEL      = 'llama3'

// Claves de localStorage
const PROVIDER_KEY     = 'poker_ai_provider'
const OLLAMA_URL_KEY   = 'poker_ollama_url'
const OLLAMA_MODEL_KEY = 'poker_ollama_model'

export const AI_PROVIDERS = {
  ollama:    { label: 'Ollama (local)',        description: 'Modelo local en tu máquina, privado y sin coste' },
  anthropic: { label: 'Anthropic (Claude)',    description: 'Requiere API key de console.anthropic.com' },
}

// ── Error types para el Dashboard ─────────────────────────────────
export const ERROR_TYPES = {
  'fold_equity':     'Fold equity ignorada',
  'pot_odds':        'Pot odds incorrectos',
  'position':        'Error de posición',
  'bet_sizing':      'Sizing incorrecto',
  'bluff_frequency': 'Frecuencia de bluff',
  'value_thin':      'Value bet muy fina'
}

// ── Utilidades (Exportadas para otros componentes) ────────────────
export function normalizeHand(hand) {
  if (!hand) return null;
  return {
    id: hand.id,
    date: hand.date,
    position: hand.position,
    result: hand.result,
    potWon: hand.potWon,
    potSize: hand.potSize,
    heroHand: hand.heroHand,
    board: hand.board,
    preflopAction: hand.preflopAction,
    street: hand.street,
    notes: hand.notes
  }
}

export async function testOllamaConnection(url = OLLAMA_DEFAULT_URL) {
  try {
    // /api/tags es el endpoint estándar para comprobar si Ollama está vivo y qué modelos tiene
    const res = await fetch(`${url}/api/tags`)
    if (!res.ok) throw new Error('Error HTTP')
    return true
  } catch (err) {
    return false
  }
}

// ── Prompts de Inteligencia Artificial ────────────────────────────
function buildSingleHandPrompt(hand, type) {
  const SYSTEM_PROMPT = `
Eres un coach de póker de élite especializado en GTO (Game Theory Optimal) y juego explotativo.
Analiza la siguiente mano del usuario (Hero). 

REGLAS ESTRICTAS DE TU ANÁLISIS:
1. Evalúa críticamente los 'bet sizings' en función del SPR (Stack-to-Pot Ratio) y la textura del board.
2. Identifica si el Hero ignoró 'Pot Odds' o 'Implied Odds' matemáticas.
3. Piensa en términos de rangos percibidos y 'blockers'. No analices resultados (resulting), analiza decisiones por valor esperado (EV).
4. Sé directo y crudo. Si el Hero cometió un error grave, usa el término [LEAK GRAVE].
5. Formatea tu respuesta usando Markdown (negritas, listas) para facilitar la lectura.
6. Si la acción fue estándar y correcta, dilo claramente sin inventar errores.

IMPORTANTE: Ve directo al análisis. No incluyas frases de introducción como 'Aquí tienes el análisis' ni te despidas.
`;

  let promptContext = `
Mano jugada en: ${hand.position}
Cartas del Hero: ${hand.heroHand}
Board: ${hand.board || 'Preflop'}
Acción preflop: ${hand.preflopAction}
Tamaño del bote final: ${hand.potSize}
Resultado: ${hand.result}
Notas de la mano: ${hand.notes || 'Ninguna'}
`;

  if (type === 'analyze') {
    return `${SYSTEM_PROMPT}\n\n${promptContext}\nPor favor, dame un análisis técnico y detallado calle por calle de mis decisiones en esta mano.`;
  } else if (type === 'suggest') {
    return `${SYSTEM_PROMPT}\n\n${promptContext}\n¿Cuál habría sido la línea GTO más óptima o la mejor adaptación explotativa en esta situación específica?`;
  } else if (type === 'errors') {
    return `${SYSTEM_PROMPT}\n\n${promptContext}\nEnumera de forma concisa (en bullet points) los principales errores matemáticos o tácticos que cometí en esta mano.`;
  }

  return `${SYSTEM_PROMPT}\n\n${promptContext}\nAnaliza esta mano.`;
}

function buildHistoryPrompt(hands, sessions) {
  return `
Eres un analista de póker. Aquí tienes un resumen de mi volumen de juego.
Manos aportadas: ${hands.length}
Sesiones jugadas: ${sessions.length}

Teniendo en cuenta los principios del GTO, dime cuáles suelen ser los 3 leaks (fugas de dinero) más comunes en los jugadores de este nivel y dame 3 consejos clave para mejorar mi win rate general.
IMPORTANTE: Ve directo al análisis, sin introducciones. Usa formato Markdown.
`;
}

// ── Hook Principal ────────────────────────────────────────────────
export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Leemos de localStorage por si el usuario lo cambia en la UI de configuración
  const provider = localStorage.getItem(PROVIDER_KEY) || 'ollama'

  // Motor de conexión con Ollama
  const callAI = useCallback(async (promptText, maxTokens = 1024) => {
    const ollamaUrl = localStorage.getItem(OLLAMA_URL_KEY) || OLLAMA_DEFAULT_URL;
    const ollamaModel = localStorage.getItem(OLLAMA_MODEL_KEY) || DEFAULT_MODEL;

    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: promptText,
          stream: false, // Falso para recibir toda la respuesta de golpe en React
          options: {
            num_predict: maxTokens,
            temperature: 0.2, // Baja temperatura para análisis lógico/matemático
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Error de Ollama: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;

    } catch (err) {
      console.error("Error conectando con Ollama:", err);
      throw new Error("No se pudo conectar con Ollama. ¿Iniciaste el servidor con CORS permitido? (OLLAMA_ORIGINS=\"*\" ollama serve)");
    }
  }, []);

  // ── Funciones de Acción ─────────────────────────────────────────
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

  // Al usar Ollama local, asumimos que siempre está "configurado" para intentar la llamada
  const isConfigured = provider === 'ollama';

  return {
    loading,
    error,
    isConfigured,
    analyzeHand,
    suggestLines,
    detectErrors,
    analyzeHistory
  }
}