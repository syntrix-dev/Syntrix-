import React from 'react';
import { Skeleton, Card, SectionLabel, SERVICE_COLORS, fmt } from './ui';
import DonutChart from './DonutChart';
import { USD_TO_INR } from '../services/api';

export default function Breakdown({ services, loading }) {
  if (loading.services) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton h={36} w={240} />
        <Skeleton h={260} />
        <Skeleton h={180} />
      </div>
    );
  }

  if (!services) {
    return <div style={{ color: '#ef4444', fontSize: 14 }}>✗ Failed to load service data</div>;
  }

  const totalUsd = services.services.reduce((a, x) => a + x.cost_usd, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Cost Breakdown
        </h1>
        <p style={{ fontSize: 14, color: '#8899bb', marginTop: 5 }}>
          7-day aggregated spend by AWS service
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <SectionLabel>Distribution</SectionLabel>
          <DonutChart services={services.services} />
        </Card>

        <Card>
          <SectionLabel>Ranked by Cost</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {services.services.map((s, i) => {
              const pct = ((s.cost_usd / totalUsd) * 100).toFixed(1);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.025)',
                  borderRadius: 9,
                }}>
                  <span style={{
                    fontSize: 10, color: '#6677aa',
                    fontFamily: "'DM Mono', monospace", minWidth: 18,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{
                    width: 7, height: 7, borderRadius: 2,
                    background: SERVICE_COLORS[i % SERVICE_COLORS.length],
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13, color: '#c8d4e8', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{s.service}</span>
                  <span style={{
                    fontSize: 11, color: '#6677aa',
                    fontFamily: "'DM Mono', monospace",
                  }}>{pct}%</span>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: '#fff',
                    fontFamily: "'DM Mono', monospace",
                    minWidth: 60, textAlign: 'right',
                  }}>${fmt(s.cost_usd)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── INR conversion banner ── */}
      <div style={{
        background: 'rgba(0,196,164,0.06)',
        border: '1px solid rgba(0,196,164,0.18)',
        borderRadius: 12, padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#8899bb' }}>
            Total 7-day spend converted at ₹{USD_TO_INR}/USD
          </div>
          <div style={{ fontSize: 12, color: '#6677aa', marginTop: 3 }}>
            ${fmt(totalUsd)} USD
          </div>
        </div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: '#00c4a4',
          fontFamily: "'DM Mono', monospace",
        }}>
          ₹{fmt(totalUsd * USD_TO_INR, 0)}
        </div>
      </div>
    </div>
  );
}
