<template>
  <div class="calculator">
    <header class="tool-header">
      <h1>可靠性预计</h1>
      <div class="tool-tabs">
        <button class="tab" :class="{active: showMain}" @click="showMain = true">基本可靠性</button>
        <button class="tab" :class="{active: !showMain}" @click="showMain = false">任务可靠性</button>
      </div>
    </header>

    <!-- 基本可靠性标签页 - 完全保持原样 -->
    <template v-if="showMain">
      <div class="card-section">
        <div class="cards-row">
          <!-- 系统参数和LRU配置合并卡片 -->
          <div class="card card-half">
            <div class="card-title">基本可靠性分析</div>
            <div class="card-content">
              <div class="param-grid">
                <!-- 系统参数 -->
                <div class="param-item">
                  <label>系统名称：</label>
                  <input v-model="systemName" placeholder="系统名称" />
                </div>
                <div class="param-item">
                  <label>任务时间：</label>
                  <div class="input-with-unit">
                    <input v-model.number="missionTime" type="number" min="0" />
                    <span class="unit">小时</span>
                  </div>
                </div>
              </div>

              <!-- LRU配置 -->
              <div class="lru-section">
                <div class="template-generator">
                  <button @click="downloadTemplate" class="download-btn">
                    📥 Excel模板
                  </button>
                  <p class="template-tip">使用模板填写数据确保正确导入</p>
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
                    <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4c2.svg" alt="Excel" class="upload-icon">
                    <p class="upload-text">点击或拖拽文件</p>
                    <small class="upload-hint">支持 .xlsx, .xls, .csv</small>
                  </div>
                </div>

                <!-- LRU列表展示 - 改为按钮触发弹窗 -->
                <div v-if="selectedComponents.length > 0" class="components-preview">
                  <div class="components-summary">
                    <span v-for="(count, type) in componentSummary" :key="type" class="summary-badge">
                      {{ type }}: {{ count }}
                    </span>
                  </div>
                  <button @click="showLRUModal = true" class="view-lru-btn">
                    📋 查看LRU详情 ({{ selectedComponents.length }}个)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 可靠性结果和操作按钮卡片 -->
          <div class="card card-half">
            <div class="card-title">计算结果</div>
            <div class="card-content">
              <!-- 纵向排列的结果指标 -->
              <div class="result-column">
                <div class="result-box purple">
                  <div class="result-label">系统可靠度</div>
                  <div class="result-value">{{ calculationResults.hasResults ? calculationResults.systemReliability.toFixed(4) : '--' }}</div>
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
                <button @click="calculateReliability" class="calculate-btn">计算</button>
                <button @click="saveCurrentSystem" class="save-btn" :disabled="!calculationResults.hasResults">
                  保存
                </button>
                <button @click="showSavedSystemsModal = true" class="view-systems-btn" :disabled="savedBasicSystems.length === 0">
                  查看已保存系统
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- LRU详情弹窗 - 保持原样 -->
      <div v-if="showLRUModal" class="modal-overlay" @click="showLRUModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>LRU详情</h3>
            <button class="close-btn" @click="showLRUModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="components-list">
              <div v-for="(comp, index) in selectedComponents" :key="index" class="component-chip">
                <span class="chip-main">{{ comp.type }} × {{ comp.quantity }}</span>
                <div class="chip-detail">
                  <label>λ(/h):</label>
                  <input v-model.number="comp.failureRate" type="number" step="any" class="failure-rate-input" placeholder="失效率" />
                </div>
                <span class="chip-desc">{{ comp.description }}</span>
                <button @click="removeComponent(index)" class="remove-btn">✕</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showLRUModal = false" class="save-btn">关闭</button>
          </div>
        </div>
      </div>

      <!-- 已保存系统弹窗 - 保持原样 -->
      <div v-if="showSavedSystemsModal" class="modal-overlay" @click="showSavedSystemsModal = false">
        <div class="modal-content wide" @click.stop>
          <div class="modal-header">
            <h3>已保存系统</h3>
            <button class="close-btn" @click="showSavedSystemsModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="saved-systems-container">
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
                      <span>时间:</span>
                      <strong>{{ system.missionTime }}h</strong>
                    </div>
                    <div class="detail-row">
                      <span>失效率:</span>
                      <strong>{{ system.totalFailureRate.toExponential(6) }}/h</strong>
                    </div>
                    <div class="detail-row">
                      <span>可靠度:</span>
                      <strong>{{ system.systemReliability.toFixed(4) }}</strong>
                    </div>
                    <div class="detail-row">
                      <span>LRU:</span>
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
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showSavedSystemsModal = false" class="save-btn">关闭</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 任务可靠性标签页 - 改为左右分布 -->
    <template v-else>
      <div class="card-section">
        <div class="cards-row">
          <!-- 左侧：任务参数和模块组成 -->
          <div class="card card-half">
            <div class="card-title">任务配置</div>
            <div class="card-content">
              <!-- 任务参数 -->
              <div class="param-grid">
                <div class="param-item">
                  <label>任务名称：</label>
                  <input v-model="taskName" placeholder="请输入任务名称" />
                </div>
                <div class="param-item">
                  <label>任务时间：</label>
                  <div class="input-with-unit">
                    <input v-model.number="missionTime" type="number" min="0" />
                    <span class="unit">小时</span>
                  </div>
                </div>
              </div>

              <!-- 操作按钮组 -->
              <div class="module-ops-bar">
                <button class="ops-btn purple" @click="openAddSystemModal('import')">导入系统</button>
                <button class="ops-btn green" @click="openAddSystemModal('manual')">手动添加</button>
                <button class="ops-btn orange" @click="openVoteModal" :disabled="!canCreateVoteModule || !missionTime">创建表决模块</button>
                <button class="ops-btn danger" @click="clearImportedSystems" :disabled="importedSystems.length===0">清空系统</button>
              </div>

              <!-- 任务模块查看按钮 -->
              <div class="task-modules-view-section">
                <button class="task-modules-view-btn" @click="showTaskModulesModal = true" :disabled="taskAssemblyModules.length === 0">
                  📋 查看任务模块
                  <span class="module-count-badge" v-if="taskAssemblyModules.length > 0">
                    {{ taskAssemblyModules.length }}
                  </span>
                </button>
                <span class="ops-count" v-if="importedSystems.length > 0">已加载系统: {{ importedSystems.length }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧：任务可靠性结果 - 改为与基本可靠性相同样式 -->
          <div class="card card-half">
            <div class="card-title">任务可靠性结果</div>
            <div class="card-content">
              <!-- 纵向排列的结果指标 - 与基本可靠性相同样式 -->
              <div class="result-column">
                <div class="result-box purple">
                  <div class="result-label">任务失效率</div>
                  <div class="result-value">{{ calculationResults.taskResults ? calculationResults.taskResults.observedFailureRate.toExponential(3) : '--' }}</div>
                </div>
                <div class="result-box pink">
                  <div class="result-label">任务可靠度</div>
                  <div class="result-value">{{ calculationResults.taskResults ? calculationResults.taskResults.taskReliability.toFixed(4) : '--' }}</div>
                </div>
                <div class="result-box blue">
                  <div class="result-label">任务 MTBF</div>
                  <div class="result-value">{{ calculationResults.taskResults ? (isFinite(calculationResults.taskResults.taskMBTF) ? calculationResults.taskResults.taskMBTF.toFixed(2) : '∞') : '--' }} h</div>
                </div>
              </div>

              <div class="system-summary" v-if="calculationResults.taskResults">
                <strong>计算基于：</strong>
                <span>{{ calculationResults.taskResults.systemCount || 0 }} 个系统，</span>
                <span>总失效率：{{ calculationResults.taskResults.observedFailureRate.toExponential(6) }}/h</span>
              </div>

              <div class="action-buttons">
                <button @click="computeTask" class="calculate-btn" :disabled="!missionTime || taskAssemblyModules.length === 0">计算</button>
                <button @click="saveTaskReliabilityResults" class="save-btn" :disabled="!calculationResults.taskResults">
                  保存
                </button>
                <button @click="showSavedTaskResultsModal = true" class="view-systems-btn" :disabled="savedTaskResults.length === 0">
                  查看已保存结果
                </button>
              </div>

              <div class="calculation-tip" v-if="!missionTime">
                <p>⚠️ 请先输入任务时间才能进行计算</p>
              </div>
              <div class="calculation-tip" v-else-if="taskAssemblyModules.length === 0">
                <p>⚠️ 请先导入系统或创建表决模块</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加系统弹窗 - 修改为与参考代码完全一致 -->
      <div v-if="showAddSystemModal" class="modal-overlay" @click="closeAddSystemModal">
        <div class="modal-content wide" @click.stop>
          <div class="modal-header">
            <h3>{{ addSystemTab==='import' ? '导入系统' : '手动添加系统' }}</h3>
            <button class="close-btn" @click="closeAddSystemModal">×</button>
          </div>
          <div class="modal-body">
            <div class="add-system-tabs" style="margin-bottom:16px;">
              <button class="sub-tab" :class="{active: addSystemTab==='import'}" @click="addSystemTab='import'">导入系统</button>
              <button class="sub-tab" :class="{active: addSystemTab==='manual'}" @click="addSystemTab='manual'">手动添加</button>
            </div>
            <!-- 导入 -->
            <div v-if="addSystemTab==='import'">
              <div class="batch-import-section" style="margin:0 0 16px; padding:0 0 16px;">
                <h4 style="margin:4px 0 12px;">批量导入系统</h4>
                <div class="batch-actions-row">
                  <button @click="importFromSavedSystems" class="download-btn" :disabled="savedBasicSystems.length === 0">📥 从已保存系统导入</button>
                  <button @click="clearImportedSystems" class="remove-btn" :disabled="importedSystems.length === 0">清空所有系统</button>
                </div>
                <p class="template-tip" v-if="savedBasicSystems.length === 0">暂无已保存系统，请先在基本可靠性页保存。</p>
                <p class="template-tip" v-else>共有 {{ savedBasicSystems.length }} 个已保存系统可导入。</p>
              </div>
              <div>
                <h4 style="margin:8px 0 12px;">已导入系统 ({{ importedSystems.length }})</h4>
                <div v-if="importedSystems.length===0" class="empty-tip" style="padding:18px;">暂无导入的系统</div>
                <div v-else class="systems-grid">
                  <div v-for="system in importedSystems" :key="system.id" class="system-card mini">
                    <div class="system-header">
                      <span class="system-name">{{ system.name }}</span>
                    </div>
                    <div class="system-details">
                      <div class="detail-item"><label>λ:</label><span>{{ system.totalFailureRate.toExponential(6) }}/h</span></div>
                      <div class="detail-item"><label>时间:</label><span>{{ system.missionTime }}h</span></div>
                      <div class="detail-item"><label>R:</label><span>{{ (Math.exp(-system.totalFailureRate * system.missionTime) * 100).toFixed(2) }}%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 手动添加 -->
            <div v-else class="manual-add-section" style="border-top:none;margin-top:0;padding-top:0;">
              <h4 style="margin:4px 0 12px;">手动添加系统</h4>
              <div class="manual-form">
                <div class="form-row">
                  <div class="form-group"><label>系统名称</label><input v-model="newSystem.name" placeholder="输入系统名称" class="task-input" /></div>
                  <div class="form-group"><label>总失效率</label><input v-model.number="newSystem.totalFailureRate" type="number" step="any" placeholder="0.000001" class="task-input" /></div>
                  <div class="form-group"><label>任务时间</label><input v-model.number="newSystem.missionTime" type="number" placeholder="1000" class="task-input" /></div>
                  <div class="form-group"><label>&nbsp;</label><button @click="addManualSystem" class="download-btn" :disabled="!isManualSystemValid">添加</button></div>
                </div>
              </div>
              <div style="margin-top:16px;">
                <h4 style="margin:8px 0 12px;">当前临时系统 ({{ importedSystems.length }})</h4>
                <div v-if="importedSystems.length===0" class="empty-tip" style="padding:18px;">暂无</div>
                <div v-else class="systems-grid">
                  <div v-for="system in importedSystems" :key="system.id" class="system-card mini">
                    <div class="system-header"><span class="system-name">{{ system.name }}</span></div>
                    <div class="system-details">
                      <div class="detail-item"><label>λ:</label><span>{{ system.totalFailureRate.toExponential(6) }}/h</span></div>
                      <div class="detail-item"><label>时间:</label><span>{{ system.missionTime }}h</span></div>
                      <div class="detail-item"><label>R:</label><span>{{ (Math.exp(-system.totalFailureRate * system.missionTime) * 100).toFixed(2) }}%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="justify-content:space-between;">
            <div style="font-size:.8rem;color:#666;">关闭弹窗后可在下方"任务模块组成"中选择这些系统。</div>
            <div style="display:flex;gap:12px;">
              <button class="save-btn" @click="closeAddSystemModal">完成</button>
              <button class="remove-btn" @click="closeAddSystemModal">关闭</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 表决模块弹窗 - 修改为与参考代码完全一致 -->
      <div v-if="showSystemSelection" class="modal-overlay" @click="closeVoteModal">
        <div class="modal-content wide" @click.stop>
          <div class="modal-header">
            <h3>{{ voteStep === 1 ? '选择系统创建表决模块' : '配置表决模块参数' }}</h3>
            <button class="close-btn" @click="closeVoteModal">×</button>
          </div>
          <div class="modal-body">
            <!-- 步骤一：选择系统 -->
            <template v-if="voteStep === 1">
              <div v-if="!missionTime" class="time-required-section">
                <div class="warning-message">
                  <p>⚠️ 请先在任务参数中输入任务时间，才能创建表决模块</p>
                  <p>当前任务时间: <span class="warning-text">{{ missionTime || '未设置' }}</span> 小时</p>
                </div>
                <div class="modal-footer">
                  <button @click="closeVoteModal" class="remove-btn">关闭</button>
                </div>
              </div>
              <div v-else>
                <div class="systems-selection-grid">
                  <div v-for="(item, index) in selectionPool" :key="item.kind + '-' + item.id + '-' + index" class="system-selection-item" :class="{ selected: selectedSystemsForVote.includes(index), 'vote-kind': item.kind==='vote' }">
                    <div class="system-name" @click="toggleSystemSelection(index)">
                      {{ item.name }}<span v-if="item.kind==='vote'" class="badge">表决</span>
                    </div>
                    <div class="system-details" @click="toggleSystemSelection(index)">
                      <div>{{ item.kind==='vote' ? '等效故障率' : '失效率' }}: {{ item.failureRate.toExponential(6) }}/h</div>
                      <div v-if="item.kind==='system'">任务时间: {{ item.missionTime }}h</div>
                      <div v-else>类型: 表决模块</div>
                    </div>
                    <div class="count-editor" v-if="selectedSystemsForVote.includes(index)">
                      <span class="count-label">数量:</span>
                      <button class="count-btn" @click="adjustSelectedCount(index,-1)" :disabled="selectedCounts[index]<=1">-</button>
                      <input class="count-input" v-model.number="selectedCounts[index]" @change="normalizeSelectedCount(index)" />
                      <button class="count-btn" @click="adjustSelectedCount(index,1)">+</button>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button @click="createVoteModuleFromSelected" class="calculate-btn" :disabled="selectedSystemsForVote.length === 0">下一步</button>
                  <button @click="closeVoteModal" class="remove-btn">取消</button>
                </div>
              </div>
            </template>
            <!-- 步骤二：配置参数 & 计算 -->
            <template v-else>
              <table class="task-module-table" style="margin-top:0;">
                <thead>
                  <tr>
                    <th style="text-align:left; width: 25%;">模块信息</th>
                    <th style="text-align:center; width: 35%;">表决参数</th>
                    <th style="text-align:right; width: 30%;">等效故障率</th>
                    <th style="text-align:center; width: 10%;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div class="module-info-item"><label>模块名：</label><input v-model="voteModule.name" class="task-input" placeholder="输入表决模块名称" /></div>
                      <div class="module-info-item" style="margin-top:8px;"><label>基本失效率：</label><input v-model="voteModule.baseFailureRate" class="task-input" readonly style="background:#f5f7fa;cursor:default;" /><span class="unit" style="margin-left:4px;">/h</span></div>
                      <div class="module-info-item" style="margin-top:8px;"><label>包含系统：</label><span class="system-count">{{ voteModule.selectedSystems ? voteModule.selectedSystems.length : 0 }} 个</span></div>
                    </td>
                    <td style="text-align:center;">
                      <div class="vote-params-container">
                        <div class="param-group"><label style="margin-right:8px;">N：</label><input v-model.number="voteParams.N" type="number" min="1" class="task-input vote-param-input" @input="validateVoteParams" :class="{ 'input-error': voteParamErrors.N }" /><div v-if="voteParamErrors.N" class="error-tooltip">{{ voteParamErrors.N }}</div></div>
                        <div class="param-group" style="margin-top:8px;"><label style="margin-right:8px;">k：</label><input v-model.number="voteParams.k" type="number" min="1" class="task-input vote-param-input" @input="validateVoteParams" :class="{ 'input-error': voteParamErrors.k }" /><div v-if="voteParamErrors.k" class="error-tooltip">{{ voteParamErrors.k }}</div></div>
                        <button @click="calculateVoteFailureRate" class="download-btn" style="margin-top:12px;padding:8px 16px;font-size:.9rem;" :disabled="!isVoteParamsValid">计算等效故障率</button>
                      </div>
                    </td>
                    <td style="text-align:right;">
                      <div class="result-display"><label>等效故障率：</label><input v-model.number="voteModule.failureRate" class="task-input failure-rate-input" :readonly="!isVoteCalculated" placeholder="点击计算获取" :class="{ 'input-success': isVoteCalculated }" /><span class="unit" style="margin-left:4px;">/h</span></div>
                      <div style="margin-top:8px;"><button @click="saveVotingModule" class="save-btn" :disabled="!isVoteCalculated">保存表决模块</button></div>
                      <p class="param-tip" style="margin-top:8px;font-size:.8rem;color:#28a745;" v-if="isVoteCalculated">✅ 将自动加入任务模块列表</p>
                    </td>
                    <td style="text-align:center;"><button @click="removeSystemVoteModule" class="remove-btn task-remove-btn">删除</button></td>
                  </tr>
                </tbody>
              </table>
              <div class="modal-footer">
                <button @click="closeVoteModal" class="remove-btn">关闭</button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 任务模块列表弹窗 - 修改为与参考代码完全一致 -->
      <div v-if="showTaskModulesModal" class="modal-overlay" @click="showTaskModulesModal = false">
        <div class="modal-content wide" @click.stop>
          <div class="modal-header">
            <h3>任务模块列表 ({{ taskAssemblyModules.length }})</h3>
            <button class="close-btn" @click="showTaskModulesModal = false">×</button>
          </div>
          <div class="modal-body">
            <div v-if="taskAssemblyModules.length===0" class="empty-tip">尚未选择任务模块</div>
            <div v-else class="assembly-grid">
              <div v-for="mod in taskAssemblyModules" :key="mod.id" class="assembly-card">
                <div class="assembly-header">
                  <strong>{{ mod.name }}</strong>
                  <button class="remove-btn small" @click="removeTaskAssemblyModule(mod.id)">×</button>
                </div>
                <div class="assembly-body">
                  <div class="assembly-row">
                    <span>来源类型:</span>
                    <strong>{{ mod.sourceType==='system' ? '系统' : '表决模块' }}</strong>
                  </div>
                  <div class="assembly-row" v-if="mod.sourceType==='system' || mod.sourceType==='vote-module'">
                    <span>数量:</span>
                    <strong style="display:flex;align-items:center;gap:6px;">
                      <button class="count-btn" @click="updateSystemModuleCount(mod,-1)" :disabled="(mod.count||1)<=1">-</button>
                      <input class="count-input" v-model.number="mod.count" @change="mod.count = Math.max(1, Math.round(mod.count||1))" />
                      <button class="count-btn" @click="updateSystemModuleCount(mod,1)">+</button>
                    </strong>
                  </div>
                  <div class="assembly-row">
                    <span>失效率:</span>
                    <strong>
                      <template v-if="(mod.sourceType==='system' || mod.sourceType==='vote-module') && (mod.count||1) > 1">
                        {{ (mod.failureRate * mod.count).toExponential(6) }} /h
                        <span style="color:#666;font-size:.7rem;">(单个 {{ mod.failureRate.toExponential(6) }})</span>
                      </template>
                      <template v-else>
                        {{ mod.failureRate.toExponential(6) }} /h
                      </template>
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="taskAssemblyModules.length>0" class="assembly-summary">
              <span>合计失效率: <strong>{{ totalTaskAssemblyFailureRate.toExponential(6) }}/h</strong></span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="calculate-btn" @click="computeTaskFromAssembly" :disabled="!missionTime">基于任务模块计算任务可靠性</button>
            <button class="remove-btn" @click="clearTaskAssemblyModules">清空任务模块</button>
            <button class="save-btn" @click="showTaskModulesModal = false">关闭</button>
          </div>
        </div>
      </div>

      <!-- 已保存的任务可靠性结果弹窗 - 修改为与基本可靠性中"查看已保存系统"相同风格 -->
      <div v-if="showSavedTaskResultsModal" class="modal-overlay" @click="showSavedTaskResultsModal = false">
        <div class="modal-content wide" @click.stop>
          <div class="modal-header">
            <h3>已保存的任务可靠性结果</h3>
            <button class="close-btn" @click="showSavedTaskResultsModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="saved-systems-container">
              <div class="saved-systems-grid">
                <div v-for="result in savedTaskResults" :key="result.id" class="saved-system-card">
                  <div class="saved-system-header">
                    <h4>{{ result.taskName || '任务可靠性分析' }}</h4>
                    <div class="saved-system-actions">
                      <button @click="removeSavedTaskResult(result.id)" class="action-btn remove">删除</button>
                    </div>
                  </div>
                  <div class="saved-system-details">
                    <div class="detail-row">
                      <span>参与系统数量:</span>
                      <strong>{{ result.systemCount }} 个</strong>
                    </div>
                    <div class="detail-row">
                      <span>总失效率:</span>
                      <strong>{{ result.observedFailureRate.toExponential(6) }}/h</strong>
                    </div>
                    <div class="detail-row">
                      <span>任务可靠度:</span>
                      <strong>{{ result.taskReliability.toFixed(4) }}</strong>
                    </div>
                    <div class="detail-row">
                      <span>任务 MTBF:</span>
                      <strong>{{ isFinite(result.taskMBTF) ? result.taskMBTF.toFixed(2) : '∞' }} h</strong>
                    </div>
                  </div>
                  <div class="saved-system-footer">
                    <small>保存时间: {{ result.timestamp }}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="save-btn" @click="showSavedTaskResultsModal = false">关闭</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// 脚本部分完全保持不变，使用您最原始的代码
defineOptions({ name: 'CalculatorView' })
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useReliabilityCalc } from '../composables/useReliabilityCalc'
import { useRouter } from 'vue-router'

