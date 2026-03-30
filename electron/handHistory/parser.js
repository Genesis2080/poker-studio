'use strict'

/**
 * parser.js — PokerStars Hand History parser
 * ─────────────────────────────────────────────────────────────────
 *
 * Formatos de cabecera que soporta este parser:
 *
 * CASH GAME:
 * PokerStars Hand #260267741096:  Hold'em No Limit ($0.01/$0.02 USD) - 2024/01/15 21:30:00 CET
 *
 * TORNEO (el que usa este usuario):
 * PokerStars Hand #260267741096: Tournament #3984919166, €4.50+€0.50 EUR Hold'em No Limit - Level I (25/50) - 2026/03/29 15:59:59 CET
 *
 * ZOOM:
 * PokerStars Zoom Hand #260267741096:  Hold'em No Limit ($0.01/$0.02 USD) - 2024/01/15 21:30:00 CET
 *
 * Diferencias del formato torneo vs cash:
 * - "Tournament #ID," antes del tipo de juego
 * - Buy-in: "€4.50+€0.50 EUR" (con símbolo de moneda, signo +, sin paréntesis)
 * - Blinds: "Level I (25/50)" — los blinds están en paréntesis al final
 * - Stacks: "(10000 in chips)" — SIN símbolo de moneda, CON espacio al final
 * - Puede haber "is sitting out" o "out of hand" al final de líneas de seat
 */

// ── Normalización ──────────────────────────────────────────────────
// CRÍTICO: archivos de Windows tienen \r\n — normalizar antes de cualquier regex
function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

// ── Constantes y Regex ────────────────────────────────────────────
// Soporta Hand, Zoom Hand, y cualquier variante con Tournament
const HAND_START_RE    = /^PokerStars (?:Zoom )?Hand #\d+/m

// Regex para Side Pots y Apuestas Devueltas
const UNCALLED_BET_RE  = /Uncalled bet \([\$€£]?([\d.,]+)\) returned to (.+)/;
const COLLECTED_POT_RE = /(.+) collected [\$€£]?([\d.,]+) from (?:side |main )?pot/;
const ALL_IN_RE        = /(.+): (?:bets|raises|calls) [\$€£]?([\d.,]+) and is all-in/;

/**
 * splitHands(rawText) → string[]
 */
