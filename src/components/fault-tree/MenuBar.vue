<template>
  <div class="menu-bar">
    <div class="menu-items">
      <div 
        v-for="menu in menus" 
        :key="menu.key"
        :class="['menu-item', { 
          active: menu.key === 'file' ? showFileMenu : activeTab === menu.key 
        }]"
        @click="handleMenuClick(menu.key)"
        @mouseenter="handleMenuHover(menu.key)"
        @mouseleave="handleMenuLeave"
      >
        {{ menu.label }}
        <!-- 文件菜单下拉 -->
        <div 
          v-if="menu.key === 'file' && showFileMenu" 
          class="dropdown-menu"
          @mouseenter="clearMenuTimeout"
          @mouseleave="handleMenuLeave"
        >
          <div 
            class="dropdown-item" 
            @click.stop="handleMenuItem('new')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 2v12M2 8h12"/>
            </svg>
            <span>新建 (N)</span>
          </div>
          <div 
            class="dropdown-item" 
            @click.stop="handleMenuItem('open')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 3h5l1 2h6v8H2V3z"/>
            </svg>
            <span>打开 (O)</span>
          </div>
          <div 
            class="dropdown-item" 
            @click.stop="handleMenuItem('save')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="10" height="11" rx="1"/>
              <path d="M6 3v4h4V3"/>
            </svg>
            <span>保存 (S)</span>
          </div>
          <div 
            class="dropdown-item" 
            @click.stop="handleMenuItem('save-as')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="10" height="11" rx="1"/>
              <path d="M6 3v4h4V3"/>
              <path d="M11 10l2 2m0-2l-2 2"/>
            </svg>
            <span>另存为 (A)</span>
          </div>
          <div 
            class="dropdown-item" 
            @click.stop="handleMenuItem('save-all')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="10" height="11" rx="1"/>
              <path d="M6 3v4h4V3"/>
              <rect x="1" y="1" width="10" height="11" rx="1" opacity="0.5"/>
              <path d="M4 1v4h4V1" opacity="0.5"/>
            </svg>
            <span>全部保存</span>
          </div>
          <div 
            class="dropdown-item" 
            @click.stop="handleMenuItem('close-all')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="12" height="12" rx="1"/>
              <path d="M5 5l6 6M11 5l-6 6"/>
            </svg>
            <span>全部关闭 (C)</span>
          </div>
          <div class="dropdown-separator"></div>
          <div 
            class="dropdown-item exit" 
            @click.stop="handleMenuItem('exit')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="8" cy="8" r="6"/>
              <path d="M8 4v8M4 8h8"/>
            </svg>
            <span>退出 (X)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'fault-tree'
  }
})

const emit = defineEmits(['tab-change', 'menu-item-selected'])

const menus = [
  { key: 'file', label: '文件' },
  { key: 'fault-tree', label: '故障树' },
  { key: 'analysis', label: '分析' }
]

const showFileMenu = ref(false)
let menuTimeout = null

const clearMenuTimeout = () => {
  clearTimeout(menuTimeout)
}

const handleMenuClick = (key) => {
  if (key === 'file') {
    showFileMenu.value = !showFileMenu.value
  } else {
    emit('tab-change', key)
    showFileMenu.value = false
  }
}

const handleMenuHover = (key) => {
  clearMenuTimeout()
  if (key === 'file') {
    showFileMenu.value = true
  }
}

const handleMenuLeave = () => {
  menuTimeout = setTimeout(() => {
    showFileMenu.value = false
  }, 200)
}

const handleMenuItem = (item) => {
  emit('menu-item-selected', item)
  showFileMenu.value = false
}
</script>

<style scoped>
.menu-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 36px;
  background: #f0f0f0;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 10px;
  -webkit-app-region: drag;
}

.menu-items {
  display: flex;
  gap: 0;
  -webkit-app-region: no-drag;
}

.menu-item {
  position: relative;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  color: #333;
  font-size: 14px;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #e0e0e0;
}

.menu-item.active {
  background: #4a90e2;
  color: #fff;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 1000;
  padding: 4px 0;
  border-radius: 2px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  cursor: pointer;
  color: #333;
  font-size: 14px;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: #e6f7ff;
  color: #1890ff;
}

.dropdown-item svg {
  flex-shrink: 0;
  stroke: currentColor;
}

.dropdown-item.exit {
  color: #333;
}

.dropdown-item.exit svg {
  stroke: #e74c3c;
}

.dropdown-item.exit:hover {
  background: #ffe6e6;
  color: #e74c3c;
}

.dropdown-separator {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}
</style>

