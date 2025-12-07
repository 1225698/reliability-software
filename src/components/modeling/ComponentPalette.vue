<template>
  <div class="palette-layout">
    <section class="palette-card">
      <header class="card-title">组件区</header>
      <div class="card-body">
        <div
          v-for="component in components"
          :key="component.id"
          class="palette-chip"
          draggable="true"
          @dragstart="onComponentDragStart(component, $event)"
        >
          <span>{{ component.name }}</span>
          <button class="delete-btn" @click.stop="removeComponent(component.id)" title="删除">×</button>
        </div>
      </div>
      <div class="card-body actions-body component-actions">
        <button type="button" @click="triggerImport">导入 Excel</button>
        <button type="button" class="linklike" @click="downloadTemplate">下载模板</button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept=".xlsx,.xls,.csv"
          @change="onFileSelected"
        />
      </div>
    </section>
    <section class="palette-card">
      <header class="card-title">模型区</header>
      <div class="card-body model-icons">
        <div class="palette-icon" draggable="true" @dragstart="onModelDragStart('series', $event)" title="串联模型">
          <svg width="68" height="36" viewBox="0 0 120 60">
            <line x1="10" y1="30" x2="110" y2="30" stroke="#444" stroke-width="4" stroke-linecap="round" />
            <rect x="24" y="18" width="28" height="24" rx="3" ry="3" fill="#fff" stroke="#444" stroke-width="3" />
            <rect x="68" y="18" width="28" height="24" rx="3" ry="3" fill="#fff" stroke="#444" stroke-width="3" />
          </svg>
        </div>
        <div class="palette-icon" draggable="true" @dragstart="onModelDragStart('parallel', $event)" title="并联模型">
          <svg width="68" height="36" viewBox="0 0 120 60">
            <line x1="8" y1="30" x2="36" y2="30" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <line x1="88" y1="30" x2="112" y2="30" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <line x1="36" y1="18" x2="36" y2="42" stroke="#444" stroke-width="3" />
            <line x1="88" y1="18" x2="88" y2="42" stroke="#444" stroke-width="3" />
            <line x1="36" y1="18" x2="88" y2="18" stroke="#444" stroke-width="3" />
            <line x1="36" y1="42" x2="88" y2="42" stroke="#444" stroke-width="3" />
            <rect x="48" y="10" width="26" height="16" rx="3" ry="3" fill="#fff" stroke="#444" stroke-width="2" />
            <rect x="48" y="34" width="26" height="16" rx="3" ry="3" fill="#fff" stroke="#444" stroke-width="2" />
          </svg>
        </div>
        <div class="palette-icon" draggable="true" @dragstart="onModelDragStart('redundancy', $event)" title="冗余模型">
          <svg width="68" height="36" viewBox="0 0 160 60">
            <line x1="14" y1="30" x2="40" y2="30" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <line x1="118" y1="30" x2="146" y2="30" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <line x1="40" y1="30" x2="60" y2="16" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <line x1="40" y1="30" x2="60" y2="44" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <rect x="60" y="12" width="28" height="16" rx="3" ry="3" fill="#fff" stroke="#444" stroke-width="2" stroke-dasharray="4 3" />
            <rect x="60" y="32" width="28" height="16" rx="3" ry="3" fill="#fff" stroke="#444" stroke-width="2" stroke-dasharray="4 3" />
            <line x1="88" y1="20" x2="108" y2="30" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <line x1="88" y1="40" x2="108" y2="30" stroke="#444" stroke-width="3" stroke-linecap="round" />
            <circle cx="118" cy="30" r="12" fill="#fff" stroke="#444" stroke-width="3" />
            <text x="118" y="34" font-size="10" text-anchor="middle" fill="#444" font-weight="600">2/4</text>
          </svg>
        </div>
      </div>
    </section>
    <section class="palette-card properties-card">
      <header class="card-title">属性区</header>
      <div v-if="selectedModel" class="properties-body">
        <dl class="property-list">
          <dt>名称</dt>
          <dd :class="{ placeholder: !hasComponents }">{{ nameDisplay }}</dd>
          <dt>类型</dt>
          <dd>{{ typeDisplay }}</dd>
          <dt>可靠度</dt>
          <dd :class="{ placeholder: !hasReliability }">{{ reliabilityDisplay }}</dd>
        </dl>
      </div>
      <div v-else class="properties-body empty">
        <p class="placeholder">请选择画布中的模型或组件查看详细属性。</p>
        <ul class="placeholder-list">
          <li>名称</li>
          <li>类型</li>
          <li>可靠度/参数</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import * as XLSX from 'xlsx';

