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

        <!-- LRU配置卡片 -->
        <div class="card">
          <div class="card-title">LRU配置</div>
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
            </div>

            <!-- LRU列表展示 -->
            <div v-if="selectedComponents.length > 0" class="components-display">
              <h4>当前LRU ({{ selectedComponents.length }}个)</h4>

              <!-- LRU统计 -->
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
                    <input v-model.number="comp.failureRate" type="number" step="any" class="failure-rate-input" placeholder="0.000001 或 1e-6" />
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
            <button @click="calculateReliability" class="calculate-btn">计算可靠性</button>
            <button @click="saveCurrentSystem" class="save-btn" :disabled="!calculationResults.hasResults">
              保存系统结果
            </button>
            <button @click="saveAndView" class="save-btn" :disabled="!calculationResults.hasResults">
              保存并查看结果
            </button>
          </div>
        </div>

        <!-- 已保存系统列表 -->
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
              <p class="template-tip">将所有已保存系统导入到任务可靠性计算中</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 任务可靠性标签页 - 紧凑布局 -->
    <template v-else>
      <div class="compact-task-section">
        <!-- 第一行：任务参数 + 操作按钮 -->
        <div class="compact-row">
          <!-- 任务参数卡片 - 紧凑版 -->
          <div class="compact-card compact-params">
            <div class="compact-card-title">任务参数</div>
            <div class="compact-card-content">
              <div class="compact-param-grid">
                <div class="compact-param-item">
                  <label>任务名称：</label>
                  <input v-model="taskName" placeholder="任务名称" class="compact-input" />
                </div>
                <div class="compact-param-item">
                  <label>任务时间：</label>
                  <div class="compact-input-with-unit">
                    <input v-model.number="missionTime" type="number" min="0" class="compact-input" />
                    <span class="compact-unit">小时</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 紧凑的操作按钮组 -->
          <div class="compact-card compact-actions">
            <div class="compact-card-title">系统操作</div>
            <div class="compact-card-content">
              <div class="compact-ops-grid">
                <button class="compact-ops-btn purple" @click="openAddSystemModal('import')">导入系统</button>
                <button class="compact-ops-btn green" @click="openAddSystemModal('manual')">手动添加</button>
                <button class="compact-ops-btn orange" @click="openVoteModal" :disabled="!canCreateVoteModule">创建表决</button>
                <button class="compact-ops-btn danger" @click="clearImportedSystems" :disabled="importedSystems.length===0">清空系统</button>
              </div>
              <div class="compact-ops-info">
                <span class="compact-ops-count">已加载: {{ importedSystems.length }} 个系统</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 第二行：任务模块组成 -->
        <div class="compact-card compact-assembly">
          <div class="compact-card-title">任务模块组成</div>
          <div class="compact-card-content">
            <div class="compact-assembly-content">
              <!-- 已选任务模块列表 -->
              <div class="compact-assembly-list">
                <h4 class="compact-source-title">任务模块 ({{ taskAssemblyModules.length }})</h4>
                <div v-if="taskAssemblyModules.length===0" class="compact-empty-tip">
                  <p>尚未选择任务模块</p>
                  <small>点击上方操作按钮添加系统或创建表决模块</small>
                </div>
                <div v-else class="compact-assembly-grid">
                  <div v-for="mod in taskAssemblyModules" :key="mod.id" class="compact-assembly-card">
                    <div class="compact-assembly-header">
                      <strong class="compact-assembly-name">{{ mod.name }}</strong>
                      <button class="compact-remove-btn" @click="removeTaskAssemblyModule(mod.id)">×</button>
                    </div>
                    <div class="compact-assembly-body">
                      <div class="compact-assembly-row">
                        <span>类型:</span>
                        <strong>{{ mod.sourceType==='system' ? '系统' : '表决模块' }}</strong>
                      </div>
                      <div class="compact-assembly-row" v-if="mod.sourceType==='system' || mod.sourceType==='vote-module'">
                        <span>数量:</span>
                        <strong style="display:flex;align-items:center;gap:4px;">
                          <button class="compact-count-btn" @click="updateSystemModuleCount(mod,-1)" :disabled="(mod.count||1)<=1">-</button>
                          <input class="compact-count-input" v-model.number="mod.count" @change="mod.count = Math.max(1, Math.round(mod.count||1))" />
                          <button class="compact-count-btn" @click="updateSystemModuleCount(mod,1)">+</button>
                        </strong>
                      </div>
                      <div class="compact-assembly-row">
                        <span>失效率:</span>
                        <strong class="compact-failure-rate">
                          {{ mod.failureRate.toExponential(6) }} /h
                          <span v-if="(mod.count||1) > 1" class="compact-count-note">(×{{ mod.count }})</span>
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="taskAssemblyModules.length>0" class="compact-assembly-summary">
                  <span>合计失效率: <strong>{{ totalTaskAssemblyFailureRate.toExponential(6) }}/h</strong></span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="compact-assembly-actions" v-if="taskAssemblyModules.length>0">
                <button class="compact-calculate-btn" @click="computeTaskFromAssembly">计算任务可靠性</button>
                <button class="compact-remove-btn" @click="clearTaskAssemblyModules">清空模块</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 第三行：结果展示 -->
        <div class="compact-row">
          <!-- 任务可靠性结果卡片 - 紧凑版 -->
          <div class="compact-card compact-results">
            <div class="compact-card-title">任务可靠性结果</div>
            <div class="compact-card-content">
              <div v-if="calculationResults.taskResults" class="compact-results-content">
                <div class="compact-result-boxes">
                  <div class="compact-result-box purple">
                    <div class="compact-result-label">任务失效率</div>
                    <div class="compact-result-value">{{ calculationResults.taskResults.observedFailureRate.toExponential(3) }}</div>
                  </div>
                  <div class="compact-result-box blue">
                    <div class="compact-result-label">任务 MTBF</div>
                    <div class="compact-result-value">{{ isFinite(calculationResults.taskResults.taskMBTF) ? calculationResults.taskResults.taskMBTF.toFixed(2) : '∞' }} h</div>
                  </div>
                  <div class="compact-result-box pink">
                    <div class="compact-result-label">任务可靠度</div>
                    <div class="compact-result-value">{{ calculationResults.taskResults.taskReliability.toFixed(4) }}</div>
                  </div>
                </div>
                <div class="compact-system-summary">
                  <strong>计算基于：</strong>
                  <span>{{ calculationResults.taskResults.systemCount || 0 }} 个系统</span>
                </div>
                <div class="compact-result-actions">
                  <button @click="saveTaskReliabilityResults" class="compact-save-btn">
                    💾 保存结果
                  </button>
                </div>
              </div>
              <div v-else class="compact-no-results">
                <p>请先添加任务模块并计算可靠性</p>
                <button @click="computeTask" class="compact-calculate-btn">
                  计算任务可靠性
                </button>
              </div>
            </div>
          </div>

          <!-- 已保存结果卡片 - 紧凑版 -->
          <div class="compact-card compact-saved" v-if="savedTaskResults.length > 0">
            <div class="compact-card-title">已保存结果 ({{ savedTaskResults.length }})</div>
            <div class="compact-card-content">
              <div class="compact-saved-list">
                <div v-for="result in savedTaskResults.slice(0, 3)" :key="result.id" class="compact-saved-item">
                  <div class="compact-saved-header">
                    <span class="compact-saved-name">{{ result.taskName || '任务分析' }}</span>
                    <button @click="removeSavedTaskResult(result.id)" class="compact-remove-btn small">×</button>
                  </div>
                  <div class="compact-saved-details">
                    <div class="compact-saved-row">
                      <span>可靠度:</span>
                      <strong>{{ result.taskReliability.toFixed(4) }}</strong>
                    </div>
                    <div class="compact-saved-row">
                      <span>系统:</span>
                      <strong>{{ result.systemCount }} 个</strong>
                    </div>
                  </div>
                </div>
                <div v-if="savedTaskResults.length > 3" class="compact-saved-more">
                  <small>还有 {{ savedTaskResults.length - 3 }} 个结果</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加系统弹窗 -->
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
            <div style="font-size:.8rem;color:#666;">关闭弹窗后可在任务模块组成中选择这些系统。</div>
            <div style="display:flex;gap:12px;">
              <button class="save-btn" @click="closeAddSystemModal">完成</button>
              <button class="remove-btn" @click="closeAddSystemModal">关闭</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统选择模态框（用于创建表决模块）-->
      <div v-if="showSystemSelection" class="modal-overlay" @click="closeVoteModal">
        <div class="modal-content wide" @click.stop>
          <div class="modal-header">
            <h3>{{ voteStep === 1 ? '选择系统创建表决模块' : '配置表决模块参数' }}</h3>
            <button class="close-btn" @click="closeVoteModal">×</button>
          </div>
          <div class="modal-body">
            <!-- 步骤一：选择系统 -->
            <template v-if="voteStep === 1">
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
const addSystemTab = ref('import')
const showAddSystemModal = ref(false)
const voteStep = ref(1)
const taskAssemblyModules = ref([])
const router = useRouter()
const fileInput = ref(null)
const uploadStatus = ref(null)
const uploadError = ref(null)
const moduleErrors = ref([])

// 保存系统相关状态
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
const showSystemSelection = ref(false)
const selectedSystemsForVote = ref([])
const selectedCounts = ref([])
const savedVotingModules = ref([])

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

const taskName = ref('')

// 计算属性
const existingVoteModules = computed(() => taskAssemblyModules.value.filter(m => m.sourceType === 'vote-module' && m.failureRate && m.failureRate > 0))

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

// 基本可靠性系统保存方法
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
  calculateReliability()
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

// 批量导入方法
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
  importedSystems.value.forEach(s => addSystemModuleIfMissing(s))

  setTimeout(() => {
    computeTask()
  }, 100)

  showMain.value = false
}

const importFromSavedSystems = () => {
  if (savedBasicSystems.value.length === 0) {
    return
  }

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

  setTimeout(() => {
    computeTask()
  }, 100)
}

const clearImportedSystems = () => {
  if (confirm('确定要清空所有导入的系统吗？')) {
    importedSystems.value = []
    calculationResults.value.taskResults = null
    calculationResults.value.hasResults = false
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
  addSystemModuleIfMissing(systemData)

  newSystem.value = {
    name: '',
    totalFailureRate: 0,
    missionTime: 1000
  }

  setTimeout(() => {
    computeTask()
  }, 100)
}

// 任务可靠性结果保存
const saveTaskReliabilityResults = () => {
  if (!calculationResults.value.taskResults) {
    return
  }

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

// 任务计算方法
const computeTask = () => {
  if (taskAssemblyModules.value.length > 0) {
    computeTaskFromAssembly()
    return
  }
  if (importedSystems.value.length === 0) {
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

// 表决模块相关方法
const toggleSystemSelection = (index) => {
  const currentIndex = selectedSystemsForVote.value.indexOf(index)
  if (currentIndex === -1) {
    selectedSystemsForVote.value.push(index)
    if (!selectedCounts.value[index]) selectedCounts.value[index] = 1
  } else {
    selectedSystemsForVote.value.splice(currentIndex, 1)
  }
}

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
  voteStep.value = 2
  isVoteCalculated.value = false
  isVoteParamsValid.value = false
}

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

const saveVotingModule = () => {
  if (!isVoteCalculated.value) {
    return
  }

  const moduleToSave = {
    ...voteModule.value,
    voteParams: { ...voteParams.value }
  }

  savedVotingModules.value.push(moduleToSave)
  saveVotingModulesToStorage()

  taskAssemblyModules.value.push({
    id: `vote-${Date.now()}`,
    name: voteModule.value.name,
    sourceType: 'vote-module',
    failureRate: voteModule.value.failureRate,
    count: 1
  })

  if (taskAssemblyModules.value.length > 0) {
    computeTaskFromAssembly()
  }

  closeVoteModal()
}

const saveVotingModulesToStorage = () => {
  try {
    localStorage.setItem('savedVotingModules', JSON.stringify(savedVotingModules.value))
  } catch (error) {
    console.error('保存表决模块失败:', error)
  }
}

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

const openAddSystemModal = (tab) => {
  if (tab) addSystemTab.value = tab
  showAddSystemModal.value = true
}

const closeAddSystemModal = () => {
  showAddSystemModal.value = false
}

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

const calculateVoteFailureRate = () => {
  if (!isVoteParamsValid.value) return

  const { N, k } = voteParams.value
  const λ_base = Number(voteModule.value.baseFailureRate)
  const t = Number(missionTime.value)

  if (!Number.isFinite(t) || t <= 0) {
    alert('请先在基础可靠性计算中设置有效的任务时间，再计算表决模块。')
    return
  }

  if (!Number.isFinite(λ_base) || λ_base < 0) {
    alert('基本失效率无效，请重新选择系统或检查数据。')
    return
  }

  const R_base = Math.exp(-λ_base * t)
  const Q_base = Math.max(0, 1 - R_base)

  let R_vote = 0
  for (let i = k; i <= N; i++) {
    const combination = factorial(N) / (factorial(i) * factorial(N - i))
    R_vote += combination * Math.pow(R_base, i) * Math.pow(Q_base, N - i)
  }

  if (!Number.isFinite(R_vote) || R_vote <= 0) {
    alert('计算结果异常，请检查参数 N、k 以及基础失效率。')
    return
  }

  const safeR = Math.min(Math.max(R_vote, Number.EPSILON), 1)
  const λ_vote = -Math.log(safeR) / t
  if (!Number.isFinite(λ_vote) || λ_vote < 0) {
    alert('计算出的等效故障率无效，请调整参数后重试。')
    return
  }
  voteModule.value.failureRate = parseFloat(λ_vote.toFixed(8))
  if (Array.isArray(taskModules.value) && taskModules.value.length > 0) {
    taskModules.value[0].failureRate = voteModule.value.failureRate
  }
  isVoteCalculated.value = true
}

const openVoteModal = () => {
  if (selectionPool.value.length === 0) {
    return
  }
  voteStep.value = 1
  selectedSystemsForVote.value = []
  selectedCounts.value = []
  showSystemSelection.value = true
}

const removeSystemVoteModule = () => {
  if (confirm('确定要删除当前表决模块配置吗？')) {
    voteModule.value = { name: '', baseFailureRate: 0, failureRate: 0 }
    voteParams.value = { N: 8, k: 4 }
    isVoteCalculated.value = false
    isVoteParamsValid.value = false
    voteParamErrors.value = { N: '', k: '' }
    voteStep.value = 1
  }
}

const closeVoteModal = () => {
  showSystemSelection.value = false
  setTimeout(() => {
    voteModule.value = { name: '', baseFailureRate: 0, failureRate: 0 }
    voteParams.value = { N: 8, k: 4 }
    selectedSystemsForVote.value = []
    voteStep.value = 1
    isVoteCalculated.value = false
    isVoteParamsValid.value = false
    voteParamErrors.value = { N: '', k: '' }
  }, 200)
}

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
/* 紧凑布局样式 */
.compact-task-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.compact-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.compact-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.compact-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.compact-card-title {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  background: linear-gradient(to right, #f8f9ff, #ffffff);
  border-radius: 12px 12px 0 0;
}

.compact-card-content {
  padding: 16px;
}

/* 参数卡片样式 */
.compact-params {
  grid-column: 1;
}

.compact-actions {
  grid-column: 2;
}

.compact-param-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.compact-param-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compact-param-item label {
  color: #764ba2;
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 70px;
}

.compact-input {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.9rem;
  background: #ffffff;
  transition: all 0.3s ease;
  outline: none;
  flex: 1;
}

.compact-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.compact-input-with-unit {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
}

.compact-unit {
  color: #4a5568;
  font-size: 0.9rem;
  min-width: 30px;
}

/* 操作按钮样式 */
.compact-ops-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.compact-ops-btn {
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  transition: all 0.3s ease;
  text-align: center;
}

.compact-ops-btn.purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.compact-ops-btn.green {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.compact-ops-btn.orange {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
}

.compact-ops-btn.danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.compact-ops-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.compact-ops-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.compact-ops-info {
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid #f1f3f4;
}

.compact-ops-count {
  font-size: 0.8rem;
  color: #666;
}

/* 任务模块组成样式 */
.compact-assembly {
  grid-column: 1 / -1;
}

.compact-assembly-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.compact-assembly-list {
  flex: 1;
}

.compact-source-title {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 0.95rem;
  font-weight: 600;
}

.compact-empty-tip {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
  border: 2px dashed #dee2e6;
}

.compact-empty-tip p {
  margin: 0 0 4px 0;
  font-size: 0.9rem;
}

.compact-empty-tip small {
  font-size: 0.8rem;
}

.compact-assembly-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.compact-assembly-card {
  background: #f8f9ff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  padding: 10px;
  transition: all 0.3s ease;
}

.compact-assembly-card:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
  transform: translateY(-1px);
}

.compact-assembly-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e9ecef;
}

.compact-assembly-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #2c3e50;
}

.compact-remove-btn {
  background: #e74c3c;
  color: white;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  transition: all 0.3s ease;
}

.compact-remove-btn:hover {
  background: #c0392b;
  transform: scale(1.1);
}

.compact-remove-btn.small {
  width: 16px;
  height: 16px;
  font-size: 10px;
}

.compact-assembly-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compact-assembly-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #4a5568;
}

.compact-failure-rate {
  font-family: monospace;
  font-size: 0.7rem;
}

.compact-count-note {
  color: #666;
  font-size: 0.65rem;
}

.compact-count-btn {
  background: #667eea;
  color: #fff;
  border: none;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.compact-count-btn:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.compact-count-btn:not(:disabled):hover {
  background: #5468d4;
}

.compact-count-input {
  width: 30px;
  text-align: center;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 0.7rem;
}

.compact-count-input:focus {
  outline: none;
  border-color: #667eea;
}

.compact-assembly-summary {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 0.8rem;
  border-left: 3px solid #667eea;
  text-align: center;
}

.compact-assembly-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.compact-calculate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.compact-calculate-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* 结果展示样式 */
.compact-results {
  grid-column: 1;
}

.compact-saved {
  grid-column: 2;
}

.compact-results-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.compact-result-boxes {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.compact-result-box {
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  color: #fff;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.compact-result-box.purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.compact-result-box.blue {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #222;
}

.compact-result-box.pink {
  background: linear-gradient(135deg, #f797a7 0%, #f7b2e7 100%);
}

.compact-result-label {
  font-size: 0.7rem;
  margin-bottom: 6px;
  font-weight: 500;
  opacity: 0.9;
}

.compact-result-value {
  font-size: 0.9rem;
  font-weight: 700;
}

.compact-system-summary {
  text-align: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 0.8rem;
}

.compact-result-actions {
  text-align: center;
}

.compact-save-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  padding: 6px 12px;
  font-size: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.compact-save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.compact-no-results {
  text-align: center;
  padding: 20px;
  color: #6c757d;
}

.compact-no-results p {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
}

/* 已保存结果样式 */
.compact-saved-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.compact-saved-item {
  background: #f8f9ff;
  border: 1px solid #e3e8ff;
  border-radius: 6px;
  padding: 8px;
  transition: all 0.3s ease;
}

.compact-saved-item:hover {
  box-shadow: 0 2px 4px rgba(102,126,234,0.1);
}

.compact-saved-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e3e8ff;
}

.compact-saved-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #667eea;
}

.compact-saved-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.compact-saved-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #4a5568;
}

.compact-saved-more {
  text-align: center;
  padding: 4px;
  color: #6c757d;
  font-size: 0.7rem;
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .compact-row {
    grid-template-columns: 1fr;
  }
  
  .compact-params,
  .compact-actions,
  .compact-results,
  .compact-saved {
    grid-column: 1;
  }
  
  .compact-assembly-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .compact-task-section {
    padding: 12px;
    gap: 12px;
  }
  
  .compact-ops-grid {
    grid-template-columns: 1fr;
  }
  
  .compact-result-boxes {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  
  .compact-assembly-grid {
    grid-template-columns: 1fr;
  }
}

/* 原有的其他样式保持不变 */
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

/* 原有的模态框样式保持不变 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content, .modal-content.wide {
  background: #fff;
  border-radius: 10px;
  width: 78vw;
  height: 76vh;
  max-width: 1100px;
  max-height: 780px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 36px -12px rgba(0,0,0,.30);
  position: relative;
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

.modal-header h3 { margin:0; font-size:1.1rem; letter-spacing:.5px; }

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  padding: 18px 24px 22px;
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}

/* 其他原有样式保持不变... */
/* 这里包含你原有的所有样式，包括组件样式、表格样式等 */
/* 由于代码长度限制，这里省略了重复的样式，但实际使用时需要保留完整的样式 */

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
  color: #4a5568;
}

/* 模板下载样式 */
.template-generator {
  margin-bottom: 1.5rem;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
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
  border-bottom: 1px solid #e2e8f0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  background: linear-gradient(to right, #f8f9ff, #ffffff);
  border-radius: 16px 16px 0 0;
}

.card-content {
  padding: 24px;
}

/* 其他按钮和组件样式保持不变... */
</style>
