import React, { useState, useMemo, useCallback } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Modal, Input, Select, Textarea, Empty, Confirm } from '../components/UI.jsx'
import { AIHandAnalysis, APIKeyModal } from '../components/AIAnalysis.jsx'

// ════════════════════════════════════════════════════════
// CONSTANTES DE CARTAS (para CardPicker del board)
// ════════════════════════════════════════════════════════
const CARD_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const CARD_SUITS = [
  { id:'s', symbol:'♠', color:'#e8eaf0' },
  { id:'h', symbol:'♥', color:'#f87171' },
  { id:'d', symbol:'♦', color:'#60a5fa' },
  { id:'c', symbol:'♣', color:'#4ade80' },
]

function cardLabel(cid) {
  if (!cid || cid.length < 2) return cid
  const suit = CARD_SUITS.find(s => s.id === cid.slice(-1))
  return cid.slice(0,-1) + (suit ? suit.symbol : cid.slice(-1))
}
function boardStr(cards) {
  return (cards||[]).filter(Boolean).map(cardLabel).join(' ')
}

// ════════════════════════════════════════════════════════
// CONSTANTES DE RANGOS (para VillainRangePicker)
// ════════════════════════════════════════════════════════
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const ORDER = 'AKQJT98765432'

// Genera la key canónica de cada celda de la grid 13×13
// diagonal → pares (AA, KK…)
// triángulo superior (i<j) → suited (AKs, AQs…)
// triángulo inferior (i>j) → offsuit (AKo, AQo…)
function cellKey(i, j) {
  const r1 = RANKS[i], r2 = RANKS[j]
  if (i === j)  return r1 + r2          // par
  if (i < j)    return r1 + r2 + 's'   // suited  (superior)
  return r2 + r1 + 'o'                  // offsuit (inferior)
}

// Genera TODAS las combinaciones posibles (169 keys)
function allRangeKeys() {
  const keys = []
  for (let i = 0; i < 13; i++)
    for (let j = 0; j < 13; j++)
      keys.push(cellKey(i, j))
  return [...new Set(keys)]
}

const ALL_KEYS = allRangeKeys()   // 169 keys únicas

// Serializa el array de keys a string legible para la IA
// ["AA","KK","AKs","AKo"] → "AA, KK, AKs, AKo"
// Si hay demasiadas manos se resume: "Rango amplio (120/169 combos)"
function serializeRange(keys) {
  if (!keys?.length) return ''
  if (keys.length === ALL_KEYS.length) return 'Todas las manos (rango completo)'
  if (keys.length > 80) return `Rango amplio (${keys.length}/169 combos)`
  return keys.slice().sort().join(', ')
}

// Grupos de selección rápida
const RANGE_GROUPS = [
  {
    label: 'Premium',
    color: '#c9a84c',
    keys: () => ['AA','KK','QQ','JJ','AKs','AKo'],
  },
  {
    label: 'Broadways',
    color: '#60a5fa',
    keys: () => {
      const out = []
      const bw = ['A','K','Q','J','T']
      for (let i=0;i<bw.length;i++) for (let j=i+1;j<bw.length;j++) {
        out.push(bw[i]+bw[j]+'s', bw[i]+bw[j]+'o')
      }
      // Pares altos
      out.push('TT','JJ','QQ','KK','AA')
      return [...new Set(out)]
    },
  },
  {
    label: 'Pares',
    color: '#a78bfa',
    keys: () => RANKS.map(r => r+r),
  },
  {
    label: 'Suited Aces',
    color: '#4ade80',
    keys: () => RANKS.slice(1).map(r => 'A'+r+'s'),
  },
  {
    label: 'Suited Connectors',
    color: '#fb923c',
    keys: () => {
      const out = []
      for (let i=1;i<RANKS.length;i++) out.push(RANKS[i-1]+RANKS[i]+'s')
      return out
    },
  },
  {
    label: 'Todas',
    color: '#94a3b8',
    keys: () => ALL_KEYS,
  },
  {
    label: 'Ninguna',
    color: '#4a5568',
    keys: () => [],
  },
]

