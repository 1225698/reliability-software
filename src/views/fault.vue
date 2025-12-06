<template>
  <div class="app-container">
    <MenuBar
      :active-tab="activeTab"
      @tab-change="handleTabChange"
      @menu-item-selected="handleMenuItem" />
    <Toolbar
      :active-tab="activeTab"
      :selected-tool="selectedTool"
      @tool-select="handleToolSelect" />
    <div class="fault-main-content">
      <div class="canvas-wrapper">
        <div class="workspace-body">
          <Sidebar
            :projects="projects"
            :current-project-id="currentProjectId"
            :current-fault-tree-id="currentFaultTreeId"
            :analysis-items="analysisTreeItems"
            @create-project="createNewProject"
            @create-fault-tree="createNewFaultTree"
            @switch-fault-tree="switchFaultTree"
            @delete-project="deleteProject"
            @delete-fault-tree="deleteFaultTree"
            @rename-project="renameProject"
            @rename-fault-tree="renameFaultTree"
            @select-analysis="handleSelectAnalysis"
            @edit-analysis="handleEditAnalysis"
            @delete-analysis="handleDeleteAnalysis"
            @show-analysis-result="handleShowAnalysisResult"
            @copy-analysis="handleCopyAnalysis"
            @paste-analysis="handlePasteAnalysis"
          />
          <div class="canvas-area">
            <div v-if="currentFaultTree" class="canvas-header">
              <span class="canvas-title">{{ currentFaultTree.name }}</span>
            </div>
            <!-- 故障树画布（故障树标签页和分析标签页都显示） -->
            <Canvas
              v-if="(activeTab === 'fault-tree' || activeTab === 'analysis') && currentFaultTree"
              :key="currentFaultTreeId || 'empty'"
              :selected-tool="selectedTool"
              :nodes="nodes"
              :connections="connections"
              @add-node="addNode"
              @update-node="updateNode"
              @delete-node="deleteNode"
              @add-connection="addConnection"
              @delete-connection="deleteConnection"
              @edit-node="handleEditNode" />

            <!-- 没有故障树时的提示 -->
            <div v-else-if="(activeTab === 'fault-tree' || activeTab === 'analysis') && !currentFaultTree" class="empty-canvas">
              <div class="empty-message">
                <p>{{ activeTab === 'analysis' ? '请先创建或打开故障树' : '没有打开的故障树' }}</p>
                <button @click="createNewProject" class="create-btn">新建项目</button>
              </div>
            </div>

            <!-- 其他标签页 -->
            <div v-else class="empty-canvas">
              <p>{{ getEmptyMessage() }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 事件编辑对话框 -->
    <EventEditDialog
      v-model:visible="editDialogVisible"
      :node-data="editingNode"
      @confirm="handleEditConfirm"
    />

    <!-- 割集分析对话框 -->
    <CutSetAnalysisDialog
      v-model:visible="analysisDialogVisible"
      :analysis-result="analysisResult"
      :analysis-type="currentAnalysisType"
      @show-chart="handleShowChart"
      @show-structural-importance="handleShowStructuralImportance"
    />

    <!-- 定性分析图表对话框 -->
    <QualitativeChartDialog
      v-model:visible="chartDialogVisible"
      :analysis-result="analysisResult"
    />

    <!-- 定性分析配置对话框 -->
    <AnalysisConfigDialog
      v-model:visible="analysisConfigDialogVisible"
      :fault-tree-name="currentFaultTree?.name"
      :analysis-count="currentFaultTreeAnalysisCount"
      :nodes="nodes"
      @analyze="handleAnalyzeExecute"
      @confirm="handleAnalysisConfigConfirm"
    />

    <!-- 定量分析配置对话框 -->
    <QuantitativeAnalysisDialog
      v-model:visible="quantitativeAnalysisDialogVisible"
      :fault-tree-name="currentFaultTree?.name"
      :analysis-count="currentFaultTreeAnalysisCount"
      :nodes="nodes"
      @analyze="handleQuantitativeAnalyzeExecute"
      @confirm="handleQuantitativeAnalysisConfigConfirm"
    />

    <!-- 结构重要度分析对话框 -->
    <StructuralImportanceDialog
      v-model:visible="structuralImportanceDialogVisible"
      :analysis-result="analysisResult"
    />

    <!-- 故障树信息对话框 -->
    <FaultTreeInfoDialog
      v-model:visible="faultTreeInfoDialogVisible"
      :nodes="nodes"
      :connections="connections"
      :fault-tree-name="currentFaultTree?.name"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import MenuBar from '@/components/fault-tree/MenuBar.vue'
import Toolbar from '@/components/fault-tree/Toolbar.vue'
import Sidebar from '@/components/fault-tree/Sidebar.vue'
import Canvas from '@/components/fault-tree/Canvas.vue'
import EventEditDialog from '@/components/fault-tree/EventEditDialog.vue'
import CutSetAnalysisDialog from '@/components/fault-tree/CutSetAnalysisDialog.vue'
import QualitativeChartDialog from '@/components/fault-tree/QualitativeChartDialog.vue'
import AnalysisConfigDialog from '@/components/fault-tree/AnalysisConfigDialog.vue'
import StructuralImportanceDialog from '@/components/fault-tree/StructuralImportanceDialog.vue'
import QuantitativeAnalysisDialog from '@/components/fault-tree/QuantitativeAnalysisDialog.vue'
import FaultTreeInfoDialog from '@/components/fault-tree/FaultTreeInfoDialog.vue'
import FaultTreeAnalyzer from '@/composables/FaultTreeAnalyzer.js'

defineOptions({ name: 'FaultTreeWorkspace' })

const activeTab = ref('fault-tree')
const selectedTool = ref('select')

// 编辑对话框状态
const editDialogVisible = ref(false)
const editingNode = ref(null)

// 分析对话框状态
const analysisConfigDialogVisible = ref(false)
const quantitativeAnalysisDialogVisible = ref(false)
const analysisDialogVisible = ref(false)
const chartDialogVisible = ref(false)
const structuralImportanceDialogVisible = ref(false)
const faultTreeInfoDialogVisible = ref(false)
const analysisResult = ref(null)
const analysisTreeItems = ref([]) // 分析树列表
const currentAnalysisType = ref('qualitative') // 当前分析类型：'qualitative' 或 'quantitative'
const copiedFaultTree = ref(null) // 复制的故障树数据

// 项目数据模型
let projectIdCounter = 1
let faultTreeIdCounter = 1
let analysisIdCounter = 1

const projects = ref([])
const currentProjectId = ref(null)
const currentFaultTreeId = ref(null)

// 历史记录管理（撤销/恢复）
const history = ref([]) // 历史记录栈
const historyIndex = ref(-1) // 当前历史记录索引

// 当前故障树的数据
const currentFaultTree = computed(() => {
  if (!currentProjectId.value || !currentFaultTreeId.value) return null
  const project = projects.value.find(p => p.id === currentProjectId.value)
  if (!project) return null
  return project.faultTrees.find(ft => ft.id === currentFaultTreeId.value)
})

// 当前故障树的节点和连接（直接引用，不使用computed setter）
const nodes = computed(() => {
  return currentFaultTree.value?.nodes || []
})

const connections = computed(() => {
  return currentFaultTree.value?.connections || []
})

// 获取当前故障树的分析数量（用于生成默认名称）
const currentFaultTreeAnalysisCount = computed(() => {
  if (!currentFaultTreeId.value) return 1
  const count = analysisTreeItems.value.filter(item => item.faultTreeId === currentFaultTreeId.value).length
  return count + 1
})

const handleTabChange = (tab) => {
  activeTab.value = tab
  // 切换标签时的工具选择处理
  if (tab === 'fault-tree' || tab === 'analysis') {
    // 故障树和分析标签页都保持选择工具
    selectedTool.value = 'select'
  } else {
    // 其他标签页清空工具选择
    selectedTool.value = ''
  }
}

// 历史记录管理函数
const saveHistory = () => {
  if (!currentFaultTree.value) return

  // 创建当前状态的深拷贝
  const state = {
    nodes: JSON.parse(JSON.stringify(currentFaultTree.value.nodes)),
    connections: JSON.parse(JSON.stringify(currentFaultTree.value.connections))
  }

  // 如果当前不在历史记录的末尾，删除后面的记录
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  // 添加新的历史记录
  history.value.push(state)
  historyIndex.value = history.value.length - 1

  // 限制历史记录数量（最多保存50条）
  if (history.value.length > 50) {
    history.value.shift()
    historyIndex.value--
  }
}

// 撤销操作
const undo = () => {
  if (!currentFaultTree.value) {
    alert('没有打开的故障树')
    return
  }

  if (historyIndex.value <= 0) {
    alert('没有可撤销的操作')
    return
  }

  historyIndex.value--
  const state = history.value[historyIndex.value]

  // 恢复状态
  currentFaultTree.value.nodes = JSON.parse(JSON.stringify(state.nodes))
  currentFaultTree.value.connections = JSON.parse(JSON.stringify(state.connections))
}

// 恢复操作
const redo = () => {
  if (!currentFaultTree.value) {
    alert('没有打开的故障树')
    return
  }

  if (historyIndex.value >= history.value.length - 1) {
    alert('没有可恢复的操作')
    return
  }

  historyIndex.value++
  const state = history.value[historyIndex.value]

  // 恢复状态
  currentFaultTree.value.nodes = JSON.parse(JSON.stringify(state.nodes))
  currentFaultTree.value.connections = JSON.parse(JSON.stringify(state.connections))
}

const handleToolSelect = (tool) => {
  console.log('handleToolSelect 被调用，tool:', tool)
  // 处理不需要切换选中状态的工具
  switch (tool) {
    case 'new-fault-tree':
      // 新建故障树
      createNewFaultTree()
      selectedTool.value = 'select'
      break
    case 'delete-fault-tree':
      // 删除故障树
      if (currentProjectId.value && currentFaultTreeId.value) {
        deleteFaultTree(currentProjectId.value, currentFaultTreeId.value)
      } else {
        alert('没有选中的故障树')
      }
      selectedTool.value = 'select'
      break
    case 'rename-fault-tree':
      // 重命名故障树
      if (currentProjectId.value && currentFaultTreeId.value) {
        renameFaultTree(currentProjectId.value, currentFaultTreeId.value)
      } else {
        alert('没有选中的故障树')
      }
      selectedTool.value = 'select'
      break
    case 'copy-fault-tree':
      // 复制故障树
      copyFaultTree()
      selectedTool.value = 'select'
      break
    case 'paste-fault-tree':
      // 粘贴故障树
      pasteFaultTree()
      selectedTool.value = 'select'
      break
    case 'undo':
      // 撤销
      undo()
      selectedTool.value = 'select'
      break
    case 'redo':
      // 恢复
      redo()
      selectedTool.value = 'select'
      break
    case 'add-comment':
      // 添加注释
      console.log('添加注释')
      // TODO: 实现添加注释逻辑
      selectedTool.value = 'select'
      break
    case 'auto-layout':
      // 自动布局状态（切换状态）
      selectedTool.value = selectedTool.value === 'auto-layout' ? 'select' : 'auto-layout'
      if (selectedTool.value === 'auto-layout') {
        console.log('启用自动布局')
        // TODO: 实现自动布局逻辑
      } else {
        console.log('禁用自动布局')
      }
      break
    case 'copy-image':
      // 复制故障树图片到剪切板
      console.log('复制图片到剪切板')
      // TODO: 实现复制图片逻辑
      selectedTool.value = 'select'
      break
    case 'fault-tree-info':
      // 故障树信息
      console.log('显示故障树信息')
      faultTreeInfoDialogVisible.value = true
      selectedTool.value = 'select'
      break
    case 'analyze-cutsets':
      // 打开分析配置对话框
      handleOpenAnalysisConfig()
      selectedTool.value = 'select'
      break
    case 'quantitative-analysis':
      // 打开定量分析配置对话框
      quantitativeAnalysisDialogVisible.value = true
      selectedTool.value = 'select'
      break
    default:
      // 其他工具（选择、事件、逻辑门等）直接设置
      selectedTool.value = tool
      break
  }
}

// 新建项目
const createNewProject = () => {
  const projectName = prompt('请输入项目名称：', `项目${projectIdCounter}`)
  if (!projectName || !projectName.trim()) return

  const newProject = {
    id: `project-${projectIdCounter++}`,
    name: projectName.trim(),
    faultTrees: [],
    createdAt: new Date().toISOString()
  }

  projects.value.push(newProject)
  currentProjectId.value = newProject.id

  // 询问是否立即创建故障树
  if (confirm('是否立即创建故障树？')) {
    createNewFaultTree(newProject.id)
  }
}

// 新建故障树
const createNewFaultTree = (projectId = null) => {
  const pid = projectId || currentProjectId.value
  if (!pid) {
    // 如果没有项目，先创建项目
    const projectName = prompt('请输入项目名称：', `项目${projectIdCounter}`)
    if (!projectName || !projectName.trim()) return

    const newProject = {
      id: `project-${projectIdCounter++}`,
      name: projectName.trim(),
      faultTrees: [],
      createdAt: new Date().toISOString()
    }

    projects.value.push(newProject)
    currentProjectId.value = newProject.id

    // 继续创建故障树
    const faultTreeName = prompt('请输入故障树名称：', `故障树${faultTreeIdCounter}`)
    if (!faultTreeName || !faultTreeName.trim()) return

    const newFaultTree = {
      id: `faulttree-${faultTreeIdCounter++}`,
      name: faultTreeName.trim(),
      nodes: [],
      connections: [],
      createdAt: new Date().toISOString()
    }

    newProject.faultTrees.push(newFaultTree)
    currentFaultTreeId.value = newFaultTree.id
    return
  }

  const project = projects.value.find(p => p.id === pid)
  if (!project) return

  const faultTreeName = prompt('请输入故障树名称：', `故障树${faultTreeIdCounter}`)
  if (!faultTreeName || !faultTreeName.trim()) return

  const newFaultTree = {
    id: `faulttree-${faultTreeIdCounter++}`,
    name: faultTreeName.trim(),
    nodes: [],
    connections: [],
    createdAt: new Date().toISOString()
  }

  project.faultTrees.push(newFaultTree)
  currentProjectId.value = pid
  currentFaultTreeId.value = newFaultTree.id
}

// 删除项目
const deleteProject = (projectId) => {
  const project = projects.value.find(p => p.id === projectId)
  if (!project) return

  if (confirm(`确定要删除项目"${project.name}"吗？此操作将删除项目中的所有故障树。`)) {
    const index = projects.value.findIndex(p => p.id === projectId)
    projects.value.splice(index, 1)

    if (currentProjectId.value === projectId) {
      currentProjectId.value = projects.value.length > 0 ? projects.value[0].id : null
      if (currentProjectId.value) {
        const firstProject = projects.value.find(p => p.id === currentProjectId.value)
        currentFaultTreeId.value = firstProject.faultTrees.length > 0
          ? firstProject.faultTrees[0].id
          : null
      } else {
        currentFaultTreeId.value = null
      }
    }
  }
}

// 删除故障树
const deleteFaultTree = (projectId, faultTreeId) => {
  const project = projects.value.find(p => p.id === projectId)
  if (!project) return

  const faultTree = project.faultTrees.find(ft => ft.id === faultTreeId)
  if (!faultTree) return

  if (confirm(`确定要删除故障树"${faultTree.name}"吗？`)) {
    const index = project.faultTrees.findIndex(ft => ft.id === faultTreeId)
    project.faultTrees.splice(index, 1)

    if (currentFaultTreeId.value === faultTreeId) {
      if (project.faultTrees.length > 0) {
        currentFaultTreeId.value = project.faultTrees[0].id
      } else {
        currentFaultTreeId.value = null
      }
    }
  }
}

// 重命名项目
const renameProject = (projectId) => {
  const project = projects.value.find(p => p.id === projectId)
  if (!project) return

  const newName = prompt('请输入新的项目名称：', project.name)
  if (newName && newName.trim()) {
    project.name = newName.trim()
  }
}

// 重命名故障树
const renameFaultTree = (projectId, faultTreeId) => {
  const project = projects.value.find(p => p.id === projectId)
  if (!project) return

  const faultTree = project.faultTrees.find(ft => ft.id === faultTreeId)
  if (!faultTree) return

  const newName = prompt('请输入新的故障树名称：', faultTree.name)
  if (newName && newName.trim()) {
    faultTree.name = newName.trim()
  }
}

// 复制故障树
const copyFaultTree = () => {
  if (!currentFaultTree.value) {
    alert('没有打开的故障树')
    return
  }

  // 深拷贝当前故障树的节点和连接
  copiedFaultTree.value = {
    nodes: JSON.parse(JSON.stringify(currentFaultTree.value.nodes)),
    connections: JSON.parse(JSON.stringify(currentFaultTree.value.connections)),
    name: currentFaultTree.value.name
  }

  alert(`已复制故障树"${currentFaultTree.value.name}"`)
}

// 粘贴故障树
const pasteFaultTree = () => {
  if (!copiedFaultTree.value) {
    alert('没有可粘贴的故障树')
    return
  }

  if (!currentProjectId.value) {
    alert('请先选择或创建一个项目')
    return
  }

  const project = projects.value.find(p => p.id === currentProjectId.value)
  if (!project) return

  // 生成新的故障树名称
  const baseName = copiedFaultTree.value.name
  let newName = `${baseName} - 副本`
  let counter = 1

  // 检查名称是否已存在，如果存在则添加数字后缀
  while (project.faultTrees.some(ft => ft.name === newName)) {
    counter++
    newName = `${baseName} - 副本${counter}`
  }

  // 创建新的故障树
  const newFaultTree = {
    id: `faulttree-${faultTreeIdCounter++}`,
    name: newName,
    nodes: JSON.parse(JSON.stringify(copiedFaultTree.value.nodes)),
    connections: JSON.parse(JSON.stringify(copiedFaultTree.value.connections)),
    createdAt: new Date().toISOString()
  }

  // 添加到项目中
  project.faultTrees.push(newFaultTree)

  // 切换到新创建的故障树
  currentFaultTreeId.value = newFaultTree.id

  alert(`已粘贴故障树"${newName}"`)
}

// 切换故障树
const switchFaultTree = (projectId, faultTreeId) => {
  currentProjectId.value = projectId
  currentFaultTreeId.value = faultTreeId

  // 重置历史记录
  history.value = []
  historyIndex.value = -1

  // 保存初始状态
  if (currentFaultTree.value) {
    saveHistory()
  }
}

const handleMenuItem = (item) => {
  console.log('Menu item selected:', item)
  switch (item) {
    case 'new':
      // 新建项目
      createNewProject()
      break
    case 'open':
      // 打开文件
      openProject()
      break
    case 'save':
      // 保存文件
      saveProject()
      break
    case 'save-as':
      // 另存为
      saveProjectAs()
      break
    case 'save-all':
      // 全部保存
      saveAllProjects()
      break
    case 'close-all':
      // 全部关闭
      if (confirm('确定要关闭所有项目吗？')) {
        projects.value = []
        currentProjectId.value = null
        currentFaultTreeId.value = null
      }
      break
    case 'exit':
      // 退出
      if (confirm('确定要退出吗？')) {
        window.close()
      }
      break
  }
}

// 打开项目
const openProject = () => {
  // 创建文件输入元素
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.fta'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)

        // 验证数据格式
        if (!data.projects || !Array.isArray(data.projects)) {
          alert('文件格式不正确')
          return
        }

        // 加载项目数据
        projects.value = data.projects

        // 重置计数器（找到最大的ID并加1）
        if (data.projects.length > 0) {
          const projectIds = data.projects.map(p => {
            if (p.id && typeof p.id === 'string') {
              const match = p.id.match(/project-(\d+)/)
              return match ? parseInt(match[1]) : 0
            }
            return 0
          }).filter(id => id > 0)

          if (projectIds.length > 0) {
            projectIdCounter = Math.max(...projectIds) + 1
          } else {
            projectIdCounter = data.projects.length + 1
          }

          const allFaultTrees = data.projects.flatMap(p => (p.faultTrees || []))
          if (allFaultTrees.length > 0) {
            const faultTreeIds = allFaultTrees.map(ft => {
              if (ft.id && typeof ft.id === 'string') {
                const match = ft.id.match(/faulttree-(\d+)/)
                return match ? parseInt(match[1]) : 0
              }
              return 0
            }).filter(id => id > 0)

            if (faultTreeIds.length > 0) {
              faultTreeIdCounter = Math.max(...faultTreeIds) + 1
            } else {
              faultTreeIdCounter = allFaultTrees.length + 1
            }
          }
        }

        // 确保每个项目都有faultTrees数组和必要的字段
        data.projects.forEach(project => {
          if (!project.faultTrees) {
            project.faultTrees = []
          }
          // 确保每个故障树都有nodes和connections
          project.faultTrees.forEach(ft => {
            if (!ft.nodes) ft.nodes = []
            if (!ft.connections) ft.connections = []
          })
        })

        // 切换到第一个项目的第一个故障树
        if (projects.value.length > 0) {
          const firstProject = projects.value[0]
          currentProjectId.value = firstProject.id
          if (firstProject.faultTrees && firstProject.faultTrees.length > 0) {
            currentFaultTreeId.value = firstProject.faultTrees[0].id
          } else {
            currentFaultTreeId.value = null
          }
        } else {
          currentProjectId.value = null
          currentFaultTreeId.value = null
        }

        console.log('项目加载成功，共加载', projects.value.length, '个项目')
      } catch (error) {
        console.error('加载文件失败:', error)
        alert(`文件加载失败：${error.message || '文件格式错误或文件已损坏'}`)
      }
    }
    reader.onerror = () => {
      alert('读取文件时发生错误')
    }
    reader.readAsText(file)
  }
  input.click()
}

