import React, { useState } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Modal, Input, Select, Textarea, Empty, Confirm } from '../components/UI.jsx'
import { AIHandAnalysis, APIKeyModal } from '../components/AIAnalysis.jsx'

const POSITIONS = [
  { value: 'BTN', label: 'BTN — Button'         },
  { value: 'CO',  label: 'CO — Cutoff'           },
  { value: 'HJ',  label: 'HJ — Hijack'           },
  { value: 'UTG', label: 'UTG — Under the Gun'   },
  { value: 'SB',  label: 'SB — Small Blind'      },
  { value: 'BB',  label: 'BB — Big Blind'        },
]

const RESULTS = [
  { value: 'win',  label: '✓ Victoria'    },
  { value: 'loss', label: '✗ Derrota'     },
  { value: 'even', label: '~ Break-even'  },
]

const PREFLOP_ACTIONS = [
  { value: 'open',  label: 'Open raise'   },
  { value: 'call',  label: 'Call'         },
  { value: '3bet',  label: '3-bet'        },
  { value: '4bet',  label: '4-bet'        },
  { value: 'limp',  label: 'Limp'         },
]

const STREETS = [
  { value: 'preflop', label: 'Preflop' },
  { value: 'flop',    label: 'Flop'    },
  { value: 'turn',    label: 'Turn'    },
  { value: 'river',   label: 'River'   },
]

const TAGS = ['Bluff', 'Value bet', 'Hero call', 'Bad beat', 'Spot correcto', 'Error propio', '3-bet pot', 'Multiway']

const EMPTY_FORM = {
  date:          new Date().toISOString().split('T')[0],
  position:      'BTN',
  result:        'win',
  amount:        '',
  // Tracking de rangos
  heroHand:      '',
  villainRange:  '',
  preflopAction: '',
  street:        '',
  board:         '',
  // Texto y tags
  notes:         '',
  tags:          [],
}

// ── Selector visual de mano hero ─────────────────────────────────
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