// 状态管理 - 完全保持原始代码
const showMain = ref(true)
const addSystemTab = ref('import')
const showAddSystemModal = ref(false)
const showLRUModal = ref(false)
const showSavedSystemsModal = ref(false)
const showTaskModulesModal = ref(false)
const showSavedTaskResultsModal = ref(false)

// 表决模块多步弹窗步骤：1 选择系统，2 参数配置
const voteStep = ref(1)
// 任务模块相关状态
const taskAssemblyModules = ref([])
const router = useRouter()
const fileInput = ref(null)
const uploadStatus = ref(null)
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
const isVoteCalculated = ref(false)
const isVoteParamsValid = ref(false)
const showSystemSelection = ref(false) // 控制表决模块弹窗显隐
const selectedSystemsForVote = ref([])
// 与 selectedSystemsForVote 索引对应的数量（默认为1）
const selectedCounts = ref([]) // index -> count
const savedVotingModules = ref([])

const voteModule = ref({
  name: '',
  baseFailureRate: 0,
  failureRate: 0
})

const voteParams = ref({
  N: null,
  k: null
})

const voteParamErrors = ref({
  N: '',
  k: ''
})
// (已移除单独的表决模块任务时间，统一使用全局 missionTime)
// 任务名称（任务可靠性保存时使用）
const taskName = ref('')

