import React, { useState, useMemo } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Empty } from '../components/UI.jsx'
import { useAI, normalizeHand } from '../hooks/useAI.js'
import { RangeHeatmapChart } from '../components/Charts.jsx'

// ── Iconos ───────────────────────────────────────────────────────
const IconBrain = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2"/>
  </svg>
)

const IconTrend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
)

const IconTarget = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
)

// ── Spinner ───────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 20px' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text3)' }}>{label}</span>
    </div>
  )
}

// ── Bloque informativo ────────────────────────────────────────────
function InfoBlock({ label, color = 'var(--accent)', children }) {
  return (
    <div style={{ background: 'var(--bg2)', borderLeft: `3px solid ${color}`, borderRadius: '0 7px 7px 0', padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

export default function Analisis() {
  const { data, setData } = useApp()
  const { loading, error, apiKey, analyzeHistory } = useAI()

  const hands    = data.hands    || []
  const sessions = data.sessions || []
  const report   = data.historyReport || null

  const MIN_HANDS = 3   // mínimo para análisis cruzado

  // ── Métricas locales (sin IA) ─────────────────────────────────
  const localStats = useMemo(() => {
    if (!hands.length) return null

    // Win rate por posición
    const byPos = {}
    hands.forEach(h => {
      if (!h.position) return
      if (!byPos[h.position]) byPos[h.position] = { total: 0, wins: 0 }
      byPos[h.position].total++
      if (h.result === 'win') byPos[h.position].wins++
    })

    // Win rate por rango de hero
    const byRange = {}
    hands.forEach(h => {
      if (!h.heroHand) return
      const key = normalizeHand(h.heroHand)
      if (!byRange[key]) byRange[key] = { total: 0, wins: 0, amounts: [] }
      byRange[key].total++
      if (h.result === 'win') byRange[key].wins++
      if (h.amount) byRange[key].amounts.push(parseFloat(h.amount) * (h.result === 'win' ? 1 : -1))
    })

    // Errores recurrentes
    const errorCounts = {}
    hands.forEach(h => {
      ;(h.aiAnalysis?.errorTypes || []).forEach(e => { errorCounts[e] = (errorCounts[e] || 0) + 1 })
      ;(h.aiErrors?.errorsFound  || []).forEach(e => { errorCounts[e.type] = (errorCounts[e.type] || 0) + 1 })
    })

    // Score trend (últimas 10 analizadas)
    const scored = hands
      .filter(h => h.aiAnalysis?.score)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    const scoreTrend = scored.slice(-10).map((h, i) => ({ i: i + 1, score: h.aiAnalysis.score, date: h.date }))

    // Win rate por tipo de acción preflop
    const byAction = {}
    hands.forEach(h => {
      if (!h.preflopAction) return
      if (!byAction[h.preflopAction]) byAction[h.preflopAction] = { total: 0, wins: 0 }
      byAction[h.preflopAction].total++
      if (h.result === 'win') byAction[h.preflopAction].wins++
    })

    return { byPos, byRange, errorCounts, scoreTrend, byAction }
  }, [hands])

  // ── Ejecutar análisis cruzado IA ──────────────────────────────
  async function runHistoryAnalysis() {
    const result = await analyzeHistory(hands, sessions)
    if (result) {
      setData(prev => ({ ...prev, historyReport: { ...result, generatedAt: new Date().toISOString() } }))
    }
  }

  const errorLabels = {
    fold_equity: 'Fold equity', pot_odds: 'Pot odds', position: 'Posición',
    bet_sizing: 'Sizing', bluff_frequency: 'Bluff freq.', value_thin: 'Value thin',
    tilt: 'Tilt', range_imbalance: 'Rango', icm: 'ICM', other: 'Otros',
  }

  const actionLabels = { open: 'Open raise', call: 'Call', '3bet': '3-bet', '4bet': '4-bet', limp: 'Limp' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Análisis de Historial"
        subtitle={`${hands.length} manos · ${hands.filter(h => h.aiAnalysis).length} analizadas con IA`}
        action={
          <Button
            onClick={runHistoryAnalysis}
            disabled={loading || !apiKey || hands.length < MIN_HANDS}
            title={!apiKey ? 'Configura tu API key' : hands.length < MIN_HANDS ? `Necesitas al menos ${MIN_HANDS} manos` : ''}
          >
            <IconBrain /> {loading ? 'Analizando…' : 'Análisis cruzado IA'}
          </Button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {hands.length === 0 && (
          <Empty icon="📊" message="Sin manos registradas" sub="Añade manos en la sección Manos para ver análisis" />
        )}

        {hands.length > 0 && hands.length < MIN_HANDS && (
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius)', padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--amber)' }}>
            ⚠ Necesitas al menos {MIN_HANDS} manos para el análisis cruzado. Tienes {hands.length}.
          </div>
        )}

        {/* ── Error de API ── */}
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)' }}>
            ✕ {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <Spinner label="Claude analizando tu historial completo…" />}

        {/* ── SECCIÓN 1: Métricas locales por rango ── */}
        {localStats && !loading && (
          <>
            {/* Win rate por posición */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
              <SectionTitle>Win rate por posición</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(localStats.byPos)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([pos, d]) => {
                    const wr  = d.total ? ((d.wins / d.total) * 100).toFixed(0) : 0
                    const col = wr >= 55 ? 'var(--accent)' : wr >= 45 ? 'var(--amber)' : 'var(--red)'
                    return (
                      <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', width: 36 }}>{pos}</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${wr}%`, background: col, borderRadius: 4, transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: col, width: 80, textAlign: 'right' }}>
                          {d.wins}/{d.total} ({wr}%)
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Win rate por acción preflop */}
            {Object.keys(localStats.byAction).length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <SectionTitle>Win rate por acción preflop</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                  {Object.entries(localStats.byAction).map(([action, d]) => {
                    const wr = d.total ? ((d.wins / d.total) * 100).toFixed(0) : 0
                    const col = wr >= 55 ? 'var(--accent)' : wr >= 45 ? 'var(--amber)' : 'var(--red)'
                    return (
                      <div key={action} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>{actionLabels[action] || action}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: col }}>{wr}%</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>{d.wins}/{d.total}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Heatmap de rangos */}
            {Object.keys(localStats.byRange).length > 0 && (
              <RangeHeatmapChart rangeData={localStats.byRange} />
            )}

            {/* Score trend */}
            {localStats.scoreTrend.length >= 3 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <SectionTitle>Tendencia de score IA (últimas {localStats.scoreTrend.length} manos analizadas)</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 80 }}>
                  {localStats.scoreTrend.map((p, i) => {
                    const h   = (p.score / 10) * 72
                    const col = p.score >= 7 ? 'var(--accent)' : p.score >= 5 ? 'var(--amber)' : 'var(--red)'
                    return (
                      <div key={i} title={`${p.date}: ${p.score}/10`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <div style={{ height: h, width: '100%', background: col, borderRadius: '3px 3px 0 0', opacity: 0.85, transition: 'height 0.4s' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: col }}>{p.score}</span>
                      </div>
                    )
                  })}
                </div>
                {(() => {
                  const first  = localStats.scoreTrend[0]?.score
                  const last   = localStats.scoreTrend[localStats.scoreTrend.length - 1]?.score
                  const delta  = last - first
                  const improving = delta > 0
                  if (Math.abs(delta) < 0.5) return null
                  return (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: improving ? 'var(--accent)' : 'var(--red)', marginTop: '10px' }}>
                      {improving ? '↑' : '↓'} Tu score ha {improving ? 'mejorado' : 'empeorado'} {Math.abs(delta).toFixed(1)} puntos en las últimas manos analizadas
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Errores recurrentes */}
            {Object.keys(localStats.errorCounts).length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <SectionTitle>Errores recurrentes detectados por IA</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(localStats.errorCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const maxCount = Math.max(...Object.values(localStats.errorCounts))
                      const pct = Math.round((count / maxCount) * 100)
                      return (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', width: 110 }}>{errorLabels[type] || type}</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--red)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', width: 30, textAlign: 'right' }}>{count}×</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SECCIÓN 2: Informe IA cruzado ── */}
        {report && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 'var(--radius)', padding: '14px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent)' }}><IconBrain /></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Informe de IA — Análisis cruzado
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
                {new Date(report.generatedAt).toLocaleDateString('es-ES')}
              </span>
            </div>

            {/* Resumen ejecutivo */}
            {report.executiveSummary && (
              <InfoBlock label="Resumen ejecutivo" color="var(--accent)">
                {report.executiveSummary}
              </InfoBlock>
            )}

            {/* Fugas principales */}
            {report.topLeaks?.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <SectionTitle>Fugas principales detectadas</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {report.topLeaks.map((leak, i) => (
                    <div key={i} style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderLeft: `3px solid var(--red)`, borderRadius: '0 8px 8px 0',
                      padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', fontWeight: 600 }}>
                          #{i + 1} {leak.category}
                        </span>
                        <Badge color={leak.frequency === 'alta' ? 'red' : leak.frequency === 'media' ? 'amber' : 'gray'}>
                          {leak.frequency} frecuencia
                        </Badge>
                        <Badge color="gray">{leak.estimatedLoss}</Badge>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.5 }}>{leak.description}</p>
                      {leak.fix && (
                        <div style={{ fontSize: '12px', color: 'var(--accent)', paddingLeft: '10px', borderLeft: '2px solid rgba(74,222,128,0.3)' }}>
                          💡 {leak.fix}
                        </div>
                      )}
                      {leak.exampleHands?.length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                          Ejemplos: {leak.exampleHands.join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patrones positivos */}
            {report.positivePatterns?.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <SectionTitle>Patrones positivos</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {report.positivePatterns.map((p, i) => (
                    <div key={i} style={{ fontSize: '13px', color: 'var(--text2)', paddingLeft: '12px', borderLeft: '2px solid rgba(74,222,128,0.4)', lineHeight: 1.5 }}>
                      ✓ {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plan de estudio personalizado */}
            {report.studyPlan?.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <SectionTitle>Plan de estudio personalizado</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {report.studyPlan.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: 'rgba(74,222,128,0.1)',
                        border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px',
                        color: 'var(--accent)', flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, marginBottom: '3px' }}>{item.topic}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5 }}>{item.reason}</div>
                        {item.resource && (
                          <div style={{ fontSize: '11px', color: 'var(--blue)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                            📚 {item.resource}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spots de alto impacto */}
            {report.highImpactSpots?.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <SectionTitle>Spots de alto impacto a trabajar</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {report.highImpactSpots.map((spot, i) => (
                    <div key={i} style={{
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                    }}>
                      <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500, marginBottom: '3px' }}>{spot.spot}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{spot.suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparativa con benchmark */}
            {report.benchmarkComparison && (
              <InfoBlock label="Comparativa con jugador referencia" color="var(--purple)">
                {report.benchmarkComparison}
              </InfoBlock>
            )}

          </div>
        )}

        {/* Prompt para iniciar si no hay informe */}
        {!report && !loading && hands.length >= MIN_HANDS && (
          <div style={{
            background: 'rgba(74,222,128,0.04)', border: '1px dashed rgba(74,222,128,0.2)',
            borderRadius: 'var(--radius)', padding: '28px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '28px', opacity: 0.4 }}>🧠</span>
            <p style={{ fontSize: '14px', color: 'var(--text2)', maxWidth: 400, lineHeight: 1.6 }}>
              Tienes <strong style={{ color: 'var(--accent)' }}>{hands.length} manos</strong> registradas.
              El análisis cruzado detecta patrones transversales, fugas recurrentes y genera un plan de estudio personalizado basado en tu historial real.
            </p>
            <Button onClick={runHistoryAnalysis} disabled={!apiKey}>
              <IconBrain /> Analizar mi historial con IA
            </Button>
            {!apiKey && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--amber)' }}>
                ⚠ Configura tu API key de Anthropic en Ajustes → API Key IA
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}