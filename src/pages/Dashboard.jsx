import React, { useMemo } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, KpiCard, Empty, Badge } from '../components/UI.jsx'
import {
  HandsPerDayChart,
  CumulativeProfitChart,
  WinRateByPositionChart,
  CommonErrorsChart,
  ResultDistributionChart,
} from '../components/Charts.jsx'

export default function Dashboard() {
  const { data } = useApp()
  const { hands, sessions } = data

  // ── Métricas principales ──────────────────────────────────────
  const netResult  = sessions.reduce((a, s) => a + ((s.cashOut || 0) - (s.buyIn || 0)), 0)
  const totalHours = sessions.reduce((a, s) => a + (s.duration || 0), 0)
  const winRate    = hands.length
    ? ((hands.filter(h => h.result === 'win').length / hands.length) * 100).toFixed(1)
    : null
  const avgSession = sessions.length ? (netResult / sessions.length).toFixed(1) : null

  // ── Errores más comunes (de análisis IA + tags) ───────────────
  const errorSummary = useMemo(() => {
    const counts = {}
    const labels = {
      fold_equity: 'Fold equity', pot_odds: 'Pot odds',
      position: 'Posición', bet_sizing: 'Sizing',
      bluff_frequency: 'Bluff freq.', value_thin: 'Value thin',
      tilt: 'Tilt', range_imbalance: 'Rango', icm: 'ICM', other: 'Otros',
    }
    hands.forEach(h => {
      ;(h.aiAnalysis?.errorTypes || []).forEach(e => { counts[e] = (counts[e] || 0) + 1 })
      ;(h.aiErrors?.errorsFound  || []).forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1 })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => ({ label: labels[k] || k, count: v }))
  }, [hands])

  // ── Manos analizadas con IA ───────────────────────────────────
  const analyzedHands = hands.filter(h => h.aiAnalysis || h.aiErrors || h.aiSuggest).length
  const avgScore = useMemo(() => {
    const scored = hands.filter(h => h.aiAnalysis?.score)
    if (!scored.length) return null
    return (scored.reduce((a, h) => a + h.aiAnalysis.score, 0) / scored.length).toFixed(1)
  }, [hands])

  // ── Últimas sesiones ──────────────────────────────────────────
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Dashboard"
        subtitle={`${hands.length} manos · ${sessions.length} sesiones · ${analyzedHands} analizadas con IA`}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <KpiCard
            label="Resultado neto"
            value={`${netResult >= 0 ? '+' : ''}${netResult.toFixed(0)}€`}
            sub={avgSession ? `${Number(avgSession) > 0 ? '+' : ''}${avgSession}€ / sesión` : 'Sin sesiones aún'}
            color={netResult >= 0 ? 'var(--accent)' : 'var(--red)'}
            icon="💶"
          />
          <KpiCard
            label="Manos analizadas"
            value={`${analyzedHands} / ${hands.length}`}
            sub={winRate ? `${winRate}% win rate` : 'Sin manos aún'}
            icon="🃏"
          />
          <KpiCard
            label="Score medio IA"
            value={avgScore ? `${avgScore}/10` : '—'}
            sub={analyzedHands ? `${analyzedHands} manos evaluadas` : 'Analiza manos con IA'}
            color={avgScore >= 7 ? 'var(--accent)' : avgScore >= 5 ? 'var(--amber)' : avgScore ? 'var(--red)' : 'var(--text)'}
            icon="🤖"
          />
          <KpiCard
            label="Horas en mesa"
            value={totalHours ? `${totalHours}h` : '—'}
            sub={sessions.length ? `${(totalHours / sessions.length).toFixed(1)}h / sesión` : 'Sin sesiones'}
            icon="⏱️"
          />
        </div>

        {/* ── Errores comunes (banner rápido) ── */}
        {errorSummary.length > 0 && (
          <div style={{
            background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: 'var(--radius)', padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--red)', textTransform: 'uppercase',
              letterSpacing: '0.1em', flexShrink: 0,
            }}>
              ⚠ Errores recurrentes
            </span>
            {errorSummary.map(e => (
              <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Badge color="red">{e.label}</Badge>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{e.count}×</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Gráfico principal ── */}
        <HandsPerDayChart hands={hands} />

        {/* ── Fila 1 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <CumulativeProfitChart sessions={sessions} />
          <ResultDistributionChart hands={hands} />
        </div>

        {/* ── Fila 2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <WinRateByPositionChart hands={hands} />
          <CommonErrorsChart hands={hands} />
        </div>

        {/* ── Últimas sesiones ── */}
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