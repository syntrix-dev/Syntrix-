import React, { useState } from 'react';
import { StatCard, Skeleton, Card, SectionLabel, EmptyState, fmt } from './ui';
import { stopEc2Instance, USD_TO_INR } from '../services/api';

function CpuBar({ value }) {
  const pct  = Math.min(value * 20, 100);
  const color = value < 2 ? '#ef4444' : value < 5 ? '#f59e0b' : '#00c4a4';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        flex: 1, height: 6, background: '#1c2540',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 3,
          transition: 'width 0.9s ease',
        }} />
      </div>
      <span style={{
        fontSize: 12, color,
        fontFamily: "'DM Mono', monospace", minWidth: 40,
      }}>{fmt(value, 1)}%</span>
    </div>
  );
}

export default function Waste({ idle, loading, onToast, onRefresh }) {
  const [stopping, setStopping] = useState({});
  const [stopped,  setStopped]  = useState({});

  async function handleStop(instanceId) {
    setStopping((p) => ({ ...p, [instanceId]: true }));
    try {
      const res = await stopEc2Instance(instanceId);
      if (res.status === 'success') {
        onToast(`Instance ${instanceId} is stopping…`, 'success');
        setStopped((p) => ({ ...p, [instanceId]: true }));
      } else {
        onToast(res.message || 'Failed to stop instance', 'error');
      }
    } catch (e) {
      onToast('Error: ' + e.message, 'error');
    } finally {
      setStopping((p) => ({ ...p, [instanceId]: false }));
    }
  }

  const activeInstances = idle?.instances?.filter((i) => !stopped[i.instance_id]) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Waste Detector
        </h1>
        <p style={{ fontSize: 14, color: '#8899bb', marginTop: 5 }}>
          Idle EC2 instances with CPU utilization below 5% in the last hour
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {loading.idle ? (
          [1, 2, 3].map((i) => <Skeleton key={i} h={96} />)
        ) : (
          <>
            <StatCard
              label="Idle Instances"
              value={activeInstances.length}
              sub="running but unused"
              accent={activeInstances.length > 0 ? '#ef4444' : '#00c4a4'}
            />
            <StatCard
              label="Est. Monthly Waste"
              value={`$${fmt(activeInstances.length * 7.5)}`}
              sub={`₹${fmt(activeInstances.length * 7.5 * USD_TO_INR, 0)}/mo`}
              accent="#f59e0b"
            />
            <StatCard
              label="Detection Threshold"
              value="CPU < 5%"
              sub="1 hour average via CloudWatch"
            />
          </>
        )}
      </div>

      {/* ── Instance list ── */}
      <Card>
        <SectionLabel>Idle EC2 Instances</SectionLabel>

        {loading.idle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2].map((i) => <Skeleton key={i} h={80} />)}
          </div>
        ) : activeInstances.length === 0 ? (
          <EmptyState
            icon="✓"
            title="No idle instances detected"
            sub="All running EC2 instances have healthy CPU utilization above 5%"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeInstances.map((inst) => {
              const isStop = stopping[inst.instance_id];
              return (
                <div key={inst.instance_id} style={{
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr auto',
                  gap: 20,
                  alignItems: 'center',
                }}>
                  {/* Instance info */}
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: '#fff',
                      fontFamily: "'DM Mono', monospace",
                    }}>{inst.instance_id}</div>
                    <div style={{
                      fontSize: 12, color: '#8899bb',
                      marginTop: 4, display: 'flex', gap: 10,
                    }}>
                      <span>{inst.instance_type}</span>
                      <span style={{ color: '#445566' }}>·</span>
                      <span style={{ color: '#ef4444' }}>~$7.50/mo waste</span>
                    </div>
                  </div>

                  {/* CPU */}
                  <div>
                    <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 7 }}>
                      CPU Utilization (1h avg)
                    </div>
                    <CpuBar value={inst.cpu} />
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleStop(inst.instance_id)}
                    disabled={isStop}
                    style={{
                      background: isStop ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      color: '#ef4444',
                      borderRadius: 9, padding: '9px 18px',
                      fontSize: 12, fontWeight: 600,
                      cursor: isStop ? 'not-allowed' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: isStop ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isStop ? '⏳ Stopping…' : '⏹ Stop Instance'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Info box ── */}
      <div style={{
        background: 'rgba(26,122,255,0.05)',
        border: '1px solid rgba(26,122,255,0.15)',
        borderRadius: 12, padding: '14px 20px',
        fontSize: 13, color: '#8899bb', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#7aadff' }}>How it works:</strong> Syntrix queries CloudWatch metrics for all running EC2 instances in ap-south-1 and flags any with average CPU below 5% over the past hour. Stopping them saves ~$7.50/instance/month (t2.micro baseline estimate).
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { StatCard, Skeleton, Card, SectionLabel, EmptyState, fmt } from './ui';
import { stopInstance, USD_TO_INR } from '../services/api';

function CpuBar({ value }) {
  const pct  = Math.min(value * 20, 100);
  const color = value < 2 ? '#ef4444' : value < 5 ? '#f59e0b' : '#00c4a4';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        flex: 1, height: 6, background: '#1c2540',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 3,
          transition: 'width 0.9s ease',
        }} />
      </div>
      <span style={{
        fontSize: 12, color,
        fontFamily: "'DM Mono', monospace", minWidth: 40,
      }}>{fmt(value, 1)}%</span>
    </div>
  );
}

