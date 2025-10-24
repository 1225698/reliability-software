<template>
  <div class="calculator">
    <header class="tool-header">
      <h1>可靠性工程工具</h1>
      <div class="tool-tabs">
        <button class="tab" :class="{active: showMain}" @click="showMain = true">基本可靠性</button>
        <button class="tab" :class="{active: !showMain}" @click="showMain = false">任务可靠性</button>
      </div>
    </header>

    <!-- 基本可靠性标签页 -->
    <template v-if="showMain">
      <div class="card-section">
        <!-- 系统参数卡片 -->
        <div class="card">
          <div class="card-title">系统参数</div>
          <div class="card-content">
            <div class="param-grid">
              <div class="param-item">
                <label>系统名称：</label>
                <input v-model="systemName" placeholder="请输入系统名称" />
              </div>
              <div class="param-item">
                <label>任务时间：</label>
                <div class="input-with-unit">
                  <input v-model.number="missionTime" type="number" min="0" />
                  <span class="unit">小时</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 元器件配置卡片 -->
        <div class="card">
          <div class="card-title">元器件配置</div>
          <div class="card-content">
            <!-- 模板下载 -->
            <div class="template-generator">
              <button @click="downloadTemplate" class="download-btn">
                📥 下载Excel模板
              </button>
              <p class="template-tip">使用此模板填写数据可确保正确导入</p>
            </div>

            <!-- Excel导入区域 -->
            <div class="excel-import-section">
              <div v-if="uploadStatus" class="upload-status" :class="uploadStatus.type">
                {{ uploadStatus.message }}
              </div>

              <div
                class="upload-area"
                @click="triggerFileInput"
                @drop="handleDrop"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  @change="handleFileUpload"
                  style="display: none"
                >
                <div class="upload-content">
                  <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4c2.svg" alt="Excel" style="width: 48px; margin-bottom: 12px;">
                  <p>点击或拖拽Excel文件到此区域</p>
                  <small>支持 .xlsx, .xls, .csv 格式</small>
                </div>
              </div>

              <!-- Excel模板说明 -->
              <div class="template-info">
                <h4>Excel模板格式：</h4>
                <table class="template-table">
                  <thead>
                    <tr>
                      <th>类型</th>
                      <th>数量</th>
                      <th>失效率</th>
                      <th>描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>电阻</td>
                      <td>10</td>
                      <td>0.000001</td>
                      <td>10kΩ碳膜电阻</td>
                    </tr>
                    <tr>
                      <td>集成电路</td>
                      <td>2</td>
                      <td>0.00001</td>
                      <td>运算放大器</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 元器件列表展示 -->
            <div v-if="selectedComponents.length > 0" class="components-display">
              <h4>当前元器件 ({{ selectedComponents.length }}个)</h4>

              <!-- 元器件统计 -->
              <div class="components-summary">
                <span v-for="(count, type) in componentSummary" :key="type" class="summary-badge">
                  {{ type }}: {{ count }}
                </span>
              </div>

              <div class="components-list">
                <div v-for="(comp, index) in selectedComponents" :key="index" class="component-chip">
                  <span class="chip-main">{{ comp.type }} × {{ comp.quantity }}</span>
                  <div class="chip-detail">
                    <label style="margin-right:6px">λ(/h):</label>
                    <input v-model.number="comp.failureRate" type="number" step="any" style="width:120px;" />
                  </div>
                  <span class="chip-desc">{{ comp.description }}</span>
                  <button @click="removeComponent(index)" class="remove-btn">删除</button>
                </div>
              </div>
            </div>

            <!-- 错误信息显示 -->
            <div v-if="uploadError" class="error-details">
              <h5>导入错误详情：</h5>
              <pre>{{ uploadError }}</pre>
              <button @click="uploadError = null" class="close-btn">关闭</button>
            </div>
          </div>
        </div>

        <!-- 可靠性结果卡片 -->
        <div class="card">
          <div class="card-title">可靠性结果</div>
          <div class="card-content result-row">
            <div class="result-box purple">
              <div class="result-label">系统可靠度</div>
              <div class="result-value">{{ calculationResults.hasResults ? (calculationResults.systemReliability * 100).toFixed(2) : '--' }}%</div>
            </div>
            <div class="result-box pink">
              <div class="result-label">总失效率</div>
              <div class="result-value">{{ calculationResults.hasResults ? calculationResults.totalFailureRate.toFixed(8) : '--' }}/h</div>
            </div>
            <div class="result-box blue">
              <div class="result-label">MTBF</div>
              <div class="result-value">{{ calculationResults.hasResults ? calculationResults.mtbf.toFixed(2) : '--' }} h</div>
            </div>
          </div>
          <div class="action-buttons">
            <button @click="calculateReliability" class="calculate-btn">计算可靠性</button>
            <button @click="saveAndView" class="save-btn" :disabled="!calculationResults.hasResults">
              保存并查看结果
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 任务可靠性标签页 -->
    <template v-else>
      <div class="card-section">
        <!-- 系统表决模块卡片 -->
        <div class="card">
          <div class="card-title">系统表决模块</div>
          <div class="card-content">
            <p>基于基本可靠性结果，配置 N/k 表决模型，生成等效故障率（可作为任务可靠性输入参数）</p>
            
            <!-- 操作按钮 -->
            <div class="task-module-actions" style="margin-bottom: 20px;">
              <button 
                @click="addSystemVoteModule" 
                class="calculate-btn"
                :disabled="!calculationResults.hasResults"
              >
                📌 添加系统表决模块
              </button>
              <p class="template-tip" v-if="!calculationResults.hasResults">
                ⚠️ 请先在「基本可靠性」标签页完成计算，再添加表决模块
              </p>
            </div>

            <!-- 系统表决模块内容 -->
            <div v-if="systemVoteModuleAdded" class="vote-module-container">
              <table class="task-module-table">
                <thead>
                  <tr>
                    <th style="text-align:left; width: 25%;">模块信息</th>
                    <th style="text-align:center; width: 35%;">表决模型参数</th>
                    <th style="text-align:right; width: 30%;">等效故障率计算</th>
                    <th style="text-align:center; width: 10%;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="task-module-row">
                    <!-- 模块信息（自动填充） -->
                    <td>
                      <div class="module-info-item">
                        <label>模块名：</label>
                        <input 
                          v-model="voteModule.name" 
                          class="task-input"
                          readonly
                          style="background: #f5f7fa; cursor: default;"
                        />
                      </div>
                      <div class="module-info-item" style="margin-top: 8px;">
                        <label>基本失效率：</label>
                        <input 
                          v-model="voteModule.baseFailureRate" 
                          class="task-input"
                          readonly
                          style="background: #f5f7fa; cursor: default;"
                        />
                        <span class="unit" style="margin-left: 4px;">/h</span>
                      </div>
                    </td>

                    <!-- 表决参数输入 -->
                    <td style="text-align:center;">
                      <div class="vote-params-container">
                        <div class="param-group">
                          <label style="margin-right: 8px;">N（总模块数）：</label>
                          <input 
                            v-model.number="voteParams.N" 
                            type="number" 
                            min="1" 
                            class="task-input vote-param-input"
                            @input="validateVoteParams"
                            :class="{ 'input-error': voteParamErrors.N }"
                          />
                          <div v-if="voteParamErrors.N" class="error-tooltip">{{ voteParamErrors.N }}</div>
                        </div>
                        <div class="param-group" style="margin-top: 8px;">
                          <label style="margin-right: 8px;">k（最小有效数）：</label>
                          <input 
                            v-model.number="voteParams.k" 
                            type="number" 
                            min="1" 
                            class="task-input vote-param-input"
                            @input="validateVoteParams"
                            :class="{ 'input-error': voteParamErrors.k }"
                          />
                          <div v-if="voteParamErrors.k" class="error-tooltip">{{ voteParamErrors.k }}</div>
                        </div>
                        <button 
                          @click="calculateVoteFailureRate" 
                          class="download-btn"
                          style="margin-top: 12px; padding: 8px 16px; font-size: 0.9rem;"
                          :disabled="!isVoteParamsValid"
                        >
                          计算等效故障率
                        </button>
                      </div>
                    </td>

                    <!-- 等效故障率输出 -->
                    <td style="text-align:right;">
                      <div class="result-display">
                        <label>等效故障率：</label>
                        <input 
                          v-model.number="voteModule.failureRate" 
                          class="task-input failure-rate-input"
                          :readonly="!isVoteCalculated"
                          placeholder="点击计算获取"
                          :class="{ 'input-success': isVoteCalculated }"
                        />
                        <span class="unit" style="margin-left: 4px;">/h</span>
                      </div>
                      <p class="param-tip" style="margin-top: 8px; font-size: 0.8rem; color: #28a745;">
                        ✅ 可直接参与任务可靠性计算
                      </p>
                    </td>

                    <!-- 操作按钮 -->
                    <td style="text-align:center;">
                      <button 
                        @click="removeSystemVoteModule" 
                        class="remove-btn task-remove-btn"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 任务可靠性结果卡片 -->
        <div class="card">
          <div class="card-title">任务可靠性结果</div>
          <div class="card-content">
            <div v-if="calculationResults.taskResults">
              <div style="display:flex;gap:20px;flex-wrap:wrap;">
                <div class="result-box purple" style="flex:0 0 220px;">
                  <div class="result-label">观测任务失效率</div>
                  <div class="result-value">{{ calculationResults.taskResults.observedFailureRate.toExponential(3) }}</div>
                </div>
                <div class="result-box blue" style="flex:0 0 220px;">
                  <div class="result-label">任务 MTBF</div>
                  <div class="result-value">{{ isFinite(calculationResults.taskResults.taskMBTF) ? calculationResults.taskResults.taskMBTF.toFixed(2) : '∞' }} h</div>
                </div>
                <div class="result-box pink" style="flex:0 0 220px;">
                  <div class="result-label">任务基本可靠度 P</div>
                  <div class="result-value">{{ (calculationResults.taskResults.taskReliability * 100).toFixed(4) }}%</div>
                </div>
              </div>
            </div>
            <div v-else>
              <p>请添加系统表决模块并计算等效故障率后，点击下方按钮计算任务可靠性</p>
              <button @click="computeTask" class="calculate-btn" style="margin-top: 16px;">
                计算任务可靠性
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineOptions({ name: 'CalculatorView' })
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useReliabilityCalc } from '../composables/useReliabilityCalc'
import { useRouter } from 'vue-router'

