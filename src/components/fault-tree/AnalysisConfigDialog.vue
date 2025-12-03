<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-container" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">定性分析</span>
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

        <!-- 选项复选框（不使用标签页） -->
        <div class="options-section">
          <div class="checkbox-item">
            <input
              type="checkbox"
              id="calc-mincuts"
              v-model="formData.calculateMinimalCutSets"
            />
            <label for="calc-mincuts">计算最小割集</label>
          </div>

          <div class="checkbox-item">
            <input
              type="checkbox"
              id="calc-importance"
              v-model="formData.calculateImportance"
            />
            <label for="calc-importance">忽略高阶最小割集或最小径集的数</label>
            <input
              v-if="formData.calculateImportance"
              type="number"
              v-model.number="formData.maxOrder"
              class="small-input"
              min="1"
              max="100"
            />
          </div>

          <div class="checkbox-item">
            <input
              type="checkbox"
              id="calc-failure"
              v-model="formData.calculateFailure"
            />
            <label for="calc-failure">忽略共因失效</label>
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
  name: '定性分析1',
  description: '',
  calculateMinimalCutSets: true,
  calculateImportance: false,
  maxOrder: 15,
  calculateFailure: false
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 根据分析计数器生成名称
    formData.value.name = `定性分析${props.analysisCount}`
    formData.value.description = ''
  }
})

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
  width: 500px;
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

.checkbox-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 6px;
}

.checkbox-item:last-child {
  margin-bottom: 0;
}

.checkbox-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
}

.checkbox-item label {
  font-size: 13px;
  color: #000;
  cursor: pointer;
  margin: 0;
  font-weight: normal;
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

</style>

