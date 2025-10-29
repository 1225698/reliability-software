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
            <p>基于基本可靠性结果，配置 N/k 表决模型，生成等效故障率（可作为任务可靠性输入参数）</p>
            <p>基于导入的系统数据，配置 N/k 表决模型，生成等效故障率</p>

            <!-- 操作按钮 -->
            <div class="task-module-actions" style="margin-bottom: 20px;">
              <button 
                @click="addSystemVoteModule" 
                class="calculate-btn"
                :disabled="!calculationResults.hasResults"
                :disabled="importedSystems.length === 0"
              >
                📌 添加系统表决模块
                📌 基于导入系统创建表决模块
              </button>
              <p class="template-tip" v-if="!calculationResults.hasResults">
                ⚠️ 请先在「基本可靠性」标签页完成计算，再添加表决模块
              <p class="template-tip" v-if="importedSystems.length === 0">
                ⚠️ 请先导入系统数据，再创建表决模块
              </p>
            </div>

@@ -196,7 +328,7 @@
                </thead>
                <tbody>
                  <tr class="task-module-row">
                    <!-- 模块信息（自动填充） -->
                    <!-- 模块信息（基于导入系统） -->
                    <td>
                      <div class="module-info-item">
                        <label>模块名：</label>
@@ -217,6 +349,10 @@
                        />
                        <span class="unit" style="margin-left: 4px;">/h</span>
                      </div>
                      <div class="module-info-item" style="margin-top: 8px;">
                        <label>包含系统：</label>
                        <span class="system-count">{{ importedSystems.length }} 个</span>
                      </div>
                    </td>

                    <!-- 表决参数输入 -->
@@ -310,23 +446,71 @@
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
              <p>请添加系统表决模块并计算等效故障率后，点击下方按钮计算任务可靠性</p>
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
import { ref, computed } from 'vue'
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useReliabilityCalc } from '../composables/useReliabilityCalc'
import { useRouter } from 'vue-router'
@@ -340,6 +524,16 @@ const uploadStatus = ref(null)
const uploadError = ref(null)
const moduleErrors = ref([])

// 🆕 新增：保存系统相关状态
const savedBasicSystems = ref([])
const importedSystems = ref([])
const savedTaskResults = ref([])
const newSystem = ref({
  name: '',
  totalFailureRate: 0,
  missionTime: 1000
})

// 表决模块相关状态
const systemVoteModuleAdded = ref(false)
const isVoteCalculated = ref(false)
@@ -377,6 +571,227 @@ const {
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
@@ -399,42 +814,52 @@ const addManualComponent = () => {
  addComponent(newComponentType.value)
}

// 任务计算方法
// 任务计算方法 - 基于导入的系统
const computeTask = () => {
  if (!systemVoteModuleAdded.value || !isVoteCalculated.value) {
    alert('请先添加系统表决模块并计算等效故障率！')
  if (importedSystems.value.length === 0) {
    alert('请先导入至少一个系统数据')
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

// 添加系统表决模块
// 添加系统表决模块 - 基于导入系统
const addSystemVoteModule = () => {
  if (!calculationResults.value?.hasResults) {
    alert('请先在「基本可靠性」标签页完成计算，获取系统总失效率！')
  if (importedSystems.value.length === 0) {
    alert('请先导入系统数据')
    return
  }

  const moduleName = `${systemName.value || '系统'}_表决模块`
  const baseFailureRate = calculationResults.value.totalFailureRate.toFixed(8)
  // 计算导入系统的平均失效率作为基础
  const totalFailureRate = importedSystems.value.reduce((sum, sys) => sum + sys.totalFailureRate, 0)
  const averageFailureRate = totalFailureRate / importedSystems.value.length

  const moduleName = `集成表决模块_${importedSystems.value.length}系统`
  const baseFailureRate = parseFloat(averageFailureRate.toFixed(8))

  voteModule.value = {
    name: moduleName,
    baseFailureRate: parseFloat(baseFailureRate),
    baseFailureRate: baseFailureRate,
    failureRate: 0
  }

@@ -472,8 +897,8 @@ const validateVoteParams = () => {
    isValid = false
  }

  if (voteParams.value.N <= voteParams.value.k && !errors.N && !errors.k) {
    errors.N = '总模块数必须大于最小有效数'
  if (voteParams.value.k > voteParams.value.N && !errors.N && !errors.k) {
    errors.k = '最小有效数不能大于总模块数'
    isValid = false
  }

@@ -624,31 +1049,205 @@ const saveAndView = () => {
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
.card-section {
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
  gap: 24px;
  gap: 6px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}
.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(102,126,234,0.10);
  padding: 24px 32px;
  margin-bottom: 0;

.detail-row span {
  color: #6c757d;
  font-size: 0.85rem;
}
.card-title {
  font-size: 1.2rem;
  font-weight: bold;

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
  margin-bottom: 18px;
  font-size: 1rem;
}
.card-content {

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
@@ -1017,6 +1616,195 @@ const saveAndView = () => {
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
@@ -1041,5 +1829,33 @@ const saveAndView = () => {
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
</style>
