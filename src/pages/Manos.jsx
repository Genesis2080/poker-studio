import React, { useState } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Modal, Input, Select, Textarea, Empty, Confirm } from '../components/UI.jsx'
import { AIHandAnalysis, APIKeyModal } from '../components/AIAnalysis.jsx'

const POSITIONS = [
  { value: 'BTN', label: 'BTN — Button' },
  { value: 'CO',  label: 'CO — Cutoff' },
  { value: 'HJ',  label: 'HJ — Hijack' },
  { value: 'UTG', label: 'UTG — Under the Gun' },
  { value: 'SB',  label: 'SB — Small Blind' },
  { value: 'BB',  label: 'BB — Big Blind' },
]

const RESULTS = [
  { value: 'win',  label: '✓ Victoria' },
  { value: 'loss', label: '✗ Derrota' },
  { value: 'even', label: '~ Break-even' },
]

const TAGS = ['Bluff', 'Value bet', 'Hero call', 'Bad beat', 'Spot correcto', 'Error propio', '3-bet pot', 'Multiway']

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  position: 'BTN', result: 'win',
  amount: '', notes: '', tags: [],
}

export default function Manos() {
  const { data, setData } = useApp()
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editId,      setEditId]      = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [confirmId,   setConfirmId]   = useState(null)
  const [filter,      setFilter]      = useState('all')
  const [search,      setSearch]      = useState('')
  const [apiKeyOpen,  setApiKeyOpen]  = useState(false)

  const hands = data.hands || []

  // ── Filtro + búsqueda ──────────────────────────────────────────
  const filtered = hands
    .filter(h => filter === 'all' || h.result === filter)
    .filter(h => {
      if (!search) return true
      const q = search.toLowerCase()
      return (h.notes || '').toLowerCase().includes(q)
        || (h.position || '').toLowerCase().includes(q)
        || (h.tags || []).some(t => t.toLowerCase().includes(q))
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  // ── CRUD ───────────────────────────────────────────────────────
  function openNew() {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] })
    setEditId(null)
    setModalOpen(true)
  }

  function openEdit(hand) {
    setForm({ ...hand, tags: hand.tags || [] })
    setEditId(hand.id)
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

  // Guardar resultados de IA sobre la mano activa
  function saveAIResult(id, aiData) {
    setData(prev => ({
      ...prev,
      hands: prev.hands.map(h => h.id === id ? { ...h, ...aiData } : h),
    }))
    // Actualizar form en vivo para que AIAnalysis tenga los datos persistidos
    setForm(f => ({ ...f, ...aiData }))
  }

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Mano actual para panel de IA (usa datos persistidos si existen)
  const currentHand = editId ? (hands.find(h => h.id === editId) || form) : form

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Manos"
        subtitle={`${hands.length} manos registradas · ${hands.filter(h => h.aiAnalysis).length} analizadas`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setApiKeyOpen(true)}>
              🤖 API Key IA
            </Button>
            <Button onClick={openNew}>+ Nueva mano</Button>
          </div>
        }
      />

      {/* Filtros */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 28px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {[
          { id: 'all',  label: 'Todas' },
          { id: 'win',  label: '✓ Victorias' },
          { id: 'loss', label: '✗ Derrotas' },
          { id: 'even', label: '~ Break-even' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
            transition: 'all 0.15s',
            background: filter === f.id ? 'rgba(74,222,128,0.12)' : 'var(--surface)',
            border: `1px solid ${filter === f.id ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
            color: filter === f.id ? 'var(--accent)' : 'var(--text2)',
          }}>{f.label}</button>
        ))}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por notas, posición, tag…"
          style={{
            marginLeft: 'auto', background: 'var(--surface)',
            border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '12px',
            padding: '5px 10px', outline: 'none', width: '220px',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
        />
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
        {filtered.length === 0
          ? <Empty icon="🃏" message="No hay manos que mostrar" sub="Añade tu primera mano con el botón superior" />
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha', 'Posición', 'Resultado', 'Importe', 'Tags', 'IA', 'Notas', ''].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontFamily: 'var(--font-mono)',
                      fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase',
                      letterSpacing: '0.1em', padding: '0 8px 10px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((hand, i) => (
                  <tr
                    key={hand.id}
                    onClick={() => openEdit(hand)}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 8px 12px 0', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {hand.date}
                    </td>
                    <td style={{ padding: '12px 8px' }}><Badge color="blue">{hand.position || '—'}</Badge></td>
                    <td style={{ padding: '12px 8px' }}>
                      <Badge color={hand.result === 'win' ? 'green' : hand.result === 'loss' ? 'red' : 'gray'}>
                        {hand.result === 'win' ? 'Victoria' : hand.result === 'loss' ? 'Derrota' : 'Break-even'}
                      </Badge>
                    </td>
                    <td style={{
                      padding: '12px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px',
                      color: hand.amount ? (hand.result === 'win' ? 'var(--accent)' : 'var(--red)') : 'var(--text3)',
                    }}>
                      {hand.amount ? `${hand.result === 'win' ? '+' : '-'}${hand.amount}€` : '—'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(hand.tags || []).slice(0, 2).map(t => <Badge key={t} color="purple">{t}</Badge>)}
                        {(hand.tags || []).length > 2 && <Badge color="gray">+{hand.tags.length - 2}</Badge>}
                      </div>
                    </td>
                    {/* Columna IA — indicador de análisis */}
                    <td style={{ padding: '12px 8px' }}>
                      {hand.aiAnalysis
                        ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: '11px',
                              color: hand.aiAnalysis.score >= 7 ? 'var(--accent)' : hand.aiAnalysis.score >= 5 ? 'var(--amber)' : 'var(--red)',
                            }}>
                              {hand.aiAnalysis.score}/10
                            </span>
                          </div>
                        )
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--text3)', fontSize: '12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hand.notes || '—'}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmId(hand.id) }}
                        style={{
                          background: 'transparent', border: '1px solid transparent',
                          borderRadius: '5px', color: 'var(--text3)',
                          padding: '3px 6px', fontSize: '12px', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
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

      {/* ── Modal nueva / editar mano — ahora con panel de IA ── */}
      <Modal
        title={editId ? 'Editar mano' : 'Nueva mano'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        width={620}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Formulario base */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Fecha" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            <Input label="Importe (€)" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select label="Posición" value={form.position} onChange={e => set('position', e.target.value)} options={POSITIONS} />
            <Select label="Resultado" value={form.result}   onChange={e => set('result',   e.target.value)} options={RESULTS}    />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.15s',
                  background: form.tags.includes(tag) ? 'rgba(167,139,250,0.15)' : 'var(--surface2)',
                  border:     form.tags.includes(tag) ? '1px solid rgba(167,139,250,0.35)' : '1px solid var(--border)',
                  color:      form.tags.includes(tag) ? 'var(--purple)' : 'var(--text2)',
                }}>{tag}</button>
              ))}
            </div>
          </div>
          <Textarea
            label="Descripción de la mano"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Describe la situación completa: posición, stack, acción preflop, board, acciones de cada calle, reads sobre el rival…&#10;&#10;Cuanto más detalle des, mejor será el análisis de IA."
            rows={5}
          />

          {/* ── Panel de IA (solo visible al editar una mano guardada) ── */}
          {editId && (
            <AIHandAnalysis
              hand={currentHand}
              onSaveAnalysis={(aiData) => saveAIResult(editId, aiData)}
            />
          )}
          {!editId && (
            <div style={{
              background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)',
              borderRadius: '7px', padding: '10px 14px',
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)',
            }}>
              💡 Guarda la mano primero y luego podrás analizarla con IA
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveHand}>{editId ? 'Guardar cambios' : 'Añadir mano'}</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Confirm
        open={!!confirmId}
        title="Eliminar mano"
        message="¿Seguro que quieres eliminar esta mano? Esta acción no se puede deshacer."
        onConfirm={() => deleteHand(confirmId)}
        onCancel={() => setConfirmId(null)}
      />

      {/* Modal API Key */}
      <APIKeyModal open={apiKeyOpen} onClose={() => setApiKeyOpen(false)} />
    </div>
  )
}