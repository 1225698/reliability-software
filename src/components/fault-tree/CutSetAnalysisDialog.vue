<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-container analysis-dialog" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">{{ analysisResult?.faultTreeName || '故障树' }}</span>
        <button class="dialog-close" @click="handleClose">×</button>
      </div>
      
      <div class="dialog-body">
        <!-- 顶事件概率 -->
        <div class="summary-section">
          <h3>顶事件概率</h3>
          <div class="probability-display">
            <span class="prob-label">P(顶事件) ≈</span>
            <span class="prob-value">{{ formatProbability(analysisResult?.topEventProbability) }}</span>
          </div>
          <div class="summary-info">
            <span>最小割集数量: {{ analysisResult?.cutSetCount || 0 }}</span>
          </div>
        </div>

        <!-- 视图选择 -->
        <div class="view-selector">
          <select v-model="currentView" class="view-dropdown">
            <option value="cutsets">最小割集</option>
            <option value="frequency">最小割集事件频次</option>
          </select>
          <span class="cutset-count">: 共 {{ analysisResult?.cutSetCount || 0 }} 个</span>
        </div>

        <!-- 最小割集视图 -->
        <div v-if="currentView === 'cutsets'" class="cutsets-section">
          <div class="cutsets-table-wrapper">
            <table class="cutsets-table">
              <thead>
                <tr>
                  <th style="width: 50px;"></th>
                  <th style="width: 60px;">序号</th>
                  <th>最小割集</th>
                  <th style="width: 80px;">阶数</th>
                  <th style="width: 120px;">发生概率</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(cutSet, index) in analysisResult?.minimalCutSets || []"
                  :key="index"
                  :class="{ 'selected-row': selectedIndex === index }"
                  @click="selectCutSet(index)"
                >
                  <td class="text-center">
                    <span class="expand-icon">{{ selectedIndex === index ? '▶' : '' }}</span>
                  </td>
                  <td class="text-center">{{ index + 1 }}</td>
                  <td>
                    <div class="cutset-events-inline">
                      <span v-for="(event, idx) in cutSet.eventNames" :key="idx">
                        {{ event }}<span v-if="idx < cutSet.eventNames.length - 1"> 、</span>
                      </span>
                    </div>
                  </td>
                  <td class="text-center">{{ cutSet.eventNames.length }}</td>
                  <td class="text-center">{{ formatProbability(cutSet.probability) }}</td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="!analysisResult || analysisResult.minimalCutSets.length === 0" class="empty-message">
              暂无割集数据
            </div>
          </div>
        </div>

        <!-- 事件频次视图 -->
        <div v-else-if="currentView === 'frequency'" class="frequency-section">
          <div class="cutsets-table-wrapper">
            <table class="cutsets-table">
              <thead>
                <tr>
                  <th style="width: 50px;"></th>
                  <th style="width: 60px;">序号</th>
                  <th>事件名称</th>
                  <th style="width: 100px;">频次</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in eventFrequency"
                  :key="index"
                  :class="{ 'selected-row': selectedIndex === index }"
                  @click="selectCutSet(index)"
                >
                  <td class="text-center">
                    <span class="expand-icon">{{ selectedIndex === index ? '▶' : '' }}</span>
                  </td>
                  <td class="text-center">{{ index + 1 }}</td>
                  <td>{{ item.eventName }}</td>
                  <td class="text-center">{{ item.frequency }}</td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="eventFrequency.length === 0" class="empty-message">
              暂无事件数据
            </div>
          </div>
        </div>
        <!-- 图表按钮 -->
        <div class="actions-section">
          <button v-if="analysisType === 'quantitative'" class="btn btn-secondary" @click="showChart">
            查看定量分析图
          </button>
          <button v-if="analysisType === 'quantitative'" class="btn btn-secondary" @click="showStructuralImportance">
            查看结构重要度
          </button>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-default" @click="handleClose">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  analysisResult: Object,
  analysisType: {
    type: String,
    default: 'qualitative' // 'qualitative' 或 'quantitative'
  }
})

const emit = defineEmits(['update:visible', 'show-chart', 'show-structural-importance'])

const selectedIndex = ref(null)
const currentView = ref('cutsets')

