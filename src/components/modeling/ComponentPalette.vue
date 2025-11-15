<template>
  <div class="component-palette">
    <h3>组件区</h3>
    <div
      v-for="component in components"
      :key="component.id"
      class="component-item"
      draggable="true"
      @dragstart="onComponentDragStart(component)"
    >
      {{ component.name }}
    </div>
    <h3>模型区</h3>
    <div class="model-item" draggable="true" @dragstart="onModelDragStart('series')">串联模型</div>
    <div class="model-item" draggable="true" @dragstart="onModelDragStart('parallel')">并联模型</div>
    <div class="model-item" draggable="true" @dragstart="onModelDragStart('redundancy')">冗余模型</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const components = ref([
  { id: 'comp1', name: '组件1', reliability: 0.9 },
  { id: 'comp2', name: '组件2', reliability: 0.95 },
]);

const onModelDragStart = (modelType) => {
  event.dataTransfer.setData('application/json', JSON.stringify({ type: 'model', modelType }));
};

const onComponentDragStart = (component) => {
  event.dataTransfer.setData('application/json', JSON.stringify({ type: 'component', component }));
};
</script>

<style scoped>
.component-palette {
  padding: 10px;
}
.component-item, .model-item {
  padding: 8px;
  margin-bottom: 5px;
  border: 1px solid #ccc;
  cursor: grab;
  text-align: center;
}
</style>
