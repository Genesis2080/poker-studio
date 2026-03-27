import React, { useState, useEffect } from 'react'
import { useAI, ERROR_TYPES, AI_PROVIDERS, testOllamaConnection } from '../hooks/useAI.js'
import { Button, Badge, Modal } from './UI.jsx'

// ── Iconos ────────────────────────────────────────────────────────
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

// ── Severity badge ────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const map = { alta: 'red', media: 'amber', baja: 'blue' }
  return <Badge color={map[severity] || 'gray'}>{severity}</Badge>
}

// ── Score ring ────────────────────────────────────────────────────
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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '16px', color }}>
        {score}
      </div>
    </div>
  )
}

// ── Panel de análisis de una mano ─────────────────────────────────
export function AIHandAnalysis({ hand, onSaveAnalysis }) {
  const { loading, error, analyzeHand, suggestLines, detectErrors, isConfigured, provider } = useAI()
  const [tab,    setTab]    = useState('analyze')
  const [result, setResult] = useState(hand.aiAnalysis || null)
  const [suggest,setSuggest]= useState(hand.aiSuggest  || null)
  const [errors, setErrors] = useState(hand.aiErrors   || null)

  async function runAnalyze() {
    const r = await analyzeHand(hand)
    if (r) { setResult(r); onSaveAnalysis?.({ aiAnalysis: r }) }
  }
  async function runSuggest() {
    const r = await suggestLines(hand)
    if (r) { setSuggest(r); onSaveAnalysis?.({ aiSuggest: r }) }
  }
  async function runErrors() {
    const r = await detectErrors(hand)
    if (r) { setErrors(r); onSaveAnalysis?.({ aiErrors: r }) }
  }

  const tabs = [
    { id: 'analyze', label: 'Análisis', icon: <IconAI />,   action: runAnalyze,  data: result  },
    { id: 'suggest', label: 'Líneas',   icon: <IconSpark />, action: runSuggest,  data: suggest },
    { id: 'errors',  label: 'Errores',  icon: <IconBug />,   action: runErrors,   data: errors  },
  ]

  // Badge del proveedor activo
  const providerBadge = provider === 'ollama'
    ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--blue)', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '4px', padding: '1px 6px' }}>Ollama</span>
    : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '4px', padding: '1px 6px' }}>Claude</span>

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(74,222,128,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--accent)', display: 'flex' }}><IconAI /></span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Análisis IA</span>
          {providerBadge}
        </div>
        {!isConfigured && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--amber)' }}>
            ⚠ Configura el proveedor en Ajustes
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
            fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {t.icon} {t.label}
            {t.data && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ padding: '16px', minHeight: 160 }}>
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)' }}>
            ✕ {error}
          </div>
        )}
        {tab === 'analyze' && <AnalyzePanel data={result} loading={loading} onRun={runAnalyze} ready={isConfigured} />}
        {tab === 'suggest' && <SuggestPanel data={suggest} loading={loading} onRun={runSuggest} ready={isConfigured} />}
        {tab === 'errors'  && <ErrorsPanel  data={errors}  loading={loading} onRun={runErrors}  ready={isConfigured} />}
      </div>
    </div>
  )
}

// ── Panels ────────────────────────────────────────────────────────
function AnalyzePanel({ data, loading, onRun, ready }) {
  if (loading) return <Spinner label="Analizando la mano…" />
  if (!data) return <EmptyPanel icon="🔍" label="Analizar esta mano" description="El modelo analizará la situación, evaluará tu juego del 1 al 10 y explicará qué mejorar." onRun={onRun} ready={ready} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <ScoreRing score={data.score || 5} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '4px' }}>{data.summary}</p>
          {data.scoreReason && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{data.scoreReason}</p>}
        </div>
      </div>
      {data.suggestedLine && <InfoBlock label="Línea óptima" color="var(--accent)">{data.suggestedLine}</InfoBlock>}
      {data.errors?.length > 0 && (
        <div>
          <SectionLabel>Errores detectados</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.errors.map((e, i) => <Badge key={i} color="red">{e}</Badge>)}
          </div>
        </div>
      )}
      {data.keyConceptsApplied?.length > 0 && (
        <div>
          <SectionLabel>Conceptos aplicados</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.keyConceptsApplied.map((c, i) => <Badge key={i} color="blue">{c}</Badge>)}
          </div>
        </div>
      )}
      {data.alternativeLines?.length > 0 && (
        <div>
          <SectionLabel>Alternativas</SectionLabel>
          {data.alternativeLines.map((l, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px', paddingLeft: '10px', borderLeft: '2px solid var(--border2)', lineHeight: 1.5 }}>{l}</div>
          ))}
        </div>
      )}
      <RerunButton onRun={onRun} label="Re-analizar" />
    </div>
  )
}

