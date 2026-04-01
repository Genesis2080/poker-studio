import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'

const CARD_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
const SUITS = {
  s: { symbol: '♠', color: '#1a1a1a' },
  h: { symbol: '♥', color: '#dc2626' },
  d: { symbol: '♦', color: '#2563eb' },
  c: { symbol: '♣', color: '#16a34a' },
}

function parseHeroHand(text) {
  const dealtMatch = text.match(/Dealt to \S+\s+\[([^\]]+)\]/)
  if (dealtMatch) {
    const cards = dealtMatch[1].trim().split(/\s+/)
    return cards.map(c => {
      const rank = c[0]
      const suit = c[1].toLowerCase()
      return { rank, suit, full: rank + suit }
    })
  }
  return []
}

function parseBoard(text) {
  const flop = text.match(/\*\*\* FLOP \*\*\*[^\[]*\[([^\]]+)\]/)
  const turn = text.match(/\*\*\* TURN \*\*\*[^\[]*\[[^\]]+\]\s*\[([^\]]+)\]/)
  const river = text.match(/\*\*\* RIVER \*\*\*[^\[]*\[[^\]]+\]\s*\[([^\]]+)\]/)

  return {
    flop: flop ? flop[1].trim().split(/\s+/) : [],
    turn: turn ? [turn[1].trim()] : [],
    river: river ? [river[1].trim()] : [],
  }
}

function parsePlayers(text) {
  const players = []
  const seatRe = /^Seat (\d+): (\S+)\s+\(([\d.]+)\s+in chips\)/gm
  let match
  while ((match = seatRe.exec(text)) !== null) {
    players.push({
      seat: parseInt(match[1]),
      name: match[2],
      stack: parseFloat(match[3]),
    })
  }
  return players
}

function parseActions(text) {
  const lines = text.split('\n')
  const actions = []
  const actionRe = /^(\S+):\s+(raises|bets|calls|checks|folds|all-in)(?:\s+([\d.]+))?/i

  for (const line of lines) {
    const match = line.match(actionRe)
    if (match) {
      actions.push({
        player: match[1],
        action: match[2].toLowerCase(),
        amount: match[3] ? parseFloat(match[3]) : null,
        line: line.trim(),
      })
    }
  }
  return actions
}

function parseShowdown(text) {
  const lines = text.split('\n')
  const showdowns = []
  const showRe = /^(\S+):\s+shows\s+\[([^\]]+)\]/i

  for (const line of lines) {
    const match = line.match(showRe)
    if (match) {
      showdowns.push({
        player: match[1],
        cards: match[2].trim().split(/\s+/),
      })
    }
  }

  const collectedRe = /(\S+)\s+collected\s+[\S]+\s+from/
  for (const line of lines) {
    const match = line.match(collectedRe)
    if (match && !showdowns.find(s => s.player === match[1])) {
      showdowns.push({ player: match[1], cards: [], winner: true })
    }
  }

  return showdowns
}

function getButtonSeat(text) {
  const match = text.match(/Seat #(\d+) is the button/)
  return match ? parseInt(match[1]) : null
}

function getHeroName(text) {
  const match = text.match(/Dealt to (\S+)/)
  return match ? match[1] : null
}

function Card({ card, size = 60, faceDown = false, highlight = false }) {
  if (faceDown || !card) {
    return (
      <div style={{
        width: size * 0.65,
        height: size,
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
        borderRadius: 6,
        border: `2px solid ${highlight ? '#4ade80' : '#2a4a6f'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontSize: size * 0.4, opacity: 0.3 }}>🂠</span>
      </div>
    )
  }

  // Support both string ("Js") and object ({rank, suit, full})
  const cardStr = typeof card === 'string' ? card : card.full
  const rank = cardStr?.[0] || '?'
  const suit = cardStr?.[1]?.toLowerCase() || 's'
  const suitInfo = SUITS[suit] || { symbol: '?', color: '#888' }

  return (
    <div style={{
      width: size * 0.65,
      height: size,
      background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
      borderRadius: 6,
      border: `2px solid ${highlight ? '#4ade80' : '#ccc'}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '3px 5px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', lineHeight: 1 }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 700, color: suitInfo.color }}>
          {rank}
        </span>
        <span style={{ fontSize: size * 0.2, color: suitInfo.color, marginLeft: 1 }}>
          {suitInfo.symbol}
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.35, color: suitInfo.color }}>
          {suitInfo.symbol}
        </span>
      </div>
    </div>
  )
}

