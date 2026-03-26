import React, { useState } from 'react'
import { useAI, ERROR_TYPES } from '../hooks/useAI.js'
import { Button, Badge, Modal } from './UI.jsx'

// ── Icono de IA ──────────────────────────────────────────────────
const IconAI = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z"/>
    <circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>
  </svg>
)

const IconSpark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

const IconBug = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2l1.5 1.5M16 2l-1.5 1.5M12 8v8M9 12H5M19 12h-4M7 6.5A4 4 0 0 0 8 14h8a4 4 0 0 0 1-7.5M9 20h6"/>
  </svg>
)

// Severity badge
function SeverityBadge({ severity }) {
  const map = { alta: 'red', media: 'amber', baja: 'blue' }
  return <Badge color={map[severity] || 'gray'}>{severity}</Badge>
}

// Score visual
function ScoreRing({ score }) {
  const color = score >= 8 ? 'var(--accent)' : score >= 5 ? 'var(--amber)' : 'var(--red)'
  const r = 22, c = 28, strokeW = 4
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 10) * circumference
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56" viewBox={`0 0 ${c * 2} ${c * 2}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border2)" strokeWidth={strokeW} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: '16px', color,
      }}>{score}</div>
    </div>
  )
}

// ── Panel de análisis de una mano ────────────────────────────────
export function AIHandAnalysis({ hand, onSaveAnalysis }) {
  const { loading, error, analyzeHand, suggestLines, detectErrors, apiKey } = useAI()
  const [tab, setTab] = useState('analyze') // analyze | suggest | errors
  const [result, setResult]   = useState(hand.aiAnalysis || null)
  const [suggest, setSuggest] = useState(hand.aiSuggest  || null)
  const [errors,  setErrors]  = useState(hand.aiErrors   || null)

  const hasKey = !!apiKey

  async function runAnalyze() {
    const r = await analyzeHand(hand)
    if (r) {
      setResult(r)
      onSaveAnalysis?.({ aiAnalysis: r })
    }
  }

  async function runSuggest() {
    const r = await suggestLines(hand)
    if (r) {
      setSuggest(r)
      onSaveAnalysis?.({ aiSuggest: r })
    }
  }

  async function runErrors() {
    const r = await detectErrors(hand)
    if (r) {
      setErrors(r)
      onSaveAnalysis?.({ aiErrors: r })
    }
  }

  const tabs = [
    { id: 'analyze', label: 'Análisis',  icon: <IconAI />,   action: runAnalyze,  data: result  },
    { id: 'suggest', label: 'Líneas',    icon: <IconSpark />, action: runSuggest,  data: suggest },
    { id: 'errors',  label: 'Errores',   icon: <IconBug />,   action: runErrors,   data: errors  },
  ]

  const currentTab = tabs.find(t => t.id === tab)

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'rgba(74,222,128,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--accent)', display: 'flex' }}><IconAI /></span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Análisis IA
          </span>
        </div>
        {!hasKey && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--amber)' }}>
            ⚠ Configura tu API key en Ajustes
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            padding: '8px', background: 'transparent',
            borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
            border: 'none', color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
            fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {t.icon} {t.label}
            {t.data && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ padding: '16px', minHeight: 160 }}>
        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '6px', padding: '10px 12px', marginBottom: '12px',
            fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)',
          }}>
            ✕ {error}
          </div>
        )}

        {tab === 'analyze' && <AnalyzePanel data={result} loading={loading} onRun={runAnalyze} hasKey={hasKey} />}
        {tab === 'suggest' && <SuggestPanel data={suggest} loading={loading} onRun={runSuggest} hasKey={hasKey} />}
        {tab === 'errors'  && <ErrorsPanel  data={errors}  loading={loading} onRun={runErrors}  hasKey={hasKey} />}
      </div>
    </div>
  )
}

// ── Análisis completo ─────────────────────────────────────────────
function AnalyzePanel({ data, loading, onRun, hasKey }) {
  if (loading) return <Spinner label="Analizando la mano…" />
  if (!data) return (
    <EmptyPanel
      icon="🔍"
      label="Analizar esta mano"
      description="Claude analizará la situación, evaluará tu juego del 1 al 10 y explicará qué hiciste bien y qué mejorar."
      onRun={onRun}
      hasKey={hasKey}
    />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Score + resumen */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <ScoreRing score={data.score || 5} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '4px' }}>{data.summary}</p>
          {data.scoreReason && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{data.scoreReason}</p>}
        </div>
      </div>

      {/* Línea sugerida */}
      {data.suggestedLine && (
        <InfoBlock label="Línea óptima" color="var(--accent)">
          {data.suggestedLine}
        </InfoBlock>
      )}

      {/* Errores */}
      {data.errors?.length > 0 && (
        <div>
          <SectionLabel>Errores detectados</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.errors.map((e, i) => <Badge key={i} color="red">{e}</Badge>)}
          </div>
        </div>
      )}

      {/* Conceptos */}
      {data.keyConceptsApplied?.length > 0 && (
        <div>
          <SectionLabel>Conceptos aplicados</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.keyConceptsApplied.map((c, i) => <Badge key={i} color="blue">{c}</Badge>)}
          </div>
        </div>
      )}

      {/* Líneas alternativas */}
      {data.alternativeLines?.length > 0 && (
        <div>
          <SectionLabel>Alternativas</SectionLabel>
          {data.alternativeLines.map((l, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px', paddingLeft: '10px', borderLeft: '2px solid var(--border2)' }}>
              {l}
            </div>
          ))}
        </div>
      )}

      <RerunButton onRun={onRun} label="Re-analizar" />
    </div>
  )
}

