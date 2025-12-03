<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog-container">
      <div class="dialog-header">
        <span class="dialog-title">故障树信息</span>
        <div class="dialog-controls">
          <button class="dialog-control-btn minimize">−</button>
          <button class="dialog-control-btn maximize">□</button>
          <button class="dialog-control-btn close" @click="handleCancel">×</button>
        </div>
      </div>

      <!-- 标签页 -->
      <div class="dialog-tabs">
        <div
          :class="['tab', { active: activeTab === 'event-info' }]"
          @click="activeTab = 'event-info'"
        >
          事件信息
        </div>
        <div
          :class="['tab', { active: activeTab === 'transfer-diagram' }]"
          @click="activeTab = 'transfer-diagram'"
        >
          故障树转移图
        </div>
      </div>

      <div class="dialog-body">
        <!-- 事件信息标签页 -->
        <div v-if="activeTab === 'event-info'" class="tab-content">
          <table class="event-table">
            <thead>
              <tr>
                <th style="width: 50px;">序号</th>
                <th style="width: 150px;">事件名称</th>
                <th style="width: 120px;">类型</th>
                <th style="width: 120px;">概率</th>
                <th style="width: 200px;">描述</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(event, index) in eventList"
                :key="event.id"
                :class="{ selected: selectedEventIndex === index }"
                @click="selectedEventIndex = index"
              >
                <td>{{ index + 1 }}</td>
                <td>{{ event.label }}</td>
                <td>{{ event.typeName }}</td>
                <td>{{ event.probability || '' }}</td>
                <td>{{ event.description || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 故障树转移图标签页 -->
        <div v-if="activeTab === 'transfer-diagram'" class="tab-content transfer-diagram">
          <div class="diagram-toolbar">
            <button class="toolbar-btn" @click="zoomIn" title="放大">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M7 4v6M4 7h6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M11 11l4 4" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="toolbar-btn" @click="zoomOut" title="缩小">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M4 7h6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M11 11l4 4" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="toolbar-btn" @click="resetZoom" title="重置">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1"/>
              </svg>
            </button>
            <button class="toolbar-btn save-btn" @click="saveDiagram" title="保存故障树图片">
              保存故障树图片
            </button>
          </div>

          <div class="diagram-container" ref="diagramContainer">
            <svg
              :width="diagramWidth"
              :height="diagramHeight"
              :viewBox="`0 0 ${diagramWidth} ${diagramHeight}`"
              class="diagram-svg"
              :style="{ transform: `scale(${zoomLevel})` }"
            >
              <!-- 这里渲染故障树的缩略图 -->
              <g v-for="node in nodes" :key="node.id">
                <FaultTreeNode :node="node" :selected="false" />
              </g>
              <g v-for="connection in connections" :key="`${connection.from}-${connection.to}`">
                <ConnectionLine :connection="connection" :nodes="nodes" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import FaultTreeNode from './FaultTreeNode.vue'
import ConnectionLine from './ConnectionLine.vue'

const props = defineProps({
  visible: Boolean,
  nodes: Array,
  connections: Array,
  faultTreeName: String
})

const emit = defineEmits(['update:visible', 'close'])

const activeTab = ref('event-info')
const selectedEventIndex = ref(null)
const zoomLevel = ref(1)
const diagramContainer = ref(null)

// 计算事件列表
const eventList = computed(() => {
  if (!props.nodes) return []

  return props.nodes
    .filter(node => node.type && node.type.startsWith('event-'))
    .map(node => ({
      id: node.id,
      label: node.label,
      typeName: getEventTypeName(node.type, node.logicGate),
      probability: node.probability || node.conditionProbability || '',
      description: node.description || ''
    }))
})

// 计算图表尺寸
const diagramWidth = computed(() => {
  if (!props.nodes || props.nodes.length === 0) return 800
  const maxX = Math.max(...props.nodes.map(n => n.x + n.width))
  return Math.max(800, maxX + 100)
})

const diagramHeight = computed(() => {
  if (!props.nodes || props.nodes.length === 0) return 600
  const maxY = Math.max(...props.nodes.map(n => n.y + n.height))
  return Math.max(600, maxY + 100)
})

// 获取事件类型名称
const getEventTypeName = (type, logicGate) => {
  const typeNames = {
    'event-rect': '中间事件',
    'event-circle': '底事件',
    'event-diamond': '未探明事件',
    'event-oval': '条件事件'
  }

  const gateNames = {
    'gate-and': '与门',
    'gate-or': '或门',
   
  }

  // 如果是中间事件且有逻辑门，显示逻辑门类型
  if (type === 'event-rect' && logicGate && gateNames[logicGate]) {
    return gateNames[logicGate]
  }

  return typeNames[type] || '未知'
}

// 缩放控制
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3)
}

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.1)
}

const resetZoom = () => {
  zoomLevel.value = 1
}

// 保存故障树图片为 PNG
const saveDiagram = () => {
  const svg = diagramContainer.value?.querySelector('svg')
  if (!svg) {
    alert('无法获取故障树图形')
    return
  }

  // 创建一个新的 SVG 元素用于导出
  const svgClone = svg.cloneNode(true)
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // 移除 transform 样式（缩放），使用原始大小
  svgClone.style.transform = 'none'

  // 获取 SVG 的尺寸
  const width = diagramWidth.value
  const height = diagramHeight.value

  // 将 SVG 转换为 Data URL
  const svgData = new XMLSerializer().serializeToString(svgClone)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  // 创建一个 Image 对象
  const img = new Image()
  img.onload = () => {
    // 创建 Canvas
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')

    // 设置白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 绘制图片到 Canvas
    ctx.drawImage(img, 0, 0, width, height)

    // 将 Canvas 转换为 PNG Blob
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('图片生成失败')
        return
      }

      // 创建下载链接
      const pngUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `${props.faultTreeName || '故障树'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(pngUrl)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  img.onerror = () => {
    alert('图片加载失败')
    URL.revokeObjectURL(url)
  }

  img.src = url
}

const handleCancel = () => {
  emit('update:visible', false)
  emit('close')
}

// 重置状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    activeTab.value = 'event-info'
    selectedEventIndex.value = null
    zoomLevel.value = 1
  }
})


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
  z-index: 1000;
}

.dialog-container {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.dialog-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.dialog-controls {
  display: flex;
  gap: 8px;
}

.dialog-control-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.dialog-control-btn:hover {
  background: #e0e0e0;
}

.dialog-control-btn.close:hover {
  background: #ff4d4f;
  color: #fff;
}

.dialog-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.tab {
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #666;
  font-size: 13px;
  transition: all 0.2s;
}

.tab:hover {
  color: #1890ff;
}

.tab.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
  background: #fff;
}

.dialog-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

/* 事件信息表格样式 */
.event-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.event-table thead {
  background: #f5f5f5;
  position: sticky;
  top: 0;
  z-index: 1;
}

.event-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 500;
  color: #333;
  border: 1px solid #e0e0e0;
}

.event-table td {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  color: #666;
}

.event-table tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}

.event-table tbody tr:hover {
  background: #f5f5f5;
}

.event-table tbody tr.selected {
  background: #e6f7ff;
}

/* 故障树转移图样式 */
.transfer-diagram {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.diagram-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  align-items: center;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.toolbar-btn.save-btn {
  width: auto;
  padding: 0 16px;
  margin-left: auto;
  font-size: 13px;
}

.diagram-container {
  flex: 1;
  overflow: auto;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.diagram-svg {
  background: #fff;
  border: 1px solid #e0e0e0;
  transform-origin: center center;
  transition: transform 0.2s;
}
</style>