// 已存在的表决模块（来自任务模块列表，sourceType 为 vote-module 且已计算出等效故障率）
const existingVoteModules = computed(() => taskAssemblyModules.value.filter(m => m.sourceType === 'vote-module' && m.failureRate && m.failureRate > 0))

// 选择列表：基础系统 + 已有表决模块
const selectionPool = computed(() => {
  const systems = importedSystems.value.map(sys => ({
    kind: 'system',
    id: sys.id,
    name: sys.name,
    failureRate: sys.totalFailureRate,
    missionTime: sys.missionTime,
    ref: sys
  }))
  const votes = existingVoteModules.value.map((vm, idx) => ({
    kind: 'vote',
    id: vm.id || ('vote-' + idx),
    name: vm.name || ('表决模块' + (idx + 1)),
    failureRate: vm.failureRate,
    missionTime: missionTime.value,
    ref: vm
  }))
  return systems.concat(votes)
})

// 是否可创建表决模块
const canCreateVoteModule = computed(() => selectionPool.value.length > 0)

// 从组合式函数获取数据和方法
const {
  systemName,
  missionTime,
  selectedComponents,
  calculationResults,
  calculateReliability,
  taskModules,
  saveAnalysis,
  removeComponent,
  importComponentsFromExcel
} = useReliabilityCalc()