// 计算事件频次
const eventFrequency = computed(() => {
  if (!props.analysisResult || !props.analysisResult.minimalCutSets) {
    return []
  }
  
  const frequencyMap = new Map()
  
  // 统计每个事件在割集中出现的次数
  props.analysisResult.minimalCutSets.forEach(cutSet => {
    cutSet.eventNames.forEach(eventName => {
      const count = frequencyMap.get(eventName) || 0
      frequencyMap.set(eventName, count + 1)
    })
  })
  
  // 转换为数组并排序
  const frequencyArray = Array.from(frequencyMap.entries()).map(([eventName, frequency]) => ({
    eventName,
    frequency
  }))
  
  // 按事件名称排序（X1, X2, X3...）
  frequencyArray.sort((a, b) => {
    const numA = parseInt(a.eventName.replace('X', '')) || 0
    const numB = parseInt(b.eventName.replace('X', '')) || 0
    return numA - numB
  })
  
  return frequencyArray
})

const selectCutSet = (index) => {
  selectedIndex.value = index
}

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
  return prob.toFixed(5)
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  // 点击遮罩层不关闭
}

const showChart = () => {
  emit('show-chart')
}

const showStructuralImportance = () => {
  emit('show-structural-importance')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-container.analysis-dialog {
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 800px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #f0f0f0;
  border-bottom: 1px solid #d0d0d0;
}

.dialog-title {
  font-size: 12px;
  font-weight: normal;
  color: #000;
}

.dialog-close {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #666;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.dialog-close:hover {
  color: #000;
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  background: #fff;
}

/* 概率汇总区域 */
.summary-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

.summary-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.probability-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.prob-label {
  font-size: 14px;
  color: #666;
}

.prob-value {
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
}

.summary-info {
  font-size: 13px;
  color: #666;
}

/* 视图选择器 */
.view-selector {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.view-dropdown {
  height: 24px;
  padding: 2px 6px;
  border: 1px solid #a0a0a0;
  border-radius: 0;
  font-size: 12px;
  background: #fff;
  cursor: pointer;
}

.cutset-count {
  font-size: 12px;
  color: #000;
}

.cutsets-section,
.frequency-section {
  margin-bottom: 0;
}

.cutsets-table-wrapper {
  border: 1px solid #d0d0d0;
  border-radius: 0;
  overflow: hidden;
  max-height: 500px;
  overflow-y: auto;
  background: #fff;
}

.cutsets-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.cutsets-table thead {
  background: #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.cutsets-table th {
  padding: 6px 8px;
  text-align: left;
  font-weight: normal;
  color: #000;
  border-bottom: 1px solid #d0d0d0;
  border-right: 1px solid #e0e0e0;
}

.cutsets-table th:last-child {
  border-right: none;
}

.cutsets-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #e8e8e8;
  border-right: 1px solid #e8e8e8;
  background: #fff;
}

.cutsets-table td:last-child {
  border-right: none;
}

.cutsets-table tbody tr {
  cursor: pointer;
  transition: background 0.1s;
}

.cutsets-table tbody tr:hover {
  background: #e8f4ff;
}

.cutsets-table tbody tr.selected-row {
  background: #0078d7;
  color: #fff;
}

.cutsets-table tbody tr.selected-row td {
  background: #0078d7;
  color: #fff;
}

.text-center {
  text-align: center;
}

.expand-icon {
  display: inline-block;
  font-size: 10px;
  color: inherit;
}

.cutset-events-inline {
  display: inline;
  font-size: 12px;
  color: inherit;
}

.empty-message {
  padding: 40px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.actions-section {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.dialog-footer {
  padding: 12px 16px;
  border-top: 1px solid #d0d0d0;
  display: flex;
  justify-content: center;
  gap: 8px;
  background: #f0f0f0;
}

.btn {
  min-width: 80px;
  height: 26px;
  padding: 4px 16px;
  border-radius: 3px;
  border: 1px solid #adadad;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.1s;
  background: linear-gradient(to bottom, #f7f7f7 0%, #e7e7e7 100%);
  color: #000;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn:hover {
  background: linear-gradient(to bottom, #fafafa 0%, #ebebeb 100%);
  border-color: #5598d7;
}

.btn:active {
  background: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: #52c41a;
  color: #fff;
  border-color: #52c41a;
}

.btn-secondary:hover {
  background: #73d13d;
  border-color: #73d13d;
}

.btn-default {
  background: linear-gradient(to bottom, #f7f7f7 0%, #e7e7e7 100%);
  color: #000;
  border-color: #adadad;
}

.btn-default:hover {
  background: linear-gradient(to bottom, #fafafa 0%, #ebebeb 100%);
  border-color: #5598d7;
}
</style>

