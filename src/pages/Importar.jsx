import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Empty } from '../components/UI.jsx'

// ── Utilidades ────────────────────────────────────────────────────
function fmt(n) { return (n ?? 0).toLocaleString('es-ES') }
function fmtTime(ms) {
  if (!ms) return '—'
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60)  return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s/60)}min`
  return `hace ${Math.floor(s/3600)}h`
}

// ── Indicador de estado ───────────────────────────────────────────
function StatusDot({ active }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:10, height:10, flexShrink:0 }}>
      {active && (
        <span style={{
          position:'absolute', inset:0, borderRadius:'50%',
          background:'var(--accent)', opacity:0.5,
          animation:'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
        }}/>
      )}
      <style>{`@keyframes ping { 75%,100% { transform:scale(1.8); opacity:0 } }`}</style>
      <span style={{
        position:'relative', width:10, height:10, borderRadius:'50%',
        background: active ? 'var(--accent)' : 'var(--text3)',
        display:'inline-block',
      }}/>
    </span>
  )
}

// ── KPI card pequeña ──────────────────────────────────────────────
function MiniKpi({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius)', padding:'14px 18px',
    }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:24, color }}>{value}</div>
    </div>
  )
}

// ── Log de eventos ────────────────────────────────────────────────
function EventLog({ events }) {
  if (!events.length) return (
    <div style={{ padding:'20px', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)' }}>
      Sin eventos aún — el log aparecerá aquí cuando se detecten manos
    </div>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {events.slice().reverse().map((ev, i) => (
        <div key={i} style={{
          display:'flex', gap:10, alignItems:'flex-start',
          fontFamily:'var(--font-mono)', fontSize:11,
          padding:'6px 8px', borderRadius:5,
          background: ev.type === 'error' ? 'rgba(248,113,113,0.06)' : 'var(--surface2)',
          border: `1px solid ${ev.type === 'error' ? 'rgba(248,113,113,0.15)' : 'var(--border)'}`,
        }}>
          <span style={{
            color: ev.type === 'success' ? 'var(--accent)' : ev.type === 'error' ? 'var(--red)' : 'var(--text3)',
            flexShrink: 0,
          }}>
            {ev.type === 'success' ? '✓' : ev.type === 'error' ? '✕' : '·'}
          </span>
          <span style={{ color: ev.type === 'error' ? 'var(--red)' : 'var(--text2)', flex:1 }}>{ev.message}</span>
          <span style={{ color:'var(--text3)', flexShrink:0, fontSize:10 }}>{ev.time}</span>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function Importar() {
  const { data, setData } = useApp()

  const [running,    setRunning]    = useState(false)
  const [hhFolder,   setHhFolder]   = useState('')
  const [dbStats,    setDbStats]    = useState(null)
  const [sessionStats, setSessionStats] = useState(null)
  const [events,     setEvents]     = useState([])
  const [syncing,    setSyncing]    = useState(false)
  const [lastSync,   setLastSync]   = useState(null)
  const [hasElectron]= useState(() => !!window.electronAPI?.hhStart)

  const addEvent = useCallback((type, message) => {
    const time = new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    setEvents(prev => [...prev.slice(-99), { type, message, time }])
  }, [])

  // ── Cargar config y estado inicial ───────────────────────────────
  useEffect(() => {
    if (!hasElectron) return

    async function init() {
      const cfg = await window.electronAPI.hhGetConfig().catch(() => ({}))
      if (cfg.hhFolder) setHhFolder(cfg.hhFolder)
      else if (cfg.defaultPath) setHhFolder(cfg.defaultPath)

      const stats = await window.electronAPI.hhGetStats().catch(() => null)
      if (stats) {
        setRunning(stats.isRunning)
        setDbStats(stats.db)
        setSessionStats(stats.session)
      }
    }
    init()
  }, [hasElectron])

  // ── Suscribirse a eventos push de Electron ────────────────────────
  useEffect(() => {
    if (!hasElectron) return

    const cleanHandsImported = window.electronAPI.onHandsImported(({ hands, count, filePath, stats }) => {
      addEvent('success', `${count} mano${count !== 1 ? 's' : ''} nuevas de ${filePath}`)
      setSessionStats(stats)
      // Actualizar stats de DB
      window.electronAPI.hhGetStats().then(s => s && setDbStats(s.db))
    })

    const cleanStatus = window.electronAPI.onHHStatus(({ running: r, stats }) => {
      setRunning(r)
      if (stats) setSessionStats(stats)
    })

    const cleanReady = window.electronAPI.onHHReady(({ watchPath, dbStats: dbs }) => {
      addEvent('info', `Monitoreando: ${watchPath}`)
      if (dbs) setDbStats(dbs)
    })

    const cleanError = window.electronAPI.onHHError(({ message }) => {
      addEvent('error', message)
    })

    return () => {
      cleanHandsImported?.()
      cleanStatus?.()
      cleanReady?.()
      cleanError?.()
    }
  }, [hasElectron, addEvent])

  // ── Acciones ──────────────────────────────────────────────────────
  async function handleStart() {
    if (!hasElectron) return
    const res = await window.electronAPI.hhStart(hhFolder || null)
    if (res.ok) {
      setRunning(true)
      setHhFolder(res.folder)
      addEvent('success', `Watcher iniciado en: ${res.folder}`)
    } else {
      addEvent('error', res.error)
    }
  }

  async function handleStop() {
    if (!hasElectron) return
    await window.electronAPI.hhStop()
    setRunning(false)
    addEvent('info', 'Watcher detenido')
  }

  async function handleBrowse() {
    if (!hasElectron) return
    const res = await window.electronAPI.hhBrowseFolder()
    if (!res.canceled && res.folder) {
      setHhFolder(res.folder)
      addEvent('info', `Carpeta seleccionada: ${res.folder}`)
    }
  }

  async function handleSync() {
    if (!hasElectron) return
    setSyncing(true)
    try {
      const res = await window.electronAPI.hhSyncToApp(500)
      if (res.ok) {
        if (res.added > 0) {
          const freshData = await window.electronAPI.loadData()
          if (freshData) setData(prev => ({ ...prev, hands: freshData.hands || prev.hands }))
          addEvent('success', `${res.added} mano${res.added !== 1 ? 's' : ''} sincronizadas con la app`)
        } else {
          addEvent('info', 'No hay manos nuevas para sincronizar')
        }
        setLastSync(Date.now())
        const stats = await window.electronAPI.hhGetStats()
        if (stats) setDbStats(stats.db)
      }
    } catch (e) {
      addEvent('error', `Error al sincronizar: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleDebug() {
    if (!hasElectron || !hhFolder) {
      addEvent('error', 'Selecciona primero la carpeta HandHistory')
      return
    }
    // Buscar el primer .txt en la carpeta para diagnosticarlo
    try {
      addEvent('info', `Analizando archivos en: ${hhFolder}`)
      // Intentar con un archivo de muestra seleccionado por el usuario
      const res = await window.electronAPI.hhBrowseFolder()
      if (res.canceled) return
      // El browse devuelve carpeta — buscar subcarpeta con txt
      const result = await window.electronAPI.hhDebugFile
        ? await window.electronAPI.hhDebugFile(res.folder)
        : { ok: false, error: 'Diagnóstico no disponible en esta versión' }

      if (result.ok) {
        addEvent('success', `Archivo: ${result.fileSize} bytes · Encoding: ${result.encoding} · ${result.handsFound} manos encontradas`)
        if (result.firstHand) {
          addEvent('info', `Primera mano: ${result.firstHand.date} · ${result.firstHand.position} · ${result.firstHand.result} · ${result.firstHand.heroHand || 'sin cartas'}`)
        } else if (result.handsFound === 0) {
          addEvent('error', `No se encontraron manos. Muestra del archivo: ${result.rawSample?.slice(0,100)}`)
        }
      } else {
        addEvent('error', `Diagnóstico: ${result.error}`)
      }
    } catch (e) {
      addEvent('error', `Error diagnóstico: ${e.message}`)
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  if (!hasElectron) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
        <PageHeader title="Importar" subtitle="Hand History de PokerStars"/>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
          <Empty
            icon="🖥️"
            message="Solo disponible en la app de escritorio"
            sub="Esta función requiere acceso al sistema de archivos local (Electron)"
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <PageHeader
        title="Importar"
        subtitle={`Hand History de PokerStars · ${fmt(dbStats?.total)} manos en base de datos`}
        action={
          <div style={{ display:'flex', gap:8 }}>
            {running
              ? <Button variant="danger" onClick={handleStop}>⏹ Detener</Button>
              : <Button onClick={handleStart}>▶ Iniciar watcher</Button>
            }
            <Button
              variant="secondary"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? '⟳ Sincronizando…' : `↓ Sync a app${dbStats?.unsynced ? ` (${fmt(dbStats.unsynced)})` : ''}`}
            </Button>
            <Button variant="secondary" onClick={handleDebug} title="Diagnóstico: analizar un archivo .txt">
              🔍 Diagnóstico
            </Button>
          </div>
        }
      />

      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Estado del watcher ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:14,
          background: running ? 'rgba(74,222,128,0.06)' : 'var(--surface)',
          border:`1px solid ${running ? 'rgba(74,222,128,0.2)' : 'var(--border)'}`,
          borderRadius:'var(--radius)', padding:'16px 20px',
        }}>
          <StatusDot active={running}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-body)', fontSize:14, color:'var(--text)', marginBottom:3 }}>
              {running ? 'Watcher activo — monitoreando cambios en tiempo real' : 'Watcher detenido'}
            </div>
            {hhFolder && (
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)' }}>
                {hhFolder}
              </div>
            )}
          </div>
          {lastSync && (
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', flexShrink:0 }}>
              Última sync: {fmtTime(lastSync)}
            </div>
          )}
        </div>

        {/* ── Selección de carpeta ── */}
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius)', padding:'18px 20px',
        }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
            Carpeta HandHistory
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input
              value={hhFolder}
              onChange={e => setHhFolder(e.target.value)}
              placeholder="Ruta a la carpeta HandHistory de PokerStars…"
              style={{
                flex:1, background:'var(--bg2)', border:'1px solid var(--border2)',
                borderRadius:7, color:'var(--text)', fontFamily:'var(--font-mono)',
                fontSize:12, padding:'9px 12px', outline:'none',
              }}
              onFocus={e  => e.target.style.borderColor='var(--accent)'}
              onBlur={e   => e.target.style.borderColor='var(--border2)'}
            />
            <Button variant="secondary" onClick={handleBrowse}>📂 Examinar</Button>
          </div>
          <div style={{ marginTop:8, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', lineHeight:1.7 }}>
            <strong style={{ color:'var(--text2)' }}>Windows:</strong> {`%LOCALAPPDATA%\\PokerStars\\HandHistory`}<br/>
            <strong style={{ color:'var(--text2)' }}>macOS:</strong> {`~/Library/Application Support/PokerStars/HandHistory`}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <MiniKpi label="Total importadas"    value={fmt(dbStats?.total)}    color="var(--text)"   />
          <MiniKpi label="Pendientes de sync"  value={fmt(dbStats?.unsynced)} color={dbStats?.unsynced ? 'var(--amber)' : 'var(--text3)'} />
          <MiniKpi label="Manos esta sesión"   value={fmt(sessionStats?.handsInserted)} color="var(--accent)" />
          <MiniKpi label="Victorias / Derrotas"
            value={`${fmt(dbStats?.byResult?.win)}/${fmt(dbStats?.byResult?.loss)}`}
            color="var(--text)"
          />
        </div>

        {/* ── Cómo funciona ── */}
        {!running && !events.length && (
          <div style={{
            background:'rgba(74,222,128,0.04)', border:'1px dashed rgba(74,222,128,0.2)',
            borderRadius:'var(--radius)', padding:'20px 24px',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
              Cómo funciona
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['1', 'Selecciona la carpeta HandHistory de PokerStars (se detecta automáticamente si está en la ruta estándar)'],
                ['2', 'Pulsa "Iniciar watcher" — la app empieza a monitorear la carpeta en tiempo real'],
                ['3', 'Cuando PokerStars escribe nuevas manos, se importan automáticamente a la base de datos local'],
                ['4', 'Pulsa "Sync a app" para trasladar las manos importadas a tu historial de la app'],
              ].map(([n, text]) => (
                <div key={n} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-mono)', fontSize:11, color:'var(--accent)',
                  }}>{n}</div>
                  <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5, margin:0 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Log de eventos ── */}
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius)', padding:'18px 20px',
        }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Log de eventos</span>
            {events.length > 0 && (
              <button onClick={() => setEvents([])} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:10 }}>
                Limpiar
              </button>
            )}
          </div>
          <EventLog events={events}/>
        </div>

        {/* ── Nota legal ── */}
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', lineHeight:1.8, padding:'12px 16px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7 }}>
          <strong style={{ color:'var(--text2)' }}>Nota legal:</strong> Este importador lee únicamente los archivos de Hand History
          que PokerStars genera localmente en tu dispositivo. No accede a servidores externos,
          no automatiza el juego ni extrae datos en tiempo real de las mesas.
          Es equivalente a lo que hacen PokerTracker 4 y Hold'em Manager, explícitamente
          permitidos por los Términos de Servicio de PokerStars (sección 4, "Permitted Software").
        </div>
      </div>
    </div>
  )
}