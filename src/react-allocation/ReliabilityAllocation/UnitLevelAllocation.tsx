import React, { useCallback } from 'react';
import { useAllocation } from './state';
import { DataImport } from './DataImport';
import { UnitInputRow } from './types';

function format(num: number, digits = 6) {
  if (!isFinite(num) || num === 0) return '0';
  if (num > 1e6) return num.toExponential(2);
  return Number(num.toFixed(digits)).toString();
}

export const UnitLevelAllocation: React.FC = () => {
  const { systemResults, selectedSystemId, dispatch, unitResults, units } = useAllocation();

  const currentSystem = systemResults.find(s => s.id === selectedSystemId) || null;
  const currentUnits = units.filter(u => u.systemId === selectedSystemId);

  const handleImport = useCallback((rows: Record<string, any>[]) => {
    if (!selectedSystemId) {
      alert('请先在系统级结果中选择一个系统行。');
      return;
    }
    const mapped: UnitInputRow[] = rows.filter(r => r['单元名称']).map((r, i) => ({
      id: `unit-import-${i}-${Date.now()}`,
      systemId: selectedSystemId,
      name: String(r['单元名称']).trim(),
      quantity: r['数量'] != null ? Number(r['数量']) : 1,
      estFailureRate: r['预计故障率'] != null ? Number(r['预计故障率']) : null,
    }));
    if (mapped.length) {
      dispatch({ type: 'SET_UNITS_FOR_SYSTEM', payload: { systemId: selectedSystemId, rows: mapped } });
    } else {
      alert('未识别到有效列，请确认表头：单元名称, 数量, 预计故障率');
    }
  }, [dispatch, selectedSystemId]);

  const updateUnit = (id: string, patch: Partial<UnitInputRow>) => {
    dispatch({ type: 'UPDATE_UNIT', payload: { id, patch } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <section style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label>当前分系统</label><br />
          <select value={selectedSystemId || ''} onChange={e => dispatch({ type: 'SELECT_SYSTEM', payload: e.target.value || null })}>
            <option value=''>-- 请选择 --</option>
            {systemResults.map(s => (
              <option key={s.id} value={s.id}>{s.name} (MTBF {s.allocatedMTBF ? format(s.allocatedMTBF,2) : '-'})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block' }}>单元数据导入</label>
          <DataImport templateType='unit' onData={handleImport} small />
        </div>
        {currentSystem && (
          <div style={{ fontSize: '.8rem', lineHeight: 1.4, maxWidth: 220 }}>
            <strong>系统分配摘要</strong><br />
            MTBF: {currentSystem.allocatedMTBF ? format(currentSystem.allocatedMTBF,2) : '-'} h<br />
            分配故障率: {currentSystem.allocatedFailureRate ? format(currentSystem.allocatedFailureRate, 8) : '-'}
          </div>
        )}
      </section>

      {!selectedSystemId && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '.6rem .8rem', borderRadius: 4, fontSize: '.85rem' }}>
          请先在“系统级分配”结果表中单击选择一个系统，或在此下拉框中选择，以进行单元级分配。
        </div>
      )}

      {selectedSystemId && (
        <>
          <section>
            <h3 style={{ margin: '0 0 .5rem' }}>单元数据</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className='re-table'>
                <thead>
                  <tr>
                    <th style={{ width: '33%' }}>单元名称</th>
                    <th style={{ width: '20%' }}>数量</th>
                    <th style={{ width: 'calc(100% - 33% - 20% - 70px)' }}>预计故障率 (1/h)</th>
                    <th style={{ width: '70px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUnits.map(u => (
                    <tr key={u.id}>
                      <td><input value={u.name} onChange={e => updateUnit(u.id, { name: e.target.value })} /></td>
                      <td><input type='number' value={u.quantity} min={1} onChange={e => updateUnit(u.id, { quantity: Number(e.target.value) })} /></td>
                      <td><input type='number' value={u.estFailureRate != null ? u.estFailureRate.toFixed(9) : ''} placeholder='0' onChange={e => updateUnit(u.id, { estFailureRate: e.target.value ? Number(e.target.value) : null })} /></td>
                      <td>
                        <button
                          onClick={() => dispatch({ type: 'REMOVE_UNIT', payload: { id: u.id } })}
                          style={{ padding: '.25rem .5rem', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, width: '100%' }}
                        >删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '.5rem' }}>
                <button
                  onClick={() => {
                    const id = `unit-${Date.now()}`;
                    dispatch({ type: 'ADD_UNIT', payload: { id, systemId: selectedSystemId!, name: '新单元', quantity: 1, estFailureRate: null } });
                  }}
                  style={{ padding: '.45rem .8rem', background: '#1476ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                >+ 添加单元</button>
              </div>
            </div>
          </section>

          <section>
            <h3 style={{ margin: '0 0 .5rem' }}>单元分配结果</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className='re-table'>
                <thead>
                  <tr>
                    <th>单元名称</th>
                    <th>数量</th>
                    <th>分配系数 k</th>
                    <th>分配 MTBF (h)</th>
                    <th>分配故障率 (1/h)</th>
                  </tr>
                </thead>
                <tbody>
                  {unitResults.map(r => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.quantity}</td>
                      <td>{r.k ? format(r.k,4) : '-'}</td>
                      <td>{r.allocatedMTBF ? format(r.allocatedMTBF,2) : '-'}</td>
                      <td>{r.allocatedFailureRate ? format(r.allocatedFailureRate,8) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <style>{`
        .re-table { border-collapse: collapse; width: 100%; font-size: 13px; }
        .re-table th, .re-table td { border: 1px solid #ddd; padding: .35rem .5rem; text-align: center; }
        .re-table input { width: 100%; padding: .25rem .3rem; font-size: 12px; }
        .re-table tbody tr:hover { background: #fafafa; }
      `}</style>
    </div>
  );
};