// 🆕 新增：基本可靠性系统保存方法
const saveCurrentSystem = () => {
  if (!calculationResults.value.hasResults) {
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
  } else {
    savedBasicSystems.value.push(systemData)
  }

  saveSystemsToStorage()
}

const loadSystem = (system) => {
  systemName.value = system.name
  missionTime.value = system.missionTime
  selectedComponents.value = JSON.parse(JSON.stringify(system.components))

  // 重新计算
  calculateReliability()
  showSavedSystemsModal.value = false
}

const removeSavedSystem = (id) => {
  savedBasicSystems.value = savedBasicSystems.value.filter(sys => sys.id !== id)
  saveSystemsToStorage()
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
    return
  }

  importedSystems.value = savedBasicSystems.value.map(sys => ({
    id: sys.id,
    name: sys.name,
    totalFailureRate: sys.totalFailureRate,
    missionTime: sys.missionTime,
    isFromSaved: true
  }))
  // 批量加入任务模块列表
  importedSystems.value.forEach(s => addSystemModuleIfMissing(s))

  // 自动计算任务可靠性
  setTimeout(() => {
    computeTask()
  }, 100)

  // 切换到任务可靠性标签页
  showMain.value = false
  showSavedSystemsModal.value = false
}

const importFromSavedSystems = () => {
  if (savedBasicSystems.value.length === 0) {
    return
  }

  // 过滤掉已经导入的系统
  const systemsToImport = savedBasicSystems.value.filter(savedSys =>
    !importedSystems.value.some(importedSys => importedSys.id === savedSys.id)
  )

  if (systemsToImport.length === 0) {
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
    addSystemModuleIfMissing(sys)
  })

  // 自动计算任务可靠性
  setTimeout(() => {
    computeTask()
  }, 100)
}

