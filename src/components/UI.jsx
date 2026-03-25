import React, { useEffect } from 'react'

/* ── Button ───────────────────────────────────────────── */
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px', border: 'none', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-body)', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s', outline: 'none', opacity: disabled ? 0.5 : 1,
  }
  const sizes = {
    sm: { padding: '5px 10px', fontSize: '12px' },
    md: { padding: '7px 14px', fontSize: '13px' },
    lg: { padding: '10px 20px', fontSize: '14px' },
  }
  const variants = {
    primary:   { background: 'var(--accent)',    color: '#0d1a0d' },
    secondary: { background: 'var(--surface2)',  color: 'var(--text2)',  border: '1px solid var(--border2)' },
    danger:    { background: 'rgba(248,113,113,0.12)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.25)' },
    ghost:     { background: 'transparent',      color: 'var(--text2)',  border: '1px solid transparent' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.1)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
    >
      {children}
    </button>
  )
}

/* ── Badge ────────────────────────────────────────────── */
export function Badge({ children, color = 'green' }) {
  const colors = {
    green:  { bg: 'rgba(74,222,128,0.12)',  text: 'var(--accent)',  border: 'rgba(74,222,128,0.25)' },
    red:    { bg: 'rgba(248,113,113,0.12)', text: 'var(--red)',     border: 'rgba(248,113,113,0.25)' },
    amber:  { bg: 'rgba(251,191,36,0.12)',  text: 'var(--amber)',   border: 'rgba(251,191,36,0.25)' },
    blue:   { bg: 'rgba(96,165,250,0.12)',  text: 'var(--blue)',    border: 'rgba(96,165,250,0.25)' },
    purple: { bg: 'rgba(167,139,250,0.12)', text: 'var(--purple)',  border: 'rgba(167,139,250,0.25)' },
    gray:   { bg: 'var(--surface2)',        text: 'var(--text2)',   border: 'var(--border2)' },
  }
  const c = colors[color] || colors.gray
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: 'var(--font-mono)', fontSize: '11px',
      padding: '2px 8px', borderRadius: '20px',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

/* ── Input ────────────────────────────────────────────── */
export function Input({ label, type = 'text', value, onChange, placeholder, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text)',
          fontFamily: 'var(--font-body)', fontSize: '13px',
          padding: '8px 10px', outline: 'none', width: '100%',
          transition: 'border-color 0.15s',
        }}
        onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e   => e.target.style.borderColor = 'var(--border2)'}
      />
    </div>
  )
}

/* ── Select ───────────────────────────────────────────── */
export function Select({ label, value, onChange, options, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>}
      <select
        value={value} onChange={onChange}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text)',
          fontFamily: 'var(--font-body)', fontSize: '13px',
          padding: '8px 10px', outline: 'none', width: '100%',
          cursor: 'pointer', transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

/* ── Textarea ─────────────────────────────────────────── */
export function Textarea({ label, value, onChange, placeholder, rows = 3, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>}
      <textarea
        value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text)',
          fontFamily: 'var(--font-body)', fontSize: '13px',
          padding: '8px 10px', outline: 'none', width: '100%',
          resize: 'vertical', transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e  => e.target.style.borderColor = 'var(--border2)'}
      />
    </div>
  )
}

/* ── Modal ────────────────────────────────────────────── */
export function Modal({ title, open, onClose, children, width = 480 }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-lg)', width, maxWidth: '90vw',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text)' }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border2)',
              borderRadius: '6px', color: 'var(--text2)', width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ── PageHeader ───────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '24px 28px 20px', borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text)', fontWeight: 400, marginBottom: subtitle ? '4px' : 0 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ── KPI Card ─────────────────────────────────────────── */
export function KpiCard({ label, value, sub, color = 'var(--text)', icon }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      {icon && <span style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</span>}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{sub}</div>}
    </div>
  )
}

/* ── Empty state ──────────────────────────────────────── */
export function Empty({ icon = '📭', message, sub }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '10px', padding: '60px 20px', color: 'var(--text3)',
    }}>
      <span style={{ fontSize: '32px', opacity: 0.5 }}>{icon}</span>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text2)' }}>{message}</p>
      {sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{sub}</p>}
    </div>
  )
}

/* ── Confirm dialog ───────────────────────────────────── */
export function Confirm({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '340px', width: '90%',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text)', marginBottom: '8px' }}>{title}</div>
        <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '20px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger"    onClick={onConfirm}>Eliminar</Button>
        </div>
      </div>
    </div>
  )
}