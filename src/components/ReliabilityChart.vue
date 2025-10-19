<template>
  <div class="chart-container">
    <h3>可靠性曲线</h3>
    <div ref="chartEl" style="height: 400px; width: 100%;"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps(['data'])
const chartEl = ref(null)
let chart = null

onMounted(() => {
  if (chartEl.value) {
    chart = echarts.init(chartEl.value)
    updateChart()
  }
})

watch(() => props.data, updateChart)

function updateChart() {
  if (!chart) return
  
  const option = {
    title: {
      text: '可靠性随时间变化曲线'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'value',
      name: '时间 (小时)'
    },
    yAxis: {
      type: 'value',
      name: '可靠度',
      min: 0,
      max: 1
    },
    series: [{
      data: props.data.map(item => [item.time, item.reliability]),
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#667eea'
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
          { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
        ])
      }
    }]
  }
  
  chart.setOption(option)
}
</script>

<style scoped>
.chart-container {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}
</style>