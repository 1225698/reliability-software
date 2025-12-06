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
  <button className={tab === 'unit' ? 'active' : ''} onClick={() => setTab('unit')}>LRU级分配</button>
        <div style={{ flex: 1 }} />
        <button onClick={exportAll} className='export-btn'>导出结果</button>
      </div>
      <div className='tab-content'>
        {tab === 'system' && (
          <div className="content-wrapper">
            <SystemLevelAllocation />
            <div className="charts-wrapper">
              <AllocationCharts mode='system' />
            </div>
          </div>
        )}
        {tab === 'unit' && (
          <div className="content-wrapper">
            <UnitLevelAllocation />
            <div className="charts-wrapper">
              <AllocationCharts mode='unit' />
            </div>
          </div>
        )}
      </div>
      <style>{`
        .allocation-root-react { font-family: system-ui, sans-serif; height: 100%; display: flex; flex-direction: column; }
        .tab-bar { display:flex; gap:.6rem; margin-bottom:.8rem; border-bottom:1px solid #e0e0e0; flex-shrink: 0; }
        .tab-bar button { background:none; border:none; padding:.55rem 1rem; cursor:pointer; border-bottom:2px solid transparent; font-size:.9rem; }
        .tab-bar button.active { color:#1476ff; border-color:#1476ff; font-weight:600; }
        .tab-bar button:hover { background:#f5f7fa; }
        .tab-bar .export-btn { background:#1476ff; color:#fff; border-radius:4px; border:1px solid #1476ff; }
        .tab-content { background:#fff; border:1px solid #eee; padding:1rem; border-radius:6px; flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        .content-wrapper { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; gap: 1rem; }
        .charts-wrapper { flex-shrink: 0; overflow-y: auto; max-height: 300px; }
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
