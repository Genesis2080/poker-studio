import React, { useState, useMemo } from 'react'
import { useApp } from '../App.jsx'
import { PageHeader, Badge } from '../components/UI.jsx'
import {
  INITIAL_STUDY_PLAN,
  STREET_ORDER,
  STREET_COLORS,
  STREET_LABELS,
  CATEGORY_COLORS,
  getOverallProgress,
  getProgressByStreet,
  getCategoryProgress,
} from '../data/studyPlan.jsx'

function Checkbox({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 18, height: 18,
        borderRadius: 4,
        border: `2px solid ${checked ? 'var(--accent)' : 'var(--border2)'}`,
        background: checked ? 'var(--accent)' : 'transparent',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4.5 7.5L8 3" stroke="#0d1a0d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function ProgressBar({ percentage, color = 'var(--accent)' }) {
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        width: `${percentage}%`, height: '100%',
        background: color,
        borderRadius: 3,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function StreetSection({ streetId, items, onToggle, filter }) {
  const colors = STREET_COLORS[streetId]
  const label = STREET_LABELS[streetId]

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)
  const completed = filtered.filter(i => i.completed).length

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px',
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: colors.text, fontWeight: 500 }}>
            {label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: colors.text, opacity: 0.7 }}>
            {completed}/{filtered.length}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: colors.text }}>
          {Math.round((completed / filtered.length) * 100)}%
        </span>
      </div>

      <div style={{ padding: '8px' }}>
        {filtered.map(item => (
          <TopicRow key={item.id} item={item} onToggle={() => onToggle(item.id)} />
        ))}
      </div>
    </div>
  )
}

function TopicRow({ item, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const catColors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.fundamentos

  return (
    <div style={{
      padding: '10px 10px',
      borderRadius: 6,
      transition: 'background 0.1s',
      background: expanded ? 'var(--bg2)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ paddingTop: '2px' }}>
          <Checkbox checked={item.completed} onChange={onToggle} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '13px',
            color: item.completed ? 'var(--text3)' : 'var(--text)',
            textDecoration: item.completed ? 'line-through' : 'none',
            cursor: 'pointer',
            marginBottom: '3px',
          }}
          onClick={() => setExpanded(!expanded)}
          >
            {item.topic}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: catColors.text, background: catColors.bg,
              padding: '1px 6px', borderRadius: 4,
            }}>
              {catColors.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{
          marginTop: '8px', marginLeft: '28px',
          padding: '10px 12px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 6,
          fontFamily: 'var(--font-body)', fontSize: '12px',
          color: 'var(--text2)', lineHeight: 1.6,
        }}>
          {item.description}
        </div>
      )}
    </div>
  )
}

function GeneralSection({ items, onToggle, filter }) {
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)
  const completed = filtered.filter(i => i.completed).length

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px',
        background: 'rgba(99,102,241,0.08)',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: '#818cf8', fontWeight: 500 }}>
            General
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#818cf8', opacity: 0.7 }}>
            {completed}/{filtered.length}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#818cf8' }}>
          {Math.round((completed / filtered.length) * 100)}%
        </span>
      </div>

      <div style={{ padding: '8px' }}>
        {filtered.map(item => (
          <TopicRow key={item.id} item={item} onToggle={() => onToggle(item.id)} />
        ))}
      </div>
    </div>
  )
}