// 状态管理
const showMain = ref(true)
const router = useRouter()
const fileInput = ref(null)
const newComponentType = ref('电阻')
const uploadStatus = ref(null)
const uploadError = ref(null)
const moduleErrors = ref([])

// 表决模块相关状态
const systemVoteModuleAdded = ref(false)
const isVoteCalculated = ref(false)
const isVoteParamsValid = ref(false)

const voteModule = ref({
  name: '',
  baseFailureRate: 0,
  failureRate: 0
})

const voteParams = ref({
  N: 8,
  k: 4
})

const voteParamErrors = ref({
  N: '',
  k: ''
})

// 从组合式函数获取数据和方法
const {
  systemName,
  missionTime,
  componentTypeOptions,
  selectedComponents,
  calculationResults,
  calculateReliability,
  taskModules,
  calculateTaskReliability,
  saveAnalysis,
  addComponent,
  removeComponent,
  importComponentsFromExcel
} = useReliabilityCalc()

// 初始化模块错误信息
const initModuleErrors = () => {
  const errors = []
  taskModules.value.forEach(() => errors.push({}))
  moduleErrors.value = errors
}
initModuleErrors()

// 元器件统计
const componentSummary = computed(() => {
  const summary = {}
  selectedComponents.value.forEach(comp => {
    summary[comp.type] = (summary[comp.type] || 0) + comp.quantity
  })
  return summary
})

