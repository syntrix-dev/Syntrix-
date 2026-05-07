import React from 'react';

const NAV_ITEMS = [
  { id: 'overview',   label: 'Overview',        icon: '◈' },
  { id: 'breakdown',  label: 'Cost Breakdown',   icon: '◉' },
  { id: 'waste',      label: 'Waste Detector',   icon: '◎' },
  { id: 'analyze',    label: 'Analysis',         icon: '◇' },
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      padding: '24px 16px',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{
        fontSize: 10, color: '#6677aa',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        fontFamily: "'DM Mono', monospace",
        padding: '4px 12px 12px',
      }}>Navigation</div>

      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              borderRadius: 10,
              border: isActive ? '1px solid rgba(26,122,255,0.3)' : '1px solid transparent',
              background: isActive ? 'rgba(26,122,255,0.1)' : 'transparent',
              color: isActive ? '#1a7aff' : '#8899bb',
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}

      {/* Bottom info */}
      <div style={{ marginTop: 'auto', padding: '16px 12px 4px' }}>
        <div style={{
          fontSize: 11, color: '#445566',
          fontFamily: "'DM Mono', monospace",
          lineHeight: 1.6,
        }}>
          <div>Syntrix v3.0</div>
          <div>Region: ap-south-1</div>
        </div>
      </div>
    </aside>
  );
}
