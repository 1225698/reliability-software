import React, { createContext, useContext, useReducer, useMemo, useEffect } from 'react';
import { AllocationAction, AllocationParams, AllocationPersistShape, AllocationState, SystemInputRow, SystemAllocationResult, UnitInputRow, UnitAllocationResult, ValidationIssue, ChartTreeNode } from './types';

const STORAGE_KEY = 'reliability-allocation-state-v1';

const defaultParams: AllocationParams = {
  taskMTBF: 2880,
  margin: 0.9,
};

function createInitialSystems(count: number, startIndex = 1): SystemInputRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `sys-${startIndex + i}`,
    name: `系统${startIndex + i}`,
    estFailureRate: null,
  }));
}

const initialPersist: AllocationPersistShape = {
  params: defaultParams,
  systems: createInitialSystems(5), // 默认初始化5个
  units: [],
};

const initialState: AllocationState = {
  ...initialPersist,
  selectedSystemId: null,
};

function reducer(state: AllocationState, action: AllocationAction): AllocationState {
  switch (action.type) {
    case 'SET_PARAMS': {
      // 仅更新任务参数（不再处理 systemCount）
      const params = { ...state.params, ...action.payload };
      return { ...state, params };
    }
    case 'SET_SYSTEMS': {
      const imported: SystemInputRow[] = action.payload;
      const validIds = new Set(imported.map((s: SystemInputRow) => s.id));
      const units = state.units.filter((u: UnitAllocationResult | any) => validIds.has(u.systemId));
      const selectedSystemId = state.selectedSystemId && !validIds.has(state.selectedSystemId) ? null : state.selectedSystemId;
      return { ...state, systems: imported, units, selectedSystemId };
    }
    case 'ADD_SYSTEM': {
      return { ...state, systems: [...state.systems, action.payload] };
    }
      case 'REMOVE_SYSTEM': {
        // Prevent removing last remaining system
        if (state.systems.length <= 1) return state;
        const id = action.payload.id;
        const nextSystems = state.systems.filter(s => s.id !== id);
        const nextUnits = state.units.filter(u => u.systemId !== id);
        // If removed system was selected, clear selection
        const nextSelected = state.selectedSystemId === id ? null : state.selectedSystemId;
        return { ...state, systems: nextSystems, units: nextUnits, selectedSystemId: nextSelected };
      }
    case 'UPDATE_SYSTEM':
  return { ...state, systems: state.systems.map((s: SystemInputRow) => s.id === action.payload.id ? { ...s, ...action.payload.patch } : s) };
    case 'SET_UNITS_FOR_SYSTEM': {
      const { systemId, rows } = action.payload;
  const others = state.units.filter((u: UnitAllocationResult | any) => u.systemId !== systemId);
      return { ...state, units: [...others, ...rows] };
    }
    case 'UPDATE_UNIT':
  return { ...state, units: state.units.map((u: UnitAllocationResult | any) => u.id === action.payload.id ? { ...u, ...action.payload.patch } : u) };
    case 'ADD_UNIT':
      return { ...state, units: [...state.units, action.payload] };
    case 'REMOVE_UNIT': {
      return { ...state, units: state.units.filter(u => u.id !== action.payload.id) };
    }
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

export function AllocationProvider({ children }: { children: React.ReactNode }) {
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
  const total = state.systems.reduce((acc: number, s: SystemInputRow) => acc + (s.estFailureRate || 0), 0);
  return state.systems.map((s: SystemInputRow) => {
      const rate = s.estFailureRate || 0;
      const k = total > 0 && rate > 0 ? rate / total : 0;
      const allocatedMTBF = k > 0 ? state.params.taskMTBF / k / margin : 0;
      const allocatedFailureRate = allocatedMTBF > 0 ? 1 / allocatedMTBF : 0;
      return { ...s, k, allocatedMTBF, allocatedFailureRate };
    });
  }, [state.systems, state.params.taskMTBF, state.params.margin]);

  // 计算单个系统的单元分配结果
  function computeUnitAllocationsForSystem(sys: SystemAllocationResult): UnitAllocationResult[] {
    const margin = state.params.margin || 1;
  const units = state.units.filter((u: UnitAllocationResult | any) => u.systemId === sys.id);
  const total = units.reduce((acc: number, u: UnitInputRow | any) => acc + (u.estFailureRate || 0) * (u.quantity || 0), 0);
  return units.map((u: UnitInputRow | any) => {
      const fr = (u.estFailureRate || 0) * (u.quantity || 0);
      const k = total > 0 && fr > 0 ? fr / total : 0;
      const allocatedMTBF = k > 0 ? (sys.allocatedMTBF / k / margin) * (u.quantity || 0) : 0;
      const allocatedFailureRate = allocatedMTBF > 0 ? 1 / allocatedMTBF : 0;
      return { ...u, k, allocatedMTBF, allocatedFailureRate };
    });
  }

  const unitResults: UnitAllocationResult[] = useMemo(() => {
    if (!state.selectedSystemId) return [];
    const sys = systemResults.find(s => s.id === state.selectedSystemId);
    if (!sys) return [];
    return computeUnitAllocationsForSystem(sys);
  }, [state.selectedSystemId, state.units, systemResults, state.params.margin]);

  const validation: ValidationIssue[] = useMemo(() => {
    const issues: ValidationIssue[] = [];
  const totalEst = state.systems.reduce((a: number, s: SystemInputRow) => a + (s.estFailureRate || 0), 0);
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
      children: systemResults.map(sys => {
        const units = computeUnitAllocationsForSystem(sys);
        return {
          name: `${sys.name}\nMTBF:${sys.allocatedMTBF ? sys.allocatedMTBF.toFixed(0) : '-'}`,
          value: sys.allocatedFailureRate || 0,
          children: units.map(u => ({
            name: `${u.name} x${u.quantity}\nMTBF:${u.allocatedMTBF ? u.allocatedMTBF.toFixed(0) : '-'}`,
            value: u.allocatedFailureRate || 0,
          }))
        };
      }),
    };
  }, [systemResults, state.units, state.params.margin]);

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
        const computedUnits = computeUnitAllocationsForSystem(sys);
        computedUnits.forEach(u => {
          allUnits.push([
            sys.name,
            u.name,
            u.quantity,
            u.estFailureRate ?? '',
            u.k || '',
            u.allocatedMTBF || '',
            u.allocatedFailureRate || '',
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
}

export function useAllocation() {
  const ctx = useContext(AllocationContext);
  if (!ctx) throw new Error('useAllocation 必须在 AllocationProvider 内使用');
  return ctx;
}
