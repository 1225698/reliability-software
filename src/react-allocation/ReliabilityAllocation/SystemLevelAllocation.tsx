import React, { useCallback } from 'react';
import { useAllocation } from './state';
import { DataImport } from './DataImport';
import { SystemInputRow } from './types';

function format(num: number, digits = 9) {
  if (!isFinite(num) || num === 0) return '0';
  // 统一保留九位小数，不再使用指数写法，确保可读性
  return num.toFixed(digits);
}

export const SystemLevelAllocation: React.FC = () => {
  const { params, dispatch, systems, systemResults, selectedSystemId } = useAllocation();

  const handleImport = useCallback((rows: Record<string, any>[]) => {
    // Attempt to map columns
    const mapped: SystemInputRow[] = rows.filter(r => r['系统名称']).map((r, i) => ({
      id: `sys-import-${i}-${Date.now()}`,
      name: String(r['系统名称']).trim(),
      estFailureRate: r['预计故障率(1/h)'] != null ? Number(r['预计故障率(1/h)']) : null,
    }));
    if (mapped.length) {
      dispatch({ type: 'SET_SYSTEMS', payload: mapped });
      dispatch({ type: 'SET_PARAMS', payload: { systemCount: mapped.length } });
    } else {
      alert('未识别到有效的列，请确认表头：系统名称, 预计故障率(1/h)');
    }
  }, [dispatch]);

  const updateSystemField = (id: string, field: keyof SystemInputRow, value: any) => {
    dispatch({ type: 'UPDATE_SYSTEM', payload: { id, patch: { [field]: value } } });
  };

  return (
    <div className="panel system-level" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
        <div>
          <label>任务 MTBF (h)</label><br />
          <input type="number" value={params.taskMTBF} min={1} onChange={e => dispatch({ type: 'SET_PARAMS', payload: { taskMTBF: Number(e.target.value) } })} />
        </div>
        <div>
          <label>余量系数 (%)</label><br />
            <input type="number" min={1} max={100} value={Math.round(params.margin * 100)} onChange={e => {
              const v = Math.min(100, Math.max(1, Number(e.target.value)));
              dispatch({ type: 'SET_PARAMS', payload: { margin: v / 100 } });
            }} />
        </div>
        <div>
          <label style={{ display: 'block' }}>导入数据</label>
          <DataImport templateType='system' onData={handleImport} small />
        </div>
        <div>
          <button onClick={() => dispatch({ type: 'RESET' })} style={{ padding: '.5rem .9rem', background: '#eee', border: '1px solid #ccc', borderRadius: 4 }}>重置</button>
        </div>
      </section>

      <section>
        <h3 style={{ margin: '0 0 .5rem' }}>系统数据</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="re-table">
            <thead>
              <tr>
                <th style={{ width: '33%' }}>系统名称</th>
                <th style={{ width: 'calc(100% - 33% - 70px)' }}>预计故障率 (1/h)</th>
                <th style={{ width: '70px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {systems.map(sys => (
                <tr key={sys.id} className={selectedSystemId === sys.id ? 'active-row' : ''}>
                  <td style={{ whiteSpace: 'nowrap' }} onClick={() => dispatch({ type: 'SELECT_SYSTEM', payload: sys.id })}>
                    <input
                      style={{ width: '100%', maxWidth: '100%', padding: '.25rem .4rem' }}
                      value={sys.name}
                      onChange={e => updateSystemField(sys.id, 'name', e.target.value)}
                    />
                  </td>
                  <td onClick={() => dispatch({ type: 'SELECT_SYSTEM', payload: sys.id })}>
                    <input type="number" value={sys.estFailureRate != null ? sys.estFailureRate.toFixed(9) : ''} placeholder="0" onChange={e => updateSystemField(sys.id, 'estFailureRate', e.target.value ? Number(e.target.value) : null)} />
                  </td>
                  <td>
                    <button
                      disabled={systems.length <= 1}
                      onClick={() => dispatch({ type: 'REMOVE_SYSTEM', payload: { id: sys.id } })}
                      style={{ padding: '.25rem .5rem', background: systems.length <= 1 ? '#ccc' : '#ff4d4f', color: '#fff', border: 'none', borderRadius: 4, cursor: systems.length <= 1 ? 'not-allowed' : 'pointer', fontSize: 12, width: '100%' }}
                      title={systems.length <= 1 ? '至少保留一个系统' : '删除此系统'}
                    >删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '.5rem' }}>
            <button
              onClick={() => {
                const id = `sys-${systems.length + 1}-${Date.now()}`;
                dispatch({ type: 'ADD_SYSTEM', payload: { id, name: `系统${systems.length + 1}`, estFailureRate: null } });
              }}
              style={{ padding: '.45rem .8rem', background: '#1476ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >+ 添加系统</button>
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ margin: '0 0 .5rem' }}>系统分配结果</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="re-table">
            <thead>
              <tr>
                <th>系统名称</th>
                <th>分配系数 k</th>
                <th>分配 MTBF (h)</th>
                <th>分配故障率 (1/h)</th>
              </tr>
            </thead>
            <tbody>
              {systemResults.map(r => (
                <tr key={r.id} className={selectedSystemId === r.id ? 'active-row' : ''} onClick={() => dispatch({ type: 'SELECT_SYSTEM', payload: r.id })}>
                  <td>{r.name}</td>
                  <td>{r.k ? format(r.k, 4) : '-'}</td>
                  <td>{r.allocatedMTBF ? format(r.allocatedMTBF, 2) : '-'}</td>
                  <td>{r.allocatedFailureRate ? format(r.allocatedFailureRate) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      <style>{`
        .re-table { border-collapse: collapse; width: 100%; font-size: 13px; }
        .re-table th, .re-table td { border: 1px solid #ddd; padding: .4rem .5rem; text-align: center; }
        .re-table input { width: 100%; padding: .25rem .3rem; font-size: 12px; }
        .re-table tbody tr.active-row { background:#f0f7ff; }
        .re-table tbody tr:hover { background: #fafafa; cursor: pointer; }
      `}</style>
    </div>
  );
};
