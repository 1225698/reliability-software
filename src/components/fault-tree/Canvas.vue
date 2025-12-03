<template>
  <div class="canvas-container" ref="containerRef" @click="handleCanvasClick" @mousemove="handleMouseMove" @mouseup="handleMouseUp">
    <svg 
      class="canvas-svg" 
      :width="canvasWidth" 
      :height="canvasHeight"
      @contextmenu.prevent
    >
      <!-- 连接线 -->
      <g class="connections">
        <ConnectionLine
          v-for="conn in connections"
          :key="conn.id"
          :connection="conn"
          :nodes="nodes"
        />
      </g>
      
      <!-- 节点 -->
      <g class="nodes">
        <FaultTreeNode
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :selected="selectedNodeId === node.id"
          :class="{ 'connection-source': quickConnectionSource?.id === node.id }"
          @mousedown="handleNodeMouseDown(node, $event)"
          @dblclick="handleNodeDoubleClick(node)"
          @connection-start="handleConnectionStart(node, $event)"
          @update="updateNode(node.id, $event)"
        />
      </g>
      
      <!-- 快速连接模式提示 -->
      <text
        v-if="quickConnectionMode"
        x="10"
        y="30"
        font-size="14"
        fill="#1890ff"
        font-weight="bold"
      >
        点击另一个节点以建立连接，或按 ESC 取消
      </text>
      
      <!-- 临时连接线（正在绘制时） -->
      <line
        v-if="drawingConnection"
        :x1="drawingConnection.fromX"
        :y1="drawingConnection.fromY"
        :x2="drawingConnection.toX"
        :y2="drawingConnection.toY"
        stroke="#1890ff"
        stroke-width="2"
        stroke-dasharray="5,5"
      />
      
      <!-- 箭头标记定义 -->
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#666" />
        </marker>
      </defs>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import FaultTreeNode from './FaultTreeNode.vue'
import ConnectionLine from './ConnectionLine.vue'

const props = defineProps({
  selectedTool: String,
  nodes: Array,
  connections: Array
})

const emit = defineEmits(['add-node', 'update-node', 'delete-node', 'add-connection', 'delete-connection', 'edit-node'])

const containerRef = ref(null)
const canvasWidth = ref(3000)  // 增加画布宽度以支持更多节点
const canvasHeight = ref(2500) // 增加画布高度以支持深层故障树
const selectedNodeId = ref(null)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const drawingConnection = ref(null)
const connectionStartNode = ref(null)
const quickConnectionMode = ref(false) // 快速连接模式
const quickConnectionSource = ref(null) // 快速连接的源节点

let nodeIdCounter = 1
let connectionIdCounter = 1

// 初始化计数器：根据已有节点和连接的最大ID来设置
const initializeCounters = () => {
  // 从已有节点中找到最大的ID
  if (props.nodes && props.nodes.length > 0) {
    const nodeIds = props.nodes.map(n => {
      if (n.id && typeof n.id === 'string') {
        const match = n.id.match(/node-(\d+)/)
        return match ? parseInt(match[1]) : 0
      }
      return 0
    }).filter(id => id > 0)

    if (nodeIds.length > 0) {
      nodeIdCounter = Math.max(...nodeIds) + 1
    }
  }

  // 从已有连接中找到最大的ID
  if (props.connections && props.connections.length > 0) {
    const connIds = props.connections.map(c => {
      if (c.id && typeof c.id === 'string') {
        const match = c.id.match(/conn-(\d+)/)
        return match ? parseInt(match[1]) : 0
      }
      return 0
    }).filter(id => id > 0)

    if (connIds.length > 0) {
      connectionIdCounter = Math.max(...connIds) + 1
    }
  }
}

onMounted(() => {
  initializeCounters()
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  window.removeEventListener('keydown', handleKeyDown)
})

// 监听节点和连接的变化，重新初始化计数器（例如切换故障树时）
watch(() => [props.nodes, props.connections], () => {
  initializeCounters()
}, { deep: false, immediate: false })

const updateCanvasSize = () => {
  if (containerRef.value) {
    canvasWidth.value = containerRef.value.clientWidth
    canvasHeight.value = containerRef.value.clientHeight
  }
}

