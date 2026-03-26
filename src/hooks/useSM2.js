/**
 * useSM2 — Implementación del algoritmo SuperMemo 2 (SM-2)
 *
 * SM-2 original (Wozniak, 1987):
 *   - Calidad de respuesta q ∈ {0,1,2,3,4,5}
 *   - Easiness Factor (EF): empieza en 2.5, nunca baja de 1.3
 *   - Intervalo: I(1)=1, I(2)=6, I(n)=I(n-1)*EF
 *   - Si q < 3 → resetear (volver a empezar con I=1)
 *
 * Mapeamos las 3 respuestas del usuario a calidad SM-2:
 *   'again' (Difícil/Resetear) → q = 1
 *   'hard'  (Difícil pero recuerdo) → q = 3
 *   'good'  (Bien)  → q = 4
 *   'easy'  (Fácil) → q = 5
 */

// ── Calidad → valor SM-2 ─────────────────────────────────────────
export const QUALITY = {
  again: 1,  // no recordé → resetear
  hard:  3,  // recordé con dificultad
  good:  4,  // recordé bien
  easy:  5,  // fácil, sin esfuerzo
}

// ── Estado inicial de una tarjeta nueva ─────────────────────────
export function initCardState() {
  return {
    interval:    0,      // días hasta la próxima revisión
    repetitions: 0,      // número de revisiones superadas (q >= 3)
    ef:          2.5,    // easiness factor
    dueDate:     null,   // próxima fecha de revisión (ISO string)
    lastReview:  null,   // última fecha de revisión
    history:     [],     // [{ date, quality, interval }]
  }
}

// ── Calcular nuevo estado tras una respuesta ─────────────────────
export function sm2Next(state, quality) {
  const q   = QUALITY[quality] ?? 4
  let { interval, repetitions, ef } = state

  // Actualizar EF (nunca menor a 1.3)
  const newEf = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

  let newInterval
  let newRepetitions

  if (q < 3) {
    // Respuesta incorrecta → resetear
    newInterval    = 1
    newRepetitions = 0
  } else {
    // Respuesta correcta
    newRepetitions = repetitions + 1
    if (newRepetitions === 1)      newInterval = 1
    else if (newRepetitions === 2) newInterval = 6
    else                           newInterval = Math.round(interval * newEf)
  }

  const today   = new Date()
  const dueDate = new Date(today)
  dueDate.setDate(today.getDate() + newInterval)

  return {
    interval:    newInterval,
    repetitions: newRepetitions,
    ef:          parseFloat(newEf.toFixed(3)),
    dueDate:     dueDate.toISOString().split('T')[0],
    lastReview:  today.toISOString().split('T')[0],
    history:     [
      ...(state.history || []),
      { date: today.toISOString().split('T')[0], quality: q, interval: newInterval },
    ],
  }
}

// ── Obtener tarjetas pendientes hoy ──────────────────────────────
export function getDueCards(cards, sm2States) {
  const today = new Date().toISOString().split('T')[0]
  return cards.filter(card => {
    const state = sm2States[card.id]
    if (!state || !state.dueDate) return true       // nueva → incluir
    return state.dueDate <= today                    // vencida o hoy
  })
}

// ── Estadísticas del mazo ─────────────────────────────────────────
export function getDeckStats(cards, sm2States) {
  const today = new Date().toISOString().split('T')[0]
  let newCards = 0, dueCards = 0, learnedCards = 0, totalReviews = 0

  cards.forEach(card => {
    const state = sm2States[card.id]
    if (!state || !state.lastReview) {
      newCards++
    } else if (state.dueDate <= today) {
      dueCards++
    } else {
      learnedCards++
    }
    totalReviews += (state?.history?.length || 0)
  })

  const retentionRates = cards
    .map(c => {
      const h = sm2States[c.id]?.history || []
      if (h.length < 2) return null
      const good = h.filter(r => r.quality >= 3).length
      return good / h.length
    })
    .filter(r => r !== null)

  const avgRetention = retentionRates.length
    ? (retentionRates.reduce((a, b) => a + b, 0) / retentionRates.length * 100).toFixed(0)
    : null

  return { newCards, dueCards, learnedCards, totalReviews, avgRetention }
}

// ── Tarjetas con mayor dificultad (EF más bajo) ───────────────────
export function getHardestCards(cards, sm2States, limit = 5) {
  return cards
    .filter(c => sm2States[c.id]?.repetitions > 0)
    .sort((a, b) => (sm2States[a.id]?.ef ?? 2.5) - (sm2States[b.id]?.ef ?? 2.5))
    .slice(0, limit)
}