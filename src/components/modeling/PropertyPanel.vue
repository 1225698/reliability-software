<template>
  <div class="property-panel">
    <h3>属性</h3>
    <div v-if="!selected">未选择模型</div>
    <div v-else>
      <div class="field">
        <label>名称</label>
        <input v-model="selected.name" />
      </div>
      <div class="field">
        <label>类型</label>
        <span>{{ selected.modelType }}</span>
      </div>

      <!-- Parallel model editable branch count -->
      <div v-if="selected.modelType === 'parallel'" class="field">
        <label>并联分支数量</label>
        <input type="number" min="1" :value="selected.branches.length" @input="onParallelCountChange($event.target.value)" />
      </div>

      <!-- Redundancy model editable k/n -->
      <div v-if="selected.modelType === 'redundancy'" class="field row">
        <div>
          <label>k</label>
          <input type="number" min="1" :max="selected.n" v-model.number="selected.k" />
        </div>
        <div>
          <label>n</label>
          <input type="number" min="1" v-model.number="selected.n" @input="onRedundancyNChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { toRefs } from 'vue';
const props = defineProps({ selected: Object });
const { selected } = toRefs(props);

function onParallelCountChange(val) {
  const count = Math.max(1, parseInt(val, 10) || 1);
  if (!selected.value) return;
  const current = selected.value.branches.length;
  if (count > current) {
    for (let i = current; i < count; i++) {
      selected.value.branches.push({ components: [] });
    }
  } else if (count < current) {
    selected.value.branches.splice(count);
  }
}

function onRedundancyNChange() {
  if (!selected.value) return;
  if (selected.value.n < selected.value.k) {
    selected.value.k = selected.value.n; // 保持 k <= n
  }
  // 调整分支数量
  const count = selected.value.n;
  const current = selected.value.branches.length;
  if (count > current) {
    for (let i = current; i < count; i++) {
      selected.value.branches.push({ components: [] });
    }
  } else if (count < current) {
    selected.value.branches.splice(count);
  }
}
</script>

<style scoped>
.property-panel {
  padding: 10px;
  font-size: 14px;
}
.field {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
}
.field label {
  font-weight: 600;
  margin-bottom: 4px;
}
.field input {
  padding: 4px 6px;
  border: 1px solid #bbb;
  border-radius: 4px;
  font-size: 13px;
}
.row { display: flex; gap: 10px; }
.row > div { flex: 1; }
</style>