export default function Waste({ idle, loading, onToast, onRefresh }) {
  const [stopping, setStopping] = useState({});
  const [stopped,  setStopped]  = useState({});

  async function handleStop(instanceId) {
    setStopping((p) => ({ ...p, [instanceId]: true }));
    try {
      const res = await stopInstance(instanceId);
      if (res.status === 'success') {
        onToast(`Instance ${instanceId} is stopping…`, 'success');
        setStopped((p) => ({ ...p, [instanceId]: true }));
      } else {
        onToast(res.message || 'Failed to stop instance', 'error');
      }
    } catch (e) {
      onToast('Error: ' + e.message, 'error');
    } finally {
      setStopping((p) => ({ ...p, [instanceId]: false }));
    }
  }

  const activeInstances = idle?.instances?.filter((i) => !stopped[i.instance_id]) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          Waste Detector
        </h1>
        <p style={{ fontSize: 14, color: '#8899bb', marginTop: 5 }}>
          Idle EC2 instances with CPU utilization below 5% in the last hour
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {loading.idle ? (
          [1, 2, 3].map((i) => <Skeleton key={i} h={96} />)
        ) : (
          <>
            <StatCard
              label="Idle Instances"
              value={activeInstances.length}
              sub="running but unused"
              accent={activeInstances.length > 0 ? '#ef4444' : '#00c4a4'}
            />
            <StatCard
              label="Est. Monthly Waste"
              value={`$${fmt(activeInstances.length * 7.5)}`}
              sub={`₹${fmt(activeInstances.length * 7.5 * USD_TO_INR, 0)}/mo`}
              accent="#f59e0b"
            />
            <StatCard
              label="Detection Threshold"
              value="CPU < 5%"
              sub="1 hour average via CloudWatch"
            />
          </>
        )}
      </div>

      {/* ── Instance list ── */}
      <Card>
        <SectionLabel>Idle EC2 Instances</SectionLabel>

        {loading.idle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2].map((i) => <Skeleton key={i} h={80} />)}
          </div>
        ) : activeInstances.length === 0 ? (
          <EmptyState
            icon="✓"
            title="No idle instances detected"
            sub="All running EC2 instances have healthy CPU utilization above 5%"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeInstances.map((inst) => {
              const isStop = stopping[inst.instance_id];
              return (
                <div key={inst.instance_id} style={{
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr auto',
                  gap: 20,
                  alignItems: 'center',
                }}>
                  {/* Instance info */}
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: '#fff',
                      fontFamily: "'DM Mono', monospace",
                    }}>{inst.instance_id}</div>
                    <div style={{
                      fontSize: 12, color: '#8899bb',
                      marginTop: 4, display: 'flex', gap: 10,
                    }}>
                      <span>{inst.instance_type}</span>
                      <span style={{ color: '#445566' }}>·</span>
                      <span style={{ color: '#ef4444' }}>~$7.50/mo waste</span>
                    </div>
                  </div>

                  {/* CPU */}
                  <div>
                    <div style={{ fontSize: 11, color: '#8899bb', marginBottom: 7 }}>
                      CPU Utilization (1h avg)
                    </div>
                    <CpuBar value={inst.cpu} />
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleStop(inst.instance_id)}
                    disabled={isStop}
                    style={{
                      background: isStop ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      color: '#ef4444',
                      borderRadius: 9, padding: '9px 18px',
                      fontSize: 12, fontWeight: 600,
                      cursor: isStop ? 'not-allowed' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: isStop ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isStop ? '⏳ Stopping…' : '⏹ Stop Instance'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Info box ── */}
      <div style={{
        background: 'rgba(26,122,255,0.05)',
        border: '1px solid rgba(26,122,255,0.15)',
        borderRadius: 12, padding: '14px 20px',
        fontSize: 13, color: '#8899bb', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#7aadff' }}>How it works:</strong> Syntrix queries CloudWatch metrics for all running EC2 instances in ap-south-1 and flags any with average CPU below 5% over the past hour. Stopping them saves ~$7.50/instance/month (t2.micro baseline estimate).
      </div>
    </div>
  );
}
