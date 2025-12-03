<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-container" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">定量分析</span>
        <button class="dialog-close" @click="handleClose">×</button>
      </div>
      
      <div class="dialog-body">
        <div class="form-group">
          <label for="analysis-name">名称(N):</label>
          <input 
            id="analysis-name" 
            v-model="formData.name" 
            type="text" 
            class="form-input" 
            placeholder="请输入分析名称"
          />
        </div>
        
        <div class="form-group">
          <label for="analysis-desc">描述(D):</label>
          <input 
            id="analysis-desc" 
            v-model="formData.description" 
            type="text" 
            class="form-input" 
            placeholder="请输入描述"
          />
        </div>
        
        <!-- 标签页 -->
        <div class="tabs-section">
          <div class="tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'overview' }"
              @click="activeTab = 'overview'"
            >
              概率
            </button>
           
           
          </div>
          
          <!-- 概率标签页 - 显示事件概率表格 -->
          <div v-if="activeTab === 'overview'" class="tab-content">
            <div class="table-wrapper">
              <table class="events-table">
                <thead>
                  <tr>
                    <th style="width: 50px;"></th>
                    <th style="width: 60px;">序号</th>
                    <th>事件名称</th>
                    <th style="width: 120px;">发生概率</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(event, index) in basicEvents"
                    :key="index"
                    :class="{ 'selected-row': selectedEventIndex === index }"
                    @click="selectedEventIndex = index"
                  >
                    <td class="text-center">
                      <span class="expand-icon">{{ selectedEventIndex === index ? '▶' : '' }}</span>
                    </td>
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>{{ event.label }}</td>
                    <td class="text-center">{{ event.probability || 0 }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="basicEvents.length === 0" class="empty-message">
                暂无基本事件
              </div>
            </div>
          </div>
          
          <!-- 目标标签页 -->
          <div v-else-if="activeTab === 'target'" class="tab-content">
            <div class="target-table-wrapper">
              <table class="target-table">
                <thead>
                  <tr>
                    <th style="width: 50px;"></th>
                    <th style="width: 60px;">序号</th>
                    <th style="width: 80px;">选择</th>
                    <th>事件名称</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(event, index) in basicEvents"
                    :key="index"
                    :class="{ 'selected-row': selectedTargetIndex === index }"
                    @click="selectedTargetIndex = index"
                  >
                    <td class="text-center">
                      <span class="expand-icon">{{ selectedTargetIndex === index ? '▶' : '' }}</span>
                    </td>
                    <td class="text-center">{{ index + 1 }}</td>
                    <td class="text-center">
                      <input 
                        type="checkbox" 
                        :checked="targetSelection[event.id]"
                        @click.stop="toggleTargetSelection(event.id)"
                      />
                    </td>
                    <td>{{ event.label }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="basicEvents.length === 0" class="empty-message">
                暂无事件
              </div>
            </div>
          </div>

          <!-- 选项标签页 -->
          <div v-else-if="activeTab === 'options'" class="tab-content">
            
         
          
            
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-primary" @click="handleAnalyze">分析(A)</button>
        
        <button class="btn btn-default" @click="handleClose">取消(C)</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  faultTreeName: String,
  analysisCount: {
    type: Number,
    default: 1
  },
  nodes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'confirm', 'analyze'])

const formData = ref({
  name: '定量分析1',
  description: '',
  ignoreHighOrder: false,
  maxOrder: 15,
  analysisMethod: 'bdd',
  importanceAnalysis: true,
  importanceFactor: 0.01,
  ignoreCommonCause: false
})

const activeTab = ref('overview')
const selectedEventIndex = ref(null)
const selectedTargetIndex = ref(null)
const targetSelection = ref({})

// 提取基本事件（底事件）
const basicEvents = computed(() => {
  if (!props.nodes || props.nodes.length === 0) {
    return []
  }
  return props.nodes
    .filter(node => node.type === 'event-circle')
    .map(node => ({
      id: node.id,
      label: node.label || '未命名',
      probability: node.probability || 0
    }))
    .sort((a, b) => {
      // 按 X1, X2, X3... 排序
      const numA = parseInt(a.label.replace('X', '')) || 0
      const numB = parseInt(b.label.replace('X', '')) || 0
      return numA - numB
    })
})

// 切换目标选择
const toggleTargetSelection = (eventId) => {
  targetSelection.value[eventId] = !targetSelection.value[eventId]
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 根据分析计数器生成名称
    formData.value.name = `定量分析${props.analysisCount}`
    formData.value.description = ''
    activeTab.value = 'overview'
    selectedEventIndex.value = null
  }
})

const handleConfirm = () => {
  emit('confirm', { ...formData.value })
  emit('update:visible', false)
}