function SuggestPanel({ data, loading, onRun, ready }) {
  if (loading) return <Spinner label="Calculando líneas de juego…" />
  if (!data) return <EmptyPanel icon="⚡" label="Sugerir líneas" description="El modelo calculará las mejores acciones ordenadas por EV con nota GTO vs exploitative." onRun={onRun} ready={ready} />
  const evColor = { alto: 'var(--accent)', medio: 'var(--amber)', bajo: 'var(--text3)', negativo: 'var(--red)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {data.recommended && <InfoBlock label="Recomendado" color="var(--accent)">{data.recommended}</InfoBlock>}
      {data.lines?.map((line, i) => (
        <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '12px 14px', borderLeft: `3px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{i + 1}. {line.action}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: evColor[line.ev] || 'var(--text3)' }}>EV {line.ev}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>{line.reason}</p>
        </div>
      ))}
      {data.gtoNote && <InfoBlock label="Nota GTO" color="var(--purple)">{data.gtoNote}</InfoBlock>}
      <RerunButton onRun={onRun} label="Recalcular" />
    </div>
  )
}

function ErrorsPanel({ data, loading, onRun, ready }) {
  if (loading) return <Spinner label="Detectando errores…" />
  if (!data) return <EmptyPanel icon="🐛" label="Detectar errores" description="El modelo identificará los errores concretos, su severidad y cómo corregirlos." onRun={onRun} ready={ready} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {!data.errorsFound?.length
        ? <div style={{ textAlign: 'center', padding: '20px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>✓ No se detectaron errores claros</div>
        : data.errorsFound.map((e, i) => (
          <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Badge color="gray">{ERROR_TYPES[e.type] || e.type}</Badge>
              <SeverityBadge severity={e.severity} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '6px', lineHeight: 1.5 }}>{e.description}</p>
            {e.fix && <div style={{ fontSize: '12px', color: 'var(--accent)', paddingLeft: '10px', borderLeft: '2px solid rgba(74,222,128,0.3)' }}>💡 {e.fix}</div>}
          </div>
        ))
      }
      {data.patternWarning && <InfoBlock label="⚠ Patrón detectado" color="var(--amber)">{data.patternWarning}</InfoBlock>}
      {data.positiveAspects?.length > 0 && (
        <div>
          <SectionLabel>Aspectos positivos</SectionLabel>
          {data.positiveAspects.map((p, i) => (
            <div key={i} style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '4px', paddingLeft: '10px', borderLeft: '2px solid rgba(74,222,128,0.3)', lineHeight: 1.5 }}>✓ {p}</div>
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
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{label}</span>
    </div>
  )
}

function EmptyPanel({ icon, label, description, onRun, ready }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px', textAlign: 'center' }}>
      <span style={{ fontSize: '24px', opacity: 0.4 }}>{icon}</span>
      <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>{description}</p>
      <Button onClick={onRun} disabled={!ready} size="sm"><IconAI /> {label}</Button>
    </div>
  )
}

function InfoBlock({ label, color = 'var(--accent)', children }) {
  return (
    <div style={{ background: 'var(--bg2)', borderLeft: `3px solid ${color}`, borderRadius: '0 6px 6px 0', padding: '10px 12px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{label}</div>
      <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{children}</p>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{children}</div>
}

function RerunButton({ onRun, label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
      <Button variant="ghost" size="sm" onClick={onRun} style={{ fontSize: '11px', color: 'var(--text3)' }}>↺ {label}</Button>
    </div>
  )
}

// ── AISettingsModal — selector de proveedor + configuración ───────
export function APIKeyModal({ open, onClose }) {
  const {
    provider, saveProvider,
    apiKey,   saveApiKey,
    ollamaUrl, saveOllamaUrl,
    ollamaModel, saveOllamaModel,
  } = useAI()

  const [draftProvider,    setDraftProvider]    = useState(provider)
  const [draftApiKey,      setDraftApiKey]      = useState(apiKey)
  const [draftOllamaUrl,   setDraftOllamaUrl]   = useState(ollamaUrl)
  const [draftOllamaModel, setDraftOllamaModel] = useState(ollamaModel)

  const [testStatus, setTestStatus] = useState(null) // null | 'testing' | { ok, message, models }

  // Sincronizar drafts cuando se abre el modal
  useEffect(() => {
    if (open) {
      setDraftProvider(provider)
      setDraftApiKey(apiKey)
      setDraftOllamaUrl(ollamaUrl)
      setDraftOllamaModel(ollamaModel)
      setTestStatus(null)
    }
  }, [open])

  async function handleTest() {
    setTestStatus('testing')
    const result = await testOllamaConnection(draftOllamaUrl, draftOllamaModel)
    setTestStatus(result)
  }

  function handleSave() {
    saveProvider(draftProvider)
    saveApiKey(draftApiKey.trim())
    saveOllamaUrl(draftOllamaUrl.trim() || 'http://localhost:11434')
    saveOllamaModel(draftOllamaModel.trim() || 'llama3')
    setTestStatus(null)
    onClose()
  }

  const fieldStyle = {
    width: '100%', background: 'var(--bg2)',
    border: '1px solid var(--border2)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '12px',
    padding: '9px 12px', outline: 'none', transition: 'border-color 0.15s',
  }

  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', display: 'block',
  }

  return (
    <Modal title="Configuración del proveedor de IA" open={open} onClose={onClose} width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Selector de proveedor ── */}
        <div>
          <span style={labelStyle}>Proveedor activo</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.entries(AI_PROVIDERS).map(([id, info]) => (
              <div
                key={id}
                onClick={() => { setDraftProvider(id); setTestStatus(null) }}
                style={{
                  padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: draftProvider === id ? 'rgba(74,222,128,0.08)' : 'var(--surface2)',
                  border: `2px solid ${draftProvider === id ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: draftProvider === id ? 'var(--accent)' : 'var(--border2)',
                    border: `2px solid ${draftProvider === id ? 'var(--accent)' : 'var(--border2)'}`,
                    transition: 'all 0.15s', flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: draftProvider === id ? 'var(--accent)' : 'var(--text)' }}>
                    {info.label}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.4, marginLeft: 18 }}>
                  {info.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Config Anthropic ── */}
        {draftProvider === 'anthropic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '8px', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: 1.7 }}>
              <div style={{ color: 'var(--accent)', marginBottom: '4px', fontWeight: 600 }}>Cómo obtener tu API key</div>
              1. Ve a <strong style={{ color: 'var(--accent)' }}>console.anthropic.com</strong><br />
              2. Crea una cuenta o inicia sesión<br />
              3. Ve a "API Keys" → "Create Key"<br />
              4. Copia y pégala aquí
            </div>
            <div>
              <label style={labelStyle}>API Key de Anthropic</label>
              <input
                type="password" value={draftApiKey}
                onChange={e => setDraftApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
              />
              {draftApiKey && (
                <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: draftApiKey.startsWith('sk-ant') ? 'var(--accent)' : 'var(--amber)' }}>
                  {draftApiKey.startsWith('sk-ant') ? '✓ Formato correcto' : '⚠ Las claves de Anthropic empiezan por sk-ant-'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Config Ollama ── */}
        {draftProvider === 'ollama' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: '8px', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: 1.7 }}>
              <div style={{ color: 'var(--blue)', marginBottom: '4px', fontWeight: 600 }}>Configuración de Ollama</div>
              Ollama debe estar ejecutándose localmente.<br />
              Si no está activo, ábrelo con: <strong style={{ color: 'var(--blue)' }}>ollama serve</strong>
            </div>

            <div>
              <label style={labelStyle}>URL de Ollama</label>
              <input
                type="text" value={draftOllamaUrl}
                onChange={e => { setDraftOllamaUrl(e.target.value); setTestStatus(null) }}
                placeholder="http://localhost:11434"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                Deja el valor por defecto si usas Ollama localmente
              </div>
            </div>

            <div>
              <label style={labelStyle}>Modelo</label>
              <input
                type="text" value={draftOllamaModel}
                onChange={e => { setDraftOllamaModel(e.target.value); setTestStatus(null) }}
                placeholder="llama3"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>
                Usa el nombre exacto del modelo instalado (ej: llama3, llama3:8b, mistral, gemma3)
              </div>
            </div>

            {/* Botón de test */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                variant="secondary" size="sm"
                onClick={handleTest}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' ? '⟳ Probando…' : '⚡ Probar conexión'}
              </Button>

              {testStatus && testStatus !== 'testing' && (
                <div style={{
                  flex: 1, padding: '7px 10px', borderRadius: '6px',
                  fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.4,
                  background: testStatus.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${testStatus.ok ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                  color: testStatus.ok ? 'var(--accent)' : 'var(--red)',
                }}>
                  {testStatus.ok ? '✓ ' : '✕ '}{testStatus.message}
                  {/* Lista de modelos disponibles si el test fue exitoso */}
                  {testStatus.ok && testStatus.models?.length > 1 && (
                    <div style={{ color: 'var(--text3)', marginTop: '4px' }}>
                      Otros modelos: {testStatus.models.filter(m => !m.startsWith(draftOllamaModel.split(':')[0])).slice(0, 4).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instrucciones rápidas */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', lineHeight: 1.8 }}>
              <div style={{ color: 'var(--text2)', marginBottom: '4px' }}>Comandos útiles en terminal:</div>
              <div style={{ color: 'var(--blue)' }}>ollama serve</div>
              <div style={{ color: 'var(--text3)', marginLeft: 12, marginBottom: 4 }}>→ Arranca el servidor de Ollama</div>
              <div style={{ color: 'var(--blue)' }}>ollama list</div>
              <div style={{ color: 'var(--text3)', marginLeft: 12, marginBottom: 4 }}>→ Ver modelos instalados</div>
              <div style={{ color: 'var(--blue)' }}>ollama pull llama3</div>
              <div style={{ color: 'var(--text3)', marginLeft: 12 }}>→ Instalar el modelo llama3</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar configuración</Button>
        </div>
      </div>
    </Modal>
  )
}