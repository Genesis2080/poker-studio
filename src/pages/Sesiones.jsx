import React, { useState } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Modal, Input, Select, Textarea, Empty, KpiCard, Confirm } from '../components/UI.jsx'

const LOCATIONS = [
  { value: 'live-casino', label: '🏛️ Casino (live)' },
  { value: 'live-home',   label: '🏠 Partida casera' },
  { value: 'online',      label: '💻 Online' },
  { value: 'other',       label: '📍 Otro' },
]

const EMPTY_FORM = {
  date:     new Date().toISOString().split('T')[0],
  location: 'live-casino',
  duration: '',
  buyIn:    '',
  cashOut:  '',
  notes:    '',
}

export default function Sesiones() {
  const { data, setData } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState(null)

  const sessions = data.sessions || []
  const sorted   = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))

  // ── KPIs ──────────────────────────────────────────────
  const totalProfit   = sessions.reduce((a, s) => a + ((s.cashOut || 0) - (s.buyIn || 0)), 0)
  const totalHours    = sessions.reduce((a, s) => a + (s.duration || 0), 0)
  const winSessions   = sessions.filter(s => (s.cashOut || 0) > (s.buyIn || 0)).length
  const profitPerHour = totalHours ? (totalProfit / totalHours).toFixed(1) : null

  // ── CRUD ───────────────────────────────────────────────
  function openNew() {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] })
    setEditId(null)
    setModalOpen(true)
  }

  function openEdit(session) {
    setForm({ ...session })
    setEditId(session.id)
    setModalOpen(true)
  }

  function saveSession() {
    if (!form.date) return
    setData(prev => {
      const sessions = prev.sessions || []
      const parsed = {
        ...form,
        buyIn:    parseFloat(form.buyIn)    || 0,
        cashOut:  parseFloat(form.cashOut)  || 0,
        duration: parseFloat(form.duration) || 0,
      }
      if (editId) {
        return { ...prev, sessions: sessions.map(s => s.id === editId ? { ...parsed, id: editId } : s) }
      }
      return { ...prev, sessions: [{ ...parsed, id: 'ses' + Date.now() }, ...sessions] }
    })
    setModalOpen(false)
  }

  function deleteSession(id) {
    setData(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== id) }))
    setConfirmId(null)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Profit del formulario en tiempo real
  const formProfit = (parseFloat(form.cashOut) || 0) - (parseFloat(form.buyIn) || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Sesiones"
        subtitle={`${sessions.length} sesiones · ${totalHours}h en mesa`}
        action={<Button onClick={openNew}>+ Nueva sesión</Button>}
      />

      {/* KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px', padding: '20px 28px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <KpiCard
          label="Resultado neto"
          value={`${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(0)}€`}
          color={totalProfit >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
        <KpiCard
          label="Sesiones ganadas"
          value={winSessions}
          sub={sessions.length ? `${((winSessions / sessions.length) * 100).toFixed(0)}% win rate` : '—'}
          color="var(--accent)"
        />
        <KpiCard label="Horas totales" value={`${totalHours}h`} />
        <KpiCard
          label="€ / hora"
          value={profitPerHour ? `${profitPerHour > 0 ? '+' : ''}${profitPerHour}€` : '—'}
          color={profitPerHour > 0 ? 'var(--accent)' : profitPerHour < 0 ? 'var(--red)' : 'var(--text)'}
        />
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
        {sorted.length === 0
          ? <Empty icon="📅" message="No hay sesiones registradas" sub="Empieza registrando tu primera sesión" />
          : sorted.map((s, i) => {
              const profit = (s.cashOut || 0) - (s.buyIn || 0)
              const locLabel = LOCATIONS.find(l => l.value === s.location)?.label || s.location || '—'
              return (
                <div
                  key={s.id}
                  onClick={() => openEdit(s)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr auto auto auto',
                    alignItems: 'center', gap: '16px',
                    padding: '14px 0',
                    borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Fecha */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text)' }}>
                      {new Date(s.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
                      {new Date(s.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' })}
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '3px' }}>{locLabel}</div>
                    {s.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        {s.notes}
                      </div>
                    )}
                  </div>

                  {/* Duración */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)' }}>
                      {s.duration ? `${s.duration}h` : '—'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
                      {s.buyIn ? `Buy-in: ${s.buyIn}€` : ''}
                    </div>
                  </div>

                  {/* Resultado */}
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400,
                    color: profit > 0 ? 'var(--accent)' : profit < 0 ? 'var(--red)' : 'var(--text2)',
                    minWidth: '80px', textAlign: 'right',
                  }}>
                    {profit >= 0 ? '+' : ''}{profit}€
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmId(s.id) }}
                    style={{
                      background: 'transparent', border: '1px solid transparent',
                      borderRadius: '5px', color: 'var(--text3)',
                      padding: '4px 7px', fontSize: '12px', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'transparent' }}
                  >✕</button>
                </div>
              )
            })
        }
      </div>

      {/* Modal nueva / editar sesión */}
      <Modal
        title={editId ? 'Editar sesión' : 'Nueva sesión'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Fecha" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            <Input label="Duración (horas)" type="number" value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="3" />
          </div>
          <Select label="Ubicación" value={form.location} onChange={e => set('location', e.target.value)} options={LOCATIONS} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Buy-in (€)" type="number" value={form.buyIn}   onChange={e => set('buyIn',   e.target.value)} placeholder="100" />
            <Input label="Cash-out (€)" type="number" value={form.cashOut} onChange={e => set('cashOut', e.target.value)} placeholder="150" />
          </div>

          {/* Preview resultado */}
          {(form.buyIn || form.cashOut) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--bg2)',
              border: `1px solid ${formProfit >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
              borderRadius: 'var(--radius-sm)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>Resultado de la sesión</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '18px',
                color: formProfit >= 0 ? 'var(--accent)' : 'var(--red)',
              }}>
                {formProfit >= 0 ? '+' : ''}{formProfit}€
              </span>
            </div>
          )}

          <Textarea label="Notas" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="¿Cómo fue la sesión? ¿Qué aprendiste? ¿Algún leak detectado?" rows={3} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveSession}>{editId ? 'Guardar cambios' : 'Añadir sesión'}</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Confirm
        open={!!confirmId}
        title="Eliminar sesión"
        message="¿Seguro que quieres eliminar esta sesión? Esta acción no se puede deshacer."
        onConfirm={() => deleteSession(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}