<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="modeling-container">
    <div class="palette">
      <ComponentPalette />
    </div>
    <div
      class="canvas"
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
  if (canvasRef.value) {
    canvasRef.value.onCanvasDrop(event);
  }
};
</script>

<style scoped>
.modeling-container {
  display: flex;
  height: calc(100vh - 50px); /* Adjust for header or other layout elements */
}
.palette {
  width: 200px;
  border-right: 1px solid #ccc;
  background-color: #f9f9f9;
}
.canvas {
  flex-grow: 1;
}
</style>