export default function StudyPlan() {
  const { data, setData } = useApp()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const studyPlan = data.studyPlan || INITIAL_STUDY_PLAN

  function toggleItem(itemId) {
    const newPlan = JSON.parse(JSON.stringify(studyPlan))
    let found = false
    
    for (const street of [...STREET_ORDER, 'general']) {
      if (newPlan[street]) {
        const item = newPlan[street].find(i => i.id === itemId)
        if (item) {
          item.completed = !item.completed
          found = true
          break
        }
      }
    }
    
    if (found) {
      setData(prev => ({ ...prev, studyPlan: newPlan }))
    }
  }

  function resetAll() {
    const resetPlan = JSON.parse(JSON.stringify(INITIAL_STUDY_PLAN))
    setData(prev => ({ ...prev, studyPlan: resetPlan }))
  }

  const overall = getOverallProgress(studyPlan)
  const byStreet = getProgressByStreet(studyPlan)
  const byCategory = getCategoryProgress(studyPlan)

  const categories = useMemo(() => {
    const cats = new Set()
    for (const street of [...STREET_ORDER, 'general']) {
      if (studyPlan[street]) {
        studyPlan[street].forEach(i => cats.add(i.category))
      }
    }
    return Array.from(cats)
  }, [studyPlan])

  const filteredStudyPlan = useMemo(() => {
    if (!search.trim()) return studyPlan
    
    const q = search.toLowerCase()
    const result = {}
    
    for (const street of [...STREET_ORDER, 'general']) {
      if (studyPlan[street]) {
        result[street] = studyPlan[street].filter(i =>
          i.topic.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
        )
      }
    }
    
    return result
  }, [studyPlan, search])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Plan de Estudios"
        subtitle="Domina el póker calle por calle"
        action={
          <button
            onClick={resetAll}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text2)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '6px 12px', cursor: 'pointer',
            }}
          >
            Resetear todo
          </button>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: 0 }}>
            
            {/* Overall Progress */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '18px',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Progreso Total
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--accent)', lineHeight: 1.1, marginTop: '4px' }}>
                  {overall.percentage}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                  {overall.completed} de {overall.total} temas completados
                </div>
              </div>
              <ProgressBar percentage={overall.percentage} />
            </div>

            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Buscar tema..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                  fontFamily: 'var(--font-body)', fontSize: '13px',
                  padding: '8px 10px', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>

            {/* Filter by category */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Filtrar por categoría
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <FilterBtn label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} />
                {categories.map(cat => {
                  const colors = CATEGORY_COLORS[cat]
                  return (
                    <FilterBtn
                      key={cat}
                      label={colors?.label || cat}
                      active={filter === cat}
                      onClick={() => setFilter(filter === cat ? 'all' : cat)}
                      color={colors?.text}
                    />
                  )
                })}
              </div>
            </div>

            {/* Progress by street */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Por calle
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {STREET_ORDER.map(street => {
                  const p = byStreet[street] || { percentage: 0, completed: 0, total: 0 }
                  const colors = STREET_COLORS[street]
                  return (
                    <div key={street}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: colors.text }}>
                          {STREET_LABELS[street]}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
                          {p.percentage}%
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${p.percentage}%`, height: '100%',
                          background: colors.text, borderRadius: 2,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#818cf8' }}>General</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
                      {byStreet.general?.percentage || 0}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${byStreet.general?.percentage || 0}%`, height: '100%',
                      background: '#818cf8', borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Category progress */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Por categoría
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categories.map(cat => {
                  const p = byCategory[cat] || { percentage: 0 }
                  const colors = CATEGORY_COLORS[cat]
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '9px',
                        color: colors.text, background: colors.bg,
                        padding: '1px 5px', borderRadius: 3,
                        minWidth: 60, textAlign: 'center',
                      }}>
                        {colors?.label || cat}
                      </span>
                      <div style={{ flex: 1, height: 4, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${p.percentage}%`, height: '100%',
                          background: colors.text, borderRadius: 2,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text3)', minWidth: 30 }}>
                        {p.percentage}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {STREET_ORDER.map(street => (
              <StreetSection
                key={street}
                streetId={street}
                items={filteredStudyPlan[street] || []}
                onToggle={toggleItem}
                filter={filter}
              />
            ))}
            
            <GeneralSection
              items={filteredStudyPlan.general || []}
              onToggle={toggleItem}
              filter={filter}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterBtn({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '6px 10px', borderRadius: 6,
        background: active ? (color ? `${color}15` : 'rgba(74,222,128,0.1)') : 'transparent',
        border: `1px solid ${active ? (color ? `${color}30` : 'rgba(74,222,128,0.25)') : 'transparent'}`,
        color: active ? (color || 'var(--accent)') : 'var(--text2)',
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        cursor: 'pointer', transition: 'all 0.15s',
        textAlign: 'left',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: 2, marginRight: '8px',
        background: active ? (color || 'var(--accent)') : 'var(--border2)',
        flexShrink: 0,
      }} />
      {label}
    </button>
  )
}
