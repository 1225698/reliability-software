<template>
  <div class="allocation-view">
    <h1>可靠性分配</h1>
    <div id="react-allocation-root" class="react-allocation-mount"></div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
defineOptions({ name: 'ReliabilityAllocationView' })

onMounted(async () => {
  const { mountReliabilityAllocation } = await import('@/react-allocation/mountAllocation')
  mountReliabilityAllocation('#react-allocation-root')
})
</script>

<style scoped>
.allocation-view {
  padding: 1rem 1.2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  height: calc(100vh - 4.5rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}
.allocation-view h1 { font-size: 1.3rem; margin-bottom: .75rem; color: #334; flex-shrink: 0; }
.react-allocation-mount { margin-top: .5rem; flex: 1; overflow: hidden; display: flex; flex-direction: column; }
</style>
