import React, { useMemo } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, KpiCard, Empty, Badge } from '../components/UI.jsx'

const POSITIONS = ['BTN','CO','HJ','UTG','SB','BB']

export default function Dashboard() {
  const { data } = useApp()
  const { hands, sessions } = data

  // ── Métricas ─────────────────────────────────────────
  const netResult  = sessions.reduce((a, s) => a + ((s.cashOut || 0) - (s.buyIn || 0)), 0)
  const totalHours = sessions.reduce((a, s) => a + (s.duration || 0), 0)
  const winRate    = hands.length
    ? ((hands.filter(h => h.result === 'win').length / hands.length) * 100).toFixed(1)
    : null
  const avgSession = sessions.length ? (netResult / sessions.length).toFixed(1) : null

  // ── Últimas 5 sesiones ───────────────────────────────
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  // ── Distribución por posición ────────────────────────
  const posByPos = useMemo(() => {
    const map = {}
    hands.forEach(h => {
      if (!h.position) return
      if (!map[h.position]) map[h.position] = { total: 0, wins: 0 }
      map[h.position].total++
      if (h.result === 'win') map[h.position].wins++
    })
    return map
  }, [hands])

  // ── Últimas 5 manos ──────────────────────────────────
  const recentHands = [...hands]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Dashboard"
        subtitle={`${hands.length} manos · ${sessions.length} sesiones registradas`}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <KpiCard
            label="Resultado neto"
            value={`${netResult >= 0 ? '+' : ''}${netResult.toFixed(0)}€`}
            sub={avgSession ? `${avgSession > 0 ? '+' : ''}${avgSession}€ / sesión` : 'Sin sesiones aún'}
            color={netResult >= 0 ? 'var(--accent)' : 'var(--red)'}
            icon="💶"
          />
          <KpiCard
            label="Manos jugadas"
            value={hands.length}
            sub={winRate ? `${winRate}% win rate` : 'Sin manos aún'}
            icon="🃏"
          />
          <KpiCard
            label="Sesiones"
            value={sessions.length}
            sub={totalHours ? `${totalHours}h en mesa` : 'Sin tiempo registrado'}
            icon="📅"
          />
          <KpiCard
            label="Horas en mesa"
            value={totalHours ? `${totalHours}h` : '—'}
            sub={sessions.length ? `${(totalHours / sessions.length).toFixed(1)}h / sesión` : 'Sin sesiones'}
            icon="⏱️"
          />
        </div>

        {/* Fila inferior */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Últimas sesiones */}
          <Card title="Últimas sesiones">
            {recentSessions.length === 0
              ? <Empty icon="📅" message="Aún no hay sesiones" sub="Regístralas en la sección Sesiones" />
              : recentSessions.map(s => {
                  const profit = (s.cashOut || 0) - (s.buyIn || 0)
                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '2px' }}>
                          {s.location || 'Sin ubicación'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>
                          {s.date} · {s.duration ? `${s.duration}h` : '?'}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500,
                        color: profit >= 0 ? 'var(--accent)' : 'var(--red)',
                      }}>
                        {profit >= 0 ? '+' : ''}{profit}€
                      </span>
                    </div>
                  )
                })
            }
          </Card>

          {/* Stats por posición */}
          <Card title="Manos por posición">
            {hands.length === 0
              ? <Empty icon="🎯" message="Sin manos registradas" sub="Añade manos en la sección Manos" />
              : POSITIONS.map(pos => {
                  const d = posByPos[pos]
                  if (!d) return null
                  const wr = ((d.wins / d.total) * 100).toFixed(0)
                  return (
                    <div key={pos} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <Badge color={d.wins / d.total >= 0.5 ? 'green' : 'red'}>{pos}</Badge>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          height: '4px', background: 'var(--border)',
                          borderRadius: '2px', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            width: `${wr}%`,
                            background: d.wins / d.total >= 0.5 ? 'var(--accent)' : 'var(--red)',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', width: '60px', textAlign: 'right' }}>
                        {d.wins}/{d.total} ({wr}%)
                      </span>
                    </div>
                  )
                })
            }
          </Card>
        </div>

        {/* Últimas manos */}
        {recentHands.length > 0 && (
          <Card title="Últimas manos registradas">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Fecha', 'Posición', 'Resultado', 'Notas'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontFamily: 'var(--font-mono)',
                      fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase',
                      letterSpacing: '0.08em', padding: '0 0 10px',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentHands.map((h, i) => (
                  <tr key={h.id} style={{ borderBottom: i < recentHands.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{h.date}</td>
                    <td style={{ padding: '10px 8px' }}><Badge color="blue">{h.position || '—'}</Badge></td>
                    <td style={{ padding: '10px 8px' }}>
                      <Badge color={h.result === 'win' ? 'green' : h.result === 'loss' ? 'red' : 'gray'}>
                        {h.result === 'win' ? 'Victoria' : h.result === 'loss' ? 'Derrota' : 'Break-even'}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 0', color: 'var(--text3)', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '18px 20px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'var(--text3)', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: '14px',
      }}>{title}</div>
      {children}
    </div>
  )
}