// ════════════════════════════════════════════════════════
// VillainRangePicker
// Props:
//   selected  → array de keys seleccionadas (vacío = nada)
//   onChange  → fn(newArray)
// ════════════════════════════════════════════════════════
function VillainRangePicker({ selected = [], onChange }) {
  const selectedSet = useMemo(() => new Set(selected), [selected])

  function toggle(key) {
    const next = new Set(selectedSet)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange([...next])
  }

  function applyGroup(groupFn) {
    onChange(groupFn())
  }

  // Añadir / quitar grupo a la selección actual
  function toggleGroup(groupFn) {
    const groupKeys = groupFn()
    const allIn = groupKeys.every(k => selectedSet.has(k))
    if (allIn) {
      // Quitar todo el grupo
      const next = new Set(selectedSet)
      groupKeys.forEach(k => next.delete(k))
      onChange([...next])
    } else {
      // Añadir todo el grupo
      const next = new Set(selectedSet)
      groupKeys.forEach(k => next.add(k))
      onChange([...next])
    }
  }

  const total = selected.length
  const pct   = ((total / ALL_KEYS.length) * 100).toFixed(1)

  // Colores de celda según tipo y estado
  function cellStyle(i, j) {
    const key      = cellKey(i, j)
    const isSel    = selectedSet.has(key)
    const isPair   = i === j
    const isSuited = i < j

    // Color base según tipo cuando está seleccionado
    let selBg = '#2a3a2a'  // offsuit seleccionado — verde oscuro neutro
    if (isPair)   selBg = 'rgba(167,139,250,0.55)'  // pares — púrpura
    if (isSuited) selBg = 'rgba(74,222,128,0.45)'   // suited — verde

    return {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 26, borderRadius: 4, cursor: 'pointer',
      fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600,
      transition: 'all 0.08s',
      background: isSel
        ? selBg
        : isPair
          ? 'rgba(167,139,250,0.08)'
          : isSuited
            ? 'rgba(74,222,128,0.06)'
            : 'rgba(96,165,250,0.05)',
      border: isSel
        ? `1px solid ${isPair ? 'rgba(167,139,250,0.6)' : isSuited ? 'rgba(74,222,128,0.5)' : 'rgba(74,222,128,0.3)'}`
        : '1px solid var(--border)',
      color: isSel
        ? (isPair ? '#d8b4fe' : '#fff')
        : 'var(--text3)',
      transform: isSel ? 'scale(1.04)' : 'scale(1)',
    }
  }

  return (
    <div>
      {/* Header: label + contador + grupos rápidos */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Rango del villano
          <span style={{ marginLeft:8, color:'var(--accent)' }}>
            {total > 0 ? `${total} combos · ${pct}%` : 'vacío'}
          </span>
        </div>
        <button
          onClick={() => onChange(total > 0 ? [] : [...ALL_KEYS])}
          style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:10, padding:'2px 6px' }}
        >
          {total > 0 ? '✕ Limpiar' : '+ Todo'}
        </button>
      </div>

      {/* Botones de grupos rápidos */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
        {RANGE_GROUPS.map(g => {
          const gKeys  = g.keys()
          const allIn  = gKeys.length > 0 && gKeys.every(k => selectedSet.has(k))
          return (
            <button
              key={g.label}
              onClick={() => {
                if (g.label === 'Todas' || g.label === 'Ninguna') applyGroup(g.keys)
                else toggleGroup(g.keys)
              }}
              style={{
                fontFamily:'var(--font-mono)', fontSize:10, padding:'3px 9px',
                borderRadius:20, cursor:'pointer', transition:'all 0.15s',
                background: allIn ? `${g.color}22` : 'var(--surface2)',
                border: `1px solid ${allIn ? g.color : 'var(--border)'}`,
                color: allIn ? g.color : 'var(--text2)',
              }}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display:'flex', gap:14, marginBottom:8, flexWrap:'wrap' }}>
        {[
          { label:'Suited (↗)', color:'rgba(74,222,128,0.5)'  },
          { label:'Pares (↘)', color:'rgba(167,139,250,0.6)' },
          { label:'Offsuit (↙)', color:'rgba(74,222,128,0.3)' },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:l.color }} />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Grid 13×13 */}
      <div style={{
        background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:8, padding:'10px 12px', overflowX:'auto',
      }}>
        {/* Header de columnas */}
        <div style={{ display:'grid', gridTemplateColumns:'20px repeat(13,1fr)', gap:3, marginBottom:3 }}>
          <div />
          {RANKS.map(r => (
            <div key={r} style={{ textAlign:'center', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', fontWeight:700 }}>{r}</div>
          ))}
        </div>

        {/* Filas */}
        {RANKS.map((r1, i) => (
          <div key={r1} style={{ display:'grid', gridTemplateColumns:'20px repeat(13,1fr)', gap:3, marginBottom:3 }}>
            {/* Label de fila */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', fontWeight:700 }}>{r1}</div>

            {/* Celdas */}
            {RANKS.map((r2, j) => {
              const key = cellKey(i, j)
              return (
                <div
                  key={key}
                  onClick={() => toggle(key)}
                  title={key}
                  style={cellStyle(i, j)}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                >
                  {key.replace('s','').replace('o','')}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer: resumen del rango */}
      {selected.length > 0 && selected.length < ALL_KEYS.length && (
        <div style={{
          marginTop:8, padding:'6px 10px',
          background:'var(--surface2)', border:'1px solid var(--border)',
          borderRadius:6, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)',
          maxHeight:60, overflowY:'auto', lineHeight:1.8,
        }}>
          {selected.length <= 30
            ? selected.sort().join(' · ')
            : `${selected.slice(0,30).sort().join(' · ')} … (+${selected.length-30} más)`
          }
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// CardChip  (para BoardPreview y CardPicker)
// ════════════════════════════════════════════════════════
function CardChip({ cid }) {
  const suit = CARD_SUITS.find(s => s.id === cid?.slice(-1))
  const rank = cid?.slice(0,-1)
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:2, background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:5, padding:'2px 7px', fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700 }}>
      <span style={{ color:'var(--text)' }}>{rank}</span>
      <span style={{ color:suit?.color||'var(--text)' }}>{suit?.symbol||''}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// CardPicker  (para Flop/Turn/River)
// ════════════════════════════════════════════════════════
function CardPicker({ label, max, selected=[], onChange, blocked=[], accentColor='var(--accent)' }) {
  const [open, setOpen] = useState(false)

  function toggle(cid) {
    if (blocked.includes(cid)) return
    if (selected.includes(cid)) { onChange(selected.filter(c=>c!==cid)); return }
    if (selected.length >= max) return
    onChange([...selected, cid])
  }

  const isFull    = selected.length >= max
  const isEmpty   = selected.length === 0
  const remaining = max - selected.length

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          {label} <span style={{ marginLeft:6, color:isFull?accentColor:'var(--text3)' }}>{selected.length}/{max}</span>
        </span>
        {!isEmpty && (
          <button onClick={()=>onChange([])} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:10, padding:'2px 6px' }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      <div onClick={()=>setOpen(o=>!o)} style={{
        display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', minHeight:38, padding:'6px 10px',
        background:'var(--surface)', border:`1px solid ${open?accentColor:'var(--border2)'}`,
        borderRadius:open?'7px 7px 0 0':'7px', cursor:'pointer', transition:'border-color 0.15s',
      }}>
        {isEmpty
          ? <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text3)' }}>
              {open ? 'Selecciona cartas ↑' : `Seleccionar ${max} carta${max>1?'s':''} →`}
            </span>
          : selected.map(cid => <CardChip key={cid} cid={cid}/>)
        }
        {!isEmpty && !isFull && (
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', marginLeft:4 }}>+{remaining} más</span>
        )}
      </div>

      {open && (
        <div style={{ border:`1px solid ${accentColor}`, borderTop:'none', borderRadius:'0 0 7px 7px', background:'var(--bg2)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'28px repeat(13,1fr)', gap:3, padding:'8px 10px 4px', borderBottom:'1px solid var(--border)' }}>
            <div/>
            {CARD_RANKS.map(r => (
              <div key={r} style={{ textAlign:'center', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', fontWeight:600 }}>{r}</div>
            ))}
          </div>
          {CARD_SUITS.map(suit => (
            <div key={suit.id} style={{ display:'grid', gridTemplateColumns:'28px repeat(13,1fr)', gap:3, padding:'4px 10px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:15, color:suit.color }}>{suit.symbol}</div>
              {CARD_RANKS.map(rank => {
                const cid        = rank + suit.id
                const isSelected = selected.includes(cid)
                const isBlocked  = blocked.includes(cid)
                const isDisabled = isBlocked || (isFull && !isSelected)
                return (
                  <div key={cid} onClick={()=>!isDisabled&&toggle(cid)} title={isBlocked?'Carta ya usada':cardLabel(cid)} style={{
                    height:30, display:'flex', alignItems:'center', justifyContent:'center',
                    borderRadius:5, cursor:isDisabled?'not-allowed':'pointer', transition:'all 0.1s',
                    fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700,
                    background:isSelected?accentColor:isBlocked?'rgba(255,255,255,0.03)':'var(--surface)',
                    border:`1px solid ${isSelected?accentColor:isBlocked?'transparent':'var(--border)'}`,
                    color:isSelected?'#0d1a0d':isBlocked?'var(--border2)':suit.color,
                    opacity:isBlocked?0.3:1,
                    transform:isSelected?'scale(1.06)':'scale(1)',
                  }}>
                    {rank}
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{ padding:'6px 10px 8px', borderTop:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>{isFull ? `✓ ${max} carta${max>1?'s':''} lista${max>1?'s':''}` : `Selecciona ${remaining} carta${remaining>1?'s':''} más`}</span>
            {isFull && (
              <button onClick={()=>setOpen(false)} style={{ background:accentColor, border:'none', borderRadius:5, color:'#0d1a0d', fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, padding:'3px 10px', cursor:'pointer' }}>
                Cerrar ✓
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// BoardPreview
// ════════════════════════════════════════════════════════
function BoardPreview({ flop, turn, river }) {
  if (!flop?.length && !turn && !river) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px' }}>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', flexShrink:0 }}>Board</span>
      {flop?.length>0 && (
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', marginRight:2 }}>F</span>
          {flop.map(cid=><CardChip key={cid} cid={cid}/>)}
        </div>
      )}
      {flop?.length>0 && turn && <span style={{ color:'var(--border2)', fontSize:14 }}>│</span>}
      {turn && (
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', marginRight:2 }}>T</span>
          <CardChip cid={turn}/>
        </div>
      )}
      {turn && river && <span style={{ color:'var(--border2)', fontSize:14 }}>│</span>}
      {river && (
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', marginRight:2 }}>R</span>
          <CardChip cid={river}/>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// HeroHandInput
// ════════════════════════════════════════════════════════
function HeroHandInput({ value, onChange }) {
  const [r1, setR1] = useState('')
  const [r2, setR2] = useState('')
  const [s,  setS]  = useState(false)

  function build(a, b, suited) {
    if (!a||!b) { onChange(''); return }
    const ia=ORDER.indexOf(a), ib=ORDER.indexOf(b)
    if (a===b) { onChange(a+b); return }
    const [hi,lo] = ia<ib?[a,b]:[b,a]
    onChange(hi+lo+(suited?'s':'o'))
  }

  const rs = (r,sel) => ({
    width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius:5, cursor:'pointer', transition:'all 0.1s', fontFamily:'var(--font-mono)', fontSize:12,
    background:sel?'var(--accent)':'var(--surface)',
    border:`1px solid ${sel?'var(--accent)':'var(--border)'}`,
    color:sel?'#0d1a0d':'var(--text2)',
  })

  return (
    <div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
        Hero hand {value&&<span style={{ color:'var(--accent)', marginLeft:8 }}>{value}</span>}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', width:16 }}>1ª</span>
          {RANKS.map(r=><div key={r} style={rs(r,r1===r)} onClick={()=>{setR1(r);build(r,r2,s)}}>{r}</div>)}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', width:16 }}>2ª</span>
          {RANKS.map(r=><div key={r} style={rs(r,r2===r)} onClick={()=>{setR2(r);build(r1,r,s)}}>{r}</div>)}
        </div>
        {r1&&r2&&r1!==r2 && (
          <div style={{ display:'flex', gap:8 }}>
            {[['s','Suited'],['o','Offsuit']].map(([v,l])=>(
              <button key={v} onClick={()=>{setS(v==='s');build(r1,r2,v==='s')}} style={{
                padding:'3px 10px', borderRadius:5, cursor:'pointer', transition:'all 0.1s', fontFamily:'var(--font-mono)', fontSize:11,
                background:(v==='s')===s?'rgba(74,222,128,0.12)':'var(--surface2)',
                border:`1px solid ${(v==='s')===s?'rgba(74,222,128,0.3)':'var(--border)'}`,
                color:(v==='s')===s?'var(--accent)':'var(--text2)',
              }}>{l}</button>
            ))}
          </div>
        )}
        <input value={value} onChange={e=>{onChange(e.target.value);setR1('');setR2('')}}
          placeholder="O escribe: AKs, QJo, 99…"
          style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:12, padding:'6px 10px', outline:'none', width:'100%' }}
          onFocus={e=>e.target.style.borderColor='var(--accent)'}
          onBlur={e=>e.target.style.borderColor='var(--border2)'}
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// Constantes del formulario
// ════════════════════════════════════════════════════════
const POSITIONS = [
  { value:'BTN', label:'BTN — Button'        },
  { value:'CO',  label:'CO — Cutoff'          },
  { value:'HJ',  label:'HJ — Hijack'          },
  { value:'UTG', label:'UTG — Under the Gun'  },
  { value:'SB',  label:'SB — Small Blind'     },
  { value:'BB',  label:'BB — Big Blind'       },
]

const RESULTS = [
  { value:'win',  label:'✓ Victoria'   },
  { value:'loss', label:'✗ Derrota'    },
  { value:'even', label:'~ Break-even' },
]

const PREFLOP_ACTIONS = [
  { value:'open', label:'Open raise' },
  { value:'call', label:'Call'       },
  { value:'3bet', label:'3-bet'      },
  { value:'4bet', label:'4-bet'      },
  { value:'limp', label:'Limp'       },
]

const STREETS = [
  { value:'preflop', label:'Preflop' },
  { value:'flop',    label:'Flop'    },
  { value:'turn',    label:'Turn'    },
  { value:'river',   label:'River'   },
]

const TAGS = ['Bluff','Value bet','Hero call','Bad beat','Spot correcto','Error propio','3-bet pot','Multiway']

const EMPTY_FORM = {
  date:            new Date().toISOString().split('T')[0],
  position:        'BTN',
  result:          'win',
  // Sin campo amount
  heroHand:        '',
  villainPosition: '',         // posición del villano
  villainRange:    [],         // array de keys del rango visual
  preflopAction:   '',
  street:          '',
  boardFlop:       [],
  boardTurn:       '',
  boardRiver:      '',
  notes:           '',
  tags:            [],
}

// ════════════════════════════════════════════════════════
// Página principal
// ════════════════════════════════════════════════════════
export default function Manos() {
  const { data, setData } = useApp()
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editId,     setEditId]     = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [confirmId,  setConfirmId]  = useState(null)
  const [filter,     setFilter]     = useState('all')
  const [search,     setSearch]     = useState('')
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [formTab,    setFormTab]    = useState('basic')

  const hands = data.hands || []

  function serializeBoard(f) {
    const parts = []
    if (f.boardFlop?.length)  parts.push('Flop: '  + boardStr(f.boardFlop))
    if (f.boardTurn)          parts.push('Turn: '  + cardLabel(f.boardTurn))
    if (f.boardRiver)         parts.push('River: ' + cardLabel(f.boardRiver))
    if (!parts.length && f.board) return f.board
    return parts.join(' | ')
  }

  function migrateHand(hand) {
    const out = { ...EMPTY_FORM, ...hand, tags: hand.tags||[] }
    // Migrar villainRange de string a array vacío si viene de versión antigua
    if (typeof out.villainRange === 'string') out.villainRange = []
    // Migrar board antiguo
    if (hand.board && !hand.boardFlop?.length && !hand.boardTurn && !hand.boardRiver) {
      out.notes = out.notes ? `${out.notes}\nBoard: ${hand.board}` : `Board: ${hand.board}`
    }
    return out
  }

  const filtered = hands
    .filter(h => filter==='all' || h.result===filter)
    .filter(h => {
      if (!search) return true
      const q = search.toLowerCase()
      return (h.notes||'').toLowerCase().includes(q)
        || (h.position||'').toLowerCase().includes(q)
        || (h.heroHand||'').toLowerCase().includes(q)
        || (h.tags||[]).some(t=>t.toLowerCase().includes(q))
    })
    .sort((a,b) => new Date(b.date)-new Date(a.date))

  function openNew() {
    setForm({ ...EMPTY_FORM, date:new Date().toISOString().split('T')[0] })
    setEditId(null); setFormTab('basic'); setModalOpen(true)
  }
  function openEdit(hand) {
    setForm(migrateHand(hand))
    setEditId(hand.id); setFormTab('basic'); setModalOpen(true)
  }
  function saveHand() {
    if (!form.date||!form.position) return
    const hs2save = {
      ...form,
      board:        serializeBoard(form),
      villainRange: Array.isArray(form.villainRange)
        ? serializeRange(form.villainRange)  // guardar como string para la IA
        : (form.villainRange || ''),
      // Guardamos el array original en campo separado para restaurarlo al editar
      villainRangeKeys: Array.isArray(form.villainRange) ? form.villainRange : [],
    }
    setData(prev => {
      const hs = prev.hands||[]
      if (editId) return { ...prev, hands:hs.map(h=>h.id===editId?{...hs2save,id:editId}:h) }
      return { ...prev, hands:[{...hs2save,id:'h'+Date.now()},...hs] }
    })
    setModalOpen(false)
  }
  function deleteHand(id) {
    setData(prev=>({...prev,hands:prev.hands.filter(h=>h.id!==id)}))
    setConfirmId(null)
  }
  function saveAIResult(id, aiData) {
    setData(prev=>({...prev,hands:prev.hands.map(h=>h.id===id?{...h,...aiData}:h)}))
    setForm(f=>({...f,...aiData}))
  }
  function toggleTag(tag) {
    setForm(f=>({...f,tags:f.tags.includes(tag)?f.tags.filter(t=>t!==tag):[...f.tags,tag]}))
  }
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const currentHand = editId?(hands.find(h=>h.id===editId)||form):form

  // Al abrir edición, restaurar los keys del rango visual
  function openEditFixed(hand) {
    const migrated = migrateHand(hand)
    // Restaurar el array de keys desde villainRangeKeys si existe
    if (hand.villainRangeKeys?.length) migrated.villainRange = hand.villainRangeKeys
    setForm(migrated)
    setEditId(hand.id); setFormTab('basic'); setModalOpen(true)
  }

  const cols = ['Fecha','Pos','Hero','Villano','Board','Resultado','IA','']

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <PageHeader
        title="Manos"
        subtitle={`${hands.length} manos · ${hands.filter(h=>h.heroHand).length} con rango · ${hands.filter(h=>h.aiAnalysis).length} analizadas`}
        action={
          <div style={{ display:'flex', gap:8 }}>
            <Button variant="secondary" size="sm" onClick={()=>setApiKeyOpen(true)}>🤖 API Key</Button>
            <Button onClick={openNew}>+ Nueva mano</Button>
          </div>
        }
      />

      {/* Filtros */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 28px', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap' }}>
        {[{id:'all',label:'Todas'},{id:'win',label:'✓ Victorias'},{id:'loss',label:'✗ Derrotas'},{id:'even',label:'~ Break-even'}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{
            fontFamily:'var(--font-mono)', fontSize:12, padding:'4px 12px', borderRadius:20, cursor:'pointer', transition:'all 0.15s',
            background:filter===f.id?'rgba(74,222,128,0.12)':'var(--surface)',
            border:`1px solid ${filter===f.id?'rgba(74,222,128,0.3)':'var(--border)'}`,
            color:filter===f.id?'var(--accent)':'var(--text2)',
          }}>{f.label}</button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…"
          style={{ marginLeft:'auto', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:12, padding:'5px 10px', outline:'none', width:200 }}
          onFocus={e=>e.target.style.borderColor='var(--accent)'}
          onBlur={e=>e.target.style.borderColor='var(--border2)'}
        />
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 28px' }}>
        {filtered.length===0
          ? <Empty icon="🃏" message="No hay manos" sub="Añade tu primera mano con el botón superior"/>
          : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{cols.map(h=>(
                  <th key={h} style={{ textAlign:'left', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 8px 10px 0', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((hand,i)=>{
                  const bd = serializeBoard(hand)
                  const vr = typeof hand.villainRange === 'string' ? hand.villainRange : serializeRange(hand.villainRangeKeys||[])
                  return (
                    <tr key={hand.id} onClick={()=>openEditFixed(hand)}
                      style={{ borderBottom:i<filtered.length-1?'1px solid var(--border)':'none', cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <td style={{ padding:'11px 8px 11px 0', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text2)', whiteSpace:'nowrap' }}>{hand.date}</td>
                      <td style={{ padding:'11px 8px' }}><Badge color="blue">{hand.position||'—'}</Badge></td>
                      <td style={{ padding:'11px 8px', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent)', whiteSpace:'nowrap' }}>
                        {hand.heroHand||<span style={{color:'var(--text3)'}}>—</span>}
                      </td>
                      <td style={{ padding:'11px 8px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {hand.villainPosition
                          ? <Badge color="purple">{hand.villainPosition}</Badge>
                          : <span style={{opacity:0.4}}>—</span>
                        }
                        {vr && <span style={{marginLeft:6}}>{vr.length>25?vr.slice(0,22)+'…':vr}</span>}
                      </td>
                      <td style={{ padding:'11px 8px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {bd||<span style={{opacity:0.4}}>—</span>}
                      </td>
                      <td style={{ padding:'11px 8px' }}>
                        <Badge color={hand.result==='win'?'green':hand.result==='loss'?'red':'gray'}>
                          {hand.result==='win'?'Victoria':hand.result==='loss'?'Derrota':'BE'}
                        </Badge>
                      </td>
                      <td style={{ padding:'11px 8px' }}>
                        {hand.aiAnalysis
                          ? <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:hand.aiAnalysis.score>=7?'var(--accent)':hand.aiAnalysis.score>=5?'var(--amber)':'var(--red)' }}>{hand.aiAnalysis.score}/10</span>
                          : <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding:'11px 0', textAlign:'right' }}>
                        <button onClick={e=>{e.stopPropagation();setConfirmId(hand.id)}}
                          style={{ background:'transparent', border:'1px solid transparent', borderRadius:5, color:'var(--text3)', padding:'3px 6px', fontSize:12, cursor:'pointer', transition:'all 0.15s' }}
                          onMouseEnter={e=>{e.currentTarget.style.color='var(--red)';e.currentTarget.style.borderColor='rgba(248,113,113,0.3)'}}
                          onMouseLeave={e=>{e.currentTarget.style.color='var(--text3)';e.currentTarget.style.borderColor='transparent'}}
                        >✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Modal */}
      <Modal title={editId?'Editar mano':'Nueva mano'} open={modalOpen} onClose={()=>setModalOpen(false)} width={720}>
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:16 }}>
            {[
              { id:'basic', label:'📋 Básico'          },
              { id:'range', label:'🃏 Rangos & Board'  },
              { id:'ai',    label:'🤖 IA', disabled:!editId },
            ].map(t=>(
              <button key={t.id} onClick={()=>!t.disabled&&setFormTab(t.id)} style={{
                padding:'8px 14px', background:'transparent', border:'none',
                borderBottom:`2px solid ${formTab===t.id?'var(--accent)':'transparent'}`,
                color:t.disabled?'var(--text3)':formTab===t.id?'var(--accent)':'var(--text2)',
                fontFamily:'var(--font-mono)', fontSize:11,
                cursor:t.disabled?'not-allowed':'pointer', transition:'all 0.15s', opacity:t.disabled?0.4:1,
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── Tab Básico ── */}
          {formTab==='basic' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Fecha + Resultado en una fila */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Fecha" type="date" value={form.date} onChange={e=>set('date',e.target.value)}/>
                <Select label="Resultado" value={form.result} onChange={e=>set('result',e.target.value)} options={RESULTS}/>
              </div>
              {/* Posición hero + Posición villano */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Select label="Tu posición (hero)" value={form.position} onChange={e=>set('position',e.target.value)} options={POSITIONS}/>
                <Select label="Posición del villano"
                  value={form.villainPosition}
                  onChange={e=>set('villainPosition',e.target.value)}
                  options={[{value:'',label:'— Sin especificar —'}, ...POSITIONS]}
                />
              </div>
              {/* Tags */}
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Tags</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {TAGS.map(tag=>(
                    <button key={tag} onClick={()=>toggleTag(tag)} style={{
                      fontFamily:'var(--font-mono)', fontSize:11, padding:'3px 10px', borderRadius:20, cursor:'pointer', transition:'all 0.15s',
                      background:form.tags.includes(tag)?'rgba(167,139,250,0.15)':'var(--surface2)',
                      border:`1px solid ${form.tags.includes(tag)?'rgba(167,139,250,0.35)':'var(--border)'}`,
                      color:form.tags.includes(tag)?'var(--purple)':'var(--text2)',
                    }}>{tag}</button>
                  ))}
                </div>
              </div>
              {/* Descripción */}
              <Textarea label="Descripción de la mano" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={4}
                placeholder="Describe la situación: stack, acción calle a calle, reads… Cuanto más detalle, mejor análisis de IA."/>
            </div>
          )}

          {/* ── Tab Rangos & Board ── */}
          {formTab==='range' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Hero hand */}
              <HeroHandInput value={form.heroHand} onChange={v=>set('heroHand',v)}/>

              {/* Rango del villano — grid visual */}
              <VillainRangePicker
                selected={Array.isArray(form.villainRange) ? form.villainRange : []}
                onChange={v=>set('villainRange',v)}
              />

              {/* Acción preflop + Calle decisiva */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Select label="Acción preflop" value={form.preflopAction} onChange={e=>set('preflopAction',e.target.value)}
                  options={[{value:'',label:'— Sin especificar —'},...PREFLOP_ACTIONS]}/>
                <Select label="Calle decisiva" value={form.street} onChange={e=>set('street',e.target.value)}
                  options={[{value:'',label:'— Sin especificar —'},...STREETS]}/>
              </div>

              {/* Board por calles */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Board</div>
                <BoardPreview flop={form.boardFlop} turn={form.boardTurn} river={form.boardRiver}/>
                <CardPicker label="Flop" max={3}
                  selected={form.boardFlop||[]}
                  onChange={v=>set('boardFlop',v)}
                  blocked={[...(form.boardTurn?[form.boardTurn]:[]),...(form.boardRiver?[form.boardRiver]:[])]}
                  accentColor="var(--accent)"
                />
                <CardPicker label="Turn" max={1}
                  selected={form.boardTurn?[form.boardTurn]:[]}
                  onChange={v=>set('boardTurn',v[0]||'')}
                  blocked={[...(form.boardFlop||[]),...(form.boardRiver?[form.boardRiver]:[])]}
                  accentColor="var(--amber)"
                />
                <CardPicker label="River" max={1}
                  selected={form.boardRiver?[form.boardRiver]:[]}
                  onChange={v=>set('boardRiver',v[0]||'')}
                  blocked={[...(form.boardFlop||[]),...(form.boardTurn?[form.boardTurn]:[])]}
                  accentColor="var(--red)"
                />
              </div>

              <div style={{ background:'rgba(74,222,128,0.04)', border:'1px solid rgba(74,222,128,0.1)', borderRadius:7, padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', lineHeight:1.6 }}>
                💡 Las cartas se bloquean automáticamente entre calles. El rango del villano se serializa para el análisis de IA.
              </div>
            </div>
          )}

          {/* ── Tab IA ── */}
          {formTab==='ai' && editId && (
            <AIHandAnalysis hand={currentHand} onSaveAnalysis={aiData=>saveAIResult(editId,aiData)}/>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:'1px solid var(--border)', marginTop:4 }}>
            <Button variant="secondary" onClick={()=>setModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveHand}>{editId?'Guardar cambios':'Añadir mano'}</Button>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmId} title="Eliminar mano"
        message="¿Eliminar esta mano? Esta acción no se puede deshacer."
        onConfirm={()=>deleteHand(confirmId)} onCancel={()=>setConfirmId(null)}/>

      <APIKeyModal open={apiKeyOpen} onClose={()=>setApiKeyOpen(false)}/>
    </div>
  )
}