import React from 'react';

export default function Header({ onRefresh }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(6,12,26,0.92)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      height: 62,
      display: 'flex', alignItems: 'center',
      padding: '0 32px',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'linear-gradient(135deg, #1a7aff 0%, #00c4a4 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 800, color: '#fff',
        }}>S</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Syntrix
          </div>
          <div style={{ fontSize: 10, color: '#8899bb', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            AWS Cost Intelligence
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: 'rgba(0,196,164,0.1)', border: '1px solid rgba(0,196,164,0.25)',
          color: '#00c4a4', borderRadius: 8, padding: '4px 12px',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
        }}>● LIVE</div>
        <div style={{ fontSize: 12, color: '#8899bb', fontFamily: "'DM Mono', monospace" }}>
          {process.env.REACT_APP_AWS_REGION || 'ap-south-1'}
        </div>
        <button onClick={onRefresh} style={{
          background: 'rgba(26,122,255,0.1)', border: '1px solid rgba(26,122,255,0.3)',
          color: '#1a7aff', borderRadius: 9, padding: '7px 16px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>↻ Refresh</button>
      </div>
    </header>
  );
}

import React from 'react';
import { DEMO_MODE } from '../services/api';

export default function Header({ onRefresh }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(6,12,26,0.92)',
      backdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      height: 62,
      display: 'flex', alignItems: 'center',
      padding: '0 32px',
      justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'linear-gradient(135deg, #1a7aff 0%, #00c4a4 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.03em',
        }}>S</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Syntrix
          </div>
          <div style={{ fontSize: 10, color: '#8899bb', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            AWS Cost Intelligence
          </div>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {DEMO_MODE && (
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#f59e0b',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
          }}>⚡ DEMO MODE</div>
        )}
        <div style={{ fontSize: 12, color: '#8899bb', fontFamily: "'DM Mono', monospace" }}>
          ap-south-1
        </div>
        <button
          onClick={onRefresh}
          style={{
            background: 'rgba(26,122,255,0.1)',
            border: '1px solid rgba(26,122,255,0.3)',
            color: '#1a7aff',
            borderRadius: 9, padding: '7px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.15s',
          }}
        >
          ↻ Refresh
        </button>
      </div>
    </header>
  );
}