const props = defineProps({
  selectedItem: {
    type: Object,
    default: null
  }
});

const components = ref([
  { id: 'comp1', name: '组件1', reliability: 0.9 },
  { id: 'comp2', name: '组件2', reliability: 0.95 },
]);

let nextComponentIndex = components.value.length + 1;
const fileInput = ref(null);
const isImporting = ref(false);

const typeLabelMap = {
  series: '串联',
  parallel: '并联',
  redundancy: '冗余'
};

const selectedModel = computed(() => {
  const candidate = props.selectedItem;
  if (!candidate || candidate.type !== 'model') return null;
  return candidate;
});

const collectComponents = (model) => {
  if (!model) return [];
  if (model.modelType === 'series') {
    const seriesComponents = Array.isArray(model.components) ? [...model.components] : [];
    seriesComponents.sort((a, b) => (a?.slot ?? 0) - (b?.slot ?? 0));
    return seriesComponents;
  }
  if (Array.isArray(model.branches)) {
    const flattened = [];
    model.branches.forEach((branch) => {
      if (!branch || !Array.isArray(branch.components)) return;
      branch.components.forEach((component) => {
        if (component) flattened.push(component);
      });
    });
    return flattened;
  }
  return Array.isArray(model.components) ? [...model.components] : [];
};

const selectedComponents = computed(() => collectComponents(selectedModel.value));

const hasComponents = computed(() => selectedComponents.value.length > 0);

const nameDisplay = computed(() => {
  if (!selectedModel.value) return '';
  const names = selectedComponents.value
    .map(comp => (comp?.name ?? '').trim())
    .filter(Boolean);
  return names.length ? names.join('、') : '待配置';
});

const typeDisplay = computed(() => {
  if (!selectedModel.value) return '';
  return typeLabelMap[selectedModel.value.modelType] || selectedModel.value.modelType || '未知模型';
});

const formatReliability = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return '--';
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
};

const clamp01 = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return null;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
};

const readComponentReliability = (component) => {
  if (!component) return null;
  const raw = typeof component.reliability === 'number'
    ? component.reliability
    : parseFloat(component.reliability);
  return clamp01(raw);
};

const computeSeriesReliability = (components) => {
  if (!Array.isArray(components) || components.length === 0) return null;
  let result = 1;
  for (const comp of components) {
    const rel = readComponentReliability(comp);
    if (rel === null) return null;
    result *= rel;
  }
  return clamp01(result);
};

const computeParallelReliability = (branches) => {
  if (!Array.isArray(branches) || branches.length === 0) return null;
  let product = 1;
  let hasBranch = false;
  for (const branch of branches) {
    const rel = computeSeriesReliability(branch?.components || []);
    if (rel === null) return null;
    product *= (1 - rel);
    hasBranch = true;
  }
  if (!hasBranch) return null;
  return clamp01(1 - product);
};

