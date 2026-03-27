import React, { useState, useMemo } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Button, Badge, Modal, Input, Select, Textarea, Empty, Confirm } from '../components/UI.jsx'
import { AIHandAnalysis, APIKeyModal } from '../components/AIAnalysis.jsx'

// ── Constantes de cartas ──────────────────────────────────────────
const CARD_RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const CARD_SUITS = [
  { id:'s', symbol:'\u2660', color:'#e8eaf0' },
  { id:'h', symbol:'\u2665', color:'#f87171' },
  { id:'d', symbol:'\u2666', color:'#60a5fa' },
  { id:'c', symbol:'\u2663', color:'#4ade80' },
]

function cardLabel(cid) {
  if (!cid || cid.length < 2) return cid
  const suit = CARD_SUITS.find(s => s.id === cid.slice(-1))
  return cid.slice(0,-1) + (suit ? suit.symbol : cid.slice(-1))
}
function boardStr(cards) {
  return (cards||[]).filter(Boolean).map(cardLabel).join(' ')
}

// ── CardChip ──────────────────────────────────────────────────────
function CardChip({ cid }) {
  const suit = CARD_SUITS.find(s => s.id === cid?.slice(-1))
  const rank = cid?.slice(0,-1)
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:2,background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:5,padding:'2px 7px',fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700}}>
      <span style={{color:'var(--text)'}}>{rank}</span>
      <span style={{color:suit?.color||'var(--text)'}}>{suit?.symbol||''}</span>
    </div>
  )
}

