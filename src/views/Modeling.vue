<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="modeling-page">
    <div class="top-bar">
      <div class="palette-ribbon">
        <ComponentPalette :selected-item="selectedItem" />
      </div>
      <div class="toolbar-actions">
        <button
          type="button"
          class="export-button"
          @click="onExportImage"
          :disabled="exportLoading"
        >
          {{ exportLoading ? '导出中…' : '保存为图片' }}
        </button>
      </div>
    </div>
    <div
      ref="stageRef"
      class="canvas-stage"
      @dragover.prevent
      @drop="onCanvasDrop"
    >
      <ModelingCanvas ref="canvasRef" @select="onItemSelect" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ComponentPalette from '@/components/modeling/ComponentPalette.vue';
import ModelingCanvas from '@/components/modeling/ModelingCanvas.vue';

const canvasRef = ref(null);
const stageRef = ref(null);
const exportLoading = ref(false);
const selectedItem = ref(null);

const onCanvasDrop = (event) => {
  canvasRef.value?.onCanvasDrop(event);
};

const onItemSelect = (item) => {
  selectedItem.value = item && item.type === 'model' ? item : null;
};

const onExportImage = async () => {
  if (exportLoading.value) return;
  const stageEl = stageRef.value;
  if (!stageEl) {
    window.alert('画布尚未准备好');
    return;
  }
  exportLoading.value = true;
  try {
    const { toPng } = await import('html-to-image');
    const canvasEl = stageEl.querySelector('.modeling-canvas');
    const target = canvasEl || stageEl;
    const dataUrl = await toPng(target, {
      backgroundColor: '#ffffff',
      pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      cacheBust: true,
    });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `可靠性建模_${timestamp}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('导出建模画布失败:', error);
    window.alert('导出失败，请稍后重试');
  } finally {
    exportLoading.value = false;
  }
};
</script>

<style scoped>
.modeling-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  background-color: #f5f5f5;
  color: #2f3b4a;
}
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
}
.palette-ribbon {
  flex: 1;
  display: flex;
  justify-content: center;
}
.toolbar-actions {
  display: flex;
  align-items: center;
}
.export-button {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: linear-gradient(90deg, #4f8df6, #6ea5ff);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.export-button:hover:enabled {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 141, 246, 0.25);
}
.export-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  box-shadow: none;
}
.canvas-stage {
  flex: 1;
  position: relative;
  margin: 18px 24px 24px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,245,245,0.96));
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.canvas-stage :deep(.modeling-canvas) {
  width: 100%;
  height: 100%;
  background-color: transparent !important;
}

@media (max-width: 920px) {
  .top-bar {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 12px;
  }
  .toolbar-actions {
    justify-content: flex-end;
  }
  .export-button {
    width: 100%;
  }
  .canvas-stage {
    margin: 16px;
    border-radius: 12px;
  }
}
</style>