function Seat({ position, player, cards, isHero, isButton, isActive, currentStreet, showCards }) {
  const seatColors = {
    'UTG': '#f87171',
    'UTG+1': '#fb923c',
    'MP': '#fbbf24',
    'CO': '#a3e635',
    'BTN': '#4ade80',
    'SB': '#60a5fa',
    'BB': '#a78bfa',
    'EP': '#f87171',
    'LJ': '#fbbf24',
    'HJ': '#fb923c',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      position: 'relative',
    }}>
      {isButton && (
        <div style={{
          position: 'absolute',
          top: -16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#4ade80',
          color: '#0d0f14',
          fontSize: 8,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          zIndex: 10,
        }}>
          BTN
        </div>
      )}
      <div style={{
        background: isHero
          ? 'rgba(74, 222, 128, 0.2)'
          : isActive
            ? 'rgba(251, 191, 36, 0.2)'
            : 'rgba(30, 41, 59, 0.8)',
        border: `2px solid ${isHero ? '#4ade80' : isActive ? '#fbbf24' : '#334155'}`,
        borderRadius: 8,
        padding: '6px 12px',
        minWidth: 70,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: isHero ? '#4ade80' : seatColors[position] || '#94a3b8',
          fontWeight: isHero ? 700 : 500,
        }}>
          {position}
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 9,
          color: '#64748b',
          marginTop: 2,
        }}>
          {player?.name?.slice(0, 8)}
        </div>
        {isHero && (
          <div style={{
            fontFamily: 'monospace',
            fontSize: 8,
            color: '#4ade80',
            fontWeight: 700,
          }}>
            HERO
          </div>
        )}
      </div>

      {cards && cards.length > 0 && (isHero || showCards) && (
        <div style={{ display: 'flex', gap: 4 }}>
          {cards.map((card, i) => (
            <Card key={i} card={card} size={50} highlight={isHero} />
          ))}
        </div>
      )}
      {cards && cards.length > 0 && !isHero && !showCards && (
        <div style={{ display: 'flex', gap: 4 }}>
          <Card card={null} size={50} />
          <Card card={null} size={50} />
        </div>
      )}
      {!cards && (
        <div style={{ display: 'flex', gap: 4 }}>
          <Card card={null} size={50} />
          <Card card={null} size={50} />
        </div>
      )}
    </div>
  )
}

