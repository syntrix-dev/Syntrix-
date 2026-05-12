import React from 'react';
import { StatCard, Skeleton, Card, SectionLabel, Badge, EmptyState, fmt } from './ui';
import { USD_TO_INR } from '../services/api';

const ISSUE_META = {
  idle_ec2:    { label: 'Idle EC2',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  hidden_cost: { label: 'Hidden Cost', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

export default function Analysis({ analysis, loading, error }) {
  if (loading.analysis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton h={36} w={200} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[1,2,3,4].map((i) => <Skeleton key={i} h={96} />)}
        </div>
        {[1,2,3].map((i) => <Skeleton key={i} h={70} />)}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ color: '#ef4444', fontSize: 14, padding: 12,
        background: 'rgba(239,68,68,0.06)', borderRadius: 10,
        border: '1px solid rgba(239,68,68,0.2)' }}>
        ✗ Failed to load analysis
      </div>
    );
  }

  const savings    = analysis.potential_savings_inr_per_month;
  const fee        = analysis.your_fee_inr;
  const netMonthly = savings - fee;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Account Analysis
        </h1>
        <p style={{ fontSize: 14, color: '#8899bb', marginTop: 5 }}>
          Full waste audit with automated savings projection
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Issues Found" value={analysis.issues_found} sub="wasteful resources" accent="#ef4444" />
        <StatCard label="Savings / Month" value={`$${fmt(analysis.potential_savings_usd_per_month)}`} sub={`₹${fmt(savings, 0)}/mo`} accent="#00c4a4" />
        <StatCard label="Syntrix Fee (20%)" value={`₹${fmt(fee, 0)}`} sub="charged only on actual savings" />
        <StatCard label="Your Net Gain" value={`₹${fmt(netMonthly, 0)}`} sub="monthly net savings" accent="#1a7aff" />
      </div>

      <Card>
        <SectionLabel>Detected Issues</SectionLabel>
        {analysis.issues.length === 0 ? (
          <EmptyState icon="✓" title="No waste detected" sub="Your AWS account is optimised" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {analysis.issues.map((issue, i) => {
              const meta     = ISSUE_META[issue.type] || ISSUE_META.hidden_cost;
              const wasteInr = issue.estimated_waste_usd_per_month * USD_TO_INR;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '13px 16px',
                  background: 'rgba(255,255,255,0.025)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <Badge label={meta.label} color={meta.color} bg={meta.bg} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#c8d4e8', fontFamily: "'DM Mono', monospace" }}>
                      {issue.resource_id || issue.service}
                    </div>
                    <div style={{ fontSize: 12, color: '#8899bb', marginTop: 2 }}>
                      {issue.type === 'idle_ec2' ? `${issue.instance_type || ''} · CPU ${issue.cpu_percent ?? ''}%` : 'Hidden or underutilised service cost'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', fontFamily: "'DM Mono', monospace" }}>
                      -${fmt(issue.estimated_waste_usd_per_month)}/mo
                    </div>
                    <div style={{ fontSize: 11, color: '#8899bb', marginTop: 2 }}>₹{fmt(wasteInr, 0)}/mo</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card accent="#00c4a4">
        <SectionLabel>Projected Savings Timeline</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[1, 3, 6, 12].map((months) => (
            <div key={months} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 10 }}>
                {months === 1 ? '1 month' : `${months} months`}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#00c4a4', fontFamily: "'DM Mono', monospace" }}>
                ₹{fmt((savings - fee) * months, 0)}
              </div>
              <div style={{ fontSize: 10, color: '#6677aa', marginTop: 6 }}>net after fees</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}