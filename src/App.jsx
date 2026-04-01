import React, { useState, useEffect, createContext, useContext } from 'react'
import Dashboard  from './pages/Dashboard.jsx'
import Manos      from './pages/Manos.jsx'
import Sesiones   from './pages/Sesiones.jsx'
import Flashcards from './pages/Flashcards.jsx'
import Analisis   from './pages/Analisis.jsx'
import Importar   from './pages/Importar.jsx'
import StudyPlan  from './pages/StudyPlan.jsx'
import { APIKeyModal } from './components/AIAnalysis.jsx'

export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

const INITIAL_DATA = {
  hands:         [],
  sessions:      [],
  flashcards:    { cards: [], sm2: {} },
  historyReport: null,
  studyPlan:     null,
}

const IconGrid = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IconCards = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="2" y="5" width="14" height="18" rx="2"/>
    <path d="M6 2h14a2 2 0 0 1 2 2v14"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
)
const IconFlash = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)
const IconBrain = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2"/>
  </svg>
)
const IconImport = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconBook = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)
const IconSpade = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8 6 3 8 3 12a4 4 0 0 0 7 2.6C9.5 16 9 18 8 20h8c-1-2-1.5-4-2-5.4A4 4 0 0 0 21 12c0-4-5-6-9-10z"/>
  </svg>
)

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      width: '100%', padding: '9px 12px',
      background: active ? 'rgba(74,222,128,0.1)' : 'transparent',
      border: `1px solid ${active ? 'rgba(74,222,128,0.25)' : 'transparent'}`,
      borderRadius: 'var(--radius-sm)',
      color: active ? 'var(--accent)' : 'var(--text2)',
      fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: active ? 500 : 400,
      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
      marginBottom: '2px',
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
    >
      <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}

function Sidebar({ page, setPage, stats }) {
  const [apiKeyOpen, setApiKeyOpen] = useState(false)

  const navItems = [
    { id: 'dashboard',  icon: <IconGrid />,     label: 'Dashboard'   },
    { id: 'manos',     icon: <IconCards />,    label: 'Manos'       },
    { id: 'sesiones',  icon: <IconCalendar />, label: 'Sesiones'    },
    { id: 'flashcards',icon: <IconFlash />,    label: 'Flashcards'  },
    { id: 'studyplan', icon: <IconBook />,     label: 'Plan estudios' },
    { id: 'analisis',  icon: <IconBrain />,    label: 'Análisis IA' },
    { id: 'importar',  icon: <IconImport />,  label: 'Importar'    },
  ]

  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: 'var(--accent)', display: 'flex' }}><IconSpade /></span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text)', lineHeight: 1.1 }}>
            Poker Tracker
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>
            v1.0.0
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 4px', marginBottom: '8px' }}>
          Menú
        </div>
        {navItems.map(item => (
          <NavItem key={item.id} {...item} active={page === item.id} onClick={() => setPage(item.id)} />
        ))}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 4px', margin: '16px 0 8px' }}>
          Ajustes
        </div>
        <NavItem
          icon={<span style={{ fontSize: '14px' }}>🤖</span>}
          label="API Key IA"
          active={false}
          onClick={() => setApiKeyOpen(true)}
        />
      </nav>

      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <StatRow label="Manos registradas" value={stats.hands} />
        <StatRow label="Sesiones totales"  value={stats.sessions} />
        <StatRow
          label="Resultado neto"
          value={`${stats.netResult >= 0 ? '+' : ''}${stats.netResult.toFixed(0)}€`}
          valueColor={stats.netResult >= 0 ? 'var(--accent)' : 'var(--red)'}
        />
      </div>

      <APIKeyModal open={apiKeyOpen} onClose={() => setApiKeyOpen(false)} />
    </aside>
  )
}

function StatRow({ label, value, valueColor = 'var(--text)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: valueColor }}>{value}</span>
    </div>
  )
}

export default function App() {
  const [page, setPage]   = useState('dashboard')
  const [data, setData]   = useState(INITIAL_DATA)
  const [ready, setReady] = useState(false)
  const [isReplayerWindow, setIsReplayerWindow] = useState(false)
  const [ReplayerComponent, setReplayerComponent] = useState(null)

  useEffect(() => {
    const hash = window.location.hash
    setIsReplayerWindow(hash === '#/replayer-window')
    if (hash === '#/replayer-window') {
      import('./ReplayerWindow.jsx').then(m => setReplayerComponent(() => m.default))
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        if (window.electronAPI) {
          const saved = await window.electronAPI.loadData()
          if (saved && typeof saved === 'object') {
            setData({
              ...INITIAL_DATA,
              ...saved,
              flashcards: {
                ...INITIAL_DATA.flashcards,
                ...(saved.flashcards || {}),
                sm2: { ...(saved.flashcards?.sm2 || {}) },
              },
            })
          }
        }
      } catch (e) {
        console.warn('Sin Electron API — modo web', e)
      } finally {
        setReady(true)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (window.electronAPI) window.electronAPI.saveData(data).catch(console.warn)
  }, [data, ready])

  const stats = {
    hands:     data.hands.length,
    sessions:  data.sessions.length,
    netResult: data.sessions.reduce((acc, s) => acc + ((s.cashOut || 0) - (s.buyIn || 0)), 0),
  }

  const PAGES = {
    dashboard:  Dashboard,
    manos:      Manos,
    sesiones:   Sesiones,
    flashcards: Flashcards,
    studyplan:  StudyPlan,
    analisis:   Analisis,
    importar:   Importar,
  }
  const PageComponent = PAGES[page] || Dashboard

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text3)' }}>Cargando…</span>
      </div>
    )
  }

  if (isReplayerWindow && ReplayerComponent) {
    return <ReplayerComponent />
  }

  if (isReplayerWindow && !ReplayerComponent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#94a3b8', fontFamily: 'monospace' }}>
        Cargando replayer...
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ data, setData }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        <Sidebar page={page} setPage={setPage} stats={stats} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <PageComponent />
        </main>
      </div>
    </AppContext.Provider>
  )
}