function PokerTable({ hand, parsedData, currentStreet, showCards }) {
  const { heroName, players, heroCards, heroPosition, board, buttonSeat } = parsedData

  const positionAngles = {
    1: 180, 2: 230, 3: 280, 4: 330, 5: 30, 6: 80, 7: 130, 8: 160, 9: 160,
  }

  const totalPlayers = players.length || 6

  const streetColors = {
    preflop: '#60a5fa',
    flop: '#4ade80',
    turn: '#fbbf24',
    river: '#f87171',
  }

  function getPositionForSeat(seatNum) {
    if (!buttonSeat) return seatNum
    const dist = ((seatNum - buttonSeat + totalPlayers) % totalPlayers)
    const maps = {
      2: ['BTN', 'BB'],
      3: ['BTN', 'SB', 'BB'],
      4: ['BTN', 'SB', 'BB', 'UTG'],
      5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
      6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
      7: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'CO'],
      8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'],
      9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP1', 'MP2', 'HJ', 'CO'],
    }
    const map = maps[totalPlayers] || maps[6]
    return map[dist] || seatNum.toString()
  }

  function getSeatPosition(seatNum, total) {
    const angle = positionAngles[seatNum] || ((seatNum - 1) * (360 / total))
    const rad = (angle * Math.PI) / 180
    const radius = 0.4
    const x = 50 + Math.cos(rad) * radius * 50
    const y = 50 + Math.sin(rad) * radius * 50
    return { x, y }
  }

  const hasBoard = board.flop?.length > 0 || board.turn?.length > 0 || board.river?.length > 0
  const activeStreet = hasBoard ? (board.river?.length > 0 ? 'river' : board.turn?.length > 0 ? 'turn' : 'flop') : 'preflop'

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 700,
      aspectRatio: '16/9',
      background: 'radial-gradient(ellipse at center, #1a5c35 0%, #0d3320 70%, #0a2818 100%)',
      borderRadius: '50%',
      border: '16px solid #8B4513',
      boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.6)',
      margin: '0 auto',
    }}>
      {/* Street indicator */}
      <div style={{
        position: 'absolute',
        top: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: `rgba(0,0,0,0.7)`,
        border: `2px solid ${streetColors[activeStreet]}`,
        borderRadius: 20,
        padding: '4px 16px',
        zIndex: 10,
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: streetColors[activeStreet],
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {activeStreet}
        </span>
      </div>

      {/* Board cards */}
      <div style={{
        position: 'absolute',
        top: '38%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
      }}>
        {hasBoard ? (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {board.flop?.length > 0 ? (
                board.flop.map((card, i) => (
                  <Card key={`f-${i}`} card={card} size={50} />
                ))
              ) : (
                [0, 1, 2].map(i => <Card key={`f-empty-${i}`} card={null} size={50} />)
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {board.turn?.length > 0 ? (
                board.turn.map((card, i) => (
                  <Card key={`t-${i}`} card={card} size={50} />
                ))
              ) : (
                <Card card={null} size={50} />
              )}
              {board.river?.length > 0 ? (
                board.river.map((card, i) => (
                  <Card key={`r-${i}`} card={card} size={50} />
                ))
              ) : (
                <Card card={null} size={50} />
              )}
            </div>
          </>
        ) : (
          <div style={{
            color: '#4ade80',
            fontFamily: 'monospace',
            fontSize: 11,
            opacity: 0.7,
            background: 'rgba(0,0,0,0.4)',
            padding: '4px 12px',
            borderRadius: 12,
          }}>
            Pre-Flop
          </div>
        )}
      </div>

      {/* Pot */}
      <div style={{
        position: 'absolute',
        bottom: '22%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 16,
        padding: '4px 12px',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>
          {(hand?.potWon || hand?.potSize || 0).toFixed(2)}€
        </span>
      </div>

      {/* All Players */}
      {players.map((player) => {
        const pos = getSeatPosition(player.seat, totalPlayers)
        const position = getPositionForSeat(player.seat)
        const isHero = player.name === heroName
        const isButton = player.seat === buttonSeat

        return (
          <div
            key={player.name}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Seat
              position={isHero ? heroPosition : position}
              player={player}
              cards={isHero ? heroCards : null}
              isHero={isHero}
              isButton={isButton}
              isActive={false}
              showCards={showCards}
            />
          </div>
        )
      })}
    </div>
  )
}

function ActionTimeline({ actions, heroName, board }) {
  const streets = ['preflop', 'flop', 'turn', 'river']
  const [currentStreet, setCurrentStreet] = useState('preflop')

  const getActionsForStreet = (street) => {
    if (street === 'preflop') {
      return actions.filter((_, i) => i < 4)
    } else if (street === 'flop') {
      return actions.filter((_, i) => i >= 4 && i < 8)
    } else if (street === 'turn') {
      return actions.filter((_, i) => i >= 8 && i < 12)
    }
    return actions.filter((_, i) => i >= 12)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {/* Street selector */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {streets.map(street => (
          <button
            key={street}
            onClick={() => setCurrentStreet(street)}
            style={{
              padding: '6px 12px',
              background: currentStreet === street ? 'rgba(74, 222, 128, 0.2)' : 'var(--bg2)',
              border: `1px solid ${currentStreet === street ? '#4ade80' : '#334155'}`,
              borderRadius: 6,
              color: currentStreet === street ? '#4ade80' : '#94a3b8',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {street}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px',
        maxHeight: 150,
        overflowY: 'auto',
      }}>
        {getActionsForStreet(currentStreet).map((action, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 0',
              borderBottom: i < getActionsForStreet(currentStreet).length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: action.player === heroName ? '#4ade80' : '#60a5fa',
              minWidth: 80,
            }}>
              {action.player}
            </span>
            <span style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: action.action === 'folds' ? '#f87171'
                : action.action === 'raises' ? '#fbbf24'
                  : action.action === 'all-in' ? '#f97316'
                    : '#94a3b8',
              fontWeight: 600,
            }}>
              {action.action}
            </span>
            {action.amount && (
              <span style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#fbbf24',
              }}>
                {action.amount.toFixed(2)}€
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ShowdownInfo({ showdowns, heroName }) {
  if (showdowns.length === 0) return null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '12px',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#fbbf24',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        Showdown
      </div>
      {showdowns.map((sd, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px',
            background: sd.winner ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
            borderRadius: 6,
            marginBottom: i < showdowns.length - 1 ? 8 : 0,
          }}
        >
          <span style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: sd.player === heroName ? '#4ade80' : '#94a3b8',
            minWidth: 80,
          }}>
            {sd.player}
          </span>
          {sd.cards.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {sd.cards.map((card, j) => (
                <Card key={j} card={card} size={35} />
              ))}
            </div>
          )}
          {sd.winner && (
            <span style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#4ade80',
              fontWeight: 700,
            }}>
              WINNER
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function HandInfo({ hand, parsedData }) {
  const resultColors = {
    win: '#4ade80',
    loss: '#f87171',
    even: '#94a3b8',
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
      gap: '12px',
      padding: '16px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <InfoItem label="Fecha" value={hand?.date} />
      <InfoItem label="Posición" value={parsedData.heroPosition} />
      <InfoItem label="Hero" value={parsedData.heroName} />
      <InfoItem
        label="Resultado"
        value={hand?.result?.toUpperCase()}
        valueColor={resultColors[hand?.result] || '#94a3b8'}
      />
      <InfoItem
        label="Bote"
        value={hand?.potWon ? `${hand.potWon.toFixed(2)}€` : '-'}
        valueColor="#4ade80"
      />
      <InfoItem label="Stakes" value={hand?.stakes} />
      <InfoItem label="Mesa" value={hand?.tableFormat} />
      <InfoItem label="Formato" value={hand?.gameType} />
    </div>
  )
}

function InfoItem({ label, value, valueColor = '#94a3b8' }) {
  return (
    <div>
      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: valueColor, fontWeight: 500 }}>
        {value || '-'}
      </div>
    </div>
  )
}

export default function ReplayerWindow() {
  const [hand, setHand] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [currentStreet, setCurrentStreet] = useState('preflop')
  const [showCards, setShowCards] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function loadHandData() {
      const saved = localStorage.getItem('replayerHand')
      if (!saved) {
        if (mounted) setLoading(false)
        return
      }

      localStorage.removeItem('replayerHand')
      let h = JSON.parse(saved)

      if (!h.rawText && h.id && window.electronAPI?.dbGetHandRawText) {
        const rawText = await window.electronAPI.dbGetHandRawText(h.id)
        if (rawText) {
          h = { ...h, rawText }
        }
      }

      if (!mounted) return
      setHand(h)

      let heroName = 'Hero'
      let heroPosition = h.position || 'Unknown'
      let players = []
      let heroCards = []
      let board = { flop: [], turn: [], river: [] }
      let actions = []
      let showdowns = []
      let buttonSeat = null

      if (h.rawText) {
        heroName = getHeroName(h.rawText) || h.heroName || h.playerName || 'Hero'
        players = parsePlayers(h.rawText)
        heroCards = parseHeroHand(h.rawText)
        board = parseBoard(h.rawText)
        actions = parseActions(h.rawText)
        showdowns = parseShowdown(h.rawText)
        buttonSeat = getButtonSeat(h.rawText)

        if (players.length > 0 && heroName) {
          const heroSeat = players.find(p => p.name === heroName)?.seat
          const seatOrder = players.map(p => p.seat).sort((a, b) => a - b)
          const btnIdx = seatOrder.indexOf(buttonSeat)
          const heroIdx = seatOrder.indexOf(heroSeat)
          const dist = (heroIdx - btnIdx + seatOrder.length) % seatOrder.length
          const maps = {
            2: ['BTN', 'BB'],
            3: ['BTN', 'SB', 'BB'],
            4: ['BTN', 'SB', 'BB', 'UTG'],
            5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
            6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
            7: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'CO'],
            8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'],
            9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP1', 'MP2', 'HJ', 'CO'],
          }
          heroPosition = (maps[players.length] || maps[6])[dist] || h.position || '?'
        }
      } else {
        heroName = h.playerName || h.heroName || 'Hero'
        heroPosition = h.position || 'Unknown'

        const heroHandStr = h.heroHand || ''
        if (heroHandStr.length >= 4) {
          const c1 = heroHandStr.slice(0, 2)
          const c2 = heroHandStr.slice(2, 4)
          heroCards.push({ rank: c1[0], suit: c1[1] || 's', full: c1 })
          heroCards.push({ rank: c2[0], suit: c2[1] || 's', full: c2 })
        }

        if (h.board) {
          const parts = h.board.split(' · ')
          if (parts[0]) board.flop = parts[0].split(' ')
          if (parts[1]) board.turn = [parts[1]]
          if (parts[2]) board.river = [parts[2]]
        }

        const numPlayers = h.numPlayers || 6
        const names = ['Villano1', 'Villano2', 'Villano3', 'Villano4', 'Villano5', 'Villano6', 'Villano7', 'Villano8']
        for (let i = 0; i < numPlayers - 1; i++) {
          players.push({ seat: i + 1, name: names[i], stack: 100 })
        }
      }

      if (mounted) {
        setParsedData({ heroName, players, heroCards, heroPosition, board, actions, showdowns, buttonSeat })
        setLoading(false)
      }
    }

    loadHandData()

    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0f14',
        color: '#94a3b8',
        fontFamily: 'monospace',
        gap: '16px',
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite' }}>
          🂡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        <div>Cargando mano...</div>
      </div>
    )
  }

  if (!hand || !parsedData) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0f14',
        color: '#f87171',
        fontFamily: 'monospace',
        gap: '8px',
      }}>
        <div style={{ fontSize: '48px' }}>❌</div>
        <div>No se encontró la mano</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Asegúrate de que la mano fue importada desde PokerStars
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0f14',
        color: '#f87171',
        fontFamily: 'monospace',
        gap: '8px',
      }}>
        <div style={{ fontSize: '48px' }}>❌</div>
        <div>No se pudo cargar la mano</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          {error || 'Verifica que la mano tenga datos importados'}
        </div>
        <div style={{ fontSize: '10px', color: '#475569', marginTop: '16px' }}>
          Hash: {window.location.hash}
        </div>
      </div>
    )
  }

  const streets = ['preflop', 'flop', 'turn', 'river']

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d0f14',
      color: '#e2e8f0',
      fontFamily: 'Arial, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: 20 }}>🂡</span>
          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>
            Poker Tracker - Replayer
          </span>
          {hand?.rawText ? (
            <span style={{
              fontFamily: 'monospace',
              fontSize: 10,
              padding: '2px 8px',
              background: 'rgba(74, 222, 128, 0.2)',
              border: '1px solid rgba(74, 222, 128, 0.4)',
              borderRadius: 10,
              color: '#4ade80',
            }}>
              REPLAY COMPLETO
            </span>
          ) : (
            <span style={{
              fontFamily: 'monospace',
              fontSize: 10,
              padding: '2px 8px',
              background: 'rgba(251, 191, 36, 0.2)',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              borderRadius: 10,
              color: '#fbbf24',
            }}>
              DATOS BÁSICOS
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowCards(!showCards)}
            style={{
              padding: '6px 12px',
              background: showCards ? 'rgba(74, 222, 128, 0.2)' : '#334155',
              border: '1px solid #4ade80',
              borderRadius: 6,
              color: '#4ade80',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {showCards ? 'Ocultar cartas' : 'Mostrar cartas'}
          </button>
        </div>
      </div>

      {/* Street selector */}
      <div style={{
        padding: '12px 20px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        gap: '8px',
      }}>
        {streets.map(street => (
          <button
            key={street}
            onClick={() => setCurrentStreet(street)}
            style={{
              padding: '8px 16px',
              background: currentStreet === street ? 'rgba(74, 222, 128, 0.2)' : '#0f172a',
              border: `2px solid ${currentStreet === street ? '#4ade80' : '#334155'}`,
              borderRadius: 8,
              color: currentStreet === street ? '#4ade80' : '#64748b',
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {street}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '16px',
        padding: '16px',
        overflow: 'auto',
      }}>
        {/* Left - Table and info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PokerTable
            hand={hand}
            parsedData={parsedData}
            currentStreet={currentStreet}
            showCards={showCards}
          />
          <HandInfo hand={hand} parsedData={parsedData} />
        </div>

        {/* Right - Actions and showdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ActionTimeline
            actions={parsedData?.actions || []}
            heroName={parsedData?.heroName}
            board={parsedData?.board}
          />
          <ShowdownInfo
            showdowns={parsedData?.showdowns || []}
            heroName={parsedData?.heroName}
          />

          {/* Hero cards */}
          {parsedData?.heroCards && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px',
            }}>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                Tu mano
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {parsedData.heroCards.map((card, i) => (
                  <Card key={i} card={card.full} size={60} highlight />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {hand?.notes && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px',
            }}>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Notas
              </div>
              <div style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 1.5,
              }}>
                {hand.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
