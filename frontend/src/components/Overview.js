import React from 'react';
import { StatCard, Skeleton, Card, SectionLabel, SERVICE_COLORS, fmt } from './ui';
import BarChart from './BarChart';
import { USD_TO_INR } from '../services/api';

export default function Overview({ cost, services, analysis, loading }) {
  const savingsUsd = analysis?.potential_savings_usd_per_month;
  const savingsInr = analysis?.potential_savings_inr_per_month;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Cost Overview
        </h1>
        <p style={{ fontSize: 14, color: '#8899bb', marginTop: 5 }}>
          Last 7 days · live AWS account cost intelligence
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {loading.cost ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} h={96} />)
        ) : cost ? (
          <>
            <StatCard
              label="7-Day Total"
              value={`$${fmt(cost.summary.total_cost_usd)}`}
              sub={`₹${fmt(cost.summary.total_cost_usd * USD_TO_INR, 0)} INR`}
              accent="#1a7aff"
            />
            <StatCard
              label="Avg Daily Cost"
              value={`$${fmt(cost.summary.average_daily_cost)}`}
              sub="per day"
            />
            <StatCard
              label="Potential Savings"
              value={savingsUsd ? `$${fmt(savingsUsd)}/mo` : '—'}
              sub={savingsInr ? `₹${fmt(savingsInr, 0)}/mo` : ''}
              accent="#00c4a4"
            />
            <StatCard
              label="Issues Found"
              value={analysis?.issues_found ?? '—'}
              sub="wasteful resources"
              accent={analysis?.issues_found > 0 ? '#ef4444' : '#00c4a4'}
            />
          </>
        ) : (
          <div style={{ gridColumn: '1/-1', color: '#ef4444', fontSize: 14 }}>
            ✗ Failed to load cost data
          </div>
        )}
      </div>

      {/* ── Daily Trend ── */}
      <Card>
        <SectionLabel>Daily Spend — Last 7 Days (USD)</SectionLabel>
        {loading.cost ? (
          <Skeleton h={110} />
        ) : cost?.daily?.length ? (
          <BarChart data={cost.daily} />
        ) : null}
      </Card>

      {/* ── Top Services ── */}
      <Card>
        <SectionLabel>Top AWS Services</SectionLabel>
        {loading.services ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={20} />)}
          </div>
        ) : services ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {services.services.slice(0, 6).map((s, i) => {
              const max = services.services[0].cost_usd;
              const pct = (s.cost_usd / max) * 100;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: SERVICE_COLORS[i % SERVICE_COLORS.length],
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13, color: '#c8d4e8', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{s.service}</span>
                  <div style={{
                    width: 130, height: 5,
                    background: '#1c2540', borderRadius: 3, overflow: 'hidden', flexShrink: 0,
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: SERVICE_COLORS[i % SERVICE_COLORS.length],
                      borderRadius: 3,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 13, color: '#8899bb',
                    fontFamily: "'DM Mono', monospace",
                    minWidth: 58, textAlign: 'right',
                  }}>${fmt(s.cost_usd)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