// 保存项目数据为JSON
const exportProjectsToJSON = () => {
  const data = {
    version: '1.0.0',
    app: 'AutoFTA',
    exportDate: new Date().toISOString(),
    projects: projects.value.map(project => ({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt || new Date().toISOString(),
      faultTrees: (project.faultTrees || []).map(ft => ({
        id: ft.id,
        name: ft.name,
        createdAt: ft.createdAt || new Date().toISOString(),
        nodes: ft.nodes || [],
        connections: ft.connections || []
      }))
    }))
  }
  return JSON.stringify(data, null, 2)
}

// 下载文件
const downloadFile = (content, filename) => {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 保存项目
const saveProject = () => {
  if (!currentProjectId.value) {
    alert('没有打开的项目')
    return
  }

  const project = projects.value.find(p => p.id === currentProjectId.value)
  if (!project) {
    alert('项目不存在')
    return
  }

  // 只保存当前项目
  const data = {
    version: '1.0.0',
    app: 'AutoFTA',
    exportDate: new Date().toISOString(),
    projects: [{
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      faultTrees: project.faultTrees.map(ft => ({
        id: ft.id,
        name: ft.name,
        createdAt: ft.createdAt,
        nodes: ft.nodes || [],
        connections: ft.connections || []
      }))
    }]
  }

  const json = JSON.stringify(data, null, 2)
  const filename = `${project.name}.fta`
  downloadFile(json, filename)
}

// 另存为
const saveProjectAs = () => {
  if (!currentProjectId.value) {
    alert('没有打开的项目')
    return
  }

  const project = projects.value.find(p => p.id === currentProjectId.value)
  if (!project) {
    alert('项目不存在')
    return
  }

  const filename = prompt('请输入文件名（不含扩展名）：', project.name)
  if (!filename) return

  // 只保存当前项目
  const data = {
    version: '1.0.0',
    app: 'AutoFTA',
    exportDate: new Date().toISOString(),
    projects: [{
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      faultTrees: project.faultTrees.map(ft => ({
        id: ft.id,
        name: ft.name,
        createdAt: ft.createdAt,
        nodes: ft.nodes || [],
        connections: ft.connections || []
      }))
    }]
  }

  const json = JSON.stringify(data, null, 2)
  downloadFile(json, `${filename}.fta`)
}

// 保存所有项目
const saveAllProjects = () => {
  if (projects.value.length === 0) {
    alert('没有可保存的项目')
    return
  }

  const json = exportProjectsToJSON()
  const filename = `AutoFTA_Projects_${new Date().toISOString().split('T')[0]}.fta`
  downloadFile(json, filename)
}

const getEmptyMessage = () => {
  switch (activeTab.value) {
    case 'analysis':
      return '分析功能区域'
    case 'display':
      return '显示设置区域'
    default:
      return ''
  }
}

const addNode = (node) => {
  if (currentFaultTree.value) {
    currentFaultTree.value.nodes.push(node)
    saveHistory() // 保存历史记录
  }
}

const updateNode = (id, updates) => {
  if (!currentFaultTree.value) return
  const node = currentFaultTree.value.nodes.find(n => n.id === id)
  if (node) {
    Object.assign(node, updates)
    saveHistory() // 保存历史记录
  }
}

const deleteNode = (id) => {
  if (!currentFaultTree.value) return
  currentFaultTree.value.nodes = currentFaultTree.value.nodes.filter(n => n.id !== id)
  currentFaultTree.value.connections = currentFaultTree.value.connections.filter(
    c => c.from !== id && c.to !== id
  )
  saveHistory() // 保存历史记录
}

const addConnection = (connection) => {
  if (currentFaultTree.value) {
    currentFaultTree.value.connections.push(connection)
    saveHistory() // 保存历史记录
  }
}

const deleteConnection = (id) => {
  if (!currentFaultTree.value) return
  currentFaultTree.value.connections = currentFaultTree.value.connections.filter(c => c.id !== id)
  saveHistory() // 保存历史记录
}

const handleEditNode = (node) => {
  editingNode.value = { ...node }
  editDialogVisible.value = true
}

const handleEditConfirm = (formData) => {
  if (!currentFaultTree.value || !editingNode.value) return

  const node = currentFaultTree.value.nodes.find(n => n.id === editingNode.value.id)
  if (node) {
    // 如果类型发生变化，需要验证
    if (formData.type !== node.type) {
      // 如果要切换为底事件，检查是否有子节点
      if (formData.type === 'event-circle') {
        const hasChildren = currentFaultTree.value.connections.some(conn => conn.from === node.id)
        if (hasChildren) {
          alert('底事件下面不能有节点，请先删除子节点！')
          return
        }
      }

      node.type = formData.type
      // 更新节点标签
      node.label = getNodeLabel(formData.type)
    }

    // 更新节点属性
    node.label = formData.label
    node.description = formData.description
    node.voterR = formData.voterR
    node.logicGate = formData.logicGate  // 保存逻辑门类型

    // 如果是底事件，验证概率值
    if (node.type === 'event-circle' && formData.probability) {
      const prob = parseFloat(formData.probability)
      if (isNaN(prob) || prob < 0 || prob > 1) {
        alert('发生概率应位于[0,1]区间')
        return
      }
      node.probability = formData.probability
    } else {
      node.probability = formData.probability
    }

    // 如果是条件事件，保存条件概率
    if (node.type === 'event-oval') {
      if (formData.conditionProbability) {
        const prob = parseFloat(formData.conditionProbability)
        if (isNaN(prob) || prob < 0 || prob > 1) {
          alert('条件概率应位于[0,1]区间')
          return
        }
        node.conditionProbability = formData.conditionProbability
      } else {
        node.conditionProbability = formData.conditionProbability
      }
    }
  }

  editingNode.value = null
}

const getNodeLabel = (type) => {
  const labels = {
    'event-rect': '中间事件',
    'event-circle': '底事件',
    'event-diamond': '未探明事件',
    'event-oval': '条件事件',
    'gate-and': '与门',
    'gate-or': '或门',
    'gate-voter': '表决门',
  }
  return labels[type] || '节点'
}

// 打开分析配置对话框
const handleOpenAnalysisConfig = () => {
  console.log('打开分析配置对话框被调用')
  console.log('当前故障树:', currentFaultTree.value)
  console.log('节点数量:', nodes.value.length)

  if (!currentFaultTree.value) {
    alert('没有打开的故障树')
    return
  }

  if (nodes.value.length === 0) {
    alert('故障树为空，无法进行分析')
    return
  }

  console.log('准备打开对话框')
  analysisConfigDialogVisible.value = true
  console.log('对话框可见性:', analysisConfigDialogVisible.value)
}

// 确定分析配置（不执行分析，只关闭对话框）
const handleAnalysisConfigConfirm = (config) => {
  console.log('保存定性分析配置:', config)
  // 只关闭对话框，不执行分析
  analysisConfigDialogVisible.value = false
}

// 确定定量分析配置（不执行分析，只关闭对话框）
const handleQuantitativeAnalysisConfigConfirm = (config) => {
  console.log('保存定量分析配置:', config)
  // 只关闭对话框，不执行分析
  quantitativeAnalysisDialogVisible.value = false
}

// 执行定量分析
const handleQuantitativeAnalyzeExecute = (config) => {
  console.log('执行定量分析，配置:', config)

  if (!currentFaultTree.value) {
    alert('没有打开的故障树')
    return
  }

  if (nodes.value.length === 0) {
    alert('故障树为空，无法进行分析')
    return
  }

  // 创建分析器
  const analyzer = new FaultTreeAnalyzer(nodes.value, connections.value)

  // 执行分析
  try {
    const result = analyzer.getAnalysisResult()
    // 添加故障树名称到结果中
    result.faultTreeName = currentFaultTree.value.name
    analysisResult.value = result

    // 添加到分析树，关联到当前故障树
    const analysisItem = {
      id: `analysis-${analysisIdCounter++}`,
      name: config.name || `定量分析${analysisIdCounter - 1}`,
      type: 'quantitative',
      config: config,
      result: result,
      timestamp: new Date().toISOString(),
      faultTreeId: currentFaultTreeId.value  // 关联到故障树
    }

    analysisTreeItems.value.push(analysisItem)
    console.log('定量分析项已添加:', analysisItem)
    console.log('当前分析列表:', analysisTreeItems.value)

    // 关闭配置对话框
    quantitativeAnalysisDialogVisible.value = false

    // 设置当前分析类型为定量分析
    currentAnalysisType.value = 'quantitative'

    // 直接显示结果对话框
    analysisDialogVisible.value = true
  } catch (error) {
    console.error('定量分析失败:', error)
    alert('分析失败: ' + error.message)
  }
}

// 执行分析
const handleAnalyzeExecute = (config) => {
  console.log('执行分析，配置:', config)

  if (!currentFaultTree.value) {
    alert('没有打开的故障树')
    return
  }

  if (nodes.value.length === 0) {
    alert('故障树为空，无法进行分析')
    return
  }

  // 创建分析器
  const analyzer = new FaultTreeAnalyzer(nodes.value, connections.value)

  // 执行分析
  try {
    const result = analyzer.getAnalysisResult()
    // 添加故障树名称到结果中
    result.faultTreeName = currentFaultTree.value.name
    analysisResult.value = result

    // 添加到分析树，关联到当前故障树
    const analysisItem = {
      id: `analysis-${analysisIdCounter++}`,
      name: config.name || `定性分析${analysisIdCounter - 1}`,
      type: 'qualitative',
      config: config,
      result: result,
      timestamp: new Date().toISOString(),
      faultTreeId: currentFaultTreeId.value  // 关联到故障树
    }

    analysisTreeItems.value.push(analysisItem)
    console.log('分析项已添加:', analysisItem)
    console.log('当前分析列表:', analysisTreeItems.value)

    // 关闭配置对话框
    analysisConfigDialogVisible.value = false

    // 设置当前分析类型为定性分析（割集分析）
    currentAnalysisType.value = 'qualitative'

    // 直接显示结果对话框
    analysisDialogVisible.value = true
  } catch (error) {
    console.error('分析失败:', error)
    alert('分析失败: ' + error.message)
  }
}

// 割集分析（旧方法，保留兼容）
const handleAnalyzeCutSets = () => {
  handleAnalyzeExecute({ name: '定性分析', calculateMinimalCutSets: true })
}

// 显示图表
const handleShowChart = () => {
  chartDialogVisible.value = true
}

// 显示结构重要度分析
const handleShowStructuralImportance = () => {
  structuralImportanceDialogVisible.value = true
}

// 选择分析项
const handleSelectAnalysis = (analysisItem) => {
  console.log('选择分析项:', analysisItem)
  // 设置分析结果和类型
  analysisResult.value = analysisItem.result
  currentAnalysisType.value = analysisItem.type
  // 显示分析结果对话框
  analysisDialogVisible.value = true
  // 切换到分析标签页
  activeTab.value = 'analysis'
}

// 编辑分析项
const handleEditAnalysis = (analysisItem) => {
  console.log('编辑分析项:', analysisItem)
  // 根据分析类型打开对应的配置对话框
  if (analysisItem.type === 'quantitative') {
    quantitativeAnalysisDialogVisible.value = true
  } else {
    analysisConfigDialogVisible.value = true
  }
}

// 删除分析项
const handleDeleteAnalysis = (analysisItem) => {
  if (confirm(`确定要删除分析项"${analysisItem.name}"吗？`)) {
    const index = analysisTreeItems.value.findIndex(item => item.id === analysisItem.id)
    if (index !== -1) {
      analysisTreeItems.value.splice(index, 1)
    }
  }
}

// 显示分析结果
const handleShowAnalysisResult = (analysisItem) => {
  console.log('显示分析结果:', analysisItem)
  analysisResult.value = analysisItem.result
  analysisDialogVisible.value = true
}

// 复制分析
const handleCopyAnalysis = (analysisItem) => {
  console.log('复制分析:', analysisItem)
  // TODO: 实现复制功能
  alert('复制功能开发中')
}

// 粘贴分析
const handlePasteAnalysis = () => {
  console.log('粘贴分析')
  // TODO: 实现粘贴功能
  alert('粘贴功能开发中')
}

// 键盘快捷键支持
const handleKeyDown = (e) => {
  // 忽略在输入框中的快捷键
  const target = e.target
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }

  // Ctrl+N: 新建项目
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault()
    createNewProject()
    return
  }

  // Ctrl+O: 打开项目
  if (e.ctrlKey && e.key === 'o') {
    e.preventDefault()
    openProject()
    return
  }

  // Ctrl+S: 保存项目
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    if (e.shiftKey) {
      // Ctrl+Shift+S: 另存为
      saveProjectAs()
    } else {
      // Ctrl+S: 保存
      saveProject()
    }
    return
  }

  // Ctrl+W: 全部关闭
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault()
    if (confirm('确定要关闭所有项目吗？')) {
      projects.value = []
      currentProjectId.value = null
      currentFaultTreeId.value = null
    }
    return
  }

  // Ctrl+Q: 退出（在浏览器中通常无法真正退出，但可以提示）
  if (e.ctrlKey && e.key === 'q') {
    e.preventDefault()
    if (confirm('确定要退出吗？')) {
      window.close()
    }
    return
  }
}