const clearImportedSystems = () => {
  if (confirm('确定要清空所有导入的系统吗？')) {
    importedSystems.value = []

    // 清空计算结果
    calculationResults.value.taskResults = null
    calculationResults.value.hasResults = false
    // 移除任务模块列表中来源为 system 的条目
    taskAssemblyModules.value = taskAssemblyModules.value.filter(m => m.sourceType !== 'system')
  }
}


const isManualSystemValid = computed(() => {
  return newSystem.value.name.trim() &&
         newSystem.value.totalFailureRate > 0 &&
         newSystem.value.missionTime > 0
})

const addManualSystem = () => {
  if (!isManualSystemValid.value) {
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
  // 加入任务模块列表（避免重复）
  addSystemModuleIfMissing(systemData)

  // 自动计算任务可靠性
  setTimeout(() => {
    computeTask()
  }, 100)
}

// 🆕 新增：任务可靠性结果保存
const saveTaskReliabilityResults = () => {
  if (!calculationResults.value.taskResults) {
    return
  }

  // 参与系统数量：任务模块列表中所有 system 模块的数量总和 + 所有表决模块展开的系统数量总和
  const participatingSystemCount = taskAssemblyModules.value.reduce((acc, m) => {
    if (m.sourceType === 'system') {
      return acc + (m.count || 1)
    } else if (m.sourceType === 'vote-module' && Array.isArray(m.selectedSystems)) {
      return acc + m.selectedSystems.reduce((s, sys) => s + (sys.count || 1), 0)
    }
    return acc
  }, 0)

  const taskResult = {
    id: Date.now(),
    taskName: taskName.value.trim(),
    systemCount: participatingSystemCount,
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
}

const removeSavedTaskResult = (id) => {
  if (confirm('确定要删除这个保存的任务可靠性结果吗？')) {
    savedTaskResults.value = savedTaskResults.value.filter(result => result.id !== id)
    saveTaskResultsToStorage()
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

// 初始化模块错误信息
const initModuleErrors = () => {
  const errors = []
  taskModules.value.forEach(() => errors.push({}))
  moduleErrors.value = errors
}
// 辅助：系统自动加入任务模块（去重）
const addSystemModuleIfMissing = (system) => {
  const exists = taskAssemblyModules.value.some(m => m.sourceType === 'system' && (m.originalSystemId === system.id))
  if (exists) return
  taskAssemblyModules.value.push({
    id: `sys-${system.id}`,
    name: system.name,
    sourceType: 'system',
    failureRate: system.totalFailureRate,
    originalSystemId: system.id,
    count: 1
  })
}
// 更新系统模块数量
const updateSystemModuleCount = (mod, delta) => {
  if (mod.sourceType !== 'system') return
  const newCount = (mod.count || 1) + delta
  if (newCount < 1) return
  mod.count = newCount
}
initModuleErrors()

// LRU统计
const componentSummary = computed(() => {
  const summary = {}
  selectedComponents.value.forEach(comp => {
    summary[comp.type] = (summary[comp.type] || 0) + comp.quantity
  })
  return summary
})

// 任务计算方法 - 基于导入的系统
const computeTask = () => {
  // 检查任务时间是否已输入
  if (!missionTime.value || missionTime.value <= 0) {
    alert('请先输入任务时间')
    return
  }

  // 如果已有任务模块，优先基于任务模块串联
  if (taskAssemblyModules.value.length > 0) {
    computeTaskFromAssembly()
    return
  }
  // 回退逻辑：没有任务模块则尝试直接用导入系统生成临时模块
  if (importedSystems.value.length === 0) {
    alert('请先导入系统或创建表决模块')
    return
  }
  taskAssemblyModules.value = importedSystems.value.map(sys => ({
    id: `auto-${sys.id}`,
    name: sys.name,
    sourceType: 'system',
    failureRate: sys.totalFailureRate,
    originalSystemId: sys.id,
    count: 1
  }))
  computeTaskFromAssembly(true)
}

// 基于任务模块串联计算
const computeTaskFromAssembly = (autoGenerated = false) => {
  if (taskAssemblyModules.value.length === 0) {
    alert('请先添加任务模块')
    return
  }

  // 检查任务时间是否已输入
  if (!missionTime.value || missionTime.value <= 0) {
    alert('请先输入任务时间')
    return
  }

  const totalObservedFailureRate = taskAssemblyModules.value.reduce((sum, m) => sum + m.failureRate * (m.count || 1), 0)
  const taskReliability = Math.exp(-totalObservedFailureRate * missionTime.value)
  const taskMBTF = totalObservedFailureRate > 0 ? 1 / totalObservedFailureRate : Infinity
  calculationResults.value.taskResults = {
    observedFailureRate: totalObservedFailureRate,
    taskReliability,
    taskMBTF,
    missionTime: missionTime.value,
    systemCount: taskAssemblyModules.value.reduce((c,m)=> c + (m.count || 1), 0)
  }
  calculationResults.value.hasResults = true
  showTaskModulesModal.value = false
}


const removeTaskAssemblyModule = (id) => {
  taskAssemblyModules.value = taskAssemblyModules.value.filter(m => m.id !== id)
}

const clearTaskAssemblyModules = () => {
  if (confirm('确定要清空所有任务模块吗？')) {
    taskAssemblyModules.value = []
  }
}

const totalTaskAssemblyFailureRate = computed(() => taskAssemblyModules.value.reduce((s,m)=>s + m.failureRate * (m.count || 1),0))

// 创建新的表决模块选择系统功能
const toggleSystemSelection = (index) => {
  const currentIndex = selectedSystemsForVote.value.indexOf(index)
  if (currentIndex === -1) {
    selectedSystemsForVote.value.push(index)
    if (!selectedCounts.value[index]) selectedCounts.value[index] = 1
  } else {
    selectedSystemsForVote.value.splice(currentIndex, 1)
    // 保留数量以便再次选中时仍记忆，可选择是否清除，这里暂不清除
  }
}

// 创建基于选定系统的表决模块
const createVoteModuleFromSelected = () => {
  if (selectedSystemsForVote.value.length === 0) {
    return
  }

  const selectedItems = selectedSystemsForVote.value.map(idx => {
    const item = selectionPool.value[idx]
    return {
      type: item.kind,
      ref: item.ref,
      failureRate: item.failureRate,
      count: selectedCounts.value[idx] || 1
    }
  })

  const totalFailureRate = selectedItems.reduce((sum, it) => sum + it.failureRate * it.count, 0)
  const baseFailureRate = parseFloat(totalFailureRate.toFixed(8))

  const moduleName = `表决模块_${selectedItems.length}模块串联`

  voteModule.value = {
    name: moduleName,
    baseFailureRate: baseFailureRate,
    failureRate: 0,
    selectedSystems: selectedItems.map(s => ({
      type: s.type,
      id: s.ref.id || s.ref.name,
      name: s.ref.name,
      failureRate: s.failureRate,
      count: s.count
    }))
  }
  // 进入第二步：参数配置
  voteStep.value = 2
  isVoteCalculated.value = false
  isVoteParamsValid.value = false
}
// 调整选中系统数量
const adjustSelectedCount = (index, delta) => {
  const current = selectedCounts.value[index] || 1
  const next = current + delta
  if (next < 1) return
  selectedCounts.value[index] = next
}
const normalizeSelectedCount = (index) => {
  let val = selectedCounts.value[index]
  if (!Number.isFinite(val) || val < 1) val = 1
  val = Math.round(val)
  selectedCounts.value[index] = val
}

// 保存表决模块
const saveVotingModule = () => {
  if (!isVoteCalculated.value) {
    return
  }

  const moduleToSave = {
    ...voteModule.value,
    voteParams: { ...voteParams.value }
  }

  // 保存到本地列表
  savedVotingModules.value.push(moduleToSave)
  saveVotingModulesToStorage()

  // 自动加入到任务模块列表参与计算（串联）
  taskAssemblyModules.value.push({
    id: `vote-${Date.now()}`,
    name: voteModule.value.name,
    sourceType: 'vote-module',
    failureRate: voteModule.value.failureRate,
    count: 1
  })

  // 重新计算任务可靠性（如果已有模块）
  if (taskAssemblyModules.value.length > 0) {
    computeTaskFromAssembly()
  }

  // 关闭弹窗并重置状态
  closeVoteModal()
}

// 保存表决模块到本地存储
const saveVotingModulesToStorage = () => {
  try {
    localStorage.setItem('savedVotingModules', JSON.stringify(savedVotingModules.value))
  } catch (error) {
    console.error('保存表决模块失败:', error)
  }
}

// 从本地存储加载表决模块
const loadVotingModulesFromStorage = () => {
  try {
    const saved = localStorage.getItem('savedVotingModules')
    if (saved) {
      savedVotingModules.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载表决模块失败:', error)
  }
}

// 打开/关闭添加系统弹窗
const openAddSystemModal = (tab) => {
  if (tab) addSystemTab.value = tab
  showAddSystemModal.value = true
}
const closeAddSystemModal = () => {
  showAddSystemModal.value = false
}

// 验证表决参数
const validateVoteParams = () => {
  const errors = { N: '', k: '' }
  let isValid = true

  // 修改后的验证逻辑
  if (voteParams.value.N === null || voteParams.value.N === undefined || !Number.isInteger(voteParams.value.N) || voteParams.value.N < 1) {
    errors.N = '请输入正整数'
    isValid = false
  }

  if (voteParams.value.k === null || voteParams.value.k === undefined || !Number.isInteger(voteParams.value.k) || voteParams.value.k < 1) {
    errors.k = '请输入正整数'
    isValid = false
  }

  // 只有在两个值都有时才检查 k <= N 的关系
  if (voteParams.value.N !== null && voteParams.value.k !== null && voteParams.value.k > voteParams.value.N && !errors.N && !errors.k) {
    errors.k = '最小有效数不能大于总模块数'
    isValid = false
  }

  voteParamErrors.value = errors
  isVoteParamsValid.value = isValid
}

// 计算表决模型等效故障率
const calculateVoteFailureRate = () => {
  if (!isVoteParamsValid.value) {
    return
  }

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
}

// 打开表决模块弹窗（初始化）
const openVoteModal = () => {
  if (selectionPool.value.length === 0) {
    alert('请先导入系统或创建其他表决模块')
    return
  }

  voteStep.value = 1
  selectedSystemsForVote.value = []
  selectedCounts.value = []

  // 重置表决参数为空值
  voteParams.value = { N: null, k: null }
  voteModule.value = { name: '', baseFailureRate: 0, failureRate: 0 }
  isVoteCalculated.value = false
  isVoteParamsValid.value = false
  voteParamErrors.value = { N: '', k: '' }

  showSystemSelection.value = true
}

// 删除当前创建中的表决模块（仅第二步可用）
const removeSystemVoteModule = () => {
  if (confirm('确定要删除当前表决模块配置吗？')) {
    voteModule.value = { name: '', baseFailureRate: 0, failureRate: 0 }
    voteParams.value = { N: null, k: null }
    isVoteCalculated.value = false
    isVoteParamsValid.value = false
    voteParamErrors.value = { N: '', k: '' }
    voteStep.value = 1
  }
}

// 关闭表决模块弹窗
const closeVoteModal = () => {
  showSystemSelection.value = false
  // 重置状态
  setTimeout(() => {
    voteModule.value = { name: '', baseFailureRate: 0, failureRate: 0 }
    voteParams.value = { N: null, k: null }
    selectedSystemsForVote.value = []
    voteStep.value = 1
    isVoteCalculated.value = false
    isVoteParamsValid.value = false
    voteParamErrors.value = { N: '', k: '' }
  }, 200)
}

// 阶乘辅助函数
const factorial = (n) => {
  if (n === 0 || n === 1) return 1
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

// Excel模板下载
const downloadTemplate = () => {
  try {
    if (typeof XLSX === 'undefined') {
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
    XLSX.utils.book_append_sheet(wb, ws, 'LRU配置')
    XLSX.writeFile(wb, '可靠性分析_LRU模板.xlsx')

  } catch (error) {
    console.error('生成模板失败:', error)
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
      uploadStatus.value = { type: 'success', message: `成功导入 ${result.count} 个LRU` }
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
    return
  }

  if (saveAnalysis()) {
    router.push('/results')
  }
}

// 初始化：加载保存的数据
onMounted(() => {
  loadSystemsFromStorage()
  loadTaskResultsFromStorage()
  loadVotingModulesFromStorage()
})
</script>

<style scoped>
/* 样式部分完全恢复您最原始的设计，只做必要的布局调整 */

/* 标签页按钮移到左边 */
.tool-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 1rem 0;
  margin-bottom: 1rem;
  gap: 2rem;
}

.tool-header h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.tool-tabs {
  display: flex;
  gap: 1rem;
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

.card-section {
  margin-top: 1rem;
}

.cards-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.card-half {
  flex: 1;
  min-height: 500px; /* 确保两个卡片高度一致 */
}

.card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e0;
}

.card-title {
  padding: 20px 24px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  background: linear-gradient(to right, #f8f9ff, #ffffff);
  border-radius: 16px 16px 0 0;
}

.card-content {
  padding: 24px;
}

/* 纵向排列的结果指标 */
.result-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 18px;
}

.result-box {
  border-radius: 16px;
  padding: 20px 16px;
  text-align: center;
  color: #fff;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.result-box:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
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
  margin-bottom: 8px;
  font-weight: 500;
}
.result-value {
  font-size: 1.8rem;
  font-weight: 700;
}

/* 参数网格 */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
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
  color: #4a5568;
}

input {
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 1rem;
  background: #ffffff;
  transition: all 0.3s ease;
  outline: none;
  flex: 1;
}

input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* LRU部分 - 恢复原始样式 */
.lru-section {
  margin-top: 20px;
}

.template-generator {
  margin-bottom: 1.5rem;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
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

.upload-area {
  border: 2px dashed #667eea;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f8f9ff;
  margin-bottom: 1.5rem;
}

.upload-area:hover {
  background: #eef1ff;
  border-color: #764ba2;
}

.upload-icon {
  width: 48px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 1.1rem;
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.upload-hint {
  font-size: 0.9rem;
  color: #6c757d;
}

.components-preview {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.components-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  justify-content: center;
}

.summary-badge {
  background: #667eea;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.view-lru-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.view-lru-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.view-systems-btn {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.view-systems-btn:hover {
  transform: translateY(-2px);
}

.view-systems-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 任务模块查看按钮单独一行 */
.task-modules-view-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 16px;
  background: #f8f9ff;
  border-radius: 8px;
  border: 1px solid #e3e8ff;
}

.task-modules-view-btn {
  background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 6px rgba(33, 150, 243, 0.3);
}

.task-modules-view-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(33, 150, 243, 0.4);
}

.task-modules-view-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

.module-count-badge {
  background: #ff5722;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  margin-left: 4px;
}

.ops-count {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.system-summary {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 0.9rem;
}

.action-buttons {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin: 2rem 0;
  flex-wrap: wrap;
}

.calculate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 36px;
  font-size: 1.1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.calculate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.calculate-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

.save-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1.1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.save-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

.remove-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.remove-btn:hover {
  background: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.remove-btn.small {
  padding: 4px 8px;
  font-size: 0.8rem;
}

/* 任务可靠性操作按钮 */
.module-ops-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 14px 0 8px;
  align-items: center;
}

.ops-btn {
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: .85rem;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
  letter-spacing: .5px;
  transition: all 0.25s;
}

.ops-btn.purple { background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); }
.ops-btn.green { background: linear-gradient(135deg,#28a745 0%,#20c997 100%); }
.ops-btn.orange { background: linear-gradient(135deg,#ff9800 0%,#f57c00 100%); }
.ops-btn.danger { background: linear-gradient(135deg,#e74c3c 0%,#c0392b 100%); }

.ops-btn:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.ops-btn:not(:disabled):hover {
  transform: translateY(-2px);
}

/* 模态框样式 - 完全恢复原始设计 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 10px;
  width: 70vw;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 36px -12px rgba(0,0,0,.30);
}

.modal-content.wide {
  width: 85vw;
  max-width: 1200px;
}

.modal-header {
  padding: 18px 28px;
  background: linear-gradient(135deg,#5b6bc7,#6b5bc7);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 14px rgba(0,0,0,.12);
}

.modal-header h3 {
  margin:0;
  font-size:1.1rem;
  letter-spacing:.5px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e9ecef;
  background: white;
}

/* LRU列表弹窗样式 - 恢复上一版方案 */
.components-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.component-chip {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 16px;
  gap: 12px;
  font-size: 0.95rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.component-chip:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e0;
}

.chip-main {
  font-weight: 600;
  color: #667eea;
  min-width: 100px;
}

.chip-detail {
  color: #4a5568;
  font-size: 0.9rem;
  min-width: 120px;
  display: flex;
  align-items: center;
}

.chip-desc {
  color: #718096;
  font-size: 0.9rem;
  flex: 1;
}

.failure-rate-input {
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.95rem;
  background: #ffffff;
  transition: all 0.3s ease;
  outline: none;
  width: 140px;
  text-align: center;
}

.failure-rate-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1), 0 1px 6px rgba(0, 0, 0, 0.1);
}

/* 已保存系统弹窗样式 - 恢复上一版方案 */
.saved-systems-container {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 6px;
}

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

/* 任务可靠性弹窗样式 - 按照参考代码恢复 */
.systems-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.system-selection-item {
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.system-selection-item:hover {
  border-color: #667eea;
}

.system-selection-item.selected {
  border-color: #667eea;
  background-color: #eef1ff;
}

.system-name {
  font-weight: bold;
  margin-bottom: 8px;
  color: #2c3e50;
}

.system-details {
  font-size: 0.85rem;
  color: #6c757d;
}

.badge {
  background: #28a745;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
  margin-left: 8px;
}

.count-editor {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.count-label {
  font-size: 0.75rem;
  color: #555;
}

.count-btn {
  background: #667eea;
  color: #fff;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.count-btn:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.count-btn:not(:disabled):hover {
  background: #5468d4;
}

.count-input {
  width: 42px;
  text-align: center;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 0.75rem;
}

.count-input:focus {
  outline: none;
  border-color: #667eea;
}

/* 表决模块表格样式 */
.task-module-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0;
  background: #fff;
  border: 1px solid #dfe3eb;
}

.task-module-table th, .task-module-table td {
  border: 1px solid #e1e6ef;
  padding: 12px 14px;
}

.task-module-table th {
  background: linear-gradient(135deg,#5b6bc7,#6b5bc7);
  color: #fff;
  font-weight:600;
}

.module-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-info-item label {
  color: #5b6bc7;
  font-weight: 600;
  width: 80px;
  text-align: right;
}

.vote-params-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
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

.param-tip {
  margin: 0;
  font-size: 0.8rem;
}

.task-remove-btn {
  padding: 5px 10px;
  font-size: 0.9rem;
}

/* 任务模块网格样式 */
.assembly-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 12px;
}

.assembly-card {
  background: #ffffff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  padding: 12px;
  position: relative;
  transition: .25s;
}

.assembly-card:hover {
  box-shadow: 0 4px 10px rgba(0,0,0,.08);
  transform: translateY(-2px);
}

.assembly-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.assembly-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assembly-row {
  display: flex;
  justify-content: space-between;
  font-size: .8rem;
}

.assembly-summary {
  margin-top: 16px;
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: .85rem;
  border-left: 4px solid #667eea;
}

/* 系统网格样式 */
.systems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.system-card.mini {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s;
  position: relative;
}

.system-card.mini:hover {
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
  font-size: 1rem;
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

/* 手动添加表单样式 */
.manual-form {
  margin-bottom: 20px;
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

/* 空状态提示 */
.empty-tip {
  text-align: center;
  padding: 40px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
  border: 2px dashed #dee2e6;
}

/* 子标签样式 */
.add-system-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.sub-tab {
  background: #eef1ff;
  color: #555;
  border: 1px solid #d6dcf5;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.25s;
}

.sub-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(102,126,234,0.25);
}

.sub-tab:not(.active):hover {
  background: #dfe5ff;
}

/* 时间要求提示区域 */
.time-required-section {
  text-align: center;
  padding: 40px 20px;
}

.warning-message {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.warning-message p {
  margin: 10px 0;
  color: #856404;
}

.warning-text {
  font-weight: bold;
  color: #e74c3c;
}

/* 计算提示 */
.calculation-tip {
  margin-top: 16px;
  padding: 12px;
  background: #fff3cd;
  border-radius: 6px;
  border: 1px solid #ffeaa7;
  color: #856404;
  text-align: center;
  font-size: 0.9rem;
}

.calculation-tip p {
  margin: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .cards-row {
    flex-direction: column;
  }

  .param-grid {
    grid-template-columns: 1fr;
  }

  .result-column {
    gap: 12px;
  }

  .modal-content {
    width: 95vw;
    margin: 1rem;
  }

  .modal-content.wide {
    width: 95vw;
  }

  .module-ops-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .task-modules-view-section {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .tool-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .tool-tabs {
    width: 100%;
    justify-content: center;
  }

  .saved-systems-grid {
    grid-template-columns: 1fr;
  }

  .systems-grid {
    grid-template-columns: 1fr;
  }

  .assembly-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .systems-selection-grid {
    grid-template-columns: 1fr;
  }
}
</style>
