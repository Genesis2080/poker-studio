import React, { useState, useMemo, useCallback } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Modal, Input, Select, Textarea, Empty } from '../components/UI.jsx'
import { sm2Next, initCardState, getDueCards, getDeckStats, getHardestCards, QUALITY } from '../hooks/useSM2.js'

// ── Tarjetas integradas (teoría de póker) ────────────────────────
const BUILTIN_CARDS = [
  // Fundamentos
  { id: 'b01', deck: 'fundamentos', q: '¿Cómo se calculan los pot odds?', a: 'Pot odds = llamada / (bote + llamada). Ej: bote 100€, llamada 50€ → 50/150 = 33%. Necesitas ≥33% equity para ser rentable.' },
  { id: 'b02', deck: 'fundamentos', q: '¿Qué es el EV (Expected Value)?', a: 'Valor esperado = Σ(probabilidad × resultado). EV+ = acción rentable a largo plazo. EV- = acción que pierde dinero a largo plazo.' },
  { id: 'b03', deck: 'fundamentos', q: '¿Qué son los implied odds?', a: 'Ganancias futuras esperadas si completas tu draw. Justifican llamadas con pot odds negativos cuando el rival pagará mucho al completar tu mano.' },
  { id: 'b04', deck: 'fundamentos', q: '¿Qué es la ventaja de posición (IP vs OOP)?', a: 'IP (In Position) actúa después → más información. OOP actúa antes → desventaja estructural. La posición es la ventaja más constante en póker.' },
  { id: 'b05', deck: 'fundamentos', q: '¿Qué es el SPR (Stack-to-Pot Ratio)?', a: 'SPR = stack efectivo / bote al flop. <2: top pair es suficiente para stackear. 2-6: necesitas two pair+. >6: sets o mejor para comprometer stack.' },
  // Preflop
  { id: 'b06', deck: 'preflop', q: '¿Cuál es el sizing estándar de un open raise?', a: '2.5x BB en posición (CO, BTN). 3x BB out of position o con limpers. Más grande en vivo que online.' },
  { id: 'b07', deck: 'preflop', q: '¿Qué manos abres desde UTG en un juego de 9 manos?', a: 'Rango tight: TT+, AK, AQs, AJs, KQs. Aprox. 12-15% de manos. Sin suited connectors débiles ni pares pequeños.' },
  { id: 'b08', deck: 'preflop', q: '¿Cuándo haces un 3-bet por valor vs bluff?', a: 'Valor: QQ+, AK. Bluff: manos con blockers (A5s, A4s) que bloquean el rango de call del rival. Evitar manos medias que se convierten en call.' },
  { id: 'b09', deck: 'preflop', q: '¿Qué es la defensa de las ciegas (MDF)?', a: 'Minimum Defense Frequency = 1 - tamaño_apuesta/(bote+apuesta). Si el rival apuesta 1/3 del bote debes defender ~75% del rango para no ser explotable.' },
  // Postflop
  { id: 'b10', deck: 'postflop', q: '¿Cuándo hacer c-bet pequeño (25-33%) vs grande (75%+)?', a: 'Pequeño: boards wet o pareados donde tienes ventaja de rango, multiway. Grande: boards secos (A72r, KQ3r) que conectan mejor con tu rango.' },
  { id: 'b11', deck: 'postflop', q: '¿Qué es un board "dry" vs "wet"?', a: 'Dry: pocos draws posibles (A♠7♣2♥). Wet: muchos draws (9♥8♥6♣). En boards wet los draws tienen mucha equity, el sizing debe ser mayor para cobrar.' },
  { id: 'b12', deck: 'postflop', q: '¿Cuándo usar overbet en el turn o river?', a: 'Cuando tienes ventaja de rango clara (el board favorece tus combos fuertes). Polariza tu rango entre nuts y bluffs. Fuerza al rival a tomar decisiones difíciles.' },
  { id: 'b13', deck: 'postflop', q: '¿Qué son los blockers y cómo afectan al river?', a: 'Cartas en tu mano que reducen combos del rival. Ej: tener A♥ en un board con flush posible reduce los flushes del rival. Mejora tus bluffs y tus bluff-catches.' },
  // ICM/Torneos
  { id: 'b14', deck: 'torneos', q: '¿Qué es el ICM y por qué importa?', a: 'Independent Chip Model: convierte fichas en valor monetario. Las fichas no son lineales en torneos. Perder fichas duele más que ganarlas en €. Impacta calls y shoves cerca del dinero.' },
  { id: 'b15', deck: 'torneos', q: '¿Cuándo entrar en modo push/fold?', a: 'Con <15bb de stack efectivo. A <10bb es obligatorio. Usa charts de Nash o ICMIZER. Shoveas toda tu rango de apertura en lugar de open+fold.' },
  { id: 'b16', deck: 'torneos', q: '¿Qué es la fold equity y por qué es crucial?', a: 'Porcentaje de veces que el rival foldea ante tu apuesta. Con stacks cortos, la fold equity puede hacer rentable un shove aunque tengas manos débiles.' },
  { id: 'b17', deck: 'torneos', q: '¿Cómo ajustar en la burbuja de un torneo?', a: 'Big stacks presionan constantemente. Medium stacks son muy vulnerables al ICM. Short stacks deben shove-or-fold. Evitar calls marginales aunque sean chip-EV positivos.' },
]

