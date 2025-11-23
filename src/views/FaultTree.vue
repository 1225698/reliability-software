<template>
  <div class="fault-tree-view">
    <h1>故障树分析</h1>
  </div>
</template>

<script setup>
defineOptions({ name: 'FaultTreeView' })
</script>

<style scoped>
.fault-tree-view {
  padding: 1rem 1.2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  min-height: 50vh;
}
.fault-tree-view h1 {
  font-size: 1.3rem;
  color: #334;
}
</style>