const computeRedundancyReliability = (branches, k) => {
  if (!Array.isArray(branches) || branches.length === 0) return null;
  const branchReliabilities = [];
  for (const branch of branches) {
    const rel = computeSeriesReliability(branch?.components || []);
    if (rel === null) return null;
    branchReliabilities.push(rel);
  }
  const n = branchReliabilities.length;
  const threshold = Number.isFinite(k) ? Math.max(1, Math.min(Math.floor(k), n)) : n;
  if (threshold > n) return null;

  let dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  branchReliabilities.forEach(rel => {
    const next = new Array(n + 1).fill(0);
    for (let successes = 0; successes <= n; successes += 1) {
      const base = dp[successes];
      if (base === 0) continue;
      next[successes] += base * (1 - rel);
      if (successes + 1 <= n) {
        next[successes + 1] += base * rel;
      }
    }
    dp = next;
  });
  const probability = dp.slice(threshold).reduce((sum, val) => sum + val, 0);
  return clamp01(probability);
};

const modelReliability = computed(() => {
  const model = selectedModel.value;
  if (!model) return null;

  if (model.modelType === 'series') {
    return computeSeriesReliability(selectedComponents.value);
  }

  if (model.modelType === 'parallel') {
    return computeParallelReliability(model.branches);
  }

  if (model.modelType === 'redundancy') {
    return computeRedundancyReliability(model.branches, model.k ?? model.branches?.length ?? 0);
  }

  return null;
});

const hasReliability = computed(() => typeof modelReliability.value === 'number');

const reliabilityDisplay = computed(() => {
  if (!hasReliability.value) return '待配置';
  return formatReliability(modelReliability.value);
});

const onModelDragStart = (modelType, dragEvent) => {
  if (!dragEvent?.dataTransfer) return;
  dragEvent.dataTransfer.setData('application/json', JSON.stringify({ type: 'model', modelType }));
};

const onComponentDragStart = (component, dragEvent) => {
  if (!dragEvent?.dataTransfer) return;
  dragEvent.dataTransfer.setData('application/json', JSON.stringify({ type: 'component', component }));
};

const triggerImport = () => {
  if (isImporting.value) return;
  fileInput.value?.click();
};

const resetFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('读取文件失败'));
  reader.readAsArrayBuffer(file);
});

const downloadTemplate = () => {
  const header = [['名称', '可靠度(0-1)']];
  const sampleRows = [
    ['组件示例A', 0.92],
    ['组件示例B', 0.88],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...header, ...sampleRows]);
  XLSX.utils.book_append_sheet(wb, ws, '组件模板');
  XLSX.writeFile(wb, '组件导入模板.xlsx');
};

const normalizeHeader = (headerCell) => {
  if (typeof headerCell !== 'string') return '';
  return headerCell.trim().toLowerCase();
};

const headerMatches = (headerValue, candidates) => {
  return candidates.some(candidate => headerValue.includes(candidate));
};

const addComponentFromRow = (name, reliability) => {
  const safeName = typeof name === 'string' && name.trim() ? name.trim() : '';
  if (!safeName) return;
  const numericReliability = Number.isFinite(reliability) ? reliability : parseFloat(reliability);
  const boundedReliability = Number.isFinite(numericReliability) ? Math.max(0, Math.min(1, numericReliability)) : undefined;
  const newComponent = {
    id: `comp${nextComponentIndex++}`,
    name: safeName,
    reliability: boundedReliability ?? 0.9,
  };
  components.value.push(newComponent);
};

const removeComponent = (id) => {
  const index = components.value.findIndex(c => c.id === id);
  if (index !== -1) {
    components.value.splice(index, 1);
  }
};

