<template>
  <div class="calculator">
    <header class="tool-header">
      <h1>可靠性工程工具</h1>
      <div class="tool-tabs">
        <button class="tab" :class="{active: showMain}" @click="showMain = true">基本可靠性</button>
  <button class="tab" :class="{active: !showMain}" @click="showMain = false">任务可靠性</button>
      </div>
    </header>

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
              <div class="param-item">
                <label>Pi 时间窗口：</label>
                <div class="input-with-unit">
                  <input v-model.number="piWindowHours" type="number" min="1" />
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
              <!-- 上传状态显示 -->
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

            <!-- 手动添加元器件（保留原有功能） -->
            <div class="manual-add-section">
              <h4>手动添加元器件</h4>
              <div class="add-controls">
                <select v-model="newComponentType" class="type-select">
                  <option v-for="type in componentTypeOptions" :key="type" :value="type">
                    {{ type }}
                  </option>
                </select>
                <button @click="addManualComponent" class="add-manual-btn">+ 添加</button>
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
                  <div class="chip-detail">
                    <label style="margin-right:6px">MTBF(h):</label>
                    <input v-model.number="comp.mtbf" type="number" min="0" step="any" placeholder="可选，优先使用MTBF" style="width:140px;" />
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
              <div class="result-label">{{ showMain ? '系统可靠度' : '任务可靠度' }}</div>
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
          <div v-if="calculationResults.hasResults" class="chart-box">
            <ReliabilityChart :data="calculationResults.curveData" />
          </div>
          <div v-if="calculationResults.hasResults" class="per-unit-results" style="margin-top:16px;">
            <h4>各单元结果 (基于 MTBF 或 失效率)</h4>
            <table style="width:100%;border-collapse:collapse;margin-top:8px;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">类型</th>
                  <th style="text-align:right;padding:8px;border-bottom:1px solid #eee;">数量</th>
                  <th style="text-align:right;padding:8px;border-bottom:1px solid #eee;">单机失效率 (/h)</th>
                  <th style="text-align:right;padding:8px;border-bottom:1px solid #eee;">单元总失效率 (/h)</th>
                  <th style="text-align:right;padding:8px;border-bottom:1px solid #eee;">Pi (e^(-λ·{{piWindowHours}}))</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in calculationResults.perUnitResults" :key="i">
                  <td style="padding:8px;border-bottom:1px solid #f5f5f5;">{{ r.type }}</td>
                  <td style="padding:8px;border-bottom:1px solid #f5f5f5;text-align:right">{{ r.quantity }}</td>
                  <td style="padding:8px;border-bottom:1px solid #f5f5f5;text-align:right">{{ r.perUnitFailureRate.toExponential ? r.perUnitFailureRate.toExponential(3) : r.perUnitFailureRate }}</td>
                  <td style="padding:8px;border-bottom:1px solid #f5f5f5;text-align:right">{{ r.unitTotalFailureRate.toExponential ? r.unitTotalFailureRate.toExponential(3) : r.unitTotalFailureRate }}</td>
                  <td style="padding:8px;border-bottom:1px solid #f5f5f5;text-align:right">{{ (r.Pi * 100).toFixed(4) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="card-section">
        <div class="card">
          <div class="card-title">任务级模块输入</div>
          <div class="card-content">
            <p>在此输入组成任务的各模块观测失效率（每个模块的失效率可代表表决模型后的模块故障率）。</p>
            <div class="template-info" style="margin-top:8px;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:8px;border-bottom:1px solid #eee;">模块名</th>
                    <th style="text-align:right;padding:8px;border-bottom:1px solid #eee;">失效率 (/h)</th>
                    <th style="text-align:center;padding:8px;border-bottom:1px solid #eee;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(m, idx) in taskModules" :key="idx">
                    <td style="padding:8px;border-bottom:1px solid #f5f5f5;"><input v-model="m.name" /></td>
                    <td style="padding:8px;border-bottom:1px solid #f5f5f5;text-align:right"><input v-model.number="m.failureRate" type="number" step="any" style="width:140px;"/></td>
                    <td style="padding:8px;border-bottom:1px solid #f5f5f5;text-align:center"><button @click="taskModules.splice(idx,1)" class="remove-btn">删除</button></td>
                  </tr>
                </tbody>
              </table>
              <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;">
                <button @click="taskModules.push({ name: '新模块', failureRate: 0.0001 })" class="add-manual-btn">+ 添加模块</button>
                <button @click="importSystemToTask" class="download-btn">从基本可靠性导入系统失效率</button>
                <button @click="computeTask" class="calculate-btn">计算任务可靠性</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">任务可靠性结果</div>
          <div class="card-content">
            <div v-if="calculationResults.taskResults">
              <div style="display:flex;gap:20px;flex-wrap:wrap;">
                <div class="result-box purple" style="flex:0 0 220px;">
                  <div class="result-label">观测任务失效率</div>
                  <div class="result-value">{{ (calculationResults.taskResults.observedFailureRate).toExponential ? calculationResults.taskResults.observedFailureRate.toExponential(3) : calculationResults.taskResults.observedFailureRate }}</div>
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
              <p>请在上方输入模块并点击“计算任务可靠性”。</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// 为满足 ESLint 的多词组件命名规则，明确设置组件名
defineOptions({ name: 'CalculatorView' })
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useReliabilityCalc } from '../composables/useReliabilityCalc'
import ReliabilityChart from '../components/ReliabilityChart.vue'
import { useRouter } from 'vue-router'

const showMain = ref(true)
const router = useRouter()
const fileInput = ref(null)
const newComponentType = ref('电阻')
const uploadStatus = ref(null)
const uploadError = ref(null)

// 从 composable 中获取所有需要的变量和方法
const {
  systemName,
  missionTime,
  componentTypeOptions,
  selectedComponents,
  calculationResults,
  piWindowHours,
  calculateReliability,
  // 任务相关
  taskModules,
  calculateTaskReliability,
  saveAnalysis,
  addComponent,
  removeComponent,
  importComponentsFromExcel
} = useReliabilityCalc()

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

// 计算任务可靠性的 wrapper
const computeTask = () => {
  calculateTaskReliability()
}

const importSystemToTask = () => {
  // 使用当前 basic 计算的 totalFailureRate 导入为一个模块
  const tf = (calculationResults.value && calculationResults.value.totalFailureRate) ? calculationResults.value.totalFailureRate : 0
  const name = (systemName && systemName.value) ? systemName.value : '系统'
  taskModules.value.push({ name: String(name), failureRate: tf })
}

// Excel模板下载
const downloadTemplate = () => {
  try {
    // 检查xlsx库是否可用
    if (typeof XLSX === 'undefined') {
      alert('Excel库未加载，请刷新页面重试')
      return
    }

    // 模板数据
    const templateData = [
      ['类型', '数量', '失效率', '描述'],
      ['电阻', 15, 0.000001, '10kΩ碳膜电阻'],
      ['电容', 8, 0.000002, '100μF电解电容'],
      ['集成电路', 3, 0.00001, '运算放大器IC'],
      ['晶体管', 5, 0.000005, 'NPN功率晶体管'],
      ['连接器', 12, 0.000003, 'DB9串口连接器'],
      ['电感', 6, 0.0000015, '10mH功率电感'],
      ['二极管', 10, 0.000004, '1N4148开关二极管'],
      ['变压器', 2, 0.000008, '220V转12V电源变压器'],
      ['继电器', 4, 0.000015, '12V直流继电器'],
      ['传感器', 3, 0.000012, '温度传感器DS18B20']
    ]

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(templateData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 10 }, // 类型
      { wch: 8 },  // 数量
      { wch: 12 }, // 失效率
      { wch: 25 }  // 描述
    ]

    // 添加工作表
    XLSX.utils.book_append_sheet(wb, ws, '元器件配置')

    // 生成并下载文件
    XLSX.writeFile(wb, '可靠性分析_元器件模板.xlsx')

    alert('Excel模板下载完成！请使用此模板填写数据。')

  } catch (error) {
    console.error('生成模板失败:', error)
    alert('模板生成失败: ' + error.message)
  }
}