// 手动添加元器件
const addManualComponent = () => {
  addComponent(newComponentType.value)
}

// 任务计算方法
const computeTask = () => {
  if (!systemVoteModuleAdded.value || !isVoteCalculated.value) {
    alert('请先添加系统表决模块并计算等效故障率！')
    return
  }

  let isValid = true
  taskModules.value.forEach((module, idx) => {
    const nameValid = validateModuleName(module, idx)
    const rateValid = validateFailureRate(module, idx)
    if (!nameValid || !rateValid) isValid = false
  })
  
  if (isValid) {
    calculateTaskReliability()
  } else {
    alert('存在无效的模块输入，请检查并修正后再计算')
    const firstError = document.querySelector('.input-error')
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// 添加系统表决模块
const addSystemVoteModule = () => {
  if (!calculationResults.value?.hasResults) {
    alert('请先在「基本可靠性」标签页完成计算，获取系统总失效率！')
    return
  }

  const moduleName = `${systemName.value || '系统'}_表决模块`
  const baseFailureRate = calculationResults.value.totalFailureRate.toFixed(8)

  voteModule.value = {
    name: moduleName,
    baseFailureRate: parseFloat(baseFailureRate),
    failureRate: 0
  }

  taskModules.value = [voteModule.value]
  systemVoteModuleAdded.value = true
  isVoteCalculated.value = false
  isVoteParamsValid.value = false

  setTimeout(() => {
    const voteModuleEl = document.querySelector('.vote-module-container')
    if (voteModuleEl) voteModuleEl.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}

// 删除系统表决模块
const removeSystemVoteModule = () => {
  systemVoteModuleAdded.value = false
  isVoteCalculated.value = false
  taskModules.value = []
  voteParamErrors.value = { N: '', k: '' }
}

// 验证表决参数
const validateVoteParams = () => {
  const errors = { N: '', k: '' }
  let isValid = true

  if (!Number.isInteger(voteParams.value.N) || voteParams.value.N < 1) {
    errors.N = '请输入正整数'
    isValid = false
  }

  if (!Number.isInteger(voteParams.value.k) || voteParams.value.k < 1) {
    errors.k = '请输入正整数'
    isValid = false
  }

  if (voteParams.value.N <= voteParams.value.k && !errors.N && !errors.k) {
    errors.N = '总模块数必须大于最小有效数'
    isValid = false
  }

  voteParamErrors.value = errors
  isVoteParamsValid.value = isValid
}

// 计算表决模型等效故障率
const calculateVoteFailureRate = () => {
  if (!isVoteParamsValid.value) return

  const { N, k } = voteParams.value
  const λ_base = voteModule.value.baseFailureRate
  const t = missionTime.value

  const R_base = Math.exp(-λ_base * t)
  const Q_base = 1 - R_base

  let R_vote = 0
  for (let i = k; i <= N; i++) {
    const combination = factorial(N) / (factorial(i) * factorial(N - i))
    R_vote += combination * Math.pow(R_base, i) * Math.pow(Q_base, N - i)
  }

  const λ_vote = -Math.log(R_vote) / t
  voteModule.value.failureRate = parseFloat(λ_vote.toFixed(8))
  taskModules.value[0].failureRate = voteModule.value.failureRate
  isVoteCalculated.value = true

  alert(`表决模块等效故障率计算完成：${voteModule.value.failureRate.toExponential(6)} /h`)
}

// 阶乘辅助函数
const factorial = (n) => {
  if (n === 0 || n === 1) return 1
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

// 模块验证方法
const validateModuleName = (module, idx) => {
  if (!module.name || module.name.trim() === '') {
    moduleErrors.value[idx] = { ...moduleErrors.value[idx], name: '模块名称不能为空' }
    return false
  } else if (module.name.length > 30) {
    moduleErrors.value[idx] = { ...moduleErrors.value[idx], name: '模块名称不能超过30个字符' }
    return false
  } else {
    const { name, ...rest } = moduleErrors.value[idx] || {}
    moduleErrors.value[idx] = rest
    return true
  }
}

const validateFailureRate = (module, idx) => {
  const rate = Number(module.failureRate)
  if (isNaN(rate) || rate < 0) {
    moduleErrors.value[idx] = { ...moduleErrors.value[idx], failureRate: '请输入有效的非负数' }
    return false
  } else {
    const { failureRate, ...rest } = moduleErrors.value[idx] || {}
    moduleErrors.value[idx] = rest
    return true
  }
}

// Excel模板下载
const downloadTemplate = () => {
  try {
    if (typeof XLSX === 'undefined') {
      alert('Excel库未加载，请刷新页面重试')
      return
    }

    const templateData = [
      ['类型', '数量', '失效率', '描述'],
      ['电阻', 15, 0.000001, '10kΩ碳膜电阻'],
      ['电容', 8, 0.000002, '100μF电解电容'],
      ['集成电路', 3, 0.00001, '运算放大器IC']
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(templateData)
    XLSX.utils.book_append_sheet(wb, ws, '元器件配置')
    XLSX.writeFile(wb, '可靠性分析_元器件模板.xlsx')
    alert('Excel模板下载完成！')

  } catch (error) {
    console.error('生成模板失败:', error)
    alert('模板生成失败: ' + error.message)
  }
}

// 文件上传处理
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  await processExcelFile(file)
  event.target.value = ''
}

const handleDrop = (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files.length > 0) processExcelFile(files[0])
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const handleDragLeave = (event) => {
  event.preventDefault()
}

const processExcelFile = async (file) => {
  try {
    uploadStatus.value = { type: 'loading', message: `正在处理文件: ${file.name}...` }
    const result = await importComponentsFromExcel(file)
    
    if (result.success) {
      uploadStatus.value = { type: 'success', message: `成功导入 ${result.count} 个元器件` }
    } else {
      uploadStatus.value = { type: 'error', message: result.message }
    }

    setTimeout(() => uploadStatus.value = null, 5000)
  } catch (error) {
    uploadStatus.value = { type: 'error', message: `处理失败: ${error.message}` }
    setTimeout(() => uploadStatus.value = null, 5000)
  }
}

// 保存并查看结果
const saveAndView = () => {
  if (selectedComponents.value.length === 0) {
    alert('请先添加或导入元器件')
    return
  }

  if (saveAnalysis()) {
    alert('分析结果已保存！')
    router.push('/results')
  }
}
</script>

<style scoped>
.card-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(102,126,234,0.10);
  padding: 24px 32px;
  margin-bottom: 0;
}
.card-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 18px;
}
.card-content {
  margin-bottom: 12px;
}

/* 系统参数样式 */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.param-item {
  display: flex;
  align-items: center;
}
.param-item label {
  color: #764ba2;
  font-weight: 600;
  margin-right: 12px;
  width: 90px;
  text-align: right;
}
.input-with-unit {
  display: flex;
  align-items: center;
  flex: 1;
}
.unit {
  margin-left: 8px;
  color: #666;
}

/* 模板下载样式 */
.template-generator {
  margin-bottom: 1.5rem;
}
.download-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}
.download-btn:hover {
  background: linear-gradient(135deg, #218838 0%, #1e9e8a 100%);
  transform: translateY(-2px);
}
.template-tip {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* Excel导入区域 */
.excel-import-section {
  margin-bottom: 2rem;
}
.upload-area {
  border: 2px dashed #667eea;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8f9ff;
}
.upload-area:hover {
  background: #eef1ff;
  border-color: #764ba2;
}
.upload-status {
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 500;
}
.upload-status.loading {
  background: #e3f2fd;
  color: #1976d2;
}
.upload-status.success {
  background: #e8f5e8;
  color: #2e7d32;
}
.upload-status.error {
  background: #ffebee;
  color: #c62828;
}
.template-info {
  margin-top: 2rem;
  padding: 1rem;
  background: #f5f7fa;
  border-radius: 8px;
}
.template-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}
.template-table th, .template-table td {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: center;
}
.template-table th {
  background: #667eea;
  color: white;
}

/* 元器件列表 */
.components-display {
  margin-top: 2rem;
}
.components-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 1rem;
}
.summary-badge {
  background: #667eea;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}
.components-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.component-chip {
  display: flex;
  align-items: center;
  background: #e3e8ff;
  border-radius: 8px;
  padding: 8px 16px;
  gap: 12px;
  font-size: 0.95rem;
}
.chip-main {
  font-weight: 600;
  color: #667eea;
  min-width: 100px;
}
.chip-detail {
  color: #666;
  font-size: 0.9rem;
  min-width: 120px;
}
.chip-desc {
  color: #888;
  font-size: 0.9rem;
  flex: 1;
}

/* 错误信息 */
.error-details {
  background: #ffebee;
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}
.close-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}

/* 结果展示 */
.result-row {
  display: flex;
  gap: 32px;
  margin-bottom: 18px;
}
.result-box {
  flex: 1;
  border-radius: 12px;
  padding: 18px 0;
  text-align: center;
  color: #fff;
  font-weight: bold;
  box-shadow: 0 2px 12px rgba(102,126,234,0.08);
}
.result-box.purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.result-box.pink {
  background: linear-gradient(135deg, #f797a7 0%, #f7b2e7 100%);
}
.result-box.blue {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #222;
}
.result-label {
  font-size: 1rem;
  margin-bottom: 10px;
  font-weight: 500;
}
.result-value {
  font-size: 2rem;
  font-weight: bold;
}
.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}
.calculate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1.1rem;
  border-radius: 25px;
  cursor: pointer;
  transition: transform 0.3s;
}
.save-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1.1rem;
  border-radius: 25px;
  cursor: pointer;
  transition: transform 0.3s;
}
.save-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}
.calculate-btn:hover, .save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}
.remove-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

