'use strict'

/**
 * parser.js
 * ─────────────────────────────────────────────────────────────────
 * Extrae y normaliza manos individuales del formato de texto bruto
 * de PokerStars Hand History.
 *
 * Las manos en PokerStars siguen este patrón:
 *
 *   PokerStars Hand #123456789:  Hold'em No Limit ($0.01/$0.02 USD)
 *   - 2024/01/15 21:30:00 CET [2024/01/15 15:30:00 ET]
 *   Table 'Acamar III' 6-max Seat #1 is the button
 *   Seat 1: Hero ($2.00 in chips)
 *   ...
 *   *** SUMMARY ***
 *   ...
 *   [línea en blanco]
 *
 * El separador de manos es una línea que empieza por "PokerStars Hand #"
 * o "PokerStars Zoom Hand #".
 */

// ── Regex de cabecera de mano ────────────────────────────────────
// Captura: handId, gameType, smallBlind, bigBlind, currency, fecha ISO
const HAND_HEADER_RE = /PokerStars (?:Zoom )?Hand #(\d+):\s+(.+?)\s+\([\$€]?(\d+(?:\.\d+)?)\/[\$€]?(\d+(?:\.\d+)?)\s*(\w+)?\)/

// Fecha y hora: "2024/01/15 21:30:00 CET"
const DATE_RE = /(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/

// Tabla y formato
const TABLE_RE = /Table '([^']+)'\s+(\S+)/

// Hero seat
const HERO_SEAT_RE = /Seat \d+: (\S+) \([\$€]?([\d,.]+) in chips\)/g

// Posición del botón
const BUTTON_RE = /Seat #(\d+) is the button/

// Cartas del héroe: "Dealt to Hero [Ah Ks]"
const DEALT_RE = /Dealt to (\S+) \[([^\]]+)\]/

// Resultado final de la mano para cada jugador
// "Hero: shows [Ah Ks] (a flush, Ace high)" o "Hero collected $1.50 from pot"
const COLLECTED_RE = /(\S+) collected [\$€]?([\d,.]+) from/g
const SHOWS_RE     = /(\S+): shows \[([^\]]+)\]/g
const MUCKS_RE     = /(\S+): mucks hand/g

// Acciones resumidas en SUMMARY
// "Seat 1: Hero (button) showed [Ah Ks] and won ($1.50) with a flush"
const SUMMARY_SEAT_RE = /Seat \d+: (\S+) (?:\([^)]+\) )?(?:showed|mucked|folded)/g
const SUMMARY_WON_RE  = /(\S+).+?(?:won|collected) \([\$€]?([\d,.]+)\)/

// ── Dividir texto bruto en bloques de manos individuales ──────────
/**
 * splitHands(rawText) → string[]
 *
 * Divide el texto en bloques individuales usando la cabecera de mano
 * como separador. Filtra bloques vacíos o demasiado cortos.
 */
