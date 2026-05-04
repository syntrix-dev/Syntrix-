import React from 'react';
import { SERVICE_COLORS, fmt } from './ui';

export default function DonutChart({ services }) {
  if (!services || !services.length) return null;

  const total = services.reduce((s, x) => s + x.cost_usd, 0);
  const top7  = services.slice(0, 7);

  const cx = 90, cy = 90, r = 72, inner = 42;
  const toRad = (d) => (d * Math.PI) / 180;
  let angle = -90;

  const segments = top7.map((item, i) => {
    const pct = item.cost_usd / total;
    const a   = pct * 360;
    const sa  = angle;
    angle    += a;

    const x1 = cx + r * Math.cos(toRad(sa));
    const y1 = cy + r * Math.sin(toRad(sa));
    const x2 = cx + r * Math.cos(toRad(angle - 0.5));
    const y2 = cy + r * Math.sin(toRad(angle - 0.5));
    const ix1 = cx + inner * Math.cos(toRad(sa));
    const iy1 = cy + inner * Math.sin(toRad(sa));
    const ix2 = cx + inner * Math.cos(toRad(angle - 0.5));
    const iy2 = cy + inner * Math.sin(toRad(angle - 0.5));

    const lg = a > 180 ? 1 : 0;
    const d  = `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${lg} 0 ${ix1} ${iy1} Z`;

    return { ...item, d, color: SERVICE_COLORS[i % SERVICE_COLORS.length], pct };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <svg width={180} height={180} viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="#060c1a" strokeWidth={2} />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fill="#8899bb"
          fontSize={10} fontFamily="'DM Mono', monospace">TOTAL</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill="#ffffff"
          fontSize={15} fontWeight={700} fontFamily="'DM Mono', monospace">
          ${fmt(total, 0)}
        </text>
      </svg>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 9, height: 9, borderRadius: 2,
              background: s.color, flexShrink: 0,
            }} />
            <span style={{
              fontSize: 12, color: '#c8d4e8', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{s.service}</span>
            <span style={{
              fontSize: 11, color: '#8899bb',
              fontFamily: "'DM Mono', monospace", flexShrink: 0,
            }}>{(s.pct * 100).toFixed(1)}%</span>
            <span style={{
              fontSize: 12, color: '#e8edf8',
              fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 52,
              textAlign: 'right',
            }}>${fmt(s.cost_usd, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
