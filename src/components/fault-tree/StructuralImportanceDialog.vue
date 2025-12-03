<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-container chart-dialog" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">结构重要度分析</span>
        <button class="dialog-close" @click="handleClose">×</button>
      </div>
      
      <div class="dialog-body">
        <!-- 图表部分 -->
        <div class="section">
          <h3 class="section-title">结构重要度分析图</h3>
          <div class="chart-container">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>

        <!-- 数据表格部分 -->
        <div class="section">
          <h3 class="section-title">结构重要度数据表</h3>
          <div class="data-table">
            <table>
              <thead>
                <tr>
                  <th>事件名称</th>
                  <th>事件类型</th>
                  <th>出现次数</th>
                  <th>结构重要度</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in structuralImportance" :key="item.eventId">
                  <td>{{ item.eventName }}</td>
                  <td>{{ item.eventType }}</td>
                  <td>{{ item.occurrences }} / {{ item.totalCutSets }}</td>
                  <td>{{ item.structuralImportance.toFixed(4) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-default" @click="handleClose">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  analysisResult: Object
})

const emit = defineEmits(['update:visible'])

const chartCanvas = ref(null)

const structuralImportance = computed(() => {
  return props.analysisResult?.structuralImportance || []
})

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await nextTick()
    drawChart()
  }
})

const drawChart = () => {
  if (!chartCanvas.value || !props.analysisResult) return

  const canvas = chartCanvas.value
  const ctx = canvas.getContext('2d')
  
  // 设置canvas尺寸
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = 350

  const importance = structuralImportance.value
  
  if (importance.length === 0) {
    // 绘制空状态提示
    ctx.fillStyle = '#999'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2)
    return
  }

  // 图表参数
  const padding = 50
  const paddingTop = 30
  const chartWidth = canvas.width - padding * 2
  const chartHeight = canvas.height - paddingTop - padding
  const barCount = importance.length
  const barWidth = Math.min(chartWidth / barCount * 0.7, 80)
  const barGap = chartWidth / barCount * 0.3

  // 找出最大重要度用于缩放
  const maxImportance = Math.max(...importance.map(item => item.structuralImportance))
  const scale = maxImportance > 0 ? chartHeight / maxImportance : 1

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 绘制背景网格
  ctx.strokeStyle = '#f0f0f0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = paddingTop + (chartHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(canvas.width - padding, y)
    ctx.stroke()
  }

  // 绘制柱状图
  importance.forEach((item, index) => {
    const x = padding + index * (barWidth + barGap) + barGap / 2
    const barHeight = item.structuralImportance * scale
    const y = paddingTop + chartHeight - barHeight

    // 绘制柱子
    ctx.fillStyle = '#1890ff'
    ctx.fillRect(x, y, barWidth, barHeight)

    // 绘制柱子边框
    ctx.strokeStyle = '#096dd9'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, barWidth, barHeight)

    // 绘制数值标签
    ctx.fillStyle = '#333'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      item.structuralImportance.toFixed(3),
      x + barWidth / 2,
      y - 5
    )

    // 绘制事件名称标签
    ctx.fillStyle = '#666'
    ctx.font = '11px Arial'
    ctx.fillText(
      item.eventName,
      x + barWidth / 2,
      paddingTop + chartHeight + 20
    )
  })

  // 绘制坐标轴
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2

  // Y轴
  ctx.beginPath()
  ctx.moveTo(padding, paddingTop)
  ctx.lineTo(padding, paddingTop + chartHeight)
  ctx.stroke()

  // X轴
  ctx.beginPath()
  ctx.moveTo(padding, paddingTop + chartHeight)
  ctx.lineTo(canvas.width - padding, paddingTop + chartHeight)
  ctx.stroke()

  // Y轴标签
  ctx.fillStyle = '#333'
  ctx.font = '11px Arial'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const value = (maxImportance / 5) * (5 - i)
    const y = paddingTop + (chartHeight / 5) * i
    ctx.fillText(value.toFixed(3), padding - 10, y + 4)
  }

  // 轴标题
  ctx.font = 'bold 13px Arial'
  ctx.textAlign = 'center'

  // X轴标题
  ctx.fillText('事件', canvas.width / 2, canvas.height - 10)

  // Y轴标题
  ctx.save()
  ctx.translate(20, canvas.height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('结构重要度', 0, 0)
  ctx.restore()
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  // 点击遮罩层不关闭
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-container.chart-dialog {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 900px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.dialog-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.dialog-close:hover {
  background: #f0f0f0;
  color: #333;
}

.dialog-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #1890ff;
}

.chart-container {
  width: 100%;
  position: relative;
  background: #fafafa;
  padding: 10px;
  border-radius: 4px;
}

.chart-container canvas {
  width: 100%;
  display: block;
}

.data-table {
  width: 100%;
  overflow-x: auto;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.data-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.data-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.data-table td {
  color: #666;
}

.data-table tbody tr:hover {
  background: #f0f7ff;
}

.data-table tbody tr:nth-child(even) {
  background: #fafafa;
}

.data-table tbody tr:nth-child(even):hover {
  background: #f0f7ff;
}

.dialog-footer {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  height: 32px;
  padding: 4px 15px;
  border-radius: 2px;
  border: 1px solid transparent;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-default {
  background: #fff;
  color: #333;
  border-color: #d9d9d9;
}

.btn-default:hover {
  color: #40a9ff;
  border-color: #40a9ff;
}
</style>

