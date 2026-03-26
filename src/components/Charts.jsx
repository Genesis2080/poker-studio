import React, { useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
  Legend, LineChart, Line,
} from 'recharts'

// ── Paleta compartida ─────────────────────────────────────────────
const C = {
  accent:  '#4ade80',
  red:     '#f87171',
  amber:   '#fbbf24',
  blue:    '#60a5fa',
  purple:  '#a78bfa',
  gray:    '#4a5568',
  grid:    '#1f2433',
  text:    '#94a3b8',
  surface: '#181c26',
}

// ── Tooltip personalizado ────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1f2433', border: '1px solid #2e3a50',
      borderRadius: '8px', padding: '10px 14px',
      fontFamily: 'var(--font-mono)', fontSize: '12px',
    }}>
      {label && <div style={{ color: '#94a3b8', marginBottom: '6px' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.accent, marginBottom: i < payload.length - 1 ? '3px' : 0 }}>
          {p.name ? `${p.name}: ` : ''}{prefix}{p.value}{suffix}
        </div>
      ))}
    </div>
  )
}

// ── 1. Manos por día (últimos 30 días) — AreaChart ───────────────
export function HandsPerDayChart({ hands }) {
  const data = useMemo(() => {
    const days = 30
    const map = {}
    const today = new Date()

    // Inicializar todos los días en 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().split('T')[0]
      map[key] = { date: key, label: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), manos: 0, victorias: 0 }
    }

    // Contar manos
    hands.forEach(h => {
      if (map[h.date]) {
        map[h.date].manos++
        if (h.result === 'win') map[h.date].victorias++
      }
    })

    return Object.values(map)
  }, [hands])

  const hasData = data.some(d => d.manos > 0)

  return (
    <ChartWrapper title="Manos por día" subtitle="Últimos 30 días" empty={!hasData}>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradManos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={C.accent} stopOpacity={0.25} />
              <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradWins" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={C.blue} stopOpacity={0.2} />
              <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis
            dataKey="label" tick={{ fill: C.text, fontSize: 10, fontFamily: 'DM Mono' }}
            tickLine={false} axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis tick={{ fill: C.text, fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip suffix=" manos" />} />
          <Area type="monotone" dataKey="manos"     name="Total"     stroke={C.accent} fill="url(#gradManos)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="victorias" name="Victorias" stroke={C.blue}   fill="url(#gradWins)"  strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ── 2. Resultado acumulado — LineChart ──────────────────────────
export function CumulativeProfitChart({ sessions }) {
  const data = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date))
    let cumulative = 0
    return sorted.map((s, i) => {
      const profit = (s.cashOut || 0) - (s.buyIn || 0)
      cumulative += profit
      return {
        label: `S${i + 1}`,
        date:  s.date,
        resultado: parseFloat(cumulative.toFixed(2)),
        sesion:    profit,
      }
    })
  }, [sessions])

  const hasData = data.length > 0
  const isPositive = data.length ? data[data.length - 1].resultado >= 0 : true

  return (
    <ChartWrapper title="Resultado acumulado" subtitle="Por sesión" empty={!hasData}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={isPositive ? C.accent : C.red} stopOpacity={0.15} />
              <stop offset="95%" stopColor={isPositive ? C.accent : C.red} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: C.text, fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: C.text, fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div style={{ background: '#1f2433', border: '1px solid #2e3a50', borderRadius: '8px', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  <div style={{ color: C.text, marginBottom: '4px' }}>{d.date}</div>
                  <div style={{ color: d.resultado >= 0 ? C.accent : C.red }}>Acumulado: {d.resultado > 0 ? '+' : ''}{d.resultado}€</div>
                  <div style={{ color: d.sesion >= 0 ? C.accent : C.red, marginTop: '2px' }}>Sesión: {d.sesion > 0 ? '+' : ''}{d.sesion}€</div>
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="resultado" stroke={isPositive ? C.accent : C.red} strokeWidth={2} dot={{ fill: isPositive ? C.accent : C.red, r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ── 3. Win rate por posición — BarChart ─────────────────────────
export function WinRateByPositionChart({ hands }) {
  const POSITIONS = ['BTN', 'CO', 'HJ', 'UTG', 'SB', 'BB']

  const data = useMemo(() => {
    const map = {}
    hands.forEach(h => {
      if (!h.position) return
      if (!map[h.position]) map[h.position] = { total: 0, wins: 0 }
      map[h.position].total++
      if (h.result === 'win') map[h.position].wins++
    })
    return POSITIONS
      .filter(p => map[p])
      .map(p => ({
        position: p,
        winRate:  parseFloat(((map[p].wins / map[p].total) * 100).toFixed(1)),
        total:    map[p].total,
        wins:     map[p].wins,
      }))
  }, [hands])

  return (
    <ChartWrapper title="Win rate por posición" subtitle="% victorias" empty={data.length === 0}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="position" tick={{ fill: C.text, fontSize: 11, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: C.text, fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div style={{ background: '#1f2433', border: '1px solid #2e3a50', borderRadius: '8px', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  <div style={{ color: C.text, marginBottom: '4px' }}>{d.position}</div>
                  <div style={{ color: d.winRate >= 50 ? C.accent : C.red }}>Win rate: {d.winRate}%</div>
                  <div style={{ color: C.text, marginTop: '2px' }}>{d.wins}/{d.total} manos</div>
                </div>
              )
            }}
          />
          <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.winRate >= 50 ? C.accent : C.red} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ── 4. Errores más comunes — BarChart horizontal ─────────────────
export function CommonErrorsChart({ hands }) {
  const data = useMemo(() => {
    const counts = {}
    hands.forEach(h => {
      // Errores de los análisis de IA guardados
      const aiErrors = h.aiAnalysis?.errorTypes || []
      aiErrors.forEach(e => { counts[e] = (counts[e] || 0) + 1 })

      // Tags manuales que son errores
      const tagErrors = (h.tags || []).filter(t =>
        ['Error propio', 'Tilt'].includes(t)
      )
      tagErrors.forEach(() => { counts['other'] = (counts['other'] || 0) + 1 })
    })

    const labels = {
      fold_equity: 'Fold equity', pot_odds: 'Pot odds',
      position: 'Posición', bet_sizing: 'Sizing',
      bluff_frequency: 'Bluff freq.', value_thin: 'Value thin',
      tilt: 'Tilt', range_imbalance: 'Rango', icm: 'ICM', other: 'Otros',
    }

    return Object.entries(counts)
      .map(([k, v]) => ({ error: labels[k] || k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [hands])

  const COLORS = [C.red, C.amber, C.purple, C.blue, C.accent, C.gray]

  return (
    <ChartWrapper title="Errores más comunes" subtitle="Detectados por IA y tags" empty={data.length === 0} emptyMsg="Analiza manos con IA para ver patrones de errores">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: C.text, fontSize: 10, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="error" tick={{ fill: C.text, fontSize: 11, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} width={58} />
          <Tooltip content={<CustomTooltip suffix=" veces" />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ── 5. Distribución resultados — PieChart ──────────────────────
export function ResultDistributionChart({ hands }) {
  const data = useMemo(() => {
    const wins   = hands.filter(h => h.result === 'win').length
    const losses = hands.filter(h => h.result === 'loss').length
    const even   = hands.filter(h => h.result === 'even').length
    return [
      { name: 'Victorias',    value: wins,   color: C.accent },
      { name: 'Derrotas',     value: losses, color: C.red    },
      { name: 'Break-even',   value: even,   color: C.gray   },
    ].filter(d => d.value > 0)
  }, [hands])

  return (
    <ChartWrapper title="Distribución resultados" subtitle="" empty={data.length === 0}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.9} />)}
            </Pie>
            <Tooltip content={<CustomTooltip suffix=" manos" />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: C.text }}>{d.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: d.color, fontWeight: 600, marginLeft: 'auto' }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartWrapper>
  )
}

// ── 6. Heatmap de rangos — grid 13×13 ──────────────────────────
const RANKS_ORDER = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']

export function RangeHeatmapChart({ rangeData }) {
  // rangeData: { 'AKs': { total: 5, wins: 3, losses: 2 }, ... }
  const hasData = Object.keys(rangeData).length > 0

  // Máximo total para normalizar opacidad
  const maxTotal = Math.max(...Object.values(rangeData).map(d => d.total), 1)

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '18px 20px',
    }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Heatmap de rangos
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', marginTop: '2px', opacity: 0.6 }}>
          Win rate por mano — diagonal superior = suited, inferior = offsuit
        </div>
      </div>

      {!hasData ? (
        <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ fontSize: '22px', opacity: 0.3 }}>🃏</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>
            Registra manos con Hero hand para ver el heatmap
          </span>
        </div>
      ) : (
        <>
          {/* Header de columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '14px repeat(13, 1fr)', gap: '2px', marginBottom: '2px' }}>
            <div />
            {RANKS_ORDER.map(r => (
              <div key={r} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text3)', textAlign: 'center' }}>{r}</div>
            ))}
          </div>

          {/* Grid */}
          {RANKS_ORDER.map((r1, i) => (
            <div key={r1} style={{ display: 'grid', gridTemplateColumns: '14px repeat(13, 1fr)', gap: '2px', marginBottom: '2px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>{r1}</div>
              {RANKS_ORDER.map((r2, j) => {
                let key
                if (i === j) key = r1 + r2
                else if (i < j) key = r1 + r2 + 's'  // suited (upper triangle)
                else key = r2 + r1 + 'o'               // offsuit (lower triangle)

                const d = rangeData[key]
                const wr = d ? d.wins / d.total : null
                const opacity = d ? 0.3 + (d.total / maxTotal) * 0.7 : 0

                // Color: verde si gana, rojo si pierde, gris si no hay datos
                let bg = 'var(--border)'
                if (d) bg = wr >= 0.5 ? `rgba(74,222,128,${opacity})` : `rgba(248,113,113,${opacity})`

                return (
                  <div
                    key={r2}
                    title={d ? `${key}: ${d.wins}/${d.total} (${Math.round(wr * 100)}%)` : key}
                    style={{
                      aspectRatio: '1', borderRadius: '2px',
                      background: bg,
                      cursor: d ? 'pointer' : 'default',
                      transition: 'filter 0.1s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => { if (d) e.currentTarget.style.filter = 'brightness(1.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                  >
                    {d && d.total >= 3 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'white', fontWeight: 700 }}>
                        {Math.round(wr * 100)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '2px', background: 'rgba(74,222,128,0.7)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>Win rate ≥50%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '2px', background: 'rgba(248,113,113,0.7)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>Win rate {'<'}50%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>Intensidad = nº de manos</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Wrapper de tarjeta ───────────────────────────────────────────
function ChartWrapper({ title, subtitle, empty, emptyMsg, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '18px 20px',
    }}>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </div>
        {subtitle && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', marginTop: '2px', opacity: 0.6 }}>{subtitle}</div>}
      </div>
      {empty
        ? (
          <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '22px', opacity: 0.3 }}>📊</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>
              {emptyMsg || 'Sin datos aún'}
            </span>
          </div>
        )
        : children
      }
    </div>
  )
}