function HeroHandInput({ value, onChange }) {
  const [rank1, setRank1] = useState('')
  const [rank2, setRank2] = useState('')
  const [suited, setSuited] = useState(false)

  function build(r1, r2, s) {
    if (!r1 || !r2) { onChange(''); return }
    const ORDER = 'AKQJT98765432'
    const i1 = ORDER.indexOf(r1), i2 = ORDER.indexOf(r2)
    if (r1 === r2) { onChange(r1 + r2); return }
    const [high, low] = i1 < i2 ? [r1, r2] : [r2, r1]
    onChange(high + low + (s ? 's' : 'o'))
  }

  function handleR1(r) { setRank1(r); build(r, rank2, suited) }
  function handleR2(r) { setRank2(r); build(rank1, r, suited) }
  function handleSuited(s) { setSuited(s); build(rank1, rank2, s) }

  const rankStyle = (r, selected) => ({
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '5px', cursor: 'pointer', transition: 'all 0.1s',
    fontFamily: 'var(--font-mono)', fontSize: '12px',
    background: selected ? 'var(--accent)' : 'var(--surface)',
    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
    color: selected ? '#0d1a0d' : 'var(--text2)',
  })

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        Hero hand {value && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>{value}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', width: 16 }}>1ª</span>
          {RANKS.map(r => <div key={r} style={rankStyle(r, rank1 === r)} onClick={() => handleR1(r)}>{r}</div>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', width: 16 }}>2ª</span>
          {RANKS.map(r => <div key={r} style={rankStyle(r, rank2 === r)} onClick={() => handleR2(r)}>{r}</div>)}
        </div>
        {rank1 && rank2 && rank1 !== rank2 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['s', 'Suited'], ['o', 'Offsuit']].map(([v, l]) => (
              <button key={v} onClick={() => handleSuited(v === 's')} style={{
                padding: '3px 10px', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.1s',
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                background: (v === 's') === suited ? 'rgba(74,222,128,0.12)' : 'var(--surface2)',
                border: `1px solid ${(v === 's') === suited ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                color: (v === 's') === suited ? 'var(--accent)' : 'var(--text2)',
              }}>{l}</button>
            ))}
          </div>
        )}
        {/* También permitir entrada manual */}
        <input
          value={value} onChange={e => { onChange(e.target.value); setRank1(''); setRank2('') }}
          placeholder="O escribe manualmente: AKs, QJo, 99…"
          style={{
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text)',
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            padding: '6px 10px', outline: 'none', width: '100%',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
        />
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function Manos() {
  const { data, setData } = useApp()
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editId,     setEditId]     = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [confirmId,  setConfirmId]  = useState(null)
  const [filter,     setFilter]     = useState('all')
  const [search,     setSearch]     = useState('')
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [formTab,    setFormTab]    = useState('basic') // basic | range | ai

  const hands = data.hands || []

  const filtered = hands
    .filter(h => filter === 'all' || h.result === filter)
    .filter(h => {
      if (!search) return true
      const q = search.toLowerCase()
      return (h.notes || '').toLowerCase().includes(q)
        || (h.position || '').toLowerCase().includes(q)
        || (h.heroHand || '').toLowerCase().includes(q)
        || (h.tags || []).some(t => t.toLowerCase().includes(q))
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  function openNew() {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] })
    setEditId(null)
    setFormTab('basic')
    setModalOpen(true)
  }

  function openEdit(hand) {
    setForm({ ...EMPTY_FORM, ...hand, tags: hand.tags || [] })
    setEditId(hand.id)
    setFormTab('basic')
    setModalOpen(true)
  }

  function saveHand() {
    if (!form.date || !form.position) return
    setData(prev => {
      const hs = prev.hands || []
      if (editId) return { ...prev, hands: hs.map(h => h.id === editId ? { ...form, id: editId } : h) }
      return { ...prev, hands: [{ ...form, id: 'h' + Date.now() }, ...hs] }
    })
    setModalOpen(false)
  }

  function deleteHand(id) {
    setData(prev => ({ ...prev, hands: prev.hands.filter(h => h.id !== id) }))
    setConfirmId(null)
  }

  function saveAIResult(id, aiData) {
    setData(prev => ({ ...prev, hands: prev.hands.map(h => h.id === id ? { ...h, ...aiData } : h) }))
    setForm(f => ({ ...f, ...aiData }))
  }

  function toggleTag(tag) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const currentHand = editId ? (hands.find(h => h.id === editId) || form) : form

  // ── Columnas de la tabla ──────────────────────────────────────
  const cols = ['Fecha', 'Pos', 'Hero', 'Resultado', '€', 'Tags', 'IA', '']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Manos"
        subtitle={`${hands.length} manos · ${hands.filter(h => h.heroHand).length} con rango · ${hands.filter(h => h.aiAnalysis).length} analizadas`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setApiKeyOpen(true)}>🤖 API Key</Button>
            <Button onClick={openNew}>+ Nueva mano</Button>
          </div>
        }
      />

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 28px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        {[
          { id: 'all',  label: 'Todas'        },
          { id: 'win',  label: '✓ Victorias'  },
          { id: 'loss', label: '✗ Derrotas'   },
          { id: 'even', label: '~ Break-even' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '4px 12px',
            borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
            background: filter === f.id ? 'rgba(74,222,128,0.12)' : 'var(--surface)',
            border: `1px solid ${filter === f.id ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
            color: filter === f.id ? 'var(--accent)' : 'var(--text2)',
          }}>{f.label}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por notas, posición, mano…"
          style={{ marginLeft: 'auto', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '12px', padding: '5px 10px', outline: 'none', width: '200px' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
        />
      </div>

      {/* Tabla */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 28px' }}>
        {filtered.length === 0
          ? <Empty icon="🃏" message="No hay manos" sub="Añade tu primera mano con el botón superior" />
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{cols.map(h => (
                  <th key={h} style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px 10px 0', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((hand, i) => (
                  <tr key={hand.id} onClick={() => openEdit(hand)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 8px 11px 0', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{hand.date}</td>
                    <td style={{ padding: '11px 8px' }}><Badge color="blue">{hand.position || '—'}</Badge></td>
                    <td style={{ padding: '11px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent)' }}>
                      {hand.heroHand || <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 8px' }}>
                      <Badge color={hand.result === 'win' ? 'green' : hand.result === 'loss' ? 'red' : 'gray'}>
                        {hand.result === 'win' ? 'Victoria' : hand.result === 'loss' ? 'Derrota' : 'BE'}
                      </Badge>
                    </td>
                    <td style={{ padding: '11px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: hand.amount ? (hand.result === 'win' ? 'var(--accent)' : 'var(--red)') : 'var(--text3)' }}>
                      {hand.amount ? `${hand.result === 'win' ? '+' : '-'}${hand.amount}€` : '—'}
                    </td>
                    <td style={{ padding: '11px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(hand.tags || []).slice(0, 1).map(t => <Badge key={t} color="purple">{t}</Badge>)}
                        {(hand.tags || []).length > 1 && <Badge color="gray">+{hand.tags.length - 1}</Badge>}
                      </div>
                    </td>
                    <td style={{ padding: '11px 8px' }}>
                      {hand.aiAnalysis
                        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: hand.aiAnalysis.score >= 7 ? 'var(--accent)' : hand.aiAnalysis.score >= 5 ? 'var(--amber)' : 'var(--red)' }}>
                            {hand.aiAnalysis.score}/10
                          </span>
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '11px 0', textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); setConfirmId(hand.id) }} style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '5px', color: 'var(--text3)', padding: '3px 6px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'transparent' }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Modal */}
      <Modal title={editId ? 'Editar mano' : 'Nueva mano'} open={modalOpen} onClose={() => setModalOpen(false)} width={660}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

          {/* Tabs del form */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
            {[
              { id: 'basic', label: '📋 Básico'   },
              { id: 'range', label: '🃏 Rangos'   },
              { id: 'ai',    label: '🤖 IA', disabled: !editId },
            ].map(t => (
              <button key={t.id} onClick={() => !t.disabled && setFormTab(t.id)} style={{
                padding: '8px 14px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${formTab === t.id ? 'var(--accent)' : 'transparent'}`,
                color: t.disabled ? 'var(--text3)' : formTab === t.id ? 'var(--accent)' : 'var(--text2)',
                fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: t.disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', opacity: t.disabled ? 0.4 : 1,
              }}>{t.label}</button>
            ))}
          </div>

          {/* Tab: Básico */}
          {formTab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input label="Fecha" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                <Input label="Importe (€)" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Select label="Posición"  value={form.position} onChange={e => set('position', e.target.value)} options={POSITIONS} />
                <Select label="Resultado" value={form.result}   onChange={e => set('result',   e.target.value)} options={RESULTS}   />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {TAGS.map(tag => (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '3px 10px',
                      borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                      background: form.tags.includes(tag) ? 'rgba(167,139,250,0.15)' : 'var(--surface2)',
                      border:     form.tags.includes(tag) ? '1px solid rgba(167,139,250,0.35)' : '1px solid var(--border)',
                      color:      form.tags.includes(tag) ? 'var(--purple)' : 'var(--text2)',
                    }}>{tag}</button>
                  ))}
                </div>
              </div>
              <Textarea
                label="Descripción de la mano"
                value={form.notes} onChange={e => set('notes', e.target.value)} rows={4}
                placeholder="Describe la situación: stack, acción calle a calle, reads… Cuanto más detalle, mejor análisis de IA."
              />
            </div>
          )}

          {/* Tab: Rangos */}
          {formTab === 'range' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <HeroHandInput value={form.heroHand} onChange={v => set('heroHand', v)} />

              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Rango estimado del villano
                </div>
                <input
                  value={form.villainRange} onChange={e => set('villainRange', e.target.value)}
                  placeholder="Ej: TT+, AK, AQs, KQs — o 'tight-passive', '3-bet rango'…"
                  style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '13px', padding: '8px 10px', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Select label="Acción preflop" value={form.preflopAction} onChange={e => set('preflopAction', e.target.value)}
                  options={[{ value: '', label: '— Sin especificar —' }, ...PREFLOP_ACTIONS]} />
                <Select label="Calle decisiva" value={form.street} onChange={e => set('street', e.target.value)}
                  options={[{ value: '', label: '— Sin especificar —' }, ...STREETS]} />
              </div>

              <Input label="Board (ej: A♠K♥7♣ · T♦ · 2♥)" value={form.board} onChange={e => set('board', e.target.value)} placeholder="A♠K♥7♣" />

              <div style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)', borderRadius: '7px', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', lineHeight: 1.6 }}>
                💡 Los datos de rango permiten al análisis cruzado detectar con qué manos pierdes más, qué spots se repiten y qué rangos tienes peor calibrados.
              </div>
            </div>
          )}

          {/* Tab: IA */}
          {formTab === 'ai' && editId && (
            <AIHandAnalysis
              hand={currentHand}
              onSaveAnalysis={(aiData) => saveAIResult(editId, aiData)}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveHand}>{editId ? 'Guardar cambios' : 'Añadir mano'}</Button>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmId} title="Eliminar mano"
        message="¿Eliminar esta mano? Esta acción no se puede deshacer."
        onConfirm={() => deleteHand(confirmId)} onCancel={() => setConfirmId(null)} />

      <APIKeyModal open={apiKeyOpen} onClose={() => setApiKeyOpen(false)} />
    </div>
  )
}