const DECK_LABELS = {
  all:          'Todas',
  fundamentos:  'Fundamentos',
  preflop:      'Preflop',
  postflop:     'Postflop',
  torneos:      'Torneos',
  custom:       'Mis tarjetas',
  due:          '📅 Pendientes hoy',
}

const EMPTY_FORM = { deck: 'custom', q: '', a: '' }

// ── Rating buttons config ────────────────────────────────────────
const RATINGS = [
  { id: 'again', label: '✕ Repetir',   sublabel: '< 1 min',  color: 'var(--red)',    bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.3)'  },
  { id: 'hard',  label: '~ Difícil',   sublabel: '< 10 min', color: '#fb923c',       bg: 'rgba(251,146,60,0.12)',   border: 'rgba(251,146,60,0.3)'   },
  { id: 'good',  label: '✓ Bien',      sublabel: '4 días',   color: 'var(--accent)', bg: 'rgba(74,222,128,0.12)',   border: 'rgba(74,222,128,0.3)'   },
  { id: 'easy',  label: '⚡ Fácil',    sublabel: '7+ días',  color: 'var(--blue)',   bg: 'rgba(96,165,250,0.12)',   border: 'rgba(96,165,250,0.3)'   },
]

export default function Flashcards() {
  const { data, setData } = useApp()

  const customCards  = data.flashcards?.cards    || []
  const sm2States    = data.flashcards?.sm2       || {}

  const [activeDeck,  setActiveDeck]  = useState('due')
  const [sessionCards,setSessionCards]= useState(null)   // null = no iniciado
  const [cardIndex,   setCardIndex]   = useState(0)
  const [flipped,     setFlipped]     = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [sessionLog,  setSessionLog]  = useState([])     // [{ id, quality }]
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editCard,    setEditCard]    = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [viewMode,    setViewMode]    = useState('session') // session | manage | stats

  // ── Todos los cards ───────────────────────────────────────────
  const allCards = useMemo(() => [...BUILTIN_CARDS, ...customCards], [customCards])

  // ── Filtrar por deck ─────────────────────────────────────────
  const deckCards = useMemo(() => {
    if (activeDeck === 'all')  return allCards
    if (activeDeck === 'due')  return getDueCards(allCards, sm2States)
    if (activeDeck === 'custom') return customCards
    return allCards.filter(c => c.deck === activeDeck)
  }, [allCards, customCards, sm2States, activeDeck])

  // ── Stats globales ────────────────────────────────────────────
  const stats = useMemo(() => getDeckStats(allCards, sm2States), [allCards, sm2States])
  const hardest = useMemo(() => getHardestCards(allCards, sm2States, 5), [allCards, sm2States])

  // ── Tarjeta actual ────────────────────────────────────────────
  const currentCard = sessionCards?.[cardIndex] ?? null
  const cardState   = currentCard ? (sm2States[currentCard.id] || initCardState()) : null

  // ── Iniciar sesión ────────────────────────────────────────────
  function startSession() {
    const cards = [...deckCards].sort(() => Math.random() - 0.5)
    if (!cards.length) return
    setSessionCards(cards)
    setCardIndex(0)
    setFlipped(false)
    setSessionDone(false)
    setSessionLog([])
    setViewMode('session')
  }

  // ── Responder tarjeta ─────────────────────────────────────────
  function answerCard(quality) {
    if (!currentCard) return
    const currentState = sm2States[currentCard.id] || initCardState()
    const newState     = sm2Next(currentState, quality)

    // Guardar en APP
    setData(prev => ({
      ...prev,
      flashcards: {
        ...prev.flashcards,
        sm2: { ...(prev.flashcards?.sm2 || {}), [currentCard.id]: newState },
      },
    }))

    setSessionLog(l => [...l, { id: currentCard.id, quality }])

    // Avanzar
    const next = cardIndex + 1
    if (next >= sessionCards.length) {
      setSessionDone(true)
    } else {
      setCardIndex(next)
      setFlipped(false)
    }
  }

  // ── Calcular intervalo mostrado ───────────────────────────────
  function getPreviewInterval(quality) {
    const state = sm2States[currentCard?.id] || initCardState()
    const next  = sm2Next(state, quality)
    if (next.interval === 1) return '1 día'
    if (next.interval < 7)   return `${next.interval} días`
    if (next.interval < 30)  return `${Math.round(next.interval / 7)} sem`
    return `${Math.round(next.interval / 30)} mes`
  }

  // ── CRUD tarjetas custom ──────────────────────────────────────
  function openNew() {
    setForm(EMPTY_FORM)
    setEditCard(null)
    setModalOpen(true)
  }

  function openEdit(card) {
    setForm({ deck: card.deck, q: card.q, a: card.a })
    setEditCard(card)
    setModalOpen(true)
  }

  function saveCard() {
    if (!form.q.trim() || !form.a.trim()) return
    setData(prev => {
      const cards = prev.flashcards?.cards || []
      if (editCard) {
        return { ...prev, flashcards: { ...prev.flashcards, cards: cards.map(c => c.id === editCard.id ? { ...c, ...form } : c) } }
      }
      const newCard = { id: 'cu' + Date.now(), ...form }
      return { ...prev, flashcards: { ...prev.flashcards, cards: [...cards, newCard] } }
    })
    setModalOpen(false)
  }

  function deleteCard(id) {
    setData(prev => ({
      ...prev,
      flashcards: {
        ...prev.flashcards,
        cards: (prev.flashcards?.cards || []).filter(c => c.id !== id),
      },
    }))
  }

  function resetCardSM2(id) {
    setData(prev => {
      const sm2 = { ...(prev.flashcards?.sm2 || {}) }
      delete sm2[id]
      return { ...prev, flashcards: { ...prev.flashcards, sm2 } }
    })
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Summary de sesión ─────────────────────────────────────────
  const sessionSummary = useMemo(() => {
    if (!sessionLog.length) return null
    const counts = { again: 0, hard: 0, good: 0, easy: 0 }
    sessionLog.forEach(l => { counts[l.quality] = (counts[l.quality] || 0) + 1 })
    const correct = counts.good + counts.easy
    const total   = sessionLog.length
    return { counts, correct, total, pct: Math.round((correct / total) * 100) }
  }, [sessionLog])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Flashcards"
        subtitle={`${stats.dueCards} pendientes hoy · ${stats.learnedCards} aprendidas · ${stats.avgRetention ? stats.avgRetention + '% retención' : 'sin datos aún'}`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {['session', 'manage', 'stats'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                background: viewMode === m ? 'var(--accent)' : 'var(--surface2)',
                border: `1px solid ${viewMode === m ? 'var(--accent)' : 'var(--border)'}`,
                color: viewMode === m ? '#0d1a0d' : 'var(--text2)',
              }}>
                {{ session: '▶ Estudiar', manage: '✏ Gestionar', stats: '📊 Stats' }[m]}
              </button>
            ))}
            <Button size="sm" onClick={openNew}>+ Nueva tarjeta</Button>
          </div>
        }
      />

      {/* ── Deck selector ── */}
      <div style={{
        display: 'flex', gap: '6px', padding: '10px 28px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {Object.entries(DECK_LABELS).map(([id, label]) => {
          const isDue = id === 'due'
          const count = id === 'due' ? stats.dueCards
            : id === 'all' ? allCards.length
            : id === 'custom' ? customCards.length
            : allCards.filter(c => c.deck === id).length
          return (
            <button key={id} onClick={() => { setActiveDeck(id); setSessionCards(null); setSessionDone(false) }} style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap',
              padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
              background: activeDeck === id ? (isDue ? 'rgba(96,165,250,0.15)' : 'rgba(74,222,128,0.12)') : 'var(--surface)',
              border: `1px solid ${activeDeck === id ? (isDue ? 'rgba(96,165,250,0.4)' : 'rgba(74,222,128,0.3)') : 'var(--border)'}`,
              color: activeDeck === id ? (isDue ? 'var(--blue)' : 'var(--accent)') : 'var(--text2)',
            }}>
              {label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ════ VIEW: ESTUDIAR ════ */}
        {viewMode === 'session' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 28px', gap: '20px' }}>

            {/* No iniciado */}
            {!sessionCards && !sessionDone && (
              <SessionStart
                deckLabel={DECK_LABELS[activeDeck]}
                count={deckCards.length}
                dueCount={stats.dueCards}
                stats={stats}
                onStart={startSession}
                hardest={hardest}
                sm2States={sm2States}
              />
            )}

            {/* Sesión activa */}
            {sessionCards && !sessionDone && currentCard && (
              <>
                {/* Progreso */}
                <div style={{ width: '100%', maxWidth: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: 'var(--accent)',
                      width: `${(cardIndex / sessionCards.length) * 100}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>
                    {cardIndex + 1} / {sessionCards.length}
                  </span>
                </div>

                {/* SM-2 info de la tarjeta */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Badge color={cardState?.repetitions === 0 ? 'blue' : cardState?.ef < 2.0 ? 'red' : 'green'}>
                    {cardState?.repetitions === 0 ? 'Nueva' : cardState?.ef < 2.0 ? 'Difícil' : 'Aprendida'}
                  </Badge>
                  <Badge color="gray">{DECK_LABELS[currentCard.deck] || currentCard.deck}</Badge>
                  {cardState?.lastReview && (
                    <Badge color="gray">Revisada {cardState.lastReview}</Badge>
                  )}
                </div>

                {/* Card */}
                <div
                  onClick={() => !flipped && setFlipped(true)}
                  style={{
                    width: '100%', maxWidth: 600, minHeight: 200,
                    background: 'var(--surface)', border: `1px solid ${flipped ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)', padding: '28px 32px',
                    cursor: flipped ? 'default' : 'pointer',
                    transition: 'border-color 0.2s',
                    display: 'flex', flexDirection: 'column', gap: '16px',
                  }}
                >
                  {/* Pregunta */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                      Pregunta
                    </div>
                    <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                      {currentCard.q}
                    </p>
                  </div>

                  {/* Respuesta */}
                  {flipped ? (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                        Respuesta
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.7 }}>
                        {currentCard.a}
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                      Toca para ver la respuesta →
                    </div>
                  )}
                </div>

                {/* Rating buttons — solo visibles tras revelar */}
                {flipped && (
                  <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: 600 }}>
                    {RATINGS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => answerCard(r.id)}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: '8px', cursor: 'pointer',
                          background: r.bg, border: `1px solid ${r.border}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                      >
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: r.color }}>{r.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
                          {getPreviewInterval(r.id)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Skip */}
                {!flipped && (
                  <button onClick={() => setFlipped(true)} style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: '6px', color: 'var(--text3)', padding: '6px 16px',
                    fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer',
                  }}>
                    Mostrar respuesta
                  </button>
                )}
              </>
            )}

            {/* Sesión completada */}
            {sessionDone && sessionSummary && (
              <SessionComplete
                summary={sessionSummary}
                onRestart={startSession}
                onNewDeck={() => { setSessionCards(null); setSessionDone(false) }}
              />
            )}
          </div>
        )}

        {/* ════ VIEW: GESTIONAR ════ */}
        {viewMode === 'manage' && (
          <div style={{ padding: '20px 28px' }}>
            {deckCards.length === 0
              ? <Empty icon="🃏" message="No hay tarjetas en este mazo" sub="Crea nuevas tarjetas con el botón superior" />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {deckCards.map(card => {
                    const state    = sm2States[card.id]
                    const isCustom = customCards.some(c => c.id === card.id)
                    return (
                      <div key={card.id} style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', padding: '14px 16px',
                        display: 'flex', gap: '14px', alignItems: 'flex-start',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px', lineHeight: 1.4 }}>{card.q}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.4 }}>{card.a}</p>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <Badge color="gray">{DECK_LABELS[card.deck] || card.deck}</Badge>
                            {state?.repetitions > 0 && <Badge color={state.ef < 2.0 ? 'red' : 'green'}>EF: {state.ef}</Badge>}
                            {state?.dueDate && <Badge color="blue">📅 {state.dueDate}</Badge>}
                            {!state?.lastReview && <Badge color="amber">Nueva</Badge>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {state?.lastReview && (
                            <button onClick={() => resetCardSM2(card.id)} title="Resetear progreso SM-2" style={{
                              background: 'transparent', border: '1px solid var(--border)', borderRadius: '5px',
                              color: 'var(--text3)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
                              fontFamily: 'var(--font-mono)',
                            }}>↺</button>
                          )}
                          {isCustom && (
                            <>
                              <button onClick={() => openEdit(card)} style={{
                                background: 'transparent', border: '1px solid var(--border)', borderRadius: '5px',
                                color: 'var(--text2)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                              }}>Editar</button>
                              <button onClick={() => deleteCard(card.id)} style={{
                                background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '5px',
                                color: 'var(--red)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                              }}>✕</button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* ════ VIEW: STATS ════ */}
        {viewMode === 'stats' && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Pendientes hoy', value: stats.dueCards, color: 'var(--blue)' },
                { label: 'Aprendidas',     value: stats.learnedCards, color: 'var(--accent)' },
                { label: 'Nuevas',         value: stats.newCards, color: 'var(--amber)' },
                { label: 'Retención media',value: stats.avgRetention ? `${stats.avgRetention}%` : '—', color: stats.avgRetention >= 80 ? 'var(--accent)' : 'var(--amber)' },
              ].map(k => (
                <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{k.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Tarjetas más difíciles */}
            {hardest.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                  Tarjetas más difíciles (menor EF)
                </div>
                {hardest.map((card, i) => {
                  const state = sm2States[card.id]
                  const ef    = state?.ef ?? 2.5
                  const pct   = Math.round(((ef - 1.3) / (2.5 - 1.3)) * 100)
                  return (
                    <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < hardest.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', width: 16 }}>{i + 1}</span>
                      <p style={{ flex: 1, fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>{card.q}</p>
                      <div style={{ width: 80 }}>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct < 40 ? 'var(--red)' : 'var(--amber)', borderRadius: 2 }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', marginTop: 2, textAlign: 'right' }}>EF {ef}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Distribución por mazo */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                Progreso por mazo
              </div>
              {['fundamentos', 'preflop', 'postflop', 'torneos'].map(deck => {
                const cards   = allCards.filter(c => c.deck === deck)
                const learned = cards.filter(c => sm2States[c.id]?.repetitions > 0).length
                const pct     = cards.length ? Math.round((learned / cards.length) * 100) : 0
                return (
                  <div key={deck} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', width: 90 }}>{DECK_LABELS[deck]}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', width: 70, textAlign: 'right' }}>
                      {learned}/{cards.length} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal nueva / editar tarjeta */}
      <Modal title={editCard ? 'Editar tarjeta' : 'Nueva flashcard'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Select label="Categoría" value={form.deck} onChange={e => set('deck', e.target.value)}
            options={[
              { value: 'custom',       label: 'Mis tarjetas' },
              { value: 'fundamentos',  label: 'Fundamentos' },
              { value: 'preflop',      label: 'Preflop' },
              { value: 'postflop',     label: 'Postflop' },
              { value: 'torneos',      label: 'Torneos' },
            ]}
          />
          <Textarea label="Pregunta" value={form.q} onChange={e => set('q', e.target.value)} rows={2} placeholder="¿Qué son los pot odds?" />
          <Textarea label="Respuesta" value={form.a} onChange={e => set('a', e.target.value)} rows={4} placeholder="Respuesta completa…" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveCard} disabled={!form.q.trim() || !form.a.trim()}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Pantalla de inicio de sesión ─────────────────────────────────
function SessionStart({ deckLabel, count, dueCount, stats, onStart, hardest, sm2States }) {
  return (
    <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', marginBottom: '6px' }}>{deckLabel}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text3)', marginBottom: '24px' }}>
          {count} tarjetas en este mazo
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
          {[
            { label: 'Nuevas',    value: stats.newCards,     color: 'var(--amber)' },
            { label: 'Pendientes',value: stats.dueCards,     color: 'var(--blue)'  },
            { label: 'Aprendidas',value: stats.learnedCards, color: 'var(--accent)'},
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <Button onClick={onStart} disabled={count === 0} size="lg">
          {count === 0 ? 'Sin tarjetas pendientes' : `▶ Empezar sesión (${count} tarjetas)`}
        </Button>
      </div>
    </div>
  )
}

// ── Pantalla de fin de sesión ────────────────────────────────────
function SessionComplete({ summary, onRestart, onNewDeck }) {
  return (
    <div style={{ width: '100%', maxWidth: 500, background: 'var(--surface)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎉</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--accent)', marginBottom: '6px' }}>Sesión completada</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text3)', marginBottom: '24px' }}>
        {summary.correct}/{summary.total} correctas · {summary.pct}% de acierto
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
        {RATINGS.map(r => summary.counts[r.id] > 0 && (
          <div key={r.id} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: r.color }}>{summary.counts[r.id]}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>{r.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <Button variant="secondary" onClick={onNewDeck}>Cambiar mazo</Button>
        <Button onClick={onRestart}>↺ Repetir</Button>
      </div>
    </div>
  )
}