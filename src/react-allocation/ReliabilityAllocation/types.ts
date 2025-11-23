// 类型定义：系统级与LRU级可靠性分配
export interface SystemInputRow {
  id: string;
  name: string;
  estFailureRate: number | null; // 预计故障率 (1/h)
}

export interface SystemAllocationResult extends SystemInputRow {
  k: number;                // 分配系数
  allocatedMTBF: number;    // 分配MTBF (h)
  allocatedFailureRate: number; // 分配故障率 (1/h)
}

export interface UnitInputRow {
  id: string;
  systemId: string; // 归属系统
  name: string;
  quantity: number;         // 数量
  estFailureRate: number | null; // 单个预计故障率 (1/h)
}

export interface UnitAllocationResult extends UnitInputRow {
  k: number;                 // LRU分配系数
  allocatedMTBF: number;     // 分配 MTBF (h)
  allocatedFailureRate: number; // 分配故障率 (1/h)
}

export interface AllocationParams {
  taskMTBF: number;   // 任务 MTBF
  margin: number;     // 余量系数 (0-1)，例如 0.9 表示 90%
  // systemCount 移除，不再通过输入控制数量，初始化固定5个，可自由追加
}

export interface AllocationPersistShape {
  systems: SystemInputRow[];
  units: UnitInputRow[]; // 所有系统的LRU
  params: AllocationParams;
}

export interface AllocationState extends AllocationPersistShape {
  selectedSystemId: string | null;
}

export type AllocationAction =
  | { type: 'SET_PARAMS'; payload: Partial<AllocationParams> }
  | { type: 'SET_SYSTEMS'; payload: SystemInputRow[] }
  | { type: 'UPDATE_SYSTEM'; payload: { id: string; patch: Partial<SystemInputRow> } }
  | { type: 'ADD_SYSTEM'; payload: SystemInputRow }
  | { type: 'REMOVE_SYSTEM'; payload: { id: string } }
  | { type: 'SET_UNITS_FOR_SYSTEM'; payload: { systemId: string; rows: UnitInputRow[] } }
  | { type: 'UPDATE_UNIT'; payload: { id: string; patch: Partial<UnitInputRow> } }
  | { type: 'ADD_UNIT'; payload: UnitInputRow }
  | { type: 'REMOVE_UNIT'; payload: { id: string } }
  | { type: 'SELECT_SYSTEM'; payload: string | null }
  | { type: 'RESET' };

export interface ValidationIssue {
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface ChartTreeNode {
  name: string;
  value?: number;
  children?: ChartTreeNode[];
}
