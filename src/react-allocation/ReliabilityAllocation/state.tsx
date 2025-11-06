import React, { createContext, useContext, useReducer, useMemo, useEffect } from 'react';
import { AllocationAction, AllocationParams, AllocationPersistShape, AllocationState, SystemInputRow, SystemAllocationResult, UnitAllocationResult, ValidationIssue, ChartTreeNode } from './types';

const STORAGE_KEY = 'reliability-allocation-state-v1';

const defaultParams: AllocationParams = {
  taskMTBF: 2880,
  margin: 0.9,
  systemCount: 5,
};

function createInitialSystems(count: number): SystemInputRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `sys-${i + 1}`,
    name: `系统${i + 1}`,
    estFailureRate: null,
  }));
}

const initialPersist: AllocationPersistShape = {
  params: defaultParams,
  systems: createInitialSystems(defaultParams.systemCount),
  units: [],
};

const initialState: AllocationState = {
  ...initialPersist,
  selectedSystemId: null,
};

function reducer(state: AllocationState, action: AllocationAction): AllocationState {
  switch (action.type) {
    case 'SET_PARAMS': {
      const params = { ...state.params, ...action.payload };
      let systems = state.systems;
      if (typeof action.payload.systemCount === 'number' && action.payload.systemCount > 0) {
        const n = action.payload.systemCount;
        if (n > systems.length) {
          systems = [...systems, ...createInitialSystems(n - systems.length)];
        } else if (n < systems.length) {
          systems = systems.slice(0, n);
        }
      }
      return { ...state, params, systems };
    }
    case 'SET_SYSTEMS':
      return { ...state, systems: action.payload };
    case 'UPDATE_SYSTEM':
      return { ...state, systems: state.systems.map(s => s.id === action.payload.id ? { ...s, ...action.payload.patch } : s) };
    case 'SET_UNITS_FOR_SYSTEM': {
      const { systemId, rows } = action.payload;
      const others = state.units.filter(u => u.systemId !== systemId);
      return { ...state, units: [...others, ...rows] };
    }
    case 'UPDATE_UNIT':
      return { ...state, units: state.units.map(u => u.id === action.payload.id ? { ...u, ...action.payload.patch } : u) };
    case 'SELECT_SYSTEM':
      return { ...state, selectedSystemId: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface AllocationContextValue extends AllocationState {
  dispatch: React.Dispatch<AllocationAction>;
  systemResults: SystemAllocationResult[];
  unitResults: UnitAllocationResult[];
  validation: ValidationIssue[];
  treeData: ChartTreeNode;
  exportAll: () => void;
}

const AllocationContext = createContext<AllocationContextValue | null>(null);

function revivePersisted(data: any): AllocationPersistShape | null {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.systems) || !Array.isArray(data.units) || !data.params) return null;
  return data as AllocationPersistShape;
}

export const AllocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const persisted = useMemo(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? revivePersisted(JSON.parse(raw)) : null; } catch { return null; }
  }, []);

  const [state, dispatch] = useReducer(reducer, persisted ? { ...persisted, selectedSystemId: null } : initialState);

  // Persist
  useEffect(() => {
    const { systems, units, params }: AllocationPersistShape = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ systems, units, params }));
  }, [state.systems, state.units, state.params]);

  const systemResults: SystemAllocationResult[] = useMemo(() => {
    const margin = state.params.margin || 1;
    const total = state.systems.reduce((acc, s) => acc + (s.estFailureRate || 0), 0);
    return state.systems.map(s => {
      const rate = s.estFailureRate || 0;
      const k = total > 0 && rate > 0 ? rate / total : 0;
      const allocatedMTBF = k > 0 ? state.params.taskMTBF / k / margin : 0;
      const allocatedFailureRate = allocatedMTBF > 0 ? 1 / allocatedMTBF : 0;
      return { ...s, k, allocatedMTBF, allocatedFailureRate };
    });
  }, [state.systems, state.params.taskMTBF, state.params.margin]);

  const unitResults: UnitAllocationResult[] = useMemo(() => {
    if (!state.selectedSystemId) return [];
    const sys = systemResults.find(s => s.id === state.selectedSystemId);
    if (!sys) return [];
    const margin = state.params.margin || 1;
    const units = state.units.filter(u => u.systemId === sys.id);
    const total = units.reduce((acc, u) => acc + (u.estFailureRate || 0) * (u.quantity || 0), 0);
    return units.map(u => {
      const fr = (u.estFailureRate || 0) * (u.quantity || 0);
      const k = total > 0 && fr > 0 ? fr / total : 0;
      const allocatedMTBF = k > 0 ? (sys.allocatedMTBF / k / margin) * (u.quantity || 0) : 0; // 公式包含乘以数量
      const allocatedFailureRate = allocatedMTBF > 0 ? 1 / allocatedMTBF : 0;
      return { ...u, k, allocatedMTBF, allocatedFailureRate };
    });
  }, [state.selectedSystemId, state.units, systemResults, state.params.margin]);

  const validation: ValidationIssue[] = useMemo(() => {
    const issues: ValidationIssue[] = [];
    const totalEst = state.systems.reduce((a, s) => a + (s.estFailureRate || 0), 0);
    if (totalEst <= 0) issues.push({ level: 'warning', message: '系统预计故障率总和为 0，无法进行有效分配。' });
    if (state.params.margin <= 0 || state.params.margin > 1) issues.push({ level: 'error', message: '余量系数需在 (0,1] 区间。' });
    const allocTotal = systemResults.reduce((a, s) => a + s.allocatedFailureRate, 0);
    if (allocTotal > 0 && totalEst > 0) {
      const diff = Math.abs(allocTotal - totalEst) / totalEst;
      if (diff > 0.2) issues.push({ level: 'info', message: '分配后故障率总和与预计值差异较大 (>' + (diff * 100).toFixed(1) + '%)。' });
    }
    return issues;
  }, [state.systems, state.params.margin, systemResults]);

  const treeData: ChartTreeNode = useMemo(() => {
    return {
      name: '任务',
      children: systemResults.map(sys => ({
        name: `${sys.name}\nMTBF:${sys.allocatedMTBF ? sys.allocatedMTBF.toFixed(0) : '-'}`,
        value: sys.allocatedMTBF || 0,
        children: state.units.filter(u => u.systemId === sys.id).map(u => ({
          name: `${u.name} x${u.quantity}`,
          value: u.estFailureRate || 0,
        })),
      })),
    };
  }, [systemResults, state.units]);

  const exportAll = () => {
    import('xlsx').then(xlsx => {
      const sysSheetData = [
        ['系统名称', '预计故障率(1/h)', '分配系数k', '分配MTBF(h)', '分配故障率(1/h)'],
        ...systemResults.map(r => [r.name, r.estFailureRate ?? '', r.k, r.allocatedMTBF, r.allocatedFailureRate])
      ];
      const wb = xlsx.utils.book_new();
      const ws1 = xlsx.utils.aoa_to_sheet(sysSheetData);
      xlsx.utils.book_append_sheet(wb, ws1, '系统分配');

      const allUnits: any[][] = [
        ['所属系统', '单元名称', '数量', '预计故障率', '分配系数', '分配MTBF', '分配故障率']
      ];
      systemResults.forEach(sys => {
        const uRes = state.units.filter(u => u.systemId === sys.id);
        const computed = unitResults.filter(u => u.systemId === sys.id);
        uRes.forEach(u => {
          const c = computed.find(cu => cu.id === u.id);
          allUnits.push([
            sys.name,
            u.name,
            u.quantity,
            u.estFailureRate ?? '',
            c?.k ?? '',
            c?.allocatedMTBF ?? '',
            c?.allocatedFailureRate ?? ''
          ]);
        });
      });
      const ws2 = xlsx.utils.aoa_to_sheet(allUnits);
      xlsx.utils.book_append_sheet(wb, ws2, '单元分配');
      xlsx.writeFile(wb, '可靠性分配结果.xlsx');
    });
  };

  const value: AllocationContextValue = {
    ...state,
    dispatch,
    systemResults,
    unitResults,
    validation,
    treeData,
    exportAll,
  };

  return <AllocationContext.Provider value={value}>{children}</AllocationContext.Provider>;
};

export function useAllocation() {
  const ctx = useContext(AllocationContext);
  if (!ctx) throw new Error('useAllocation 必须在 AllocationProvider 内使用');
  return ctx;
}