/* 标签页样式 */
.tool-tabs {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin: 24px 0;
}
.tab {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 12px 36px;
  font-size: 1.1rem;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s;
}
.tab.active {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #222;
  transform: scale(1.08);
}

/* 输入框样式 */
.param-item input, .task-input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 1rem;
  background: #f5f7fa;
  transition: border-color 0.2s;
  outline: none;
  flex: 1;
}
.param-item input:focus, .task-input:focus {
  border-color: #667eea;
}

/* 表决模块样式 */
.vote-module-container {
  background: #f8f9ff;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}
.module-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.module-info-item label {
  color: #764ba2;
  font-weight: 600;
  width: 80px;
  text-align: right;
}
.vote-params-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.param-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
}
.vote-param-input {
  width: 80px !important;
  text-align: center;
}
.result-display {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}
.input-error {
  border-color: #e74c3c !important;
}
.input-success {
  border-color: #28a745 !important;
}
.error-tooltip {
  position: absolute;
  background-color: #e74c3c;
  color: white;
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 30px;
  white-space: nowrap;
}
.task-module-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}
.task-module-table th, .task-module-table td {
  border: 1px solid #ddd;
  padding: 12px 15px;
}
.task-module-table th {
  background: #667eea;
  color: white;
}
.task-module-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}
.task-remove-btn {
  padding: 5px 10px;
  font-size: 0.9rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .param-grid {
    grid-template-columns: 1fr;
  }
  .result-row {
    flex-direction: column;
    gap: 1rem;
  }
  .tool-tabs {
    flex-direction: column;
    align-items: center;
  }
  .module-info-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .module-info-item label {
    text-align: left;
  }
  .param-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>