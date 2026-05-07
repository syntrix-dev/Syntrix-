import React from 'react';
import { fmt, fmtDate } from './ui';

export default function BarChart({ data }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map((d) => d.cost_usd));

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 110 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = Math.max(4, (d.cost_usd / max) * 80);
        return (
          <div
            key={i}
            title={`${fmtDate(d.date)}: $${d.cost_usd}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <span style={{
              fontSize: 10, color: isLast ? '#1a7aff' : '#6677aa',
              fontFamily: "'DM Mono', monospace",
              fontWeight: isLast ? 600 : 400,
            }}>
              ${d.cost_usd}
            </span>
            <div style={{
              width: '100%',
              height: `${h}px`,
              background: isLast ? '#1a7aff' : 'rgba(26,122,255,0.28)',
              borderRadius: '4px 4px 2px 2px',
              border: isLast ? '1px solid rgba(26,122,255,0.55)' : 'none',
              transition: 'height 0.8s cubic-bezier(.23,1,.32,1)',
            }} />
            <span style={{ fontSize: 10, color: '#6677aa' }}>{fmtDate(d.date)}</span>
          </div>
        );
      })}
    </div>
  );
}