const handleCanvasClick = (e) => {
  // 如果点击在节点或连接点上，不要添加新节点
  if (e.target.closest('.node') ||
      e.target.classList.contains('connection-point-hitarea') ||
      e.target.closest('.connection-point-wrapper')) {
    return
  }

  if (props.selectedTool === 'select') {
    selectedNodeId.value = null
    return
  }

  // 添加新节点
  if ((props.selectedTool && props.selectedTool.startsWith('event-')) ||
      (props.selectedTool && props.selectedTool.startsWith('gate-')) ||
      props.selectedTool === 'event-intermediate' ||
      props.selectedTool === 'event-basic' ||
      props.selectedTool === 'event-undeveloped' ||
      props.selectedTool === 'event-conditional') {
    const rect = containerRef.value.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top

    // 映射新的工具名称到节点类型
    const nodeType = mapToolToNodeType(props.selectedTool)

    // 如果是条件事件且有选中的节点，将条件事件放在选中节点的左侧
    if (nodeType === 'event-oval' && selectedNodeId.value) {
      const selectedNode = props.nodes.find(n => n.id === selectedNodeId.value)
      if (selectedNode) {
        // 将条件事件放在选中节点的左侧，垂直居中对齐
        x = selectedNode.x - 150 // 左侧偏移150px
        y = selectedNode.y + (selectedNode.height / 2) - 25 // 垂直居中
      }
    }

    const node = {
      id: `node-${nodeIdCounter++}`,
      type: nodeType,
      x: x - 50,
      y: y - 25,
      width: 100,
      height: 50,
      label: getNodeLabel(nodeType)
    }

    emit('add-node', node)
    // 不自动选中新创建的节点，避免误删除
    // selectedNodeId.value = node.id
  }
}

const handleConnectionStart = (node, e) => {
  e.stopPropagation()
  e.preventDefault()
  connectionStartNode.value = node
  const rect = containerRef.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  // 条件事件从右侧中间连接
  if (node.type === 'event-oval') {
    drawingConnection.value = {
      fromX: node.x + node.width,
      fromY: node.y + node.height / 2,
      toX: mouseX,
      toY: mouseY
    }
  } else {
    // 其他节点从底部中间连接
    // 转移门的连接点位置特殊
    const connectionY = node.type === 'gate-transfer' ? node.y + node.height - 4 : node.y + node.height
    drawingConnection.value = {
      fromX: node.x + node.width / 2,
      fromY: connectionY,
      toX: mouseX,
      toY: mouseY
    }
  }

  // 阻止节点拖放
  isDragging.value = false
}

const handleNodeMouseDown = (node, e) => {
  // 如果点击了连接点区域，不处理节点拖放
  if (e.target.classList && (e.target.classList.contains('connection-point-hitarea') ||
      e.target.closest('.connection-point-wrapper'))) {
    return
  }

  e.stopPropagation()

  // 快速连接模式
  if (quickConnectionMode.value && quickConnectionSource.value) {
    // 点击第二个节点，建立连接
    if (node.id !== quickConnectionSource.value.id) {
      // 检查是否是底事件（底事件下面不能有节点）
      if (quickConnectionSource.value.type === 'event-circle') {
        alert('底事件下面不能有节点！')
        quickConnectionMode.value = false
        quickConnectionSource.value = null
        return
      }

      // 检查连接是否已存在
      const exists = props.connections.some(conn =>
        conn.from === quickConnectionSource.value.id && conn.to === node.id
      )

      if (!exists) {
        const connection = {
          id: `conn-${connectionIdCounter++}`,
          from: quickConnectionSource.value.id,
          to: node.id
        }
        emit('add-connection', connection)
      }
    }
    // 退出快速连接模式
    quickConnectionMode.value = false
    quickConnectionSource.value = null
    return
  }

  if (props.selectedTool === 'select' || !props.selectedTool || props.selectedTool === '') {
    selectedNodeId.value = node.id

    // 检测是否按下了Ctrl键启动快速连接模式
    if (e.ctrlKey) {
      quickConnectionMode.value = true
      quickConnectionSource.value = node
      return
    }

    isDragging.value = true
    const rect = containerRef.value.getBoundingClientRect()
    dragOffset.value = {
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    }
  } else if (props.selectedTool === 'delete') {
    emit('delete-node', node.id)
    selectedNodeId.value = null
  } else if (props.selectedTool === 'gate-and' || props.selectedTool === 'gate-or') {
    // 如果选择的是与门或或门，且点击的是中间事件，直接给中间事件设置逻辑门
    if (node.type === 'event-rect') {
      emit('update-node', node.id, { logicGate: props.selectedTool })
      selectedNodeId.value = node.id
      // 不启动快速连接模式，避免产生多余的连接线
    } else {
      // 如果不是中间事件，不做任何操作（不启动快速连接）
      selectedNodeId.value = node.id
    }
  } else if (props.selectedTool.startsWith('event-') ||
             (props.selectedTool.startsWith('gate-') &&
              props.selectedTool !== 'gate-and' &&
              props.selectedTool !== 'gate-or') ||
             props.selectedTool === 'event-intermediate' ||
             props.selectedTool === 'event-basic' ||
             props.selectedTool === 'event-undeveloped' ||
             props.selectedTool === 'event-conditional') {
    // 在添加节点模式下，点击节点也可以启动快速连接
    quickConnectionMode.value = true
    quickConnectionSource.value = node
    selectedNodeId.value = node.id
  }
}

