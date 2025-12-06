<template>
  <div class="toolbar">
    <!-- 故障树工具栏 -->
    <template v-if="activeTab === 'fault-tree'">
      <div class="tool-group">
        <div class="group-title">编辑</div>
        <div class="tools">
          <div
            class="tool"
            @click="$emit('tool-select', 'new-fault-tree')"
            title="新建故障树"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div
            class="tool"
            @click="$emit('tool-select', 'delete-fault-tree')"
            title="删除故障树"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div
            class="tool"
            @click="$emit('tool-select', 'rename-fault-tree')"
            title="重命名故障树"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="4" y="4" width="12" height="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 8l4 4M8 12l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="7" cy="7" r="1" fill="currentColor"/>
              <circle cx="13" cy="13" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div
            class="tool"
            @click="$emit('tool-select', 'copy-fault-tree')"
            title="复制故障树"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="4" y="2" width="10" height="12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.7"/>
              <rect x="6" y="6" width="10" height="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <div
            class="tool"
            @click="$emit('tool-select', 'paste-fault-tree')"
            title="粘贴故障树"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="4" y="2" width="10" height="12" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.7"/>
              <rect x="6" y="6" width="10" height="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M12 14h2v2h-2z" fill="currentColor" opacity="0.5"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="tool-group">
        <div class="group-title">事件</div>
        <div class="tools">
          <div
            :class="['tool', { active: selectedTool === 'select' }]"
            @click="$emit('tool-select', 'select')"
            title="选择"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M3 3l5 5M17 3l-5 5M3 17l5-5M17 17l-5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="10" cy="10" r="2" fill="currentColor"/>
            </svg>
          </div>
          <div
            :class="['tool', { active: selectedTool === 'event-intermediate' }]"
            @click="$emit('tool-select', 'event-intermediate')"
            title="添加中间事件"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="6" y="2" width="8" height="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <line x1="10" y1="8" x2="10" y2="12" stroke="currentColor" stroke-width="1.5"/>
              <rect x="7" y="12" width="6" height="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <div
            :class="['tool', { active: selectedTool === 'event-basic' }]"
            @click="$emit('tool-select', 'event-basic')"
            title="底事件"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <div
            :class="['tool', { active: selectedTool === 'event-conditional' }]"
            @click="$emit('tool-select', 'event-conditional')"
            title="条件事件"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="4" y="6" width="12" height="8" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="tool-group">
        <div class="group-title">逻辑门</div>
        <div class="tools">
          <div
            :class="['tool', { active: selectedTool === 'gate-and' }]"
            @click="$emit('tool-select', 'gate-and')"
            title="与门"
          >
            <svg width="28" height="28" viewBox="0 0 20 20">
              <path d="M3 14 L17 14 L17 8 A 7 7 0 0 0 3 8 Z" stroke="currentColor" stroke-width="1" fill="none"/>
              <circle cx="10" cy="9" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <div
            :class="['tool', { active: selectedTool === 'gate-or' }]"
            @click="$emit('tool-select', 'gate-or')"
            title="或门"
          >
            <svg width="28" height="28" viewBox="0 0 20 20">
              <path d="M3 14 Q 3 9 10 5 Q 17 9 17 14 Q 10 11 3 14" stroke="currentColor" stroke-width="1" fill="none"/>
              <path d="M10 7v4M8 9h4" stroke="currentColor" stroke-width="1" />
            </svg>
          </div>
          <div
            :class="['tool', { active: selectedTool === 'gate-voter' }]"
            @click="$emit('tool-select', 'gate-voter')"
            title="表决门"
          >
            <svg width="28" height="28" viewBox="0 0 20 20">
              <path d="M3 14 L17 14 L17 8 A 7 7 0 0 0 3 8 Z" stroke="currentColor" stroke-width="1" fill="none"/>
              <text x="10" y="12" font-size="6" text-anchor="middle" fill="currentColor">r/N</text>
            </svg>
          </div>
        </div>
      </div>

      <div class="tool-group">
        <div class="group-title">操作</div>
        <div class="tools">
          <div
            class="tool"
            @click="$emit('tool-select', 'undo')"
            title="撤销"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M6 10 L2 6 L6 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 6h8a6 6 0 010 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <div
            class="tool"
            @click="$emit('tool-select', 'redo')"
            title="恢复"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M14 10 L18 6 L14 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 6h-8a6 6 0 000 12" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <div
            class="tool"
            @click="$emit('tool-select', 'fault-tree-info')"
            title="故障树信息"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M10 2L12 6h4l-3 3 1 4-4-3-4 3 1-4-3-3h4z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <circle cx="10" cy="15" r="2" fill="currentColor"/>
            </svg>
          </div>
          <div
            :class="['tool', { active: selectedTool === 'connection' }]"
            @click="$emit('tool-select', 'connection')"
            title="连线"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M4 16 L16 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <circle cx="4" cy="16" r="2" fill="currentColor"/>
              <circle cx="16" cy="4" r="2" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </div>
    </template>

    <!-- 分析工具栏 -->
    <template v-else-if="activeTab === 'analysis'">
      <div class="tool-group">
        <div class="group-title">计算</div>
        <div class="tools">
          <div class="tool" title="割集分析" @click="$emit('tool-select', 'analyze-cutsets')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="2" width="6" height="4"/>
              <rect x="10" y="2" width="6" height="4"/>
              <path d="M5 6v4M15 6v4M8 10h4M10 10v4" stroke="currentColor" stroke-width="1.5"/>
              <rect x="8" y="14" width="4" height="4"/>
            </svg>
          </div>
          <div class="tool" title="定量分析" @click="$emit('tool-select', 'quantitative-analysis')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="3" y="12" width="3" height="6"/>
              <rect x="7" y="8" width="3" height="10"/>
              <rect x="11" y="4" width="3" height="14"/>
            </svg>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  activeTab: {
    type: String,
    default: 'fault-tree'
  },
  selectedTool: {
    type: String,
    default: 'select'
  }
})

defineEmits(['tool-select'])
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
  flex-wrap: wrap;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.tools {
  display: flex;
  gap: 4px;
  align-items: center;
}

.tool {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  color: #333;
  transition: all 0.2s;
}

.tool:hover {
  background: #f0f0f0;
}

.tool.active {
  background: #1890ff;
  color: #fff;
}

.tool-select {
  height: 32px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
  color: #333;
}

.tool-select:hover {
  border-color: #1890ff;
}

.color-swatch {
  border: 1px solid #ddd;
  cursor: pointer;
}

.color-swatch:hover {
  border-color: #1890ff;
  transform: scale(1.1);
}
</style>

