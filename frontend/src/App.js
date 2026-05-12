import React, { useState, useCallback } from 'react';
import Header    from './components/Header';
import Sidebar   from './components/Sidebar';
import Overview  from './components/Overview';
import Breakdown from './components/Breakdown';
import Waste     from './components/Waste';
import Analysis  from './components/Analysis';
import { Toast } from './components/ui';
import { useApi } from './hooks/useApi';
import { getCost, getCostByService, getIdleEc2, getAnalysis } from './services/api';

const GLOBAL_STYLES = `
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  button { font-family: inherit; }
`;

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast,     setToast]     = useState(null);

  const { data: cost,     loading: lcost,     error: ecost,     refetch: refetchCost     } = useApi(getCost);
  const { data: services, loading: lservices, error: eservices, refetch: refetchServices } = useApi(getCostByService);
  const { data: analysis, loading: lanalysis, error: eanalysis, refetch: refetchAnalysis } = useApi(getAnalysis);
  const { data: idle,     loading: lidle,     error: eidle,     refetch: refetchIdle     } = useApi(getIdleEc2);

  const loading = { cost: lcost, services: lservices, analysis: lanalysis, idle: lidle };
  const errors  = { cost: ecost, services: eservices, analysis: eanalysis, idle: eidle };

  const handleRefresh = useCallback(() => {
    refetchCost(); refetchServices(); refetchAnalysis(); refetchIdle();
    setToast({ msg: 'Refreshing data…', type: 'info' });
  }, [refetchCost, refetchServices, refetchAnalysis, refetchIdle]);

  const showToast = useCallback((msg, type = 'info') => setToast({ msg, type }), []);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#060c1a' }}>
        <Header onRefresh={handleRefresh} />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar active={activeTab} onChange={setActiveTab} />
          <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', maxWidth: 1000 }}>
            <div key={activeTab} style={{ animation: 'fadeUp 0.3s ease' }}>
              {activeTab === 'overview'  && <Overview  cost={cost} services={services} analysis={analysis} loading={loading} errors={errors} />}
              {activeTab === 'breakdown' && <Breakdown services={services} loading={loading} errors={errors} />}
              {activeTab === 'waste'     && <Waste     idle={idle} loading={loading} errors={errors} onToast={showToast} onRefresh={refetchIdle} />}
              {activeTab === 'analyze'   && <Analysis  analysis={analysis} loading={loading} error={errors} />}
            </div>
          </main>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}