// ── CardPicker ────────────────────────────────────────────────────
function CardPicker({ label, max, selected=[], onChange, blocked=[], accentColor='var(--accent)' }) {
  const [open, setOpen] = useState(false)

  function toggle(cid) {
    if (blocked.includes(cid)) return
    if (selected.includes(cid)) { onChange(selected.filter(c => c !== cid)); return }
    if (selected.length >= max) return
    onChange([...selected, cid])
  }

  const isFull    = selected.length >= max
  const isEmpty   = selected.length === 0
  const remaining = max - selected.length

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
          {label} <span style={{marginLeft:6,color:isFull?accentColor:'var(--text3)'}}>{selected.length}/{max}</span>
        </span>
        {!isEmpty && (
          <button onClick={()=>onChange([])} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,padding:'2px 6px'}}>
            \u00d7 Limpiar
          </button>
        )}
      </div>

      <div onClick={()=>setOpen(o=>!o)} style={{
        display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',minHeight:38,padding:'6px 10px',
        background:'var(--surface)',border:`1px solid ${open?accentColor:'var(--border2)'}`,
        borderRadius:open?'7px 7px 0 0':'7px',cursor:'pointer',transition:'border-color 0.15s',
      }}>
        {isEmpty
          ? <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text3)'}}>
              {open?'Selecciona cartas \u2191':`Seleccionar ${max} carta${max>1?'s':''} \u2192`}
            </span>
          : selected.map(cid => <CardChip key={cid} cid={cid}/>)
        }
        {!isEmpty && !isFull && (
          <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',marginLeft:4}}>+{remaining} m\u00e1s</span>
        )}
      </div>

      {open && (
        <div style={{border:`1px solid ${accentColor}`,borderTop:'none',borderRadius:'0 0 7px 7px',background:'var(--bg2)',overflow:'hidden'}}>

          {/* Header rangos */}
          <div style={{display:'grid',gridTemplateColumns:'28px repeat(13,1fr)',gap:3,padding:'8px 10px 4px',borderBottom:'1px solid var(--border)'}}>
            <div/>
            {CARD_RANKS.map(r => (
              <div key={r} style={{textAlign:'center',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',fontWeight:600}}>{r}</div>
            ))}
          </div>

          {/* Filas por palo */}
          {CARD_SUITS.map(suit => (
            <div key={suit.id} style={{display:'grid',gridTemplateColumns:'28px repeat(13,1fr)',gap:3,padding:'4px 10px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-mono)',fontSize:15,color:suit.color}}>{suit.symbol}</div>
              {CARD_RANKS.map(rank => {
                const cid        = rank + suit.id
                const isSelected = selected.includes(cid)
                const isBlocked  = blocked.includes(cid)
                const isDisabled = isBlocked || (isFull && !isSelected)
                return (
                  <div key={cid} onClick={()=>!isDisabled&&toggle(cid)} title={isBlocked?'Carta ya usada':cardLabel(cid)} style={{
                    height:30,display:'flex',alignItems:'center',justifyContent:'center',
                    borderRadius:5,cursor:isDisabled?'not-allowed':'pointer',transition:'all 0.1s',
                    fontFamily:'var(--font-mono)',fontSize:11,fontWeight:700,
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

          {/* Footer */}
          <div style={{padding:'6px 10px 8px',borderTop:'1px solid var(--border)',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>{isFull?`\u2713 ${max} carta${max>1?'s':''} lista${max>1?'s':''}`:`Selecciona ${remaining} carta${remaining>1?'s':''} m\u00e1s`}</span>
            {isFull && (
              <button onClick={()=>setOpen(false)} style={{background:accentColor,border:'none',borderRadius:5,color:'#0d1a0d',fontFamily:'var(--font-mono)',fontSize:10,fontWeight:700,padding:'3px 10px',cursor:'pointer'}}>
                Cerrar \u2713
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── BoardPreview ──────────────────────────────────────────────────
function BoardPreview({ flop, turn, river }) {
  if (!flop?.length && !turn && !river) return null
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px'}}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.1em',flexShrink:0}}>Board</span>
      {flop?.length>0 && (
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginRight:2}}>F</span>
          {flop.map(cid=><CardChip key={cid} cid={cid}/>)}
        </div>
      )}
      {flop?.length>0&&turn&&<span style={{color:'var(--border2)',fontSize:14}}>\u2502</span>}
      {turn && (
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginRight:2}}>T</span>
          <CardChip cid={turn}/>
        </div>
      )}
      {turn&&river&&<span style={{color:'var(--border2)',fontSize:14}}>\u2502</span>}
      {river && (
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginRight:2}}>R</span>
          <CardChip cid={river}/>
        </div>
      )}
    </div>
  )
}

// ── HeroHandInput ─────────────────────────────────────────────────
function HeroHandInput({ value, onChange }) {
  const [r1, setR1] = useState('')
  const [r2, setR2] = useState('')
  const [s,  setS]  = useState(false)

  function build(a, b, suited) {
    if (!a||!b) { onChange(''); return }
    const ORD = 'AKQJT98765432'
    const ia=ORD.indexOf(a), ib=ORD.indexOf(b)
    if (a===b) { onChange(a+b); return }
    const [hi,lo] = ia<ib?[a,b]:[b,a]
    onChange(hi+lo+(suited?'s':'o'))
  }

  const rs = (r,sel) => ({
    width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',
    borderRadius:5,cursor:'pointer',transition:'all 0.1s',fontFamily:'var(--font-mono)',fontSize:12,
    background:sel?'var(--accent)':'var(--surface)',
    border:`1px solid ${sel?'var(--accent)':'var(--border)'}`,
    color:sel?'#0d1a0d':'var(--text2)',
  })

  return (
    <div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>
        Hero hand {value&&<span style={{color:'var(--accent)',marginLeft:8}}>{value}</span>}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',width:16}}>1\u00aa</span>
          {CARD_RANKS.map(r=><div key={r} style={rs(r,r1===r)} onClick={()=>{setR1(r);build(r,r2,s)}}>{r}</div>)}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',width:16}}>2\u00aa</span>
          {CARD_RANKS.map(r=><div key={r} style={rs(r,r2===r)} onClick={()=>{setR2(r);build(r1,r,s)}}>{r}</div>)}
        </div>
        {r1&&r2&&r1!==r2&&(
          <div style={{display:'flex',gap:8}}>
            {[['s','Suited'],['o','Offsuit']].map(([v,l])=>(
              <button key={v} onClick={()=>{setS(v==='s');build(r1,r2,v==='s')}} style={{
                padding:'3px 10px',borderRadius:5,cursor:'pointer',transition:'all 0.1s',fontFamily:'var(--font-mono)',fontSize:11,
                background:(v==='s')===s?'rgba(74,222,128,0.12)':'var(--surface2)',
                border:`1px solid ${(v==='s')===s?'rgba(74,222,128,0.3)':'var(--border)'}`,
                color:(v==='s')===s?'var(--accent)':'var(--text2)',
              }}>{l}</button>
            ))}
          </div>
        )}
        <input value={value} onChange={e=>{onChange(e.target.value);setR1('');setR2('')}}
          placeholder="O escribe: AKs, QJo, 99\u2026"
          style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:12,padding:'6px 10px',outline:'none',width:'100%'}}
          onFocus={e=>e.target.style.borderColor='var(--accent)'}
          onBlur={e=>e.target.style.borderColor='var(--border2)'}
        />
      </div>
    </div>
  )
}

// ── Listas de opciones ────────────────────────────────────────────
const POSITIONS = [
  {value:'BTN',label:'BTN \u2014 Button'},{value:'CO',label:'CO \u2014 Cutoff'},
  {value:'HJ',label:'HJ \u2014 Hijack'},{value:'UTG',label:'UTG \u2014 Under the Gun'},
  {value:'SB',label:'SB \u2014 Small Blind'},{value:'BB',label:'BB \u2014 Big Blind'},
]
const RESULTS = [
  {value:'win',label:'\u2713 Victoria'},{value:'loss',label:'\u2717 Derrota'},{value:'even',label:'~ Break-even'},
]
const PREFLOP_ACTIONS = [
  {value:'open',label:'Open raise'},{value:'call',label:'Call'},
  {value:'3bet',label:'3-bet'},{value:'4bet',label:'4-bet'},{value:'limp',label:'Limp'},
]
const STREETS = [
  {value:'preflop',label:'Preflop'},{value:'flop',label:'Flop'},
  {value:'turn',label:'Turn'},{value:'river',label:'River'},
]
const TAGS = ['Bluff','Value bet','Hero call','Bad beat','Spot correcto','Error propio','3-bet pot','Multiway']

const EMPTY_FORM = {
  date:new Date().toISOString().split('T')[0],
  position:'BTN', result:'win', amount:'',
  heroHand:'', villainRange:'', preflopAction:'', street:'',
  boardFlop:[],   // array de cardIds: ["As","Kh","7c"]
  boardTurn:'',   // cardId: "Td"
  boardRiver:'',  // cardId: "2h"
  notes:'', tags:[],
}

// ── P\u00e1gina principal ──────────────────────────────────────────────────
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
    if (!parts.length && f.board) return f.board   // compatibilidad manos antiguas
    return parts.join(' | ')
  }

  function migrateHand(hand) {
    const out = { ...EMPTY_FORM, ...hand, tags: hand.tags||[] }
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
    setForm({...EMPTY_FORM, date:new Date().toISOString().split('T')[0]})
    setEditId(null); setFormTab('basic'); setModalOpen(true)
  }
  function openEdit(hand) {
    setForm(migrateHand(hand))
    setEditId(hand.id); setFormTab('basic'); setModalOpen(true)
  }
  function saveHand() {
    if (!form.date||!form.position) return
    const hs2save = { ...form, board: serializeBoard(form) }
    setData(prev => {
      const hs = prev.hands||[]
      if (editId) return {...prev, hands:hs.map(h=>h.id===editId?{...hs2save,id:editId}:h)}
      return {...prev, hands:[{...hs2save,id:'h'+Date.now()},...hs]}
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

  const cols = ['Fecha','Pos','Hero','Board','Resultado','\u20ac','IA','']

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <PageHeader
        title="Manos"
        subtitle={`${hands.length} manos \u00b7 ${hands.filter(h=>h.heroHand).length} con rango \u00b7 ${hands.filter(h=>h.aiAnalysis).length} analizadas`}
        action={
          <div style={{display:'flex',gap:8}}>
            <Button variant="secondary" size="sm" onClick={()=>setApiKeyOpen(true)}>\ud83e\udd16 API Key</Button>
            <Button onClick={openNew}>+ Nueva mano</Button>
          </div>
        }
      />

      {/* Filtros */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 28px',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap'}}>
        {[{id:'all',label:'Todas'},{id:'win',label:'\u2713 Victorias'},{id:'loss',label:'\u2717 Derrotas'},{id:'even',label:'~ Break-even'}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{
            fontFamily:'var(--font-mono)',fontSize:12,padding:'4px 12px',borderRadius:20,cursor:'pointer',transition:'all 0.15s',
            background:filter===f.id?'rgba(74,222,128,0.12)':'var(--surface)',
            border:`1px solid ${filter===f.id?'rgba(74,222,128,0.3)':'var(--border)'}`,
            color:filter===f.id?'var(--accent)':'var(--text2)',
          }}>{f.label}</button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar\u2026"
          style={{marginLeft:'auto',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:12,padding:'5px 10px',outline:'none',width:200}}
          onFocus={e=>e.target.style.borderColor='var(--accent)'}
          onBlur={e=>e.target.style.borderColor='var(--border2)'}
        />
      </div>

      {/* Tabla */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 28px'}}>
        {filtered.length===0
          ? <Empty icon="\ud83c\udccf" message="No hay manos" sub="A\u00f1ade tu primera mano con el bot\u00f3n superior"/>
          : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>{cols.map(h=>(
                  <th key={h} style={{textAlign:'left',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.1em',padding:'0 8px 10px 0',borderBottom:'1px solid var(--border)'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((hand,i)=>{
                  const bd = serializeBoard(hand)
                  return (
                    <tr key={hand.id} onClick={()=>openEdit(hand)}
                      style={{borderBottom:i<filtered.length-1?'1px solid var(--border)':'none',cursor:'pointer',transition:'background 0.1s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <td style={{padding:'11px 8px 11px 0',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text2)',whiteSpace:'nowrap'}}>{hand.date}</td>
                      <td style={{padding:'11px 8px'}}><Badge color="blue">{hand.position||'\u2014'}</Badge></td>
                      <td style={{padding:'11px 8px',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--accent)',whiteSpace:'nowrap'}}>
                        {hand.heroHand||<span style={{color:'var(--text3)'}}>—</span>}
                      </td>
                      <td style={{padding:'11px 8px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {bd||<span style={{opacity:0.4}}>\u2014</span>}
                      </td>
                      <td style={{padding:'11px 8px'}}>
                        <Badge color={hand.result==='win'?'green':hand.result==='loss'?'red':'gray'}>
                          {hand.result==='win'?'Victoria':hand.result==='loss'?'Derrota':'BE'}
                        </Badge>
                      </td>
                      <td style={{padding:'11px 8px',fontFamily:'var(--font-mono)',fontSize:12,color:hand.amount?(hand.result==='win'?'var(--accent)':'var(--red)'):'var(--text3)',whiteSpace:'nowrap'}}>
                        {hand.amount?`${hand.result==='win'?'+':'-'}${hand.amount}\u20ac`:'\u2014'}
                      </td>
                      <td style={{padding:'11px 8px'}}>
                        {hand.aiAnalysis
                          ? <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:hand.aiAnalysis.score>=7?'var(--accent)':hand.aiAnalysis.score>=5?'var(--amber)':'var(--red)'}}>{hand.aiAnalysis.score}/10</span>
                          : <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)'}}>—</span>
                        }
                      </td>
                      <td style={{padding:'11px 0',textAlign:'right'}}>
                        <button onClick={e=>{e.stopPropagation();setConfirmId(hand.id)}}
                          style={{background:'transparent',border:'1px solid transparent',borderRadius:5,color:'var(--text3)',padding:'3px 6px',fontSize:12,cursor:'pointer',transition:'all 0.15s'}}
                          onMouseEnter={e=>{e.currentTarget.style.color='var(--red)';e.currentTarget.style.borderColor='rgba(248,113,113,0.3)'}}
                          onMouseLeave={e=>{e.currentTarget.style.color='var(--text3)';e.currentTarget.style.borderColor='transparent'}}
                        >\u00d7</button>
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
      <Modal title={editId?'Editar mano':'Nueva mano'} open={modalOpen} onClose={()=>setModalOpen(false)} width={700}>
        <div style={{display:'flex',flexDirection:'column',gap:0}}>

          {/* Tabs */}
          <div style={{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:16}}>
            {[{id:'basic',label:'\ud83d\udccb B\u00e1sico'},{id:'range',label:'\ud83c\udccf Rangos & Board'},{id:'ai',label:'\ud83e\udd16 IA',disabled:!editId}].map(t=>(
              <button key={t.id} onClick={()=>!t.disabled&&setFormTab(t.id)} style={{
                padding:'8px 14px',background:'transparent',border:'none',
                borderBottom:`2px solid ${formTab===t.id?'var(--accent)':'transparent'}`,
                color:t.disabled?'var(--text3)':formTab===t.id?'var(--accent)':'var(--text2)',
                fontFamily:'var(--font-mono)',fontSize:11,cursor:t.disabled?'not-allowed':'pointer',
                transition:'all 0.15s',opacity:t.disabled?0.4:1,
              }}>{t.label}</button>
            ))}
          </div>

          {/* Tab B\u00e1sico */}
          {formTab==='basic'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Input label="Fecha" type="date" value={form.date} onChange={e=>set('date',e.target.value)}/>
                <Input label="Importe (\u20ac)" type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0"/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Select label="Posici\u00f3n"  value={form.position} onChange={e=>set('position',e.target.value)} options={POSITIONS}/>
                <Select label="Resultado" value={form.result}   onChange={e=>set('result',e.target.value)}   options={RESULTS}/>
              </div>
              <div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Tags</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {TAGS.map(tag=>(
                    <button key={tag} onClick={()=>toggleTag(tag)} style={{
                      fontFamily:'var(--font-mono)',fontSize:11,padding:'3px 10px',borderRadius:20,cursor:'pointer',transition:'all 0.15s',
                      background:form.tags.includes(tag)?'rgba(167,139,250,0.15)':'var(--surface2)',
                      border:`1px solid ${form.tags.includes(tag)?'rgba(167,139,250,0.35)':'var(--border)'}`,
                      color:form.tags.includes(tag)?'var(--purple)':'var(--text2)',
                    }}>{tag}</button>
                  ))}
                </div>
              </div>
              <Textarea label="Descripci\u00f3n de la mano" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={4}
                placeholder="Describe la situaci\u00f3n: stack, acci\u00f3n calle a calle, reads\u2026"/>
            </div>
          )}

          {/* Tab Rangos & Board */}
          {formTab==='range'&&(
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <HeroHandInput value={form.heroHand} onChange={v=>set('heroHand',v)}/>

              <div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Rango estimado del villano</div>
                <input value={form.villainRange} onChange={e=>set('villainRange',e.target.value)}
                  placeholder="Ej: TT+, AK, AQs \u2014 o 'tight-passive'\u2026"
                  style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:13,padding:'8px 10px',outline:'none'}}
                  onFocus={e=>e.target.style.borderColor='var(--accent)'}
                  onBlur={e=>e.target.style.borderColor='var(--border2)'}
                />
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Select label="Acci\u00f3n preflop" value={form.preflopAction} onChange={e=>set('preflopAction',e.target.value)}
                  options={[{value:'',label:'\u2014 Sin especificar \u2014'},...PREFLOP_ACTIONS]}/>
                <Select label="Calle decisiva" value={form.street} onChange={e=>set('street',e.target.value)}
                  options={[{value:'',label:'\u2014 Sin especificar \u2014'},...STREETS]}/>
              </div>

              {/* Board por calles */}
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Board</div>

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

              <div style={{background:'rgba(74,222,128,0.04)',border:'1px solid rgba(74,222,128,0.1)',borderRadius:7,padding:'10px 14px',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',lineHeight:1.6}}>
                \ud83d\udca1 Las cartas se bloquean autom\u00e1ticamente entre calles. El board se guarda estructurado para el an\u00e1lisis de IA.
              </div>
            </div>
          )}

          {/* Tab IA */}
          {formTab==='ai'&&editId&&(
            <AIHandAnalysis hand={currentHand} onSaveAnalysis={aiData=>saveAIResult(editId,aiData)}/>
          )}

          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:12,borderTop:'1px solid var(--border)',marginTop:4}}>
            <Button variant="secondary" onClick={()=>setModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveHand}>{editId?'Guardar cambios':'A\u00f1adir mano'}</Button>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirmId} title="Eliminar mano"
        message="\u00bfEliminar esta mano? Esta acci\u00f3n no se puede deshacer."
        onConfirm={()=>deleteHand(confirmId)} onCancel={()=>setConfirmId(null)}/>

      <APIKeyModal open={apiKeyOpen} onClose={()=>setApiKeyOpen(false)}/>
    </div>
  )
}