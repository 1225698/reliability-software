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
            <button @click="saveCurrentSystem" class="save-btn" :disabled="!calculationResults.hasResults">
              保存系统结果
            </button>
            <button @click="saveAndView" class="save-btn" :disabled="!calculationResults.hasResults">
              保存并查看结果
            </button>
          </div>
        </div>

        <!-- 🆕 新增：已保存系统列表 -->
        <div class="card" v-if="savedBasicSystems.length > 0">
          <div class="card-title">已保存的基本可靠性系统</div>
          <div class="card-content">
            <div class="saved-systems-grid">
              <div v-for="system in savedBasicSystems" :key="system.id" class="saved-system-card">
                <div class="saved-system-header">
                  <h4>{{ system.name }}</h4>
                  <div class="saved-system-actions">
                    <button @click="loadSystem(system)" class="action-btn load">加载</button>
                    <button @click="removeSavedSystem(system.id)" class="action-btn remove">删除</button>
                  </div>
                </div>
                <div class="saved-system-details">
                  <div class="detail-row">
                    <span>任务时间:</span>
                    <strong>{{ system.missionTime }}h</strong>
                  </div>
                  <div class="detail-row">
                    <span>总失效率:</span>
                    <strong>{{ system.totalFailureRate.toExponential(6) }}/h</strong>
                  </div>
                  <div class="detail-row">
                    <span>系统可靠度:</span>
                    <strong>{{ (system.systemReliability * 100).toFixed(2) }}%</strong>
                  </div>
                  <div class="detail-row">
                    <span>元器件:</span>
                    <strong>{{ system.components.length }} 个</strong>
                  </div>
                </div>
                <div class="saved-system-footer">
                  <small>保存时间: {{ system.timestamp }}</small>
                </div>
              </div>
            </div>
            <div class="batch-actions">
              <button @click="importAllToTaskReliability" class="calculate-btn">
                📥 批量导入到任务可靠性
              </button>
              <p class="template-tip">将所有已保存系统导入到任务可靠性计算中</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 任务可靠性标签页 -->
    <template v-else>
      <div class="card-section">
        <!-- 基本可靠性结果导入区域 -->
        <div class="card">
          <div class="card-title">基本可靠性结果导入</div>
          <div class="card-content">
            <!-- 批量导入区域 -->
            <div class="batch-import-section">
              <h4>批量导入系统</h4>
              <div class="batch-actions-row">
                <button @click="importFromSavedSystems" class="download-btn" :disabled="savedBasicSystems.length === 0">
                  📥 从已保存系统导入
                </button>
                <button @click="clearImportedSystems" class="remove-btn" :disabled="importedSystems.length === 0">
                  清空所有系统
                </button>
              </div>
              <p class="template-tip" v-if="savedBasicSystems.length === 0">
                暂无已保存的基本可靠性系统，请先在基本可靠性标签页计算并保存系统
              </p>
              <p class="template-tip" v-else>
                可从 {{ savedBasicSystems.length }} 个已保存系统中选择导入
              </p>
            </div>

            <!-- 已导入系统列表 -->
            <div class="imported-systems-section">
              <h4>已导入系统 ({{ importedSystems.length }})</h4>
              
              <div v-if="importedSystems.length === 0" class="empty-tip">
                <p>暂无导入的系统数据，请从已保存系统中批量导入或手动添加系统</p>
              </div>

              <div v-else class="systems-grid">
                <div v-for="system in importedSystems" :key="system.id" class="system-card">
                  <div class="system-header">
                    <span class="system-name">{{ system.name }}</span>
                    <button @click="removeImportedSystem(system.id)" class="remove-btn small">×</button>
                  </div>
                  <div class="system-details">
                    <div class="detail-item">
                      <label>总失效率:</label>
                      <span>{{ system.totalFailureRate.toExponential(6) }}/h</span>
                    </div>
                    <div class="detail-item">
                      <label>任务时间:</label>
                      <span>{{ system.missionTime }}h</span>
                    </div>
                    <div class="detail-item">
                      <label>可靠度:</label>
                      <span>{{ (Math.exp(-system.totalFailureRate * system.missionTime) * 100).toFixed(2) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 手动添加系统 -->
            <div class="manual-add-section">
              <h4>手动添加系统</h4>
              <div class="manual-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>系统名称</label>
                    <input v-model="newSystem.name" placeholder="输入系统名称" class="task-input" />
                  </div>
                  <div class="form-group">
                    <label>总失效率</label>
                    <input v-model.number="newSystem.totalFailureRate" type="number" step="any" placeholder="0.000001" class="task-input" />
                  </div>
                  <div class="form-group">
                    <label>任务时间</label>
                    <input v-model.number="newSystem.missionTime" type="number" placeholder="1000" class="task-input" />
                  </div>
                  <div class="form-group">
                    <label>&nbsp;</label>
                    <button @click="addManualSystem" class="download-btn" :disabled="!isManualSystemValid">
                      添加系统
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统表决模块卡片 -->
        <div class="card">
          <div class="card-title">系统表决模块</div>
          <div class="card-content">
            <p>基于导入的系统数据，配置 N/k 表决模型，生成等效故障率</p>
            
            <!-- 操作按钮 -->
            <div class="task-module-actions" style="margin-bottom: 20px;">
              <button 
                @click="addSystemVoteModule" 
                class="calculate-btn"
                :disabled="importedSystems.length === 0"
              >
                📌 基于导入系统创建表决模块
              </button>
              <p class="template-tip" v-if="importedSystems.length === 0">
                ⚠️ 请先导入系统数据，再创建表决模块
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
                    <!-- 模块信息（基于导入系统） -->
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
                      <div class="module-info-item" style="margin-top: 8px;">
                        <label>包含系统：</label>
                        <span class="system-count">{{ importedSystems.length }} 个</span>
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
              <div class="system-summary" style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px;">
                <strong>计算基于：</strong>
                <span>{{ calculationResults.taskResults.systemCount || 0 }} 个系统，</span>
                <span>总失效率：{{ calculationResults.taskResults.observedFailureRate.toExponential(6) }}/h</span>
              </div>
              
              <!-- 🆕 新增：任务可靠性保存按钮 -->
              <div class="action-buttons" style="margin-top: 20px;">
                <button @click="saveTaskReliabilityResults" class="save-btn">
                  💾 保存任务可靠性结果
                </button>
              </div>
            </div>
            <div v-else>
              <p>请导入系统数据并创建表决模块后，点击下方按钮计算任务可靠性</p>
              <button @click="computeTask" class="calculate-btn" style="margin-top: 16px;">
                计算任务可靠性
              </button>
            </div>
          </div>
        </div>

        <!-- 🆕 新增：已保存的任务可靠性结果 -->
        <div class="card" v-if="savedTaskResults.length > 0">
          <div class="card-title">已保存的任务可靠性结果</div>
          <div class="card-content">
            <div class="saved-task-results">
              <div v-for="result in savedTaskResults" :key="result.id" class="saved-task-card">
                <div class="saved-task-header">
                  <h4>任务可靠性分析</h4>
                  <button @click="removeSavedTaskResult(result.id)" class="remove-btn small">×</button>
                </div>
                <div class="saved-task-details">
                  <div class="task-result-row">
                    <span>系统数量:</span>
                    <strong>{{ result.systemCount }} 个</strong>
                  </div>
                  <div class="task-result-row">
                    <span>总失效率:</span>
                    <strong>{{ result.observedFailureRate.toExponential(6) }}/h</strong>
                  </div>
                  <div class="task-result-row">
                    <span>任务可靠度:</span>
                    <strong>{{ (result.taskReliability * 100).toFixed(4) }}%</strong>
                  </div>
                  <div class="task-result-row">
                    <span>任务 MTBF:</span>
                    <strong>{{ isFinite(result.taskMBTF) ? result.taskMBTF.toFixed(2) : '∞' }} h</strong>
                  </div>
                </div>
                <div class="saved-task-footer">
                  <small>保存时间: {{ result.timestamp }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineOptions({ name: 'CalculatorView' })
import { ref, computed, onMounted } from 'vue'
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

// 🆕 新增：保存系统相关状态
// 使用 shallowRef 优化，只响应 .value 的整体变化
const savedBasicSystems = shallowRef([]);
const importedSystems = shallowRef([]);

// 当需要更新数组时，直接替换整个数组（这是关键！）
const saveCurrentSystem = () => {
  // ... 您的现有逻辑
  
  // 不再使用 push，而是创建新数组赋值
  const existingIndex = savedBasicSystems.value.findIndex(sys => sys.name === systemData.name);
  if (existingIndex !== -1) {
    // 替换特定元素
    const updatedSystems = [...savedBasicSystems.value];
    updatedSystems[existingIndex] = systemData;
    savedBasicSystems.value = updatedSystems; // 直接赋值
  } else {
    // 添加新元素
    savedBasicSystems.value = [...savedBasicSystems.value, systemData];
  }
})
const savedTaskResults = ref([])
const newSystem = ref({
  name: '',
  totalFailureRate: 0,
  missionTime: 1000
})

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

// 🆕 新增：基本可靠性系统保存方法
const saveCurrentSystem = () => {
  if (!calculationResults.value.hasResults) {
    alert('请先完成基本可靠性计算')
    return
  }

  const systemData = {
    id: Date.now(),
    name: systemName.value || '未命名系统',
    missionTime: missionTime.value,
    totalFailureRate: calculationResults.value.totalFailureRate,
    systemReliability: calculationResults.value.systemReliability,
    mtbf: calculationResults.value.mtbf,
    components: JSON.parse(JSON.stringify(selectedComponents.value)),
    timestamp: new Date().toLocaleString('zh-CN')
  }

  // 检查是否已存在相同名称的系统
  const existingIndex = savedBasicSystems.value.findIndex(sys => sys.name === systemData.name)
  if (existingIndex !== -1) {
    savedBasicSystems.value[existingIndex] = systemData
    alert(`系统 "${systemData.name}" 已更新`)
  } else {
    savedBasicSystems.value.push(systemData)
    alert(`系统 "${systemData.name}" 已保存`)
  }

  saveSystemsToStorage()
}

const loadSystem = (system) => {
  systemName.value = system.name
  missionTime.value = system.missionTime
  selectedComponents.value = JSON.parse(JSON.stringify(system.components))
  
  // 重新计算
  calculateReliability()
  
  alert(`系统 "${system.name}" 已加载`)
}

const removeSavedSystem = (id) => {
  if (confirm('确定要删除这个保存的系统吗？')) {
    savedBasicSystems.value = savedBasicSystems.value.filter(sys => sys.id !== id)
    saveSystemsToStorage()
    alert('系统已删除')
  }
}

const saveSystemsToStorage = () => {
  try {
    localStorage.setItem('savedBasicSystems', JSON.stringify(savedBasicSystems.value))
  } catch (error) {
    console.error('保存系统数据失败:', error)
  }
}

const loadSystemsFromStorage = () => {
  try {
    const saved = localStorage.getItem('savedBasicSystems')
    if (saved) {
      savedBasicSystems.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载系统数据失败:', error)
  }
}

// 🆕 新增：批量导入方法
const importAllToTaskReliability = () => {
  if (savedBasicSystems.value.length === 0) {
    alert('暂无已保存的系统')
    return
  }

  importedSystems.value = savedBasicSystems.value.map(sys => ({
    id: sys.id,
    name: sys.name,
    totalFailureRate: sys.totalFailureRate,
    missionTime: sys.missionTime,
    isFromSaved: true
  }))

  alert(`成功导入 ${importedSystems.value.length} 个系统到任务可靠性`)
  
  // 切换到任务可靠性标签页
  showMain.value = false
}

const importFromSavedSystems = () => {
  if (savedBasicSystems.value.length === 0) {
    alert('暂无已保存的系统')
    return
  }

  // 过滤掉已经导入的系统
  const systemsToImport = savedBasicSystems.value.filter(savedSys => 
    !importedSystems.value.some(importedSys => importedSys.id === savedSys.id)
  )

  if (systemsToImport.length === 0) {
    alert('所有系统都已导入')
    return
  }

  systemsToImport.forEach(sys => {
    importedSystems.value.push({
      id: sys.id,
      name: sys.name,
      totalFailureRate: sys.totalFailureRate,
      missionTime: sys.missionTime,
      isFromSaved: true
    })
  })

  alert(`成功导入 ${systemsToImport.length} 个系统`)
}

const clearImportedSystems = () => {
  if (confirm('确定要清空所有导入的系统吗？')) {
    importedSystems.value = []
    alert('已清空所有导入的系统')
  }
}

// 原有的导入系统方法
const removeImportedSystem = (id) => {
  importedSystems.value = importedSystems.value.filter(sys => sys.id !== id)
}

const isManualSystemValid = computed(() => {
  return newSystem.value.name.trim() && 
         newSystem.value.totalFailureRate > 0 && 
         newSystem.value.missionTime > 0
})

const addManualSystem = () => {
  if (!isManualSystemValid.value) {
    alert('请填写完整的系统信息')
    return
  }

  const systemData = {
    id: Date.now(),
    name: newSystem.value.name.trim(),
    totalFailureRate: newSystem.value.totalFailureRate,
    missionTime: newSystem.value.missionTime,
    timestamp: new Date().toLocaleString('zh-CN'),
    isManual: true
  }

  importedSystems.value.push(systemData)
  
  // 重置表单
  newSystem.value = {
    name: '',
    totalFailureRate: 0,
    missionTime: 1000
  }
  
  alert(`系统 "${systemData.name}" 已添加`)
}

// 🆕 新增：任务可靠性结果保存
const saveTaskReliabilityResults = () => {
  if (!calculationResults.value.taskResults) {
    alert('请先计算任务可靠性')
    return
  }

  const taskResult = {
    id: Date.now(),
    systemCount: importedSystems.value.length,
    observedFailureRate: calculationResults.value.taskResults.observedFailureRate,
    taskReliability: calculationResults.value.taskResults.taskReliability,
    taskMBTF: calculationResults.value.taskResults.taskMBTF,
    missionTime: calculationResults.value.taskResults.missionTime,
    timestamp: new Date().toLocaleString('zh-CN'),
    systems: importedSystems.value.map(sys => ({
      name: sys.name,
      totalFailureRate: sys.totalFailureRate
    }))
  }

  savedTaskResults.value.unshift(taskResult)
  saveTaskResultsToStorage()
  
  alert('任务可靠性结果已保存')
}

const removeSavedTaskResult = (id) => {
  if (confirm('确定要删除这个保存的任务可靠性结果吗？')) {
    savedTaskResults.value = savedTaskResults.value.filter(result => result.id !== id)
    saveTaskResultsToStorage()
    alert('任务可靠性结果已删除')
  }
}

const saveTaskResultsToStorage = () => {
  try {
    localStorage.setItem('savedTaskResults', JSON.stringify(savedTaskResults.value))
  } catch (error) {
    console.error('保存任务结果失败:', error)
  }
}

const loadTaskResultsFromStorage = () => {
  try {
    const saved = localStorage.getItem('savedTaskResults')
    if (saved) {
      savedTaskResults.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载任务结果失败:', error)
  }
}

// 其余现有方法保持不变...
// [原有的所有其他方法保持不变，包括：initModuleErrors, componentSummary, addManualComponent, computeTask, addSystemVoteModule, removeSystemVoteModule, validateVoteParams, calculateVoteFailureRate, factorial, validateModuleName, validateFailureRate, downloadTemplate, triggerFileInput, handleFileUpload, handleDrop, handleDragOver, handleDragLeave, processExcelFile, saveAndView]

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

// 任务计算方法 - 基于导入的系统
const computeTask = () => {
  if (importedSystems.value.length === 0) {
    alert('请先导入至少一个系统数据')
    return
  }

  // 基于导入的系统数据计算任务可靠性
  const totalObservedFailureRate = importedSystems.value.reduce((sum, sys) => {
    return sum + sys.totalFailureRate
  }, 0)

  const taskReliability = Math.exp(-totalObservedFailureRate * missionTime.value)
  const taskMBTF = totalObservedFailureRate > 0 ? 1 / totalObservedFailureRate : Infinity

  // 更新计算结果
  calculationResults.value.taskResults = {
    observedFailureRate: totalObservedFailureRate,
    taskReliability,
    taskMBTF,
    missionTime: missionTime.value,
    systemCount: importedSystems.value.length
  }
  
  calculationResults.value.hasResults = true
  
  alert(`任务可靠性计算完成！\n基于 ${importedSystems.value.length} 个系统\n总失效率: ${totalObservedFailureRate.toExponential(6)}/h`)
}

// 添加系统表决模块 - 基于导入系统
const addSystemVoteModule = () => {
  if (importedSystems.value.length === 0) {
    alert('请先导入系统数据')
    return
  }

  // 计算导入系统的平均失效率作为基础
  const totalFailureRate = importedSystems.value.reduce((sum, sys) => sum + sys.totalFailureRate, 0)
  const averageFailureRate = totalFailureRate / importedSystems.value.length

  const moduleName = `集成表决模块_${importedSystems.value.length}系统`
  const baseFailureRate = parseFloat(averageFailureRate.toFixed(8))

  voteModule.value = {
    name: moduleName,
    baseFailureRate: baseFailureRate,
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

  if (voteParams.value.k > voteParams.value.N && !errors.N && !errors.k) {
    errors.k = '最小有效数不能大于总模块数'
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

// 初始化：加载保存的数据
onMounted(() => {
  loadSystemsFromStorage()
  loadTaskResultsFromStorage()
})
</script>

<style scoped>
/* 🆕 新增：保存系统样式 */
.saved-systems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.saved-system-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.saved-system-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.saved-system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f4;
}

.saved-system-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.saved-system-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s;
}

.action-btn.load {
  background: #28a745;
  color: white;
}

.action-btn.remove {
  background: #e74c3c;
  color: white;
}

.action-btn:hover {
  opacity: 0.8;
}

.saved-system-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.detail-row span {
  color: #6c757d;
  font-size: 0.85rem;
}

.detail-row strong {
  color: #2c3e50;
  font-size: 0.9rem;
}

.saved-system-footer {
  text-align: right;
  padding-top: 8px;
  border-top: 1px solid #f1f3f4;
}

.saved-system-footer small {
  color: #6c757d;
  font-size: 0.8rem;
}

.batch-actions {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}

/* 🆕 新增：任务可靠性结果保存样式 */
.saved-task-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.saved-task-card {
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
  border: 1px solid #e3e8ff;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.saved-task-card:hover {
  box-shadow: 0 4px 12px rgba(102,126,234,0.15);
  transform: translateY(-2px);
}

.saved-task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.saved-task-header h4 {
  margin: 0;
  color: #667eea;
  font-size: 1rem;
}

.saved-task-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.task-result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.task-result-row span {
  color: #6c757d;
  font-size: 0.85rem;
}

.task-result-row strong {
  color: #2c3e50;
  font-size: 0.9rem;
}

.saved-task-footer {
  text-align: right;
  padding-top: 8px;
  border-top: 1px solid #e3e8ff;
}

.saved-task-footer small {
  color: #6c757d;
  font-size: 0.8rem;
}

/* 批量导入区域样式 */
.batch-import-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.batch-actions-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

/* 其余现有样式保持不变... */
/* [所有原有的样式代码保持不变] */

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

/* 导入系统样式 */
.current-system-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.system-badge.current {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 2px solid #2196f3;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.system-info strong {
  color: #1976d2;
  font-size: 1.1rem;
  margin-bottom: 4px;
}

.system-info span {
  color: #455a64;
  font-size: 0.9rem;
}

.import-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  font-weight: 500;
  white-space: nowrap;
}

.import-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.import-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.imported-systems-section {
  margin-bottom: 20px;
}

.empty-tip {
  text-align: center;
  padding: 30px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
  border: 2px dashed #dee2e6;
}

.systems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.system-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
  position: relative;
}

.system-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f3f4;
}

.system-name {
  font-weight: bold;
  color: #2c3e50;
  font-size: 1.1rem;
}

.remove-btn.small {
  background: #e74c3c;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}

.system-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.detail-item label {
  color: #6c757d;
  font-weight: 500;
  font-size: 0.85rem;
}

.detail-item span {
  color: #2c3e50;
  font-weight: 500;
  font-size: 0.9rem;
}

.manual-add-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.manual-add-section h4 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr auto;
  gap: 12px;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  color: #764ba2;
  font-weight: 600;
  font-size: 0.9rem;
}

.system-count {
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.system-summary {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-left: 4px solid #667eea;
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
  .system-badge.current {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .systems-grid {
    grid-template-columns: 1fr;
  }
  .vote-params-container {
    align-items: stretch;
  }
  .saved-systems-grid {
    grid-template-columns: 1fr;
  }
  .saved-task-results {
    grid-template-columns: 1fr;
  }
  .batch-actions-row {
    flex-direction: column;
  }
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
}
</style>