function splitHands(rawText) {
  const text  = normalize(rawText)
  const parts = text.split(/(?=^PokerStars (?:Zoom )?Hand #\d+)/m)
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 30 && HAND_START_RE.test(p))
}

/**
 * extractHandId(block) → string | null
 */
function extractHandId(block) {
  const text = normalize(block)
  const m    = text.match(/PokerStars (?:Zoom )?Hand #(\d+)/)
  return m ? m[1] : null
}

/**
 * parseHand(block) → HandObject | null
 */
function parseHand(block) {
  try {
    const text   = normalize(block)
    const handId = extractHandId(text)
    if (!handId) return null

    const lines   = text.split('\n')
    const header  = lines[0]  // primera línea completa

    // ── Detectar si es torneo ────────────────────────────────────
    const isTournament = /Tournament #\d+/.test(header)
    const tournamentId = isTournament
      ? (header.match(/Tournament #(\d+)/) || [])[1] || ''
      : ''

    // ── Tipo de juego ────────────────────────────────────────────
    const gameType = extractGameType(header)

    // ── Stakes ───────────────────────────────────────────────────
    const stakes = extractStakes(header, isTournament)

    // ── Blinds actuales ──────────────────────────────────────────
    const blinds = extractBlinds(header, isTournament)

    // ── Fecha ────────────────────────────────────────────────────
    const date = extractDate(header)

    // ── Tabla ────────────────────────────────────────────────────
    const tableLine   = lines.find(l => l.startsWith("Table '")) || ''
    const tableM      = tableLine.match(/Table '([^']+)'\s+(\S+(?:-max)?)\s+Seat #(\d+) is the button/)
    const tableName   = tableM ? tableM[1] : ''
    const tableFormat = tableM ? tableM[2] : ''
    const buttonSeat  = tableM ? parseInt(tableM[3]) : null

    // ── Jugadores y stacks ───────────────────────────────────────
    const players = {}
    const seatRe  = /^Seat (\d+): ([^\s(]+)\s*\([\$€£]?([\d,]+(?:\.\d+)?)\s*in chips\)/gm
    let seatM
    while ((seatM = seatRe.exec(text)) !== null) {
      players[parseInt(seatM[1])] = {
        name:  seatM[2].trim(),
        stack: parseFloat(seatM[3].replace(/,/g, '')),
      }
    }
    const totalPlayers = Object.keys(players).length

    // ── Héroe ────────────────────────────────────────────────────
    const dealtM    = text.match(/Dealt to ([^\s[]+)\s*\[([^\]]+)\]/)
    const heroName  = dealtM ? dealtM[1].trim() : null
    const heroCards = dealtM ? dealtM[2].trim() : null
    const heroHand  = heroCards ? normalizeHoleCards(heroCards) : ''

    // ── Posición ─────────────────────────────────────────────────
    let heroSeat = null
    for (const [seat, p] of Object.entries(players)) {
      if (p.name === heroName) { heroSeat = parseInt(seat); break }
    }
    const position  = derivePosition(heroSeat, buttonSeat, players)
    const heroStack = heroSeat && players[heroSeat] ? players[heroSeat].stack : 0

    // ── Acción preflop ───────────────────────────────────────────
    const preflopAction = detectPreflopAction(text, heroName)

    // ── Board ────────────────────────────────────────────────────
    const board  = extractBoard(text)
    const street = detectDecisiveStreet(text)

    // ── Bote y rake inicial (SUMMARY) ────────────────────────────
    const potInfo = extractPotInfo(text)

    // ── Resultado y Side Pots (NUEVA LÓGICA) ─────────────────────
    let { result, potWon } = detectResult(text, heroName)
    
    let uncalledBet = 0;
    let collectedPot = 0;

    // Iteramos línea por línea para capturar botes múltiples y apuestas devueltas
    for (const line of lines) {
      if (UNCALLED_BET_RE.test(line)) {
        const [, amountStr, player] = line.match(UNCALLED_BET_RE);
        if (player.trim() === heroName) {
          uncalledBet += parseFloat(amountStr.replace(/,/g, ''));
        }
      }

      if (COLLECTED_POT_RE.test(line)) {
        const [, player, amountStr] = line.match(COLLECTED_POT_RE);
        if (player.trim() === heroName) {
          collectedPot += parseFloat(amountStr.replace(/,/g, ''));
        }
      }
    }

    // Si encontramos sumas recogidas explícitamente (Side Pots/Main Pots)
    if (collectedPot > 0) {
      potWon = collectedPot;
      result = 'win';
    }

    // Restamos lo que nunca entró al bote real (Uncalled bets)
    potWon = Math.max(0, potWon - uncalledBet);

    // ── Tags ─────────────────────────────────────────────────────
    const tags = autoTags(text, heroName, preflopAction, result, isTournament)

    // ── Notas automáticas ────────────────────────────────────────
    const notes = buildAutoNotes({
      heroName, heroCards, position, preflopAction,
      board, street, result, potWon,
      tableFormat, totalPlayers, stakes, blinds, isTournament,
    })

    return {
      // ── Campos del schema de la app ──────────────────────────
      id:              'ps-' + handId,
      date,
      position:        position || 'BTN',
      result,
      heroHand,
      villainRange:    '',
      villainRangeKeys:[],
      preflopAction:   preflopAction || '',
      street:          street || '',
      board,
      notes,
      tags,
      // ── Metadatos del import ─────────────────────────────────
      handId,
      tournamentId,
      isTournament,
      gameType,
      stakes,
      blinds,
      tableName,
      tableFormat,
      heroName:        heroName || '',
      heroStack,
      potSize:         potInfo.total,
      rake:            potInfo.rake,
      potWon,
      importedAt:      Date.now(),
      source:          'pokerstars',
      rawText:         block,
    }

  } catch (err) {
    console.warn('[parser] Error parseando mano:', err.message)
    return null
  }
}

// ══════════════════════════════════════════════════════════════════
// HELPERS DE EXTRACCIÓN
// ══════════════════════════════════════════════════════════════════

function extractGameType(header) {
  const types = [
    "Hold'em No Limit",
    "Hold'em Pot Limit",
    "Hold'em Limit",
    'Omaha Pot Limit',
    'Omaha Hi/Lo Pot Limit',
    '5 Card Omaha',
    'Badugi',
    '7 Card Stud',
    'Razz',
    'HORSE',
  ]
  for (const t of types) {
    if (header.includes(t)) return t
  }
  return "Hold'em No Limit" 
}

function extractStakes(header, isTournament) {
  if (isTournament) {
    const m = header.match(/Tournament #\d+,\s*([\$€£]?[\d.]+\+[\$€£]?[\d.]+(?:\s*\w+)?)/)
    return m ? m[1].trim() : ''
  }
  const m = header.match(/\(([\$€£]?[\d,]+(?:\.\d+)?\/[\$€£]?[\d,]+(?:\.\d+)?(?:\s+\w+)?)\)/)
  return m ? m[1].trim() : ''
}

function extractBlinds(header, isTournament) {
  if (isTournament) {
    const m = header.match(/Level [IVXLCDM\d]+\s*\(([\d,]+\/[\d,]+)\)/)
    return m ? m[1] : ''
  }
  const m = header.match(/([\d,]+(?:\.\d+)?\/([\d,]+(?:\.\d+)?))/)
  return m ? m[1] : ''
}

function extractDate(header) {
  const m = header.match(/(\d{4})\/(\d{2})\/(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : new Date().toISOString().split('T')[0]
}

function normalizeHoleCards(cards) {
  const parts = cards.trim().split(/\s+/)
  if (parts.length !== 2) return cards.replace(/\s+/g, '')

  const ORDER = 'AKQJT98765432'
  const rank  = c => c[0].toUpperCase()
  const suit  = c => c.slice(1).toLowerCase()

  const r1 = rank(parts[0]), r2 = rank(parts[1])
  const s1 = suit(parts[0]), s2 = suit(parts[1])

  if (r1 === r2) return r1 + r2

  const i1 = ORDER.indexOf(r1), i2 = ORDER.indexOf(r2)
  const [hi, lo] = i1 <= i2 ? [r1, r2] : [r2, r1]
  return hi + lo + (s1 === s2 ? 's' : 'o')
}

function derivePosition(heroSeat, buttonSeat, players) {
  if (!heroSeat || !buttonSeat) return ''

  const seats   = Object.keys(players).map(Number).sort((a, b) => a - b)
  const n       = seats.length
  const btnIdx  = seats.indexOf(buttonSeat)
  const heroIdx = seats.indexOf(heroSeat)

  if (btnIdx === -1 || heroIdx === -1) return ''

  const dist = (heroIdx - btnIdx + n) % n

  const maps = {
    2: { 0:'BTN', 1:'BB' },
    3: { 0:'BTN', 1:'SB', 2:'BB' },
    4: { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG' },
    5: { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'CO' },
    6: { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'HJ', 5:'CO' },
    7: { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'UTG', 5:'HJ', 6:'CO' },
    8: { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'UTG', 5:'UTG', 6:'HJ', 7:'CO' },
    9: { 0:'BTN', 1:'SB', 2:'BB', 3:'UTG', 4:'UTG', 5:'UTG', 6:'HJ', 7:'CO', 8:'CO' },
  }

  return (maps[n] || maps[9])[dist] || ''
}

function detectPreflopAction(text, heroName) {
  if (!heroName) return ''

  const hcIdx    = text.indexOf('*** HOLE CARDS ***')
  const flopIdx  = text.indexOf('*** FLOP ***')
  const end      = flopIdx !== -1 ? flopIdx : text.length
  const preflop  = text.slice(hcIdx !== -1 ? hcIdx : 0, end)

  const esc = escRe(heroName)
  const heroRaises = [...preflop.matchAll(new RegExp(`^${esc}: raises`, 'gm'))]

  if (heroRaises.length >= 2) return '4bet'

  if (heroRaises.length === 1) {
    const idx    = preflop.indexOf(heroName + ': raises')
    const before = preflop.slice(0, idx)
    return /raises|bets/.test(before) ? '3bet' : 'open'
  }

  if (new RegExp(`^${esc}: calls`, 'm').test(preflop))  return 'call'
  if (new RegExp(`^${esc}: checks`, 'm').test(preflop)) return 'limp'

  return ''
}

function extractBoard(text) {
  const parts = []
  const flopM = text.match(/\*\*\* FLOP \*\*\*[^\[]*\[([^\]]+)\]/)
  if (flopM) parts.push(flopM[1].trim())

  const turnM = text.match(/\*\*\* TURN \*\*\*[^\[]*\[[^\]]+\]\s*\[([^\]]+)\]/)
  if (turnM) parts.push(turnM[1].trim())

  const riverM = text.match(/\*\*\* RIVER \*\*\*[^\[]*\[[^\]]+\]\s*\[([^\]]+)\]/)
  if (riverM) parts.push(riverM[1].trim())

  return parts.join(' · ')
}

function detectDecisiveStreet(text) {
  if (/\*\*\* RIVER \*\*\*/.test(text)) return 'river'
  if (/\*\*\* TURN \*\*\*/.test(text))  return 'turn'
  if (/\*\*\* FLOP \*\*\*/.test(text))  return 'flop'
  return 'preflop'
}

function detectResult(text, heroName) {
  if (!heroName) return { result: 'even', potWon: 0 }
  const esc = escRe(heroName)

  const collRe = new RegExp(`\\b${esc}\\b collected ([\\$€£]?[\\d,]+(?:\\.\\d+)?)`)
  const collM  = text.match(collRe)
  if (collM) return { result: 'win', potWon: parseFloat(collM[1].replace(/[€$£,]/g, '')) }

  const wonRe = new RegExp(`\\b${esc}\\b[^\\n]* won \\([\\$€£]?([\\d,]+(?:\\.\\d+)?)\\)`)
  const wonM  = text.match(wonRe)
  if (wonM) return { result: 'win', potWon: parseFloat(wonM[1].replace(/,/g, '')) }

  const sumCollRe = new RegExp(`\\b${esc}\\b[^\\n]* collected \\([\\$€£]?([\\d,]+(?:\\.\\d+)?)\\)`)
  const sumCollM  = text.match(sumCollRe)
  if (sumCollM) return { result: 'win', potWon: parseFloat(sumCollM[1].replace(/,/g, '')) }

  if (new RegExp(`^${esc}: folds`, 'm').test(text)) return { result: 'loss', potWon: 0 }
  if (/\*\*\* SHOW DOWN \*\*\*/.test(text)) return { result: 'loss', potWon: 0 }

  return { result: 'even', potWon: 0 }
}

function extractPotInfo(text) {
  const m = text.match(/Total pot\s+[\$€£]?([\d,]+(?:\.\d+)?)(?:[^|\n]*\|\s*Rake\s+[\$€£]?([\d,]+(?:\.\d+)?))?/)
  return {
    total: m ? parseFloat(m[1].replace(/,/g, '')) : 0,
    rake:  m && m[2] ? parseFloat(m[2].replace(/,/g, '')) : 0,
  }
}

function autoTags(text, heroName, preflopAction, result, isTournament) {
  const tags = []
  if (!heroName) return tags

  const esc = escRe(heroName)

  if (/\*\*\* SHOW DOWN \*\*\*/.test(text)) tags.push('Showdown')
  
  // Tag: All-in (Usa la regex ampliada de la cabecera)
  const heroAllInRe = new RegExp(`^${esc}: (?:bets|raises|calls) [\\$€£]?([\\d.,]+) and is all-in`, 'm');
  if (heroAllInRe.test(text) || new RegExp(`\\b${esc}\\b[^\\n]* all-in`, 'm').test(text)) {
    tags.push('All-in');
  }

  if (preflopAction === '3bet' || preflopAction === '4bet') tags.push('3-bet pot')
  if (isTournament) tags.push('Torneo')

  const flopIdx = text.indexOf('*** FLOP ***')
  const turnIdx = text.indexOf('*** TURN ***')
  if (flopIdx !== -1) {
    const flopSec = text.slice(flopIdx, turnIdx !== -1 ? turnIdx : text.length)
    const actors  = new Set((flopSec.match(/^[^:]+:/gm) || []).map(s => s.trim()))
    if (actors.size >= 3) tags.push('Multiway')
  }

  if (result === 'win' && !/\*\*\* SHOW DOWN \*\*\*/.test(text)) tags.push('Bluff')

  return tags
}

function buildAutoNotes({ heroName, heroCards, position, preflopAction,
                          board, street, result, potWon,
                          tableFormat, totalPlayers, stakes, blinds, isTournament }) {
  const parts = []
  if (heroName)      parts.push(`Jugador: ${heroName}`)
  if (heroCards)     parts.push(`Cartas: [${heroCards}]`)
  if (position)      parts.push(`Posición: ${position}`)
  if (preflopAction) parts.push(`Preflop: ${preflopAction}`)
  if (board)         parts.push(`Board: ${board}`)
  if (street)        parts.push(`Calle final: ${street}`)
  if (stakes)        parts.push(`Stakes: ${stakes}`)
  if (blinds)        parts.push(`Blinds: ${blinds}`)
  parts.push(`Resultado: ${result}${potWon ? ` (+${potWon})` : ''}`)
  parts.push(`Mesa: ${tableFormat || ''} ${totalPlayers}max${isTournament ? ' (torneo)' : ''}`)
  return parts.join(' | ')
}

function escRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function debugHand(rawText) {
  const text   = normalize(rawText)
  const blocks = splitHands(rawText)

  console.log(`[parser debug] Bloques encontrados: ${blocks.length}`)

  if (!blocks.length) {
    console.log('[parser debug] Primeros 300 chars:', JSON.stringify(text.slice(0, 300)))
    console.log('[parser debug] ¿Contiene cabecera?', HAND_START_RE.test(text))
    console.log('[parser debug] ¿Tiene \\r\\n?', rawText.includes('\r\n'))
    return { blocks: 0, rawSample: text.slice(0, 300) }
  }

  const first = parseHand(blocks[0])
  console.log('[parser debug] Primera mano:', first)
  return { blocks: blocks.length, firstHand: first, rawBlock: blocks[0].slice(0, 500) }
}

module.exports = { splitHands, parseHand, extractHandId, debugHand, normalize }