<template>
  <div class="ft-sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">项目</span>
    </div>
    <div class="sidebar-content">
      <div v-if="projects.length === 0" class="empty-projects">
        <p>暂无项目</p>
        <button @click="$emit('create-project')" class="create-project-btn">新建项目</button>
      </div>
      <div v-else class="project-tree">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-item"
        >
          <!-- 项目文件夹 -->
          <div
            :class="['project-folder', { expanded: expandedProjects[project.id] }]"
            @click="toggleProject(project.id)"
            @contextmenu.prevent="showProjectMenu(project.id, $event)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              class="folder-icon yellow-folder"
            >
              <path d="M2 3h5l1 2h6v8H2V3z" fill="#ffd700" stroke="#ffa500" stroke-width="1"/>
            </svg>
            <span class="project-name">{{ project.name }}</span>
            <div class="project-actions" @click.stop>
              <button
                class="action-btn"
                @click.stop="showProjectMenu(project.id, $event)"
                title="更多操作"
              >
                ⋮
              </button>
            </div>
          </div>

          <!-- 项目下的故障树列表 -->
          <div
            v-if="expandedProjects[project.id]"
            class="fault-tree-list"
          >
            <div
              v-for="faultTree in project.faultTrees"
              :key="faultTree.id"
              class="fault-tree-wrapper"
            >
              <!-- 故障树主项 -->
              <div
              :class="['fault-tree-item', {
                  active: currentProjectId === project.id && currentFaultTreeId === faultTree.id,
                  expanded: expandedFaultTrees[faultTree.id]
              }]"
              @click="selectFaultTree(project.id, faultTree.id)"
              @contextmenu.prevent="showFaultTreeMenu(project.id, faultTree.id, $event)"
            >
                <svg
                  v-if="getAnalysisItemsForFaultTree(faultTree.id).length > 0"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  class="expand-icon"
                  @click.stop="toggleFaultTree(faultTree.id)"
                >
                  <path
                    :d="expandedFaultTrees[faultTree.id] ? 'M2 4l4 4 4-4' : 'M4 2l4 4-4 4'"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                class="fault-tree-icon"
                  :style="{ marginLeft: getAnalysisItemsForFaultTree(faultTree.id).length > 0 ? '0' : '12px' }"
              >
                <text x="8" y="12" text-anchor="middle" font-size="12" fill="#1890ff" font-weight="bold">T</text>
              </svg>
              <span class="fault-tree-name">{{ faultTree.name }}</span>
              </div>

              <!-- 分析结果子项 -->
              <div
                v-if="expandedFaultTrees[faultTree.id]"
                class="analysis-items-list"
              >
                <div
                  v-for="analysisItem in getAnalysisItemsForFaultTree(faultTree.id)"
                  :key="analysisItem.id"
                  class="analysis-item"
                  @click.stop="selectAnalysisItem(analysisItem)"
                  @dblclick.stop="editAnalysisItem(analysisItem)"
                  @contextmenu.prevent="showAnalysisMenu(analysisItem, $event)"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    class="analysis-icon"
                  >
                    <rect x="2" y="2" width="10" height="10" stroke="#52c41a" stroke-width="1.5" fill="none"/>
                    <path d="M4 7h6M7 4v6" stroke="#52c41a" stroke-width="1.5"/>
                  </svg>
                  <span class="analysis-name">{{ analysisItem.name }}</span>
                </div>
              </div>
            </div>

            <!-- 添加故障树按钮 -->
            <div
              class="add-fault-tree-btn"
              @click="addFaultTreeToProject(project.id)"
              title="新建故障树"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>新建故障树</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 新建项目按钮 -->
      <div class="sidebar-footer">
        <button @click="$emit('create-project')" class="new-project-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>新建项目</span>
        </button>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div
        v-if="contextMenu.type === 'project'"
        class="context-menu-items"
      >
        <div class="context-menu-item" @click="handleRenameProject">
          <span>重命名</span>
        </div>
        <div class="context-menu-item" @click="handleDeleteProject">
          <span>删除</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" @click="handleAddFaultTree">
          <span>新建故障树</span>
        </div>
      </div>
      <div
        v-if="contextMenu.type === 'fault-tree'"
        class="context-menu-items"
      >
        <div class="context-menu-item" @click="handleRenameFaultTree">
          <span>重命名</span>
        </div>
        <div class="context-menu-item" @click="handleDeleteFaultTree">
          <span>删除</span>
        </div>
      </div>
      <div
        v-if="contextMenu.type === 'analysis'"
        class="context-menu-items"
      >
        <div class="context-menu-item" @click="handleEditAnalysis">
          <span>编辑(E)...</span>
        </div>
        <div class="context-menu-item" @click="handleAnalyze">
          <span>分析</span>
        </div>
        <div class="context-menu-item" @click="handleDeleteAnalysis">
          <span>删除(D)</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" @click="handleShowResult">
          <span>结果(R)...</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" @click="handleCopyAnalysis">
          <span>复制粘贴</span>
          <span class="shortcut">Ctrl+C</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  currentProjectId: {
    type: String,
    default: null
  },
  currentFaultTreeId: {
    type: String,
    default: null
  },
  analysisItems: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'create-project',
  'create-fault-tree',
  'switch-fault-tree',
  'delete-project',
  'delete-fault-tree',
  'rename-project',
  'rename-fault-tree',
  'select-analysis',
  'edit-analysis',
  'delete-analysis',
  'show-analysis-result',
  'copy-analysis',
  'paste-analysis'
])

const expandedProjects = ref({})
const expandedFaultTrees = ref({})
const contextMenu = reactive({
  show: false,
  type: null,
  projectId: null,
  faultTreeId: null,
  analysisItem: null,
  x: 0,
  y: 0
})

// 初始化：展开当前项目
watch(() => props.currentProjectId, (newId) => {
  if (newId && !expandedProjects.value[newId]) {
    expandedProjects.value[newId] = true
  }
}, { immediate: true })

// 初始化：展开所有项目
watch(() => props.projects, () => {
  props.projects.forEach(project => {
    if (!(project.id in expandedProjects.value)) {
      expandedProjects.value[project.id] = true
    }
  })
}, { immediate: true, deep: true })

const toggleProject = (projectId) => {
  expandedProjects.value[projectId] = !expandedProjects.value[projectId]
}

const toggleFaultTree = (faultTreeId) => {
  expandedFaultTrees.value[faultTreeId] = !expandedFaultTrees.value[faultTreeId]
}

const selectFaultTree = (projectId, faultTreeId) => {
  emit('switch-fault-tree', projectId, faultTreeId)
}

const getAnalysisItemsForFaultTree = (faultTreeId) => {
  return props.analysisItems.filter(item => item.faultTreeId === faultTreeId)
}

const selectAnalysisItem = (analysisItem) => {
  emit('select-analysis', analysisItem)
}

const editAnalysisItem = (analysisItem) => {
  emit('edit-analysis', analysisItem)
}

const addFaultTreeToProject = (projectId) => {
  emit('create-fault-tree', projectId)
}

const showProjectMenu = (projectId, event) => {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.show = true
  contextMenu.type = 'project'
  contextMenu.projectId = projectId
  contextMenu.faultTreeId = null
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
}

const showFaultTreeMenu = (projectId, faultTreeId, event) => {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.show = true
  contextMenu.type = 'fault-tree'
  contextMenu.projectId = projectId
  contextMenu.faultTreeId = faultTreeId
  contextMenu.analysisItem = null
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
}

const showAnalysisMenu = (analysisItem, event) => {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.show = true
  contextMenu.type = 'analysis'
  contextMenu.projectId = null
  contextMenu.faultTreeId = null
  contextMenu.analysisItem = analysisItem
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
}

const handleRenameProject = () => {
  if (contextMenu.projectId) {
    emit('rename-project', contextMenu.projectId)
  }
  contextMenu.show = false
}

const handleDeleteProject = () => {
  if (contextMenu.projectId) {
    emit('delete-project', contextMenu.projectId)
  }
  contextMenu.show = false
}

const handleAddFaultTree = () => {
  if (contextMenu.projectId) {
    emit('create-fault-tree', contextMenu.projectId)
  }
  contextMenu.show = false
}

const handleRenameFaultTree = () => {
  if (contextMenu.projectId && contextMenu.faultTreeId) {
    emit('rename-fault-tree', contextMenu.projectId, contextMenu.faultTreeId)
  }
  contextMenu.show = false
}

const handleDeleteFaultTree = () => {
  if (contextMenu.projectId && contextMenu.faultTreeId) {
    emit('delete-fault-tree', contextMenu.projectId, contextMenu.faultTreeId)
  }
  contextMenu.show = false
}

const handleEditAnalysis = () => {
  if (contextMenu.analysisItem) {
    emit('edit-analysis', contextMenu.analysisItem)
  }
  contextMenu.show = false
}

const handleAnalyze = () => {
  if (contextMenu.analysisItem) {
    emit('show-analysis-result', contextMenu.analysisItem)
  }
  contextMenu.show = false
}

const handleDeleteAnalysis = () => {
  if (contextMenu.analysisItem) {
    emit('delete-analysis', contextMenu.analysisItem)
  }
  contextMenu.show = false
}

const handleShowResult = () => {
  if (contextMenu.analysisItem) {
    emit('show-analysis-result', contextMenu.analysisItem)
  }
  contextMenu.show = false
}

const handleCopyAnalysis = () => {
  if (contextMenu.analysisItem) {
    emit('copy-analysis', contextMenu.analysisItem)
  }
  contextMenu.show = false
}

const handlePasteAnalysis = () => {
  emit('paste-analysis')
  contextMenu.show = false
}

// 点击其他地方关闭菜单
const closeContextMenu = (event) => {
  // 如果点击的是菜单本身，不关闭
  if (event && event.target && event.target.closest && event.target.closest('.context-menu')) {
    return
  }
  contextMenu.show = false
}

// 监听点击事件关闭菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('contextmenu', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('contextmenu', closeContextMenu)
})
</script>

<style scoped>
.ft-sidebar {
  width: 200px;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-projects {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.create-project-btn {
  margin-top: 16px;
  padding: 6px 12px;
  background: #1890ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.create-project-btn:hover {
  background: #40a9ff;
}

.project-tree {
  padding: 4px 0;
}

.project-item {
  margin-bottom: 4px;
}

.project-folder {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  user-select: none;
  position: relative;
  transition: background 0.2s;
}

.project-folder:hover {
  background: #f0f0f0;
}

.project-folder:hover .project-actions {
  opacity: 1;
}

.folder-icon {
  flex-shrink: 0;
}

.yellow-folder {
  color: #ffd700;
}

.project-name {
  flex: 1;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #666;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  line-height: 1;
}

.action-btn:hover {
  background: #e0e0e0;
}

.fault-tree-list {
  padding-left: 24px;
  margin-top: 2px;
}

.fault-tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background 0.2s;
  user-select: none;
}

.fault-tree-item:hover {
  background: #f0f0f0;
}

.fault-tree-item.active {
  background: #e6f7ff;
  color: #1890ff;
}

.fault-tree-item.active .fault-tree-name {
  color: #1890ff;
  font-weight: 500;
}

.fault-tree-icon {
  flex-shrink: 0;
}

.fault-tree-name {
  flex: 1;
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expand-icon {
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.fault-tree-wrapper {
  margin-bottom: 2px;
}

.analysis-items-list {
  padding-left: 28px;
  margin-top: 2px;
  margin-bottom: 4px;
}

.analysis-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background 0.2s;
  user-select: none;
}

.analysis-item:hover {
  background: #f0f0f0;
}

.analysis-icon {
  flex-shrink: 0;
}

.analysis-name {
  flex: 1;
  font-size: 11px;
  color: #52c41a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-fault-tree-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-top: 4px;
  cursor: pointer;
  border-radius: 4px;
  color: #999;
  font-size: 12px;
  transition: all 0.2s;
}

.add-fault-tree-btn:hover {
  background: #f0f0f0;
  color: #1890ff;
}

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid #e0e0e0;
  margin-top: auto;
}

.new-project-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: #1890ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.new-project-btn:hover {
  background: #40a9ff;
}

.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 10000;
  min-width: 120px;
  padding: 4px 0;
}

.context-menu-items {
  display: flex;
  flex-direction: column;
}

.context-menu-item {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

.context-menu-item .shortcut {
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.context-menu-separator {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}
</style>