const onFileSelected = async (changeEvent) => {
  const file = changeEvent.target?.files?.[0];
  if (!file) return;

  try {
    isImporting.value = true;
    const fileBuffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    if (!workbook.SheetNames.length) {
      window.alert('未在文件中找到工作表');
      return;
    }
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true });
    if (!rows.length) {
      window.alert('Excel 文件为空');
      return;
    }

    const [headerRow, ...dataRows] = rows;
    const normalizedHeaders = headerRow.map(normalizeHeader);
    const nameIndex = normalizedHeaders.findIndex(h => headerMatches(h, ['name', '名称', '组件']));
    const reliabilityIndex = normalizedHeaders.findIndex(h => headerMatches(h, ['reliability', '可靠']));

    if (nameIndex === -1) {
      window.alert('未找到名称列，请确保表头包含 “名称” 或 “Name”');
      return;
    }

    if (!dataRows.length) {
      window.alert('未检测到数据行');
      return;
    }

    let importedCount = 0;
    dataRows.forEach((row) => {
      if (!Array.isArray(row)) return;
      const nameCell = row[nameIndex];
      const reliabilityCell = reliabilityIndex >= 0 ? row[reliabilityIndex] : undefined;
      const beforeLength = components.value.length;
      addComponentFromRow(nameCell, reliabilityCell);
      if (components.value.length > beforeLength) importedCount += 1;
    });

    if (importedCount === 0) {
      window.alert('未成功导入任何组件，请检查数据内容');
    } else {
      window.alert(`成功导入 ${importedCount} 个组件`);
    }
  } catch (error) {
    console.error(error);
    window.alert('解析 Excel 文件失败，请确认文件格式正确');
  } finally {
    resetFileInput();
    isImporting.value = false;
  }
};
</script>

<style scoped>
.palette-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  color: #2f3b4a;
}
.palette-card {
  flex: 1 1 200px;
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
.properties-card {
  flex: 0 0 220px;
  max-width: 240px;
  align-self: flex-start;
}
.card-title {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #30445a;
}
.card-body {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.card-body.model-icons {
  justify-content: flex-start;
  gap: 12px;
}
.palette-chip {
  position: relative;
  padding: 6px 28px 6px 14px;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 999px;
  background: #fff;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
  font-size: 13px;
  display: flex;
  align-items: center;
}
.palette-chip:hover {
  background-color: #e6f7ff;
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
  color: #1890ff;
}
.palette-chip .delete-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff4d4f;
  color: white;
  border: none;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
.palette-chip:hover .delete-btn {
  display: flex;
  opacity: 1;
}
.palette-chip .delete-btn:hover {
  background: #ff7875;
}
.palette-icon {
  width: 68px;
  height: 40px;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,245,245,0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.palette-icon:hover {
  transform: translateY(-1px);
  border-color: rgba(0,0,0,0.2);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
  background: #edf3ff;
}
.actions-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.component-actions {
  align-items: stretch;
  border-top: 1px solid rgba(0,0,0,0.05);
  margin-top: 8px;
  padding-top: 10px;
}
.properties-body {
  padding: 6px 0;
  font-size: 13px;
  color: #475569;
}
.properties-body.empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.properties-body.empty .placeholder {
  margin: 0;
  color: #6b7280;
}
.properties-body.empty .placeholder-list {
  margin: 0;
  padding-left: 16px;
  list-style: disc;
  color: #94a3b8;
}
.property-list {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 12px;
  row-gap: 6px;
  align-items: baseline;
}
.property-list dt {
  margin: 0;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
}
.property-list dd {
  margin: 0;
  color: #334155;
  line-height: 1.4;
}
.property-list dd.placeholder {
  color: #94a3b8;
  font-style: italic;
}
.actions-body button {
  padding: 6px 10px;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  font-size: 13px;
  color: #333;
}
.actions-body button:hover {
  background: #edf3ff;
  border-color: rgba(0,0,0,0.2);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}
.actions-body button.linklike {
  background: transparent;
  border: none;
  color: #0b6efd;
  padding: 0;
  text-align: left;
}
.actions-body button.linklike:hover {
  text-decoration: underline;
  box-shadow: none;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 920px) {
  .palette-layout {
    gap: 12px;
  }
  .palette-card {
    flex: 1 1 100%;
  }
  .card-body {
    justify-content: flex-start;
  }
}
</style>
