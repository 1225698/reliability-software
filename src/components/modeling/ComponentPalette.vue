<template>
  <div class="component-palette">
    <h3>组件区</h3>
    <div class="import-bar">
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
    <div
      v-for="component in components"
      :key="component.id"
      class="component-item"
      draggable="true"
      @dragstart="onComponentDragStart(component, $event)"
    >
      {{ component.name }}
    </div>
    <h3>模型区</h3>
    <div class="model-item" draggable="true" @dragstart="onModelDragStart('series', $event)">串联模型</div>
    <div class="model-item" draggable="true" @dragstart="onModelDragStart('parallel', $event)">并联模型</div>
    <div class="model-item" draggable="true" @dragstart="onModelDragStart('redundancy', $event)">冗余模型</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import * as XLSX from 'xlsx';

const components = ref([
  { id: 'comp1', name: '组件1', reliability: 0.9 },
  { id: 'comp2', name: '组件2', reliability: 0.95 },
]);

let nextComponentIndex = components.value.length + 1;
const fileInput = ref(null);
const isImporting = ref(false);

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
.component-palette {
  padding: 10px;
}
.import-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.import-bar button {
  padding: 6px 12px;
  line-height: 1.4;
  border: 1px solid #bbb;
  background-color: #f5f5f5;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
}
.import-bar button.linklike {
  background: none;
  border: none;
  color: #0b6efd;
  padding: 0;
}
.import-bar button.linklike:hover {
  text-decoration: underline;
  background: none;
}
.import-bar button:hover {
  background-color: #e8e8e8;
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
.component-item, .model-item {
  padding: 8px;
  margin-bottom: 5px;
  border: 1px solid #ccc;
  cursor: grab;
  text-align: center;
}
</style>
