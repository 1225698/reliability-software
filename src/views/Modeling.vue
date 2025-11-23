<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="modeling-page">
    <div class="top-bar">
      <div class="palette-ribbon">
        <ComponentPalette />
      </div>
    </div>
    <div
      class="canvas-stage"
      @dragover.prevent
      @drop="onCanvasDrop"
    >
      <ModelingCanvas ref="canvasRef" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ComponentPalette from '@/components/modeling/ComponentPalette.vue';
import ModelingCanvas from '@/components/modeling/ModelingCanvas.vue';

const canvasRef = ref(null);

const onCanvasDrop = (event) => {
  canvasRef.value?.onCanvasDrop(event);
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
  padding: 18px 24px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
}
.palette-ribbon {
  width: 100%;
  display: flex;
  justify-content: center;
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
    padding: 16px;
  }
  .canvas-stage {
    margin: 16px;
    border-radius: 12px;
  }
}
</style>
