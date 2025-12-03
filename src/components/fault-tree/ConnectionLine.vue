<template>
  <g v-if="fromNode && toNode">
    <!-- 所有连接线都使用横平竖直的路径 -->
    <polyline
      :points="getOrthogonalPath()"
      stroke="#333"
      stroke-width="2"
      fill="none"
    />

    <!-- 起点连接点 -->
    <circle
      :cx="getStartX()"
      :cy="getStartY()"
      r="3"
      fill="#333"
    />

    <!-- 终点连接点 -->
    <circle
      :cx="toNode.x + toNode.width / 2"
      :cy="getToY(toNode)"
      r="3"
      fill="#333"
    />
  </g>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  connection: Object,
  nodes: Array
})

const fromNode = computed(() => {
  return props.nodes.find(n => n.id === props.connection.from)
})

const toNode = computed(() => {
  return props.nodes.find(n => n.id === props.connection.to)
})

const getFromY = (node) => {
  // 如果中间事件有逻辑门，连接线从逻辑门底部开始
  if (node.type === 'event-rect' && node.logicGate && node.logicGate !== '') {
    return node.y + node.height + 20  // 逻辑门图形高度约20px
  }
  
  // 转移门的连接点位置特殊
  if (node.type === 'gate-transfer') {
    return node.y + node.height - 4
  }
  
  return node.y + node.height
}

const getToY = (node) => {
  // 中间事件（顶事件）的顶部有小矩形，连接点在小矩形顶部
  if (node.type === 'event-rect') {
    return node.y
  }
  // 其他类型节点连接到顶部
  return node.y
}

// 获取起点X坐标
const getStartX = () => {
  if (!fromNode.value) return 0

  // 条件事件从右侧中间连接
  if (fromNode.value.type === 'event-oval') {
    return fromNode.value.x + fromNode.value.width
  }

  // 其他节点从底部中间连接
  return fromNode.value.x + fromNode.value.width / 2
}

// 获取起点Y坐标
const getStartY = () => {
  if (!fromNode.value) return 0

  // 条件事件从右侧中间连接
  if (fromNode.value.type === 'event-oval') {
    return fromNode.value.y + fromNode.value.height / 2
  }

  // 其他节点从底部连接
  return getFromY(fromNode.value)
}

// 检查线段是否与节点相交
const lineIntersectsNode = (x1, y1, x2, y2, node) => {
  // 忽略起点和终点节点
  if (node.id === fromNode.value.id || node.id === toNode.value.id) {
    return false
  }

  // 扩展节点边界，增加一些边距
  const margin = 10
  const nodeLeft = node.x - margin
  const nodeRight = node.x + node.width + margin
  const nodeTop = node.y - margin
  const nodeBottom = node.y + node.height + margin

  // 检查水平线段
  if (Math.abs(y1 - y2) < 1) {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const y = y1

    // 线段在节点的垂直范围内
    if (y > nodeTop && y < nodeBottom) {
      // 线段与节点的水平范围有重叠
      if (maxX > nodeLeft && minX < nodeRight) {
        return true
      }
    }
  }

  // 检查垂直线段
  if (Math.abs(x1 - x2) < 1) {
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    const x = x1

    // 线段在节点的水平范围内
    if (x > nodeLeft && x < nodeRight) {
      // 线段与节点的垂直范围有重叠
      if (maxY > nodeTop && minY < nodeBottom) {
        return true
      }
    }
  }

  return false
}

// 检查路径是否与其他节点相交
const pathIntersectsNodes = (points) => {
  if (!props.nodes) return false

  // 将点字符串转换为坐标数组
  const coords = points.split(' ').map(p => {
    const [x, y] = p.split(',').map(Number)
    return { x, y }
  })

  // 检查每条线段
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]
    const p2 = coords[i + 1]

    for (const node of props.nodes) {
      if (lineIntersectsNode(p1.x, p1.y, p2.x, p2.y, node)) {
        return true
      }
    }
  }

  return false
}

// 获取同一父节点的所有子节点
const getSiblingNodes = () => {
  if (!fromNode.value || !props.nodes) return []

  // 找出所有从同一父节点连接出来的子节点
  const siblings = props.nodes.filter(node => {
    // 检查是否有从fromNode到该节点的连接
    return props.nodes.some(n => {
      const conn = props.connection
      // 查找所有connections（需要从父组件传入）
      return false // 暂时返回false，后续优化
    })
  })

  return siblings
}

// 计算横平竖直的连接路径
const getOrthogonalPath = () => {
  if (!fromNode.value || !toNode.value) return ''

  const startX = getStartX()
  const startY = getStartY()
  const endX = toNode.value.x + toNode.value.width / 2
  const endY = getToY(toNode.value)

  // 条件事件的特殊路径（从右侧引出）
  if (fromNode.value.type === 'event-oval') {
    const horizontalExtend = 30 // 向右延伸的距离
    const midX = startX + horizontalExtend
    return `${startX},${startY} ${midX},${startY} ${midX},${endY} ${endX},${endY}`
  }

  // 普通节点的横平竖直路径
  // 如果起点和终点X坐标相同，直接垂直连接
  if (Math.abs(startX - endX) < 5) {
    return `${startX},${startY} ${endX},${endY}`
  }

  // 使用简单的三段式路径：垂直-水平-垂直
  // 第一段：从起点向下延伸一小段
  const verticalExtend = 30
  const midY1 = startY + verticalExtend

  // 第二段：水平移动到终点X坐标
  // 第三段：垂直下降到终点
  const simplePath = `${startX},${startY} ${startX},${midY1} ${endX},${midY1} ${endX},${endY}`

  return simplePath
}
</script>

<style scoped>
line,
polyline {
  pointer-events: stroke;
  cursor: pointer;
}
</style>