// ── Sugerencias de líneas ─────────────────────────────────────────
function SuggestPanel({ data, loading, onRun, hasKey }) {
  if (loading) return <Spinner label="Calculando líneas de juego…" />
  if (!data) return (
    <EmptyPanel
      icon="⚡"
      label="Sugerir líneas de juego"
      description="Claude calculará las mejores acciones posibles ordenadas por EV y explicará el razonamiento GTO vs exploitative."
      onRun={onRun}
      hasKey={hasKey}
    />
  )

  const evColor = { alto: 'var(--accent)', medio: 'var(--amber)', bajo: 'var(--text3)', negativo: 'var(--red)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {data.recommended && (
        <InfoBlock label="Recomendado" color="var(--accent)">
          {data.recommended}
        </InfoBlock>
      )}

      {data.lines?.map((line, i) => (
        <div key={i} style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: '7px', padding: '12px 14px',
          borderLeft: `3px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>
              {i + 1}. {line.action}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: evColor[line.ev] || 'var(--text3)' }}>
              EV {line.ev}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>{line.reason}</p>
        </div>
      ))}

      {data.gtoNote && (
        <InfoBlock label="Nota GTO" color="var(--purple)">
          {data.gtoNote}
        </InfoBlock>
      )}

      <RerunButton onRun={onRun} label="Recalcular líneas" />
    </div>
  )
}

// ── Detección de errores ──────────────────────────────────────────
function ErrorsPanel({ data, loading, onRun, hasKey }) {
  if (loading) return <Spinner label="Detectando errores…" />
  if (!data) return (
    <EmptyPanel
      icon="🐛"
      label="Detectar errores"
      description="Claude identificará los errores concretos, su severidad y cómo corregirlos en futuras manos similares."
      onRun={onRun}
      hasKey={hasKey}
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {data.errorsFound?.length === 0
        ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            ✓ No se detectaron errores claros en esta mano
          </div>
        )
        : data.errorsFound?.map((e, i) => (
          <div key={i} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: '7px', padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge color="gray">{ERROR_TYPES[e.type] || e.type}</Badge>
              <SeverityBadge severity={e.severity} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '6px', lineHeight: 1.5 }}>{e.description}</p>
            {e.fix && (
              <div style={{
                fontSize: '12px', color: 'var(--accent)',
                paddingLeft: '10px', borderLeft: '2px solid rgba(74,222,128,0.3)',
              }}>
                💡 {e.fix}
              </div>
            )}
          </div>
        ))
      }

      {data.patternWarning && (
        <InfoBlock label="⚠ Patrón detectado" color="var(--amber)">
          {data.patternWarning}
        </InfoBlock>
      )}

      {data.positiveAspects?.length > 0 && (
        <div>
          <SectionLabel>Aspectos positivos</SectionLabel>
          {data.positiveAspects.map((p, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px', paddingLeft: '10px', borderLeft: '2px solid rgba(74,222,128,0.3)' }}>
              ✓ {p}
            </div>
          ))}
        </div>
      )}

      <RerunButton onRun={onRun} label="Volver a detectar" />
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '30px' }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        border: '2px solid var(--border2)', borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{label}</span>
    </div>
  )
}

function EmptyPanel({ icon, label, description, onRun, hasKey }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px', textAlign: 'center' }}>
      <span style={{ fontSize: '24px', opacity: 0.4 }}>{icon}</span>
      <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>{description}</p>
      <Button onClick={onRun} disabled={!hasKey} size="sm">
        <IconAI /> {label}
      </Button>
    </div>
  )
}

function InfoBlock({ label, color, children }) {
  return (
    <div style={{
      background: 'var(--bg2)', borderLeft: `3px solid ${color}`,
      borderRadius: '0 6px 6px 0', padding: '10px 12px',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
      <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{children}</p>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
      {children}
    </div>
  )
}

function RerunButton({ onRun, label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
      <Button variant="ghost" size="sm" onClick={onRun} style={{ fontSize: '11px', color: 'var(--text3)' }}>
        ↺ {label}
      </Button>
    </div>
  )
}

// ── Modal de configuración de API key ────────────────────────────
export function APIKeyModal({ open, onClose }) {
  const { apiKey, saveApiKey } = useAI()
  const [draft, setDraft] = useState(apiKey)

  function save() {
    saveApiKey(draft.trim())
    onClose()
  }

  return (
    <Modal title="Configurar API de IA" open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)',
          borderRadius: '8px', padding: '12px 14px',
          fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: 1.7,
        }}>
          <div style={{ color: 'var(--accent)', marginBottom: '6px', fontWeight: 600 }}>¿Cómo obtener tu API key?</div>
          1. Ve a <strong style={{ color: 'var(--accent)' }}>console.anthropic.com</strong><br />
          2. Crea una cuenta o inicia sesión<br />
          3. Ve a "API Keys" y crea una nueva clave<br />
          4. Pégala aquí — se guarda solo en tu dispositivo
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            API Key de Anthropic
          </div>
          <input
            type="password"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{
              width: '100%', background: 'var(--bg2)',
              border: '1px solid var(--border2)', borderRadius: '7px',
              color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '12px',
              padding: '10px 12px', outline: 'none',
            }}
            onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e   => e.target.style.borderColor = 'var(--border2)'}
          />
        </div>

        {draft && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: draft.startsWith('sk-ant') ? 'var(--accent)' : 'var(--amber)',
          }}>
            {draft.startsWith('sk-ant') ? '✓ Formato de clave correcto' : '⚠ Las claves de Anthropic empiezan por sk-ant-'}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!draft.trim()}>Guardar clave</Button>
        </div>
      </div>
    </Modal>
  )
}