const handleMouseMove = (e) => {
  if (drawingConnection.value) {
    // 优先处理连接绘制
    const rect = containerRef.value.getBoundingClientRect()
    drawingConnection.value.toX = e.clientX - rect.left
    drawingConnection.value.toY = e.clientY - rect.top
    return
  }
  
  if (isDragging.value && selectedNodeId.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const node = props.nodes.find(n => n.id === selectedNodeId.value)
    if (node) {
      emit('update-node', selectedNodeId.value, {
        x: e.clientX - rect.left - dragOffset.value.x,
        y: e.clientY - rect.top - dragOffset.value.y
      })
    }
  }
}

const handleMouseUp = (e) => {
  // 优先处理连接完成
  if (drawingConnection.value && connectionStartNode.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 查找是否释放到了节点的顶部区域
    const targetNode = props.nodes.find(node => {
      const topY = node.y
      const centerX = node.x + node.width / 2
      const nodeWidth = node.width
      // 检查是否在节点顶部区域内
      return x >= centerX - nodeWidth / 2 && 
             x <= centerX + nodeWidth / 2 && 
             y >= topY - 15 && 
             y <= topY + 15 &&
             node.id !== connectionStartNode.value.id
    })
    
    if (targetNode) {
      // 检查是否是底事件（底事件下面不能有节点）
      if (connectionStartNode.value.type === 'event-circle') {
        alert('底事件下面不能有节点！')
        drawingConnection.value = null
        connectionStartNode.value = null
        return
      }
      
      // 检查连接是否已存在
      const exists = props.connections.some(conn => 
        conn.from === connectionStartNode.value.id && conn.to === targetNode.id
      )
      
      if (!exists) {
        const connection = {
          id: `conn-${connectionIdCounter++}`,
          from: connectionStartNode.value.id,
          to: targetNode.id
        }
        emit('add-connection', connection)
      }
    }
    
    drawingConnection.value = null
    connectionStartNode.value = null
    return
  }
  
  if (isDragging.value) {
    isDragging.value = false
  }
}

const handleKeyDown = (e) => {
  // ESC键取消快速连接模式
  if (e.key === 'Escape' && quickConnectionMode.value) {
    quickConnectionMode.value = false
    quickConnectionSource.value = null
    return
  }
  
  // 只处理Delete键删除节点，其他快捷键由App.vue处理
  if (e.key === 'Delete' && selectedNodeId.value && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    // 确保不在输入框中
    const target = e.target
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
      emit('delete-node', selectedNodeId.value)
      selectedNodeId.value = null
    }
  }
}

const updateNode = (id, updates) => {
  emit('update-node', id, updates)
}