function splitHands(rawText) {
  // Separador: inicio de línea con "PokerStars Hand #" o "PokerStars Zoom Hand #"
  const parts = rawText.split(/(?=PokerStars (?:Zoom )?Hand #\d+)/)
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 50 && /PokerStars (?:Zoom )?Hand #\d+/.test(p))
}

// ── Extraer el ID único de una mano ──────────────────────────────
function extractHandId(block) {
  const m = block.match(/PokerStars (?:Zoom )?Hand #(\d+)/)
  return m ? m[1] : null
}

// ── Parsear una mano individual ───────────────────────────────────
/**
 * parseHand(block) → HandObject | null
 *
 * Retorna un objeto normalizado compatible con el schema de la app:
 * {
 *   id, date, position, result, heroHand, villainRange,
 *   preflopAction, street, board, notes, tags,
 *   // campos adicionales del import:
 *   handId, gameType, stakes, tableName, tableFormat,
 *   heroName, heroStack, potSize, rake, rawText
 * }
 */
function parseHand(block) {
  try {
    const handId = extractHandId(block)
    if (!handId) return null

    // ── Cabecera ─────────────────────────────────────────────────
    const headerM = block.match(HAND_HEADER_RE)
    const gameType = headerM ? headerM[2].trim() : 'Unknown'
    const smallBlind = headerM ? parseFloat(headerM[3]) : 0
    const bigBlind   = headerM ? parseFloat(headerM[4]) : 0
    const currency   = headerM ? (headerM[5] || 'USD') : 'USD'

    // ── Fecha ────────────────────────────────────────────────────
    const dateM = block.match(DATE_RE)
    const date  = dateM
      ? dateM[1].replace(/\//g, '-').split(' ')[0]  // "2024-01-15"
      : new Date().toISOString().split('T')[0]

    // ── Tabla ────────────────────────────────────────────────────
    const tableM    = block.match(TABLE_RE)
    const tableName  = tableM ? tableM[1] : 'Unknown'
    const tableFormat= tableM ? tableM[2] : 'Unknown'  // "6-max", "9-max", etc.

    // ── Botón y asientos ─────────────────────────────────────────
    const buttonM = block.match(BUTTON_RE)
    const buttonSeat = buttonM ? parseInt(buttonM[1]) : null

    // Extraer todos los jugadores con sus stacks
    const players = {}
    let seatMatch
    const seatRe = /Seat (\d+): (\S+) \([\$€]?([\d,.]+) in chips\)/g
    while ((seatMatch = seatRe.exec(block)) !== null) {
      players[parseInt(seatMatch[1])] = {
        name:  seatMatch[2],
        stack: parseFloat(seatMatch[3].replace(',', '')),
      }
    }

    const totalPlayers = Object.keys(players).length

    // ── Héroe: cartas y nombre ───────────────────────────────────
    const dealtM = block.match(DEALT_RE)
    const heroName = dealtM ? dealtM[1] : null
    const heroCards= dealtM ? dealtM[2] : null  // "Ah Ks"

    // Convertir cartas a formato canónico de la app: "AKs" o "AKo"
    const heroHand = heroCards ? normalizeHoleCards(heroCards) : ''

    // ── Posición del héroe ────────────────────────────────────────
    // Determinar la posición del héroe según su seat y el botón
    let heroSeat = null
    for (const [seat, p] of Object.entries(players)) {
      if (p.name === heroName) { heroSeat = parseInt(seat); break }
    }
    const position = derivePosition(heroSeat, buttonSeat, totalPlayers, players)

    const heroStack = heroSeat && players[heroSeat]
      ? players[heroSeat].stack
      : 0

    // ── Acción preflop del héroe ──────────────────────────────────
    const preflopAction = detectPreflopAction(block, heroName)

    // ── Board ─────────────────────────────────────────────────────
    const board = extractBoard(block)

    // ── Calle decisiva ────────────────────────────────────────────
    const street = detectDecisiveStreet(block)

    // ── Resultado ─────────────────────────────────────────────────
    const { result, potWon } = detectResult(block, heroName)

    // ── Tamaño del bote y rake ────────────────────────────────────
    const potInfo = extractPotInfo(block)

    // ── Tags automáticos ──────────────────────────────────────────
    const tags = autoTags(block, heroName, preflopAction, result)

    // ── Notas (resumen de la mano para la IA) ─────────────────────
    const notes = buildAutoNotes({
      heroName, heroCards, position, preflopAction,
      board, street, result, potWon,
      tableFormat, totalPlayers,
    })

    return {
      // Schema de la app
      id:            'ps-' + handId,
      date,
      position:      position || 'BTN',
      result,
      heroHand,
      villainRange:  '',
      villainRangeKeys: [],
      preflopAction: preflopAction || '',
      street:        street || '',
      board,
      notes,
      tags,
      // Campos adicionales del import
      handId,
      gameType,
      stakes:        `${currency} ${smallBlind}/${bigBlind}`,
      tableName,
      tableFormat,
      heroName:      heroName || '',
      heroStack,
      potSize:       potInfo.total,
      rake:          potInfo.rake,
      potWon,
      importedAt:    Date.now(),
      source:        'pokerstars',
      rawText:       block,   // guardamos el texto original para re-análisis
    }
  } catch (err) {
    console.error('[parser] Error parsing hand:', err.message)
    return null
  }
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Convierte "Ah Ks" → "AKs" o "AKo"
 * Convierte "Ah As" → "AA"
 */
function normalizeHoleCards(cards) {
  const parts = cards.trim().split(/\s+/)
  if (parts.length !== 2) return cards

  const rankOf  = c => c[0].toUpperCase().replace('T', 'T')
  const suitOf  = c => c[1].toLowerCase()
  const ORDER   = 'AKQJT98765432'

  const [c1, c2]   = parts
  const r1 = rankOf(c1), r2 = rankOf(c2)
  const s1 = suitOf(c1), s2 = suitOf(c2)

  if (r1 === r2) return r1 + r2   // par

  const i1 = ORDER.indexOf(r1), i2 = ORDER.indexOf(r2)
  const [hi, lo] = i1 < i2 ? [r1, r2] : [r2, r1]
  const suited    = s1 === s2 ? 's' : 'o'

  return hi + lo + suited
}

/**
 * Infiere la posición según número de seat, seat del botón y total de jugadores
 */
function derivePosition(heroSeat, buttonSeat, totalPlayers, players) {
  if (!heroSeat || !buttonSeat || !totalPlayers) return ''

  const seats = Object.keys(players).map(Number).sort((a, b) => a - b)
  const n     = seats.length

  // Índice del héroe y del botón en el array de seats ordenados
  const btnIdx  = seats.indexOf(buttonSeat)
  const heroIdx = seats.indexOf(heroSeat)

  if (btnIdx === -1 || heroIdx === -1) return ''

  // Distancia del héroe al botón en sentido horario
  // 0 = BTN, 1 = SB (después del BTN), 2 = BB ...
  // Pero las posiciones preflop son: BTN actúa último → queda al final
  // El orden de acción preflop es: UTG → ... → CO → BTN → SB → BB
  // Así que mapeamos por la posición relativa al BTN

  const dist = (heroIdx - btnIdx + n) % n   // 0=BTN, 1=SB, 2=BB, 3=UTG3, etc.

  if (n <= 3) {
    const map3 = { 0:'BTN', 1:'SB', 2:'BB' }
    return map3[dist] || 'BTN'
  }
  if (n === 4) {
    const map4 = { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG' }
    return map4[dist] || ''
  }
  if (n === 5) {
    const map5 = { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'CO' }
    return map5[dist] || ''
  }
  if (n === 6) {
    const map6 = { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'HJ', 5:'CO' }
    return map6[dist] || ''
  }
  // 7-9 jugadores
  const mapFull = { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'UTG', 5:'UTG', 6:'HJ', 7:'CO', 8:'CO' }
  return mapFull[dist] || ''
}

/**
 * Detecta la primera acción significativa del héroe en preflop:
 * open, 3bet, 4bet, call, limp
 */
function detectPreflopAction(block, heroName) {
  if (!heroName) return ''

  // Extraer solo la sección preflop (entre inicio y *** FLOP ***)
  const preflopSection = block.split(/\*\*\* FLOP \*\*\*/)[0]

  // Escapar caracteres especiales del nombre para usarlo en regex
  const escaped = heroName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Detectar 4-bet (raise tras un 3-bet)
  const raises = [...preflopSection.matchAll(new RegExp(`${escaped}: raises`, 'g'))]
  if (raises.length >= 2) return '4bet'

  // Detectar 3-bet (primer raise del héroe cuando ya había una subida)
  if (raises.length === 1) {
    // ¿Hubo una apuesta/raise antes que la del héroe?
    const heroRaiseIdx = preflopSection.indexOf(heroName + ': raises')
    const prevAction   = preflopSection.slice(0, heroRaiseIdx)
    if (/raises|bets/.test(prevAction)) return '3bet'
    return 'open'
  }

  // Detectar open raise sin 3-bet previo
  if (new RegExp(`${escaped}: raises`).test(preflopSection)) return 'open'

  // Detectar call
  if (new RegExp(`${escaped}: calls`).test(preflopSection)) return 'call'

  // Detectar limp (check en BB o call de BB sin raise)
  if (new RegExp(`${escaped}: checks`).test(preflopSection)) return 'limp'

  return ''
}

/**
 * Extrae el board completo (flop, turn, river) como string legible
 * Formato: "Ah Ks 7c · Td · 2h"
 */
function extractBoard(block) {
  const parts = []

  const flopM = block.match(/\*\*\* FLOP \*\*\* \[([^\]]+)\]/)
  if (flopM) parts.push(flopM[1])

  const turnM = block.match(/\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/)
  if (turnM) parts.push(turnM[1])

  const riverM = block.match(/\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/)
  if (riverM) parts.push(riverM[1])

  return parts.join(' · ')
}

/**
 * Detecta la calle más profunda jugada (donde terminó la mano)
 */
function detectDecisiveStreet(block) {
  if (/\*\*\* RIVER \*\*\*/.test(block))  return 'river'
  if (/\*\*\* TURN \*\*\*/.test(block))   return 'turn'
  if (/\*\*\* FLOP \*\*\*/.test(block))   return 'flop'
  return 'preflop'
}

/**
 * Detecta si el héroe ganó, perdió o quedó break-even
 * También retorna cuánto ganó/perdió
 */
function detectResult(block, heroName) {
  if (!heroName) return { result: 'even', potWon: 0 }

  const escaped = heroName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // ¿Colectó el bote?
  const collectedRe = new RegExp(`${escaped} collected [\\$€]?([\\d,.]+)`)
  const collectedM  = block.match(collectedRe)
  if (collectedM) {
    return {
      result: 'win',
      potWon: parseFloat(collectedM[1].replace(',', '')),
    }
  }

  // ¿Ganó en el summary?
  const summaryWonRe = new RegExp(`${escaped}[^\\n]+(?:won|collected) \\([\\$€]?([\\d,.]+)\\)`)
  const summaryWonM  = block.match(summaryWonRe)
  if (summaryWonM) {
    return {
      result: 'win',
      potWon: parseFloat(summaryWonM[1].replace(',', '')),
    }
  }

  // ¿Perdió (foldó y otro ganó)?
  if (new RegExp(`${escaped}: folds`).test(block)) {
    return { result: 'loss', potWon: 0 }
  }

  // Si llegó a showdown y otro ganó
  if (/\*\*\* SHOW DOWN \*\*\*/.test(block)) {
    return { result: 'loss', potWon: 0 }
  }

  return { result: 'even', potWon: 0 }
}

/**
 * Extrae el tamaño total del bote y el rake del SUMMARY
 */
function extractPotInfo(block) {
  // "Total pot $1.50 | Rake $0.07"
  const m = block.match(/Total pot [\$€]?([\d,.]+)(?:\s*\|\s*Rake\s*[\$€]?([\d,.]+))?/)
  return {
    total: m ? parseFloat(m[1].replace(',', '')) : 0,
    rake:  m && m[2] ? parseFloat(m[2].replace(',', '')) : 0,
  }
}

/**
 * Genera tags automáticos basados en el contenido de la mano
 */
function autoTags(block, heroName, preflopAction, result) {
  const tags = []
  if (!heroName) return tags

  const escaped = heroName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Llegó a showdown
  if (/\*\*\* SHOW DOWN \*\*\*/.test(block)) tags.push('Showdown')

  // Fue all-in
  if (new RegExp(`${escaped}.+all-in`).test(block)) tags.push('All-in')

  // 3-bet pot
  if (preflopAction === '3bet' || preflopAction === '4bet') tags.push('3-bet pot')

  // Multiway (3+ jugadores con fichas en el flop)
  const flopSection = block.split(/\*\*\* FLOP \*\*\*/)[1] || ''
  const actorsInFlop = new Set(flopSection.match(/^(\S+):/gm) || []).size
  if (actorsInFlop >= 3) tags.push('Multiway')

  // Bluff (foldó el rival tras una gran apuesta del héroe sin showdown)
  if (result === 'win' && !/\*\*\* SHOW DOWN \*\*\*/.test(block)) {
    tags.push('Bluff')
  }

  return tags
}

/**
 * Construye unas notas automáticas legibles para la IA
 */
function buildAutoNotes({ heroName, heroCards, position, preflopAction,
                          board, street, result, potWon,
                          tableFormat, totalPlayers }) {
  const lines = []
  if (heroName)      lines.push(`Jugador: ${heroName}`)
  if (heroCards)     lines.push(`Cartas: [${heroCards}]`)
  if (position)      lines.push(`Posición: ${position}`)
  if (preflopAction) lines.push(`Acción preflop: ${preflopAction}`)
  if (board)         lines.push(`Board: ${board}`)
  if (street)        lines.push(`Calle final: ${street}`)
  lines.push(`Resultado: ${result}${potWon ? ` (+${potWon})` : ''}`)
  lines.push(`Mesa: ${tableFormat || ''} (${totalPlayers} jugadores)`)
  return lines.join(' | ')
}

// ── API pública ───────────────────────────────────────────────────
module.exports = { splitHands, parseHand, extractHandId }