// 文件上传相关功能
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  await processExcelFile(file)
  // 清空文件输入，允许重复选择同一文件
  event.target.value = ''
}

const handleDrop = (event) => {
  event.preventDefault()

  // 清除拖拽样式
  event.currentTarget.style.background = '#f8f9ff'
  event.currentTarget.style.borderColor = '#667eea'

  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    console.log('拖拽文件:', file)
    processExcelFile(file)
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
  // 添加拖拽悬停效果
  event.currentTarget.style.background = '#eef1ff'
  event.currentTarget.style.borderColor = '#764ba2'
}

const handleDragLeave = (event) => {
  event.preventDefault()
  // 恢复原始样式
  event.currentTarget.style.background = '#f8f9ff'
  event.currentTarget.style.borderColor = '#667eea'
}

// 处理Excel文件
const processExcelFile = async (file) => {
  try {
    uploadError.value = null

    // 显示上传状态
    uploadStatus.value = {
      type: 'loading',
      message: `正在处理文件: ${file.name}...`
    }

    console.log('Vue3环境文件处理:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // 添加文件类型验证
    const allowedTypes = ['.xlsx', '.xls', '.csv']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(`不支持的文件格式: ${fileExtension}，请使用 ${allowedTypes.join(', ')} 格式`)
    }

    // 文件大小限制（10MB）
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('文件大小超过限制（10MB）')
    }

    if (file.size === 0) {
      throw new Error('文件为空')
    }

    const result = await importComponentsFromExcel(file)

    console.log('Vue3环境导入结果:', result)

    if (result.success) {
      uploadStatus.value = {
        type: 'success',
        message: `成功导入 ${result.count} 个元器件`
      }

      // 自动滚动到元器件列表
      setTimeout(() => {
        const componentsSection = document.querySelector('.components-display')
        if (componentsSection) {
          componentsSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 500)

    } else {
      uploadStatus.value = {
        type: 'error',
        message: result.message
      }
    }

    // 5秒后清除状态消息
    setTimeout(() => {
      uploadStatus.value = null
    }, 5000)

  } catch (error) {
    console.error('Vue3环境文件处理错误:', error)
    uploadStatus.value = {
      type: 'error',
      message: `处理失败: ${error.message}`
    }

    // 显示详细错误信息
    uploadError.value = {
      message: error.message,
      stack: error.stack,
      file: file.name
    }

    setTimeout(() => {
      uploadStatus.value = null
    }, 5000)
  }
}

// 保存并查看结果
const saveAndView = () => {
  // 验证环境信息是否已输入
  // 环境相关输入已移除，校验逻辑不再需要

  // 验证是否有元器件
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

/* 系统参数网格布局 */
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
  display: inline-block;
  width: 90px;
  text-align: right;
  white-space: nowrap;
}

/* 带单位的输入框容器 */
.input-with-unit {
  display: flex;
  align-items: center;
  flex: 1;
}

.unit {
  margin-left: 8px;
  color: #666;
  white-space: nowrap;
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
  font-size: 14px;
  font-weight: 500;
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
  text-align: center;
}

/* Excel导入区域样式 */
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

.upload-content p {
  margin: 0.5rem 0;
  color: #667eea;
  font-weight: 500;
}

.upload-content small {
  color: #888;
}

/* 上传状态样式 */
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
  border: 1px solid #bbdefb;
}

.upload-status.success {
  background: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.upload-status.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
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

.template-table th,
.template-table td {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: center;
}

.template-table th {
  background: #667eea;
  color: white;
}

/* 手动添加区域 */
.manual-add-section {
  margin: 2rem 0;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.manual-add-section h4 {
  margin-bottom: 1rem;
  color: #667eea;
}

.add-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.type-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  flex: 1;
}

.add-manual-btn {
  background: #27ae60;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.add-manual-btn:hover {
  background: #219653;
}

/* 元器件列表展示 */
.components-display {
  margin-top: 2rem;
}

.components-display h4 {
  margin-bottom: 1rem;
  color: #667eea;
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

/* 错误信息显示 */
.error-details {
  background: #ffebee;
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.error-details h5 {
  color: #c62828;
  margin-bottom: 0.5rem;
}

.error-details pre {
  background: white;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
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

.close-btn:hover {
  background: #d32f2f;
}

/* 结果展示区域 */
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
.chart-box {
  margin-top: 24px;
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
  transform: none;
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
  white-space: nowrap;
}

.remove-btn:hover {
  background: #c0392b;
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
  box-shadow: 0 2px 8px rgba(102,126,234,0.15);
  transition: background 0.3s, transform 0.2s;
  font-weight: 500;
}
.tab.active {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #222;
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(67,233,123,0.15);
}
.tab:hover:not(.active) {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333;
  transform: scale(1.04);
}
.calculator {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(102,126,234,0.12);
  padding: 32px 24px;
  max-width: 900px;
  margin: 32px auto;
}
.tool-header h1 {
  font-size: 2.2rem;
  font-weight: 700;
  color: #667eea;
  text-align: center;
  margin-bottom: 0.5em;
  letter-spacing: 2px;
}

/* 输入框样式 */
.param-item input,
.param-item select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 1rem;
  background: #f5f7fa;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(102,126,234,0.06);
  outline: none;
  flex: 1;
  min-width: 0;
}
.param-item input {
  height: 32px; /* 固定高度 */
  box-sizing: border-box; /* 包含内边距和边框 */
}

.input-with-unit {
  width: 100%; /* 确保带单位的容器占满宽度 */
}

.input-with-unit input {
  flex: 1; /* 输入框占满容器剩余空间 */
  height: 32px; /* 与系统名称输入框高度一致 */
  box-sizing: border-box;
}

.input-with-unit .unit {
  margin-left: 8px;
  line-height: 32px; /* 与输入框高度一致，垂直居中 */
  white-space: normal; /* 允许长单位文本换行 */
  max-width: 150px; /* 限制单位最大宽度，避免压缩输入框 */
}

.param-item input:focus,
.param-item select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px #667eea33;
  background: #fff;
}

/* 空白页面样式 */
.blank-section {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(102,126,234,0.12);
  padding: 48px 24px;
  max-width: 600px;
  margin: 48px auto;
  text-align: center;
}
.blank-section h2 {
  font-size: 1.5rem;
  color: #764ba2;
  margin-bottom: 24px;
  font-weight: 600;
}
.blank-content p {
  color: #888;
  font-size: 1.1rem;
  margin-top: 12px;
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

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .component-chip {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .add-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .tool-tabs {
    flex-direction: column;
    align-items: center;
  }
}
</style>

