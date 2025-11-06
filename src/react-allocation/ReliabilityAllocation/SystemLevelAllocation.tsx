import React, { useCallback } from 'react';
import { useAllocation } from './state';
import { DataImport } from './DataImport';
import { SystemInputRow } from './types';

function format(num: number, digits = 6) {
  if (!isFinite(num) || num === 0) return '0';
  if (num > 1e5) return num.toExponential(2);
  return Number(num.toFixed(digits)).toString();
}

export const SystemLevelAllocation: React.FC = () => {
  const { params, dispatch, systems, systemResults, validation, selectedSystemId } = useAllocation();

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
          <label>系统数量</label><br />
          <input type="number" min={1} value={params.systemCount} onChange={e => dispatch({ type: 'SET_PARAMS', payload: { systemCount: Number(e.target.value) } })} />
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
        <h3 style={{ margin: '0 0 .5rem' }}>手动输入 / 编辑</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="re-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>系统名称</th>
                <th>预计故障率 (1/h)</th>
              </tr>
            </thead>
            <tbody>
              {systems.map(sys => (
                <tr key={sys.id} className={selectedSystemId === sys.id ? 'active-row' : ''} onClick={() => dispatch({ type: 'SELECT_SYSTEM', payload: sys.id })}>
                  <td>
                    <input value={sys.name} onChange={e => updateSystemField(sys.id, 'name', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" value={sys.estFailureRate ?? ''} placeholder="0" onChange={e => updateSystemField(sys.id, 'estFailureRate', e.target.value ? Number(e.target.value) : null)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 style={{ margin: '0 0 .5rem' }}>计算结果</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="re-table">
            <thead>
              <tr>
                <th>系统名称</th>
                <th>预计故障率</th>
                <th>分配系数 k</th>
                <th>分配 MTBF (h)</th>
                <th>分配故障率 (1/h)</th>
              </tr>
            </thead>
            <tbody>
              {systemResults.map(r => (
                <tr key={r.id} className={selectedSystemId === r.id ? 'active-row' : ''} onClick={() => dispatch({ type: 'SELECT_SYSTEM', payload: r.id })}>
                  <td>{r.name}</td>
                  <td>{r.estFailureRate != null ? format(r.estFailureRate) : '-'}</td>
                  <td>{r.k ? format(r.k, 4) : '-'}</td>
                  <td>{r.allocatedMTBF ? format(r.allocatedMTBF, 2) : '-'}</td>
                  <td>{r.allocatedFailureRate ? format(r.allocatedFailureRate) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 style={{ margin: '0 0 .5rem' }}>校验信息</h3>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '.85rem', color: '#555' }}>
          {validation.map((v, i) => (
            <li key={i} style={{ color: v.level === 'error' ? '#d93026' : v.level === 'warning' ? '#e67e22' : '#555' }}>{v.message}</li>
          ))}
          {!validation.length && <li style={{ color: '#2e7d32' }}>无明显问题。</li>}
        </ul>
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
