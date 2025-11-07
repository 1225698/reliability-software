import React, { useState } from 'react';
import { AllocationProvider, useAllocation } from './state';
import { SystemLevelAllocation } from './SystemLevelAllocation';
import { UnitLevelAllocation } from './UnitLevelAllocation';
import { AllocationCharts } from './AllocationCharts';

const TabsInner: React.FC = () => {
  const [tab, setTab] = useState<'system' | 'unit'>('system');
  const { exportAll } = useAllocation();
  return (
    <div className='allocation-root-react'>
      <div className='tab-bar'>
  <button className={tab === 'system' ? 'active' : ''} onClick={() => setTab('system')}>系统级分配</button>
  <button className={tab === 'unit' ? 'active' : ''} onClick={() => setTab('unit')}>单元级分配</button>
        <div style={{ flex: 1 }} />
        <button onClick={exportAll} className='export-btn'>导出结果</button>
      </div>
      <div className='tab-content'>
        {tab === 'system' && <SystemLevelAllocation />}
        {tab === 'unit' && <UnitLevelAllocation />}
      </div>
      <div style={{ marginTop: '1.2rem' }}>
        {tab === 'system' && <AllocationCharts mode='system' />}
        {tab === 'unit' && <AllocationCharts mode='unit' />}
      </div>
      <style>{`
        .allocation-root-react { font-family: system-ui, sans-serif; }
        .tab-bar { display:flex; gap:.6rem; margin-bottom:.8rem; border-bottom:1px solid #e0e0e0; }
        .tab-bar button { background:none; border:none; padding:.55rem 1rem; cursor:pointer; border-bottom:2px solid transparent; font-size:.9rem; }
        .tab-bar button.active { color:#1476ff; border-color:#1476ff; font-weight:600; }
        .tab-bar button:hover { background:#f5f7fa; }
        .tab-bar .export-btn { background:#1476ff; color:#fff; border-radius:4px; border:1px solid #1476ff; }
        .tab-content { background:#fff; border:1px solid #eee; padding:1rem; border-radius:6px; }
      `}</style>
    </div>
  );
};

export const ReliabilityAllocationApp: React.FC = () => {
  return (
    <AllocationProvider>
      <TabsInner />
    </AllocationProvider>
  );
};
