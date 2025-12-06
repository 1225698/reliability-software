<template>
  <g 
    :class="['node', { selected }]"
    :transform="`translate(${node.x}, ${node.y})`"
    @mousedown="$emit('mousedown', $event)"
    @dblclick="$emit('dblclick')"
  >
    <!-- 中间事件（顶事件） -->
    <g v-if="node.type === 'event-rect'">
      <!-- 主矩形 -->
      <rect
        x="0"
        y="0"
        :width="node.width"
        :height="node.height"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 3 : 2"
        rx="2"
      />
      <text
        :x="node.width / 2"
        :y="node.height / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="12"
        fill="#333"
      >
        {{ node.label }}
      </text>
      
      <!-- 下方逻辑门图形 -->
      <g v-if="node.logicGate && node.logicGate !== ''" :transform="`translate(${node.width / 2}, ${node.height + 24})`">
        <!-- AND门图形 -->
        <g v-if="node.logicGate === 'gate-and'">
          <path
            d="M -15 8 L 15 8 L 15 -2 A 15 10 0 0 0 -15 -2 Z"
            :fill="selected ? '#e6f7ff' : '#fff'"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <!-- 中心点 -->
          <circle 
            cx="0" 
            cy="-2" 
            r="2" 
            :fill="selected ? '#1890ff' : '#333'" 
          />
          <line
            x1="0" y1="-12" x2="0" y2="-24"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <line
            x1="0" y1="8" x2="0" y2="15"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
        </g>
        
        <!-- OR门图形 -->
        <g v-else-if="node.logicGate === 'gate-or'">
          <path
            d="M -15 8 Q -15 -2 0 -8 Q 15 -2 15 8 Q 0 3 -15 8"
            :fill="selected ? '#e6f7ff' : '#fff'"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <!-- 中心加号 -->
          <line 
            x1="0" y1="-5" x2="0" y2="1" 
            :stroke="selected ? '#1890ff' : '#333'" 
            :stroke-width="1.5" 
          />
          <line 
            x1="-3" y1="-2" x2="3" y2="-2" 
            :stroke="selected ? '#1890ff' : '#333'" 
            :stroke-width="1.5" 
          />
          <line
            x1="0" y1="-24" x2="0" y2="-8"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <line
            x1="0" y1="8" x2="0" y2="15"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
        </g>

        <!-- 表决门图形 -->
        <g v-else-if="node.logicGate === 'gate-voter'">
          <path
            d="M -15 8 L 15 8 L 15 -2 A 15 10 0 0 0 -15 -2 Z"
            :fill="selected ? '#e6f7ff' : '#fff'"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <line
            x1="0" y1="-12" x2="0" y2="-24"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <line
            x1="0" y1="8" x2="0" y2="15"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <text
            x="0"
            y="2"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="10"
            fill="#333"
          >
            {{ node.voterR ? node.voterR + '/N' : 'r/N' }}
          </text>
        </g>
        
        <!-- 其他逻辑门显示小圆圈标记 -->
        <g v-else>
          <line
            x1="0" y1="-24" x2="0" y2="-8"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <circle
            cx="0"
            cy="0"
            r="8"
            :fill="selected ? '#e6f7ff' : '#fff'"
            :stroke="selected ? '#1890ff' : '#333'"
            :stroke-width="1.5"
          />
          <text
            x="0"
            y="1"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="8"
            fill="#333"
          >
            {{ getGateSymbol(node.logicGate) }}
          </text>
        </g>
      </g>
    </g>
    
    <!-- 底事件 (圆形) -->
    <g v-else-if="node.type === 'event-circle'">
      <!-- 顶部连接线 -->
      <line
        :x1="node.width / 2"
        y1="0"
        :x2="node.width / 2"
        :y2="10"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 2 : 1.5"
      />
      <!-- 圆形 -->
      <circle
        :cx="node.width / 2"
        :cy="30"
        r="20"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 3 : 2"
      />
      <text
        :x="node.width / 2"
        :y="30"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="12"
        fill="#333"
      >
        {{ node.label }}
      </text>
    </g>
    
    <!-- 菱形事件 -->
    <g v-else-if="node.type === 'event-diamond'">
      <path
        :d="`M ${node.width / 2} 2 L ${node.width - 2} ${node.height / 2} L ${node.width / 2} ${node.height - 2} L 2 ${node.height / 2} Z`"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 3 : 2"
      />
      <text
        :x="node.width / 2"
        :y="node.height / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="11"
        fill="#333"
      >
        {{ node.label }}
      </text>
    </g>
    
    <!-- 椭圆形事件（条件事件） -->
    <g v-else-if="node.type === 'event-oval'">
      <ellipse
        :cx="node.width / 2"
        :cy="node.height / 2"
        :rx="node.width / 2 - 2"
        :ry="node.height / 2 - 2"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 3 : 2"
      />
      <text
        :x="node.width / 2"
        :y="node.height / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="11"
        fill="#333"
      >
        {{ node.label }}
      </text>

      <!-- 右侧中间连接点（用于条件事件连接） -->
      <g class="connection-point-wrapper-right" @mousedown.stop="handleConnectionPointClick($event)">
        <circle
          :cx="node.width"
          :cy="node.height / 2"
          r="12"
          fill="transparent"
          class="connection-point-hitarea"
        />
        <circle
          :cx="node.width"
          :cy="node.height / 2"
          r="4"
          :fill="selected ? '#1890ff' : '#999'"
          :opacity="selected ? 1 : 0.6"
          class="connection-point-indicator"
        />
      </g>
    </g>

    <!-- 表决门 (Standalone) -->
    <g v-else-if="node.type === 'gate-voter'">
      <path
        :d="`M ${node.width / 2 - 15} 8 L ${node.width / 2 + 15} 8 L ${node.width / 2 + 15} -2 A 15 10 0 0 0 ${node.width / 2 - 15} -2 Z`"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 2 : 1.5"
        :transform="`translate(0, ${node.height / 2})`"
      />
      <line
        :x1="node.width / 2" :y1="node.height / 2 - 12" :x2="node.width / 2" :y2="node.height / 2 - 20"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 2 : 1.5"
      />
      <line
        :x1="node.width / 2" :y1="node.height / 2 + 8" :x2="node.width / 2" :y2="node.height / 2 + 20"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 2 : 1.5"
      />
      <text
        :x="node.width / 2"
        :y="node.height / 2 + 2"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="10"
        fill="#333"
      >
        {{ node.voterR ? node.voterR + '/N' : 'r/N' }}
      </text>
      
      <!-- 连接点 -->
      <g class="connection-point-wrapper" @mousedown.stop="handleConnectionPointClick($event)">
        <circle
          :cx="node.width / 2"
          :cy="node.height"
          r="12"
          fill="transparent"
          class="connection-point-hitarea"
        />
        <circle
          :cx="node.width / 2"
          :cy="node.height"
          r="4"
          :fill="selected ? '#1890ff' : '#999'"
          :opacity="selected ? 1 : 0.6"
          class="connection-point-indicator"
        />
      </g>
    </g>
    
    <!-- 各类逻辑门（AND, OR, XOR, Inhibit, NOT, Voter, Priority-AND, Transfer） -->
    <!-- 省略中间门类型代码（与你原始一致，无需改动） -->
    
    <!-- 转移门 -->
    <g v-else-if="node.type === 'gate-transfer'">
      <rect x="8" y="4" :width="node.width - 16" :height="12"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 2 : 1.5"
      />
      <line :x1="node.width / 2" :y1="16" :x2="node.width / 2" :y2="24"
        :stroke="selected ? '#1890ff' : '#333'" :stroke-width="selected ? 2 : 1.5"
      />
      <path :d="`M ${node.width / 2 - 8} 24 Q ${node.width / 2} 24 ${node.width / 2} 32 Q ${node.width / 2} 24 ${node.width / 2 + 8} 24`"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 2 : 1.5"
      />
      <circle :cx="node.width / 2 + 6" :cy="28" r="2" fill="#333" />
      <line :x1="node.width / 2" :y1="32" :x2="node.width / 2" :y2="36"
        :stroke="selected ? '#1890ff' : '#333'" :stroke-width="selected ? 2 : 1.5"
      />
      <rect :x="node.width / 2 - 6" y="36" width="12" height="8"
        :fill="selected ? '#e6f7ff' : '#fff'"
        :stroke="selected ? '#1890ff' : '#333'"
        :stroke-width="selected ? 2 : 1.5"
      />
      <text :x="node.width / 2" :y="node.height + 15" text-anchor="middle" font-size="11" fill="#333">
        {{ node.label }}
      </text>
    </g>
    
    <!-- 连接点（底部，用于输出连接） -->
    <g class="connection-point-wrapper" @mousedown.stop="handleConnectionPointClick($event)">
      <circle
        :cx="node.width / 2"
        :cy="node.type === 'gate-transfer' ? node.height - 4 : node.height"
        r="12"
        fill="transparent"
        class="connection-point-hitarea"
      />
      <circle
        :cx="node.width / 2"
        :cy="node.type === 'gate-transfer' ? node.height - 4 : node.height"
        r="4"
        :fill="selected ? '#1890ff' : '#999'"
        :opacity="selected ? 1 : 0.6"
        class="connection-point-indicator"
      />
    </g>
  </g>
</template>

<script setup>
const props = defineProps({
  node: Object,
  selected: Boolean
})

const emit = defineEmits(['mousedown', 'dblclick', 'update', 'connection-start'])

const handleConnectionPointClick = (e) => {
  emit('connection-start', e)
}

const getGateSymbol = (gateType) => {
  const symbols = {
    'gate-and': '&',
    'gate-or': '≥1',
    'gate-not': '¬',
    'gate-xor': '⊕',
    'gate-voter': 'r/N',
    'gate-priority-and': '→&',
    'gate-inhibit': '⊗',
    'gate-transfer': '→'
  }
  return symbols[gateType] || '?'
}
</script>

<style scoped>
.node {
  cursor: move;
}

.connection-point-wrapper,
.connection-point-wrapper-right {
  pointer-events: all;
  cursor: crosshair;
}

.connection-point-hitarea {
  pointer-events: all;
}

.connection-point-wrapper:hover .connection-point-indicator,
.connection-point-wrapper-right:hover .connection-point-indicator {
  r: 6;
  opacity: 1 !important;
  fill: #1890ff !important;
}

.connection-point-indicator {
  pointer-events: none;
  transition: all 0.2s;
}
</style>