// 监听键盘事件
const STORAGE_KEY = 'fault-tree-workspace-data'

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)

  // 加载保存的数据
  const savedData = localStorage.getItem(STORAGE_KEY)
  if (savedData) {
    try {
      const data = JSON.parse(savedData)
      if (data.projects && Array.isArray(data.projects)) {
        projects.value = data.projects

        // 更新计数器以避免ID冲突
        let maxPid = 0
        let maxFid = 0

        projects.value.forEach(p => {
          if (p.id) {
            const pidMatch = p.id.match(/project-(\d+)/)
            if (pidMatch) {
              const pid = parseInt(pidMatch[1])
              if (pid > maxPid) maxPid = pid
            }
          }

          if (p.faultTrees) {
            p.faultTrees.forEach(ft => {
              if (ft.id) {
                const fidMatch = ft.id.match(/ft-(\d+)/)
                if (fidMatch) {
                  const fid = parseInt(fidMatch[1])
                  if (fid > maxFid) maxFid = fid
                }
              }
            })
          }
        })

        projectIdCounter = maxPid + 1
        faultTreeIdCounter = maxFid + 1
      }

      if (data.currentProjectId) currentProjectId.value = data.currentProjectId
      if (data.currentFaultTreeId) currentFaultTreeId.value = data.currentFaultTreeId
      if (data.analysisTreeItems) analysisTreeItems.value = data.analysisTreeItems
    } catch (e) {
      console.error('Failed to load saved data', e)
    }
  }
})

// 自动保存数据
watch([projects, currentProjectId, currentFaultTreeId, analysisTreeItems], () => {
  const data = {
    projects: projects.value,
    currentProjectId: currentProjectId.value,
    currentFaultTreeId: currentFaultTreeId.value,
    analysisTreeItems: analysisTreeItems.value
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}, { deep: true })

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 64px);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.fault-main-content {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #ffffff;
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fcfcfc;
  min-height: 0;
}

.workspace-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.canvas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
}

.canvas-title {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.empty-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #94a3b8;
  font-size: 15px;
}

.empty-message {
  text-align: center;
}

.create-btn {
  margin-top: 16px;
  padding: 8px 18px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.35);
}
</style>