const handleNodeDoubleClick = (node) => {
  // 如果是选择模式，打开编辑对话框
  if (props.selectedTool === 'select' || !props.selectedTool || props.selectedTool === '') {
    emit('edit-node', node)
    return
  }
  
  // 如果选中了事件或逻辑门工具，自动创建并连接子节点
  if (props.selectedTool.startsWith('event-') || 
      props.selectedTool.startsWith('gate-') ||
      props.selectedTool === 'event-intermediate' ||
      props.selectedTool === 'event-basic' ||
      props.selectedTool === 'event-undeveloped' ||
      props.selectedTool === 'event-conditional') {
    
    // 检查是否是底事件（底事件下面不能有节点）
    if (node.type === 'event-circle') {
      alert('底事件下面不能有节点！')
      return
    }
    
    // 映射工具到节点类型
    const nodeType = mapToolToNodeType(props.selectedTool)
    
    let newNode
    let connection
    
    // 特殊处理条件事件：放在旁边而不是下方
    if (nodeType === 'event-oval' || props.selectedTool === 'event-conditional') {
      // 条件事件：放在顶事件旁边
      const horizontalSpacing = 150  // 水平间距
      
      // 检查左侧和右侧是否有空间
      const leftX = node.x - horizontalSpacing - 100  // 100是节点宽度
      const rightX = node.x + node.width + horizontalSpacing
      
      // 默认放在右侧，如果右侧有冲突则放在左侧
      let newX = rightX
      
      // 检查右侧是否有其他节点
      const rightConflict = props.nodes.some(otherNode => 
        otherNode.id !== node.id &&
        otherNode.x >= rightX - 50 && 
        otherNode.x <= rightX + 150 &&
        Math.abs(otherNode.y - node.y) < 100
      )
      
      if (rightConflict) {
        newX = leftX
      }
      
      newNode = {
        id: `node-${nodeIdCounter++}`,
        type: nodeType,
        x: newX,
        y: node.y,  // 与顶事件同一水平线
        width: 100,
        height: 50,
        label: getNodeLabel(nodeType)
      }
      
      // 对于条件事件，连接到顶事件的侧面而不是下方
      connection = {
        id: `conn-${connectionIdCounter++}`,
        from: newNode.id,  // 条件事件作为源
        to: node.id        // 连接到顶事件
      }
    } else {
      // 其他事件类型：放在下方（原有逻辑）
      // 找出该节点已有的子节点
      const existingChildren = props.connections.filter(conn => conn.from === node.id)
      const childNodes = existingChildren.map(conn => 
        props.nodes.find(n => n.id === conn.to)
      ).filter(n => n !== undefined)
      
      // 水平间距和垂直间距
      const childSpacing = 130       // 同一父节点的子节点间距
      const verticalOffset = 120     // 垂直间距
      
      let newX = node.x
      
      if (childNodes.length === 0) {
        // 第一个子节点：放在父节点正下方
        newX = node.x
      } else {
        // 有子节点时，新节点放在最右边的子节点右侧
        const sortedChildren = [...childNodes].sort((a, b) => a.x - b.x)
        const rightmostChild = sortedChildren[sortedChildren.length - 1]
        newX = rightmostChild.x + childSpacing
      }
      
      newNode = {
        id: `node-${nodeIdCounter++}`,
        type: nodeType,
        x: newX,
        y: node.y + node.height + verticalOffset,
        width: 100,
        height: 50,
        label: getNodeLabel(nodeType)
      }
      
      // 创建连接（常规事件连接到父节点下方）
      connection = {
        id: `conn-${connectionIdCounter++}`,
        from: node.id,      // 父节点作为源
        to: newNode.id      // 连接到新节点
      }
    }
    
    // 添加节点
    emit('add-node', newNode)

    // 创建连接
    emit('add-connection', connection)

    // 不自动选中新创建的节点，避免误删除
    // selectedNodeId.value = newNode.id
  }
}

const mapToolToNodeType = (tool) => {
  const mapping = {
    'event-intermediate': 'event-rect', // 中间事件使用矩形
    'event-basic': 'event-circle', // 底事件使用圆形
    'event-undeveloped': 'event-diamond', // 未探明事件使用菱形
    'event-conditional': 'event-oval', // 条件事件使用椭圆
  }
  return mapping[tool] || tool
}

const getNodeLabel = (type) => {
  // 如果是底事件或条件事件，自动生成 X1, X2, X3... 的名称
  if (type === 'event-circle' || type === 'event-oval') {
    // 计算当前已有的底事件和条件事件总数量
    const existingEvents = props.nodes.filter(n =>
      n.type === 'event-circle' || n.type === 'event-oval'
    )
    const nextNumber = existingEvents.length + 1
    return `X${nextNumber}`
  }

  const labels = {
    'event-rect': '中间事件',
    'event-circle': '底事件',
    'event-diamond': '未探明事件',
    'event-oval': '条件事件',
    'gate-and': '与门',
    'gate-or': '或门',
    
  }
  return labels[type] || '节点'
}
</script>

<style scoped>
.canvas-container {
  flex: 1;
  overflow: auto;
  background: #fff;
  position: relative;
  cursor: default;
  min-height: 0; /* 重要：允许flex子项正确收缩和滚动 */
  /* 添加网格背景，更容易看出滚动位置 */
  background-image: 
    linear-gradient(to right, #f0f0f0 1px, transparent 1px),
    linear-gradient(to bottom, #f0f0f0 1px, transparent 1px);
  background-size: 20px 20px;
}

/* 自定义滚动条样式 */
.canvas-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.canvas-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.canvas-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 6px;
}

.canvas-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.canvas-svg {
  display: block;
  background: transparent;
  min-width: 100%;
  min-height: 100%;
}
</style>
