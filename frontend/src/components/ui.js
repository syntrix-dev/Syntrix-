import React, { useEffect } from 'react';

// ─── Colors ───────────────────────────────────────────────────────────────────
export const SERVICE_COLORS = [
  '#1a7aff', '#00c4a4', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

// ─── Formatters ───────────────────────────────────────────────────────────────
export function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ h = 20, w = '100%', style = {} }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 8,
      background: 'rgba(255,255,255,0.06)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
    }}>
      <span style={{
        fontSize: 11, color: '#8899bb',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'DM Mono', monospace",
      }}>{label}</span>
      <span style={{
        fontSize: 26, fontWeight: 700,
        color: accent || '#ffffff',
        fontFamily: "'DM Mono', monospace",
        lineHeight: 1.1,
      }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: '#6677aa' }}>{sub}</span>}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ msg, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { success: '#00c4a4', error: '#ef4444', info: '#1a7aff' };
  const icons  = { success: '✓', error: '✗', info: 'i' };
  const c = colors[type];

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: '#0d1529',
      border: `1px solid ${c}35`,
      borderLeft: `3px solid ${c}`,
      borderRadius: 12, padding: '14px 20px',
      color: '#e8edf8', fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 10,
      minWidth: 250, maxWidth: 380,
      animation: 'slideUp 0.25s ease',
    }}>
      <span style={{ color: c, fontSize: 18, fontWeight: 700 }}>{icons[type]}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: '#8899bb',
        cursor: 'pointer', fontSize: 16, padding: 0,
      }}>×</button>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{
      textAlign: 'center', padding: '56px 32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      <div style={{ fontSize: 40, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: '#c8d4e8' }}>{title}</div>
      {sub && <div style={{ fontSize: 14, color: '#8899bb', maxWidth: 300 }}>{sub}</div>}
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
export function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: accent ? `${accent}08` : 'rgba(255,255,255,0.02)',
      border: accent ? `1px solid ${accent}20` : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: 22,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, color: '#8899bb',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      fontFamily: "'DM Mono', monospace",
      marginBottom: 16,
    }}>{children}</div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color, bg }) {
  return (
    <span style={{
      fontSize: 11, color, background: bg,
      padding: '3px 9px', borderRadius: 7,
      fontWeight: 600, letterSpacing: '0.05em',
      flexShrink: 0,
    }}>{label}</span>
  );
}
