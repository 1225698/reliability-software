<template>
  <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-container" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">{{ getDialogTitle() }}</span>
        <button class="dialog-close" @click="handleCancel">×</button>
      </div>
      
      <div class="dialog-body">
        <div class="form-group">
          <label for="event-name">事件名称:</label>
          <input 
            id="event-name" 
            v-model="formData.label" 
            type="text" 
            class="form-input" 
            placeholder="请输入事件名称"
          />
        </div>
        
        <div class="form-group">
          <label for="event-description">事件描述:</label>
          <input 
            id="event-description" 
            v-model="formData.description" 
            type="text" 
            class="form-input" 
            placeholder="请输入事件描述"
          />
        </div>
        
        <!-- 中间事件显示逻辑门下拉选择 -->
        <div v-if="formData.type === 'event-rect'" class="form-group">
          <label for="logic-gate">逻辑门:</label>
          <select 
            id="logic-gate" 
            v-model="formData.logicGate" 
            class="form-select"
          >
            <option value="">中间事件</option>
            <option value="gate-and">与门</option>
            <option value="gate-or">或门</option>
           
          </select>
        </div>
        
        <!-- 底事件显示发生概率 -->
        <div v-if="formData.type === 'event-circle'" class="form-group">
          <label for="event-probability">发生概率:</label>
          <input
            id="event-probability"
            v-model="formData.probability"
            type="text"
            class="form-input"
            placeholder="请输入发生概率 (0-1之间的数值)"
          />
        </div>

        <!-- 条件事件显示条件概率 -->
        <div v-if="formData.type === 'event-oval'" class="form-group">
          <label for="condition-probability">条件概率:</label>
          <input
            id="condition-probability"
            v-model="formData.conditionProbability"
            type="text"
            class="form-input"
            placeholder="请输入条件概率 (0-1之间的数值)"
          />
          <div class="form-hint">条件事件用于表示某个条件发生的概率，通常与禁门配合使用</div>
        </div>

        <!-- 未探明事件显示估计概率 -->
        <div v-if="formData.type === 'event-diamond'" class="form-group">
          <label for="estimated-probability">估计概率:</label>
          <input
            id="estimated-probability"
            v-model="formData.probability"
            type="text"
            class="form-input"
            placeholder="请输入估计概率 (0-1之间的数值，可选)"
          />
          <div class="form-hint">未探明事件表示暂未深入分析的事件，可以输入估计的发生概率</div>
        </div>

        <!-- 表决门参数 -->
        <div v-if="formData.type === 'gate-voter' || formData.type === 'gate-priority-and'" class="form-group">
          <label for="gate-r">r值 (表决门r/N):</label>
          <input 
            id="gate-r" 
            v-model.number="formData.voterR" 
            type="number" 
            min="1"
            class="form-input" 
            placeholder="r"
          />
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-primary" @click="handleConfirm">确定(O)</button>
        <button class="btn btn-default" @click="handleCancel">取消(C)</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  nodeData: Object
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

const formData = ref({
  label: '',
  description: '',
  type: 'event-rect',
  probability: '',
  conditionProbability: '',
  voterR: 1,
  logicGate: ''
})

const isEvent = ref(true)

watch(() => props.nodeData, (newData) => {
  if (newData) {
    formData.value = {
      label: newData.label || '',
      description: newData.description || '',
      type: newData.type || 'event-rect',
      probability: newData.probability || '',
      conditionProbability: newData.conditionProbability || '',
      voterR: newData.voterR || 1,
      logicGate: newData.logicGate || ''
    }

    // 判断是事件还是逻辑门
    isEvent.value = newData.type ? newData.type.startsWith('event-') : true
  }
}, { immediate: true })

const getDialogTitle = () => {
  if (!formData.value.type) return '编辑节点'
  
  if (formData.value.type.startsWith('event-')) {
    // 根据事件类型返回标题
    if (formData.value.type === 'event-rect') {
      return '中间事件'
    } else if (formData.value.type === 'event-circle') {
      return '基本事件'
    } else if (formData.value.type === 'event-diamond') {
      return '未探明事件'
    } else if (formData.value.type === 'event-oval') {
      return '条件事件'
    }
    return '中间事件'
  } else if (formData.value.type.startsWith('gate-')) {
    const gateNames = {
      'gate-and': '与门',
      'gate-or': '或门',
     
    }
    return gateNames[formData.value.type] || '逻辑门'
  }
  return '编辑节点'
}

const handleConfirm = () => {
  // 验证底事件的发生概率
  if (formData.value.type === 'event-circle' && formData.value.probability) {
    const prob = parseFloat(formData.value.probability)
    if (isNaN(prob) || prob < 0 || prob > 1) {
      alert('发生概率必须是0到1之间的数值！')
      return
    }
  }

  // 验证条件事件的条件概率
  if (formData.value.type === 'event-oval' && formData.value.conditionProbability) {
    const prob = parseFloat(formData.value.conditionProbability)
    if (isNaN(prob) || prob < 0 || prob > 1) {
      alert('条件概率必须是0到1之间的数值！')
      return
    }
  }

  // 验证未探明事件的估计概率
  if (formData.value.type === 'event-diamond' && formData.value.probability) {
    const prob = parseFloat(formData.value.probability)
    if (isNaN(prob) || prob < 0 || prob > 1) {
      alert('估计概率必须是0到1之间的数值！')
      return
    }
  }

  emit('confirm', { ...formData.value })
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

const handleOverlayClick = () => {
  // 点击遮罩层不关闭对话框
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

.dialog-container {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 400px;
  max-width: 500px;
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
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

.form-input,
.form-select {
  width: 100%;
  height: 32px;
  padding: 4px 11px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  font-size: 14px;
  transition: all 0.3s;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  border-color: #40a9ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-input::placeholder {
  color: #bfbfbf;
}

.form-input:disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
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

.btn-primary {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
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

