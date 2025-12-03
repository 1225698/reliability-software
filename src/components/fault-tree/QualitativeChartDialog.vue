<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-container chart-dialog" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">顶事件概率分析图</span>
        <button class="dialog-close" @click="handleClose">×</button>
      </div>
      
      <div class="dialog-body">
        <div class="chart-container">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-default" @click="handleClose">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: Boolean,
  analysisResult: Object
})

const emit = defineEmits(['update:visible'])

const chartCanvas = ref(null)

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await nextTick()
    drawChart()
  }
})

// 格式化概率值，小数值使用科学计数法
const formatProbability = (prob) => {
  if (prob === undefined || prob === null || prob === 0) {
    return '0'
  }

  // 如果概率值小于 0.0001，使用科学计数法
  if (prob < 0.0001) {
    // 使用科学计数法，格式为 2×10^-6
    const exp = Math.floor(Math.log10(prob))
    const mantissa = prob / Math.pow(10, exp)
    return `${mantissa.toFixed(1)}×10^${exp}`
  }

  // 否则使用固定小数位数
  return prob.toFixed(4)
}

const drawChart = () => {
  if (!chartCanvas.value || !props.analysisResult) return

  const canvas = chartCanvas.value
  const ctx = canvas.getContext('2d')
  
  // 设置canvas尺寸
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight

  const cutSets = props.analysisResult.minimalCutSets || []
  
  if (cutSets.length === 0) {
    // 绘制空状态提示
    ctx.fillStyle = '#999'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2)
    return
  }

  // 图表参数
  const paddingLeft = 80  // 左侧留更多空间给Y轴标签
  const paddingRight = 40
  const paddingTop = 60
  const paddingBottom = 60
  const chartWidth = canvas.width - paddingLeft - paddingRight
  const chartHeight = canvas.height - paddingTop - paddingBottom
  const barCount = Math.min(cutSets.length, 10) // 最多显示10个
  const barWidth = chartWidth / barCount * 0.7
  const barGap = chartWidth / barCount * 0.3

  // 找出最大概率用于缩放
  const maxProb = Math.max(...cutSets.slice(0, barCount).map(cs => cs.probability))
  const scale = maxProb > 0 ? chartHeight / maxProb : 1

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 绘制背景网格
  ctx.strokeStyle = '#f0f0f0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = paddingTop + (chartHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(paddingLeft, y)
    ctx.lineTo(canvas.width - paddingRight, y)
    ctx.stroke()
  }

  // 绘制柱状图
  cutSets.slice(0, barCount).forEach((cutSet, index) => {
    const x = paddingLeft + index * (barWidth + barGap)
    const barHeight = cutSet.probability * scale
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
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      formatProbability(cutSet.probability),
      x + barWidth / 2,
      y - 5
    )

    // 绘制割集标签（序号）
    ctx.fillStyle = '#666'
    ctx.font = '11px Arial'
    ctx.fillText(
      `割集${index + 1}`,
      x + barWidth / 2,
      paddingTop + chartHeight + 20
    )
  })

  // 绘制坐标轴
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2

  // Y轴
  ctx.beginPath()
  ctx.moveTo(paddingLeft, paddingTop)
  ctx.lineTo(paddingLeft, paddingTop + chartHeight)
  ctx.stroke()

  // X轴
  ctx.beginPath()
  ctx.moveTo(paddingLeft, paddingTop + chartHeight)
  ctx.lineTo(canvas.width - paddingRight, paddingTop + chartHeight)
  ctx.stroke()

  // Y轴标签
  ctx.fillStyle = '#333'
  ctx.font = '11px Arial'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const value = (maxProb / 5) * (5 - i)
    const y = paddingTop + (chartHeight / 5) * i
    ctx.fillText(formatProbability(value), paddingLeft - 10, y + 4)
  }

  // 轴标题
  ctx.font = 'bold 14px Arial'
  ctx.textAlign = 'center'

  // X轴标题
  ctx.fillText('割集', canvas.width / 2, canvas.height - 10)

  // Y轴标题
  ctx.save()
  ctx.translate(15, canvas.height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('概率', 0, 0)
  ctx.restore()

  // 图表标题
  ctx.font = 'bold 16px Arial'
  ctx.fillText('顶事件概率分析图', canvas.width / 2, 25)
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
  height: 600px;
  max-height: 80vh;
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
  overflow: hidden;
}

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-container canvas {
  width: 100%;
  height: 100%;
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