const handleAnalyze = () => {
  emit('analyze', { ...formData.value })
  emit('update:visible', false)
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
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-container {
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 560px;
  max-width: 90vw;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f0f0f0;
  border-bottom: 1px solid #d0d0d0;
}

.dialog-title {
  font-size: 13px;
  font-weight: normal;
  color: #000;
}

.dialog-close {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.dialog-close:hover {
  color: #000;
}

.dialog-body {
  padding: 24px 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #000;
  font-weight: normal;
}

.form-input {
  width: 100%;
  height: 28px;
  padding: 2px 8px;
  border: 1px solid #7eb4ea;
  border-radius: 0;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
  background: #fff;
}

.form-input:focus {
  border-color: #3399ff;
  outline: none;
  background: #e5f3ff;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.form-input::selection {
  background: #3399ff;
  color: #fff;
}

.options-section {
  margin-top: 16px;
  padding: 0;
  background: transparent;
  border-radius: 0;
}

.option-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  gap: 8px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.option-row input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
  flex-shrink: 0;
}

.option-row label {
  font-size: 13px;
  color: #000;
  cursor: pointer;
  margin: 0;
  font-weight: normal;
}

.option-row .indent-label {
  margin-left: 22px;
  cursor: default;
}

.method-select {
  height: 24px;
  padding: 2px 6px;
  border: 1px solid #a0a0a0;
  border-radius: 0;
  font-size: 12px;
  background: #fff;
  cursor: pointer;
  flex: 1;
  max-width: 200px;
}

.factor-input {
  width: 80px;
  height: 22px;
  padding: 2px 6px;
  border: 1px solid #a0a0a0;
  border-radius: 0;
  font-size: 12px;
  text-align: right;
}

.small-input {
  width: 50px;
  height: 22px;
  padding: 2px 6px;
  border: 1px solid #a0a0a0;
  border-radius: 0;
  font-size: 12px;
  margin-left: 6px;
  text-align: right;
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid #d0d0d0;
  display: flex;
  justify-content: center;
  gap: 12px;
  background: #f0f0f0;
}

.btn {
  min-width: 90px;
  height: 28px;
  padding: 4px 20px;
  border-radius: 3px;
  border: 1px solid #adadad;
  font-size: 13px;
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

.btn-primary {
  background: linear-gradient(to bottom, #f7f7f7 0%, #e7e7e7 100%);
  color: #000;
  border-color: #adadad;
}

.btn-primary:hover {
  background: linear-gradient(to bottom, #fafafa 0%, #ebebeb 100%);
  border-color: #5598d7;
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

/* 标签页样式 */
.tabs-section {
  margin-top: 16px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #d0d0d0;
  margin-bottom: 0;
}

.tab-btn {
  padding: 6px 16px;
  border: 1px solid transparent;
  border-bottom: none;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
  color: #000;
  transition: all 0.1s;
  border-radius: 0;
}

.tab-btn.active {
  background: #fff;
  border-color: #d0d0d0;
  border-bottom-color: #fff;
  margin-bottom: -1px;
}

.tab-btn:hover:not(.active) {
  background: #f5f5f5;
}

.tab-content {
  padding: 12px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-top: none;
  min-height: 200px;
}

/* 表格样式 */
.table-wrapper {
  border: 1px solid #d0d0d0;
  border-radius: 0;
  overflow: hidden;
  max-height: 250px;
  overflow-y: auto;
  background: #fff;
}

.events-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.events-table thead {
  background: #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.events-table th {
  padding: 6px 8px;
  text-align: left;
  font-weight: normal;
  color: #000;
  border-bottom: 1px solid #d0d0d0;
  border-right: 1px solid #e0e0e0;
}

.events-table th:last-child {
  border-right: none;
}

.events-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #e8e8e8;
  border-right: 1px solid #e8e8e8;
  background: #fff;
}

.events-table td:last-child {
  border-right: none;
}

.events-table tbody tr {
  cursor: pointer;
  transition: background 0.1s;
}

.events-table tbody tr:hover {
  background: #e8f4ff;
}

.events-table tbody tr.selected-row {
  background: #0078d7;
  color: #fff;
}

.events-table tbody tr.selected-row td {
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

.empty-message {
  padding: 40px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

/* 目标表格样式 */
.target-table-wrapper {
  border: 1px solid #d0d0d0;
  border-radius: 0;
  overflow: hidden;
  max-height: 250px;
  overflow-y: auto;
  background: #fff;
}

.target-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.target-table thead {
  background: #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.target-table th {
  padding: 6px 8px;
  text-align: left;
  font-weight: normal;
  color: #000;
  border-bottom: 1px solid #d0d0d0;
  border-right: 1px solid #e0e0e0;
}

.target-table th:last-child {
  border-right: none;
}

.target-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #e8e8e8;
  border-right: 1px solid #e8e8e8;
  background: #fff;
}

.target-table td:last-child {
  border-right: none;
}

.target-table tbody tr {
  cursor: pointer;
  transition: background 0.1s;
}

.target-table tbody tr:hover {
  background: #e8f4ff;
}

.target-table tbody tr.selected-row {
  background: #0078d7;
  color: #fff;
}

.target-table tbody tr.selected-row td {
  background: #0078d7;
  color: #fff;
}

.target-table input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}
</style>

