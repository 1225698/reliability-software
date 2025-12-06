<template>
  <div
    ref="canvasEl"
    class="modeling-canvas"
    @mousemove="onCanvasMouseMove"
    @mouseup="onCanvasMouseUp"
    @mouseleave="onCanvasMouseUp"
    @mousedown="onCanvasMouseDown"
    @contextmenu.prevent="onCanvasContextMenu"
    @wheel.ctrl.prevent="handleWheel"
  >
    <div class="canvas-content" :style="{ transform: `scale(${zoomLevel})`, transformOrigin: '0 0' }">
    <!-- Connection Lines -->
    <svg class="connection-lines">
      <path
        v-for="(points, index) in connectionPaths"
        :key="index"
        :d="points"
        stroke="black"
        stroke-width="2"
        fill="none"
      />
    </svg>

    <!-- Group Overlay (虚线框) -->
    <div
      v-if="hoveredGroup"
      class="group-overlay"
      :style="{
        left: hoveredGroup.bbox.left + 'px',
        top: hoveredGroup.bbox.top + 'px',
        width: hoveredGroup.bbox.width + 'px',
        height: hoveredGroup.bbox.height + 'px'
      }"
      @mousedown.stop="onGroupMouseDown($event)"
      @contextmenu.prevent.stop="onGroupContextMenu($event)"
    ></div>

    <!-- Canvas Items -->
    <div
      v-for="item in items"
      :key="item.id"
      :style="item.style"
      :class="['canvas-item', item.modelType, { 'is-dragging': item.id === draggedItemId }]"
      @mousedown.stop="onItemMouseDown(item, $event)"
      @click.stop="onItemClick(item)"
      @contextmenu.prevent.stop="onItemContextMenu(item, $event)"
    >
      <!-- Redundancy Model -->
      <template v-if="item.modelType === 'redundancy'">
        <div class="redundancy-container" :style="{ width: getRedundancyLayout(item).totalWidth + 'px', height: getRedundancyLayout(item).height + 'px' }">
          <svg class="redundancy-svg" :style="{ width: getRedundancyLayout(item).totalWidth + 'px', height: getRedundancyLayout(item).height + 'px' }">
            <path :d="`M 0 ${getRedundancyLayout(item).baseCenterY} L ${getRedundancyLayout(item).entryLength} ${getRedundancyLayout(item).baseCenterY}`" fill="none" stroke="black" stroke-width="2"/>
            <template v-for="(cy,i) in getRedundancyLayout(item).branchCenters" :key="i">
              <path :d="`M ${getRedundancyLayout(item).entryLength} ${getRedundancyLayout(item).baseCenterY} L ${getRedundancyLayout(item).branchStartX} ${cy}`" fill="none" stroke="black" stroke-width="2" />
              <path :d="`M ${getRedundancyLayout(item).branchEndX} ${cy} L ${getRedundancyLayout(item).circleCenterX - getRedundancyLayout(item).circleRadius} ${getRedundancyLayout(item).baseCenterY}`" fill="none" stroke="black" stroke-width="2" />
            </template>
            <circle :cx="getRedundancyLayout(item).circleCenterX" :cy="getRedundancyLayout(item).baseCenterY" :r="getRedundancyLayout(item).circleRadius" fill="white" stroke="black" stroke-width="2"/>
            <text :x="getRedundancyLayout(item).circleCenterX" :y="getRedundancyLayout(item).baseCenterY + 5" text-anchor="middle" font-size="16">{{ item.k }}/{{ item.n }}</text>
            <line :x1="getRedundancyLayout(item).circleCenterX + getRedundancyLayout(item).circleRadius" :y1="getRedundancyLayout(item).baseCenterY" :x2="getRedundancyLayout(item).outputEndX" :y2="getRedundancyLayout(item).baseCenterY" stroke="black" stroke-width="2"/>
          </svg>
          <div class="redundancy-branches" :style="{ position: 'absolute', top: 0, left: getRedundancyLayout(item).branchStartX + 'px', width: getRedundancyLayout(item).branchWidth + 'px', height: '100%' }">
            <div
              v-for="(branch, index) in item.branches"
              :key="index"
              class="component-container"
              :data-item-id="item.id"
              :data-branch-index="index"
              :style="{
                position: 'absolute',
                top: getRedundancyLayout(item).branchTops[index] + 'px',
                height: getRedundancyLayout(item).branchHeight + 'px',
                width: getRedundancyLayout(item).branchWidth + 'px'
              }"
            >
              <div v-for="comp in branch.components" :key="comp.id" class="dropped-component">
                {{ comp.name }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Parallel Model (dynamic) -->
      <template v-else-if="item.modelType === 'parallel'">
        <div class="parallel-container" :style="{ height: getParallelLayout(item).height + 'px', width: getParallelLayout(item).totalWidth + 'px' }">
          <svg class="parallel-svg" :style="{ height: getParallelLayout(item).height + 'px', width: getParallelLayout(item).totalWidth + 'px' }">
            <path :d="`M 0 ${getParallelLayout(item).centerY} L ${getParallelLayout(item).leftBusX} ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="2"/>
            <path :d="`M ${getParallelLayout(item).rightBusX} ${getParallelLayout(item).centerY} L ${getParallelLayout(item).totalWidth} ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="2"/>
            <template v-for="(cy, i) in getParallelLayout(item).branchCenters" :key="i">
              <path :d="`M ${getParallelLayout(item).leftBusX} ${getParallelLayout(item).centerY} L ${getParallelLayout(item).leftBusX} ${cy} L ${getParallelLayout(item).branchStartX} ${cy}`" fill="none" stroke="black" stroke-width="2"/>
              <path :d="`M ${getParallelLayout(item).branchEndX} ${cy} L ${getParallelLayout(item).rightBusX} ${cy} L ${getParallelLayout(item).rightBusX} ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="2"/>
            </template>
          </svg>
          <div class="parallel-branches" :style="{ height: getParallelLayout(item).height + 'px', width: getParallelLayout(item).totalWidth + 'px' }">
            <div
              v-for="(branch, bIndex) in item.branches"
              :key="bIndex"
              class="component-container"
              :data-item-id="item.id"
              :data-branch-index="bIndex"
              :style="{
                position: 'absolute',
                top: getParallelLayout(item).branchTops[bIndex] + 'px',
                left: getParallelLayout(item).branchStartX + 'px',
                width: getParallelLayout(item).branchWidth + 'px',
                height: getParallelLayout(item).branchHeight + 'px'
              }"
            >
              <div v-for="comp in branch.components" :key="comp.id" class="dropped-component">{{ comp.name }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- Series Model -->
      <template v-else-if="item.modelType === 'series'">
        <div class="series-container" :style="getSeriesContainerBounds(item)">
          <svg class="series-svg" :style="getSeriesContainerBounds(item)">
            <line
              v-for="(segment, segIndex) in getSeriesLayout(item).segments"
              :key="segIndex"
              :x1="segment.x1"
              :y1="segment.y1"
              :x2="segment.x2"
              :y2="segment.y2"
              stroke="#555"
              stroke-width="2"
            />
          </svg>
          <div
            v-for="index in getSeriesLayout(item).containerCount"
            :key="index - 1"
            class="series-box component-container"
            :data-item-id="item.id"
            :data-slot="index - 1"
            :style="getSeriesContainerStyle(item, index - 1)"
          >
            <div
              v-for="comp in getSeriesSlotComponents(item, index - 1)"
              :key="comp.id"
              class="dropped-component"
            >
              {{ comp.name }}
            </div>
          </div>
        </div>
      </template>

      <!-- Other Models (Series, etc.) -->
      <template v-else>
        {{ item.type === 'model' ? item.modelType : item.component.name }}
        <div v-if="item.type === 'model'" class="component-container" :data-item-id="item.id">
          <div v-for="comp in item.components" :key="comp.id" class="dropped-component">
            {{ comp.name }}
          </div>
        </div>
      </template>
    </div>
    </div>

    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @mousedown.stop
      @click.stop
      @contextmenu.prevent
    >
      <button
        v-if="contextMenu.targetType === 'item'"
        type="button"
        @click="onEditItem"
      >编辑</button>
      <button type="button" @click="onCopyItem">复制</button>
      <button type="button" class="danger" @click="onDeleteItem">删除</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';

const canvasEl = ref(null);
const items = ref([]);
const connections = ref([]);
const zoomLevel = ref(1.0);

const handleWheel = (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel.value + delta));
    zoomLevel.value = parseFloat(newZoom.toFixed(1));
  }
};

let idCounter = 0;
let componentInstanceCounter = 0;
const STORAGE_KEY = 'modeling-canvas-state-v1';
let restoringState = false;

const SERIES_CONTAINER_HEIGHT = 50;
const SERIES_HORIZONTAL_GAP = 75; // adjusted spacing for shorter connectors
const SERIES_MARGIN_X = 20;
const SERIES_MARGIN_Y = 30;
const SERIES_MAX_COLUMNS = 4;
const SERIES_VERTICAL_GAP = 60;
const AUTO_LAYOUT_MAX_PER_ROW = 4;
const AUTO_LAYOUT_GAP_X = 20;
const AUTO_LAYOUT_GAP_Y = 100;

const COMPONENT_MIN_WIDTH = 100;
const COMPONENT_MAX_WIDTH = 240;
const COMPONENT_MAX_WIDTH_REDUNDANCY = 180;
const COMPONENT_LABEL_PADDING = 18;
const LABEL_MEASURE_FONT = '500 13px "Microsoft YaHei", sans-serif';

let textMeasureContext = null;
if (typeof document !== 'undefined') {
  const measureCanvas = document.createElement('canvas');
  textMeasureContext = measureCanvas.getContext('2d');
  if (textMeasureContext) {
    textMeasureContext.font = LABEL_MEASURE_FONT;
  }
}

function measureLabelWidth(label) {
  if (!label) return 0;
  const text = String(label);
  if (textMeasureContext && textMeasureContext.measureText) {
    return textMeasureContext.measureText(text).width;
  }
  return text.length * 14;
}

function getMaxComponentLabelWidth(item) {
  let max = 0;
  const checkComponent = (comp) => {
    if (!comp) return;
    const width = measureLabelWidth(comp.name || '');
    if (width > max) max = width;
  };

  if (item.modelType === 'parallel' || item.modelType === 'redundancy') {
    if (Array.isArray(item.branches)) {
      item.branches.forEach(branch => {
        if (Array.isArray(branch.components)) {
          branch.components.forEach(checkComponent);
        }
      });
    }
  } else {
    if (Array.isArray(item.components)) {
      item.components.forEach(checkComponent);
    }
  }

  return max;
}

function getAdaptiveContainerWidth(item) {
  const raw = getMaxComponentLabelWidth(item);
  const padded = raw + COMPONENT_LABEL_PADDING;
  const maxWidth = item.modelType === 'redundancy' ? COMPONENT_MAX_WIDTH_REDUNDANCY : COMPONENT_MAX_WIDTH;
  return Math.ceil(Math.min(maxWidth, Math.max(COMPONENT_MIN_WIDTH, padded)));
}

const createComponentInstance = (component, slot) => {
  const uniqueId = `${component.id || 'component'}-${componentInstanceCounter++}`;
  const instance = { ...component, id: uniqueId };
  if (slot !== undefined) instance.slot = slot;
  return instance;
};

function ensureItemDefaults(item) {
  if (!item || item.type !== 'model') return;
  if (!item.style) {
    item.style = {
      position: 'absolute',
      left: item.styleLeft || '0px',
      top: item.styleTop || '0px',
      zIndex: 1,
    };
  }
  if (!item.connectors || !item.connectors.in || !item.connectors.out) {
    item.connectors = {
      in: { x: 0, y: 0, snapped: false },
      out: { x: 0, y: 0, snapped: false },
    };
  }
  if (item.modelType === 'parallel' && !Array.isArray(item.branches)) {
    item.branches = [{ components: [] }, { components: [] }];
  }
  if (item.modelType === 'series' && typeof item.containers !== 'number') {
    item.containers = 2;
  }
  if (item.modelType === 'redundancy') {
    if (typeof item.k !== 'number') item.k = 2;
    if (typeof item.n !== 'number') item.n = 4;
    if (!Array.isArray(item.branches) || item.branches.length === 0) {
      item.branches = Array.from({ length: item.n }, () => ({ components: [] }));
    }
  }
}

function getSeriesLayout(item) {
  const containerCount = Math.max(1, item.containers ?? 2);
  const containerWidth = getAdaptiveContainerWidth(item);
  const containerHeight = SERIES_CONTAINER_HEIGHT;
  const columns = Math.min(containerCount, SERIES_MAX_COLUMNS);
  const rows = Math.ceil(containerCount / SERIES_MAX_COLUMNS);
  const width = SERIES_MARGIN_X * 2 + columns * containerWidth + (columns - 1) * SERIES_HORIZONTAL_GAP;
  const height = SERIES_MARGIN_Y * 2 + rows * containerHeight + Math.max(0, rows - 1) * SERIES_VERTICAL_GAP;

  const positions = Array.from({ length: containerCount }, (_, idx) => {
    const row = Math.floor(idx / SERIES_MAX_COLUMNS);
    const column = idx % SERIES_MAX_COLUMNS;
    const left = SERIES_MARGIN_X + column * (containerWidth + SERIES_HORIZONTAL_GAP);
    const top = SERIES_MARGIN_Y + row * (containerHeight + SERIES_VERTICAL_GAP);
    const right = left + containerWidth;
    const centerY = top + containerHeight / 2;
    return { row, column, left, top, right, centerY };
  });

  const segments = [];
  if (positions.length > 0) {
    const first = positions[0];
    segments.push({ x1: 0, y1: first.centerY, x2: first.left, y2: first.centerY });

    for (let i = 0; i < positions.length; i += 1) {
      const current = positions[i];
      const next = positions[i + 1];

      if (next && next.row === current.row) {
        segments.push({ x1: current.right, y1: current.centerY, x2: next.left, y2: current.centerY });
      } else if (next) {
        // Route the connector around the right margin before entering the next row.
        segments.push({ x1: current.right, y1: current.centerY, x2: width, y2: current.centerY });
        segments.push({ x1: width, y1: current.centerY, x2: width, y2: next.centerY });
        segments.push({ x1: width, y1: next.centerY, x2: next.left, y2: next.centerY });
      } else {
        segments.push({ x1: current.right, y1: current.centerY, x2: width, y2: current.centerY });
      }
    }
  }

  const entryY = positions.length ? positions[0].centerY : SERIES_MARGIN_Y + containerHeight / 2;
  const exitY = positions.length ? positions[positions.length - 1].centerY : entryY;

  return {
    containerCount,
    containerWidth,
    containerHeight,
    width,
    height,
    positions,
    entryY,
    exitY,
    segments
  };
}

function getSeriesContainerBounds(item) {
  const layout = getSeriesLayout(item);
  return {
    width: `${layout.width}px`,
    height: `${layout.height}px`
  };
}

function getSeriesContainerStyle(item, index) {
  const layout = getSeriesLayout(item);
  const position = layout.positions[index] || { left: SERIES_MARGIN_X, top: SERIES_MARGIN_Y };
  return {
    width: `${layout.containerWidth}px`,
    height: `${layout.containerHeight}px`,
    left: `${position.left}px`,
    top: `${position.top}px`
  };
}

function syncItemStyle(item) {
  if (!item || item.type !== 'model') return;
  if (!item.style) item.style = {};

  if (item.modelType === 'series') {
    const layout = getSeriesLayout(item);
    item.style.width = `${layout.width}px`;
    item.style.height = `${layout.height}px`;
  } else if (item.modelType === 'parallel') {
    const layout = getParallelLayout(item);
    item.style.width = `${layout.totalWidth}px`;
    item.style.height = `${layout.height}px`;
  } else if (item.modelType === 'redundancy') {
    const layout = getRedundancyLayout(item);
    item.style.width = `${layout.totalWidth}px`;
    item.style.height = `${layout.height}px`;
  }
}

const draggedItemId = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const potentialSnap = ref(null); // { draggedItem, draggedConnectorType, staticItem, staticConnectorType }
const SNAP_THRESHOLD = 20;
const hoveredGroup = ref(null); // { ids:[], bbox }
const groupDrag = ref({ active: false, offset: {x:0,y:0}, startMouse: {x:0,y:0}, startPositions: {} });
const contextMenu = ref({ visible: false, x: 0, y: 0, targetType: null, itemId: null, groupIds: [] });

// --- Drag and Drop for NEW items from Palette ---
const onCanvasDrop = (event) => {
  event.preventDefault();
  const dataString = event.dataTransfer.getData('application/json');
  if (!dataString) return;

  const data = JSON.parse(dataString);
  const canvasRect = canvasEl.value.getBoundingClientRect();
  const scrollLeft = canvasEl.value.scrollLeft;
  const scrollTop = canvasEl.value.scrollTop;
  const x = (event.clientX - canvasRect.left + scrollLeft) / zoomLevel.value;
  const y = (event.clientY - canvasRect.top + scrollTop) / zoomLevel.value;

  if (data.type === 'model') {
    const newItem = {
      id: `item-${idCounter++}`,
      type: 'model',
      modelType: data.modelType,
      name: data.modelType,
      style: {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 1,
      },
      connectors: { in: {x:0, y:0, snapped: false}, out: {x:0, y:0, snapped: false} },
    };

    if (data.modelType === 'parallel') {
      newItem.branches = [{ components: [] }, { components: [] }];
    } else if (data.modelType === 'redundancy') {
      newItem.k = 2;
      newItem.n = 4;
      newItem.branches = Array.from({ length: newItem.n }, () => ({ components: [] }));
    } else { // Series
      newItem.containers = 2;
      newItem.components = [];
    }
    syncItemStyle(newItem);
    items.value.push(newItem);
    nextTick(() => updateItemConnectors(newItem.id));
  } else if (data.type === 'component') {
    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    const container = targetElement.closest('.component-container');
    if (container) {
      const itemId = container.getAttribute('data-item-id');
      const branchIndex = container.getAttribute('data-branch-index');
      const slotIndexAttr = container.getAttribute('data-slot');
      const targetItem = items.value.find(item => item.id === itemId);
      if (targetItem) {
        const hasBranchIndex = branchIndex !== null;
        if (hasBranchIndex && Array.isArray(targetItem.branches)) {
          const index = parseInt(branchIndex, 10);
          if (!Number.isNaN(index) && targetItem.branches[index]) {
            targetItem.branches[index].components.push(createComponentInstance(data.component));
          }
        } else {
          if (!Array.isArray(targetItem.components)) targetItem.components = [];
          if (slotIndexAttr !== null) {
            const slotIndex = parseInt(slotIndexAttr, 10) || 0;
            targetItem.components.push(createComponentInstance(data.component, slotIndex));
          } else {
            targetItem.components.push(createComponentInstance(data.component));
          }
        }
        nextTick(() => updateItemConnectors(targetItem.id));
      }
    }
  }
};

// selection emit
const emit = defineEmits(['select']);
const onItemClick = (item) => emit('select', item);
// Expose to parent if needed, or handle drop here
defineExpose({ onCanvasDrop });

const onCanvasMouseDown = (event) => {
  if (event.target === event.currentTarget ||
      event.target.classList.contains('canvas-content') ||
      event.target.closest('.connection-lines')) {
    emit('select', null);
  }
  hideContextMenu();
};

const hideContextMenu = () => {
  contextMenu.value.visible = false;
  contextMenu.value.targetType = null;
  contextMenu.value.itemId = null;
  contextMenu.value.groupIds = [];
};

const onCanvasContextMenu = (event) => {
  if (event.target === event.currentTarget ||
      event.target.classList.contains('canvas-content') ||
      event.target.closest('.connection-lines')) {
    hideContextMenu();
  }
};

const onItemContextMenu = (item, event) => {
  const canvasEl = event.currentTarget.closest('.modeling-canvas');
  if (!canvasEl) {
    hideContextMenu();
    return;
  }
  const rect = canvasEl.getBoundingClientRect();
  contextMenu.value.x = event.clientX - rect.left;
  contextMenu.value.y = event.clientY - rect.top;
  contextMenu.value.targetType = 'item';
  contextMenu.value.itemId = item.id;
  contextMenu.value.groupIds = [];
  contextMenu.value.visible = true;
};

const onGroupContextMenu = (event) => {
  const group = hoveredGroup.value;
  if (!group || !Array.isArray(group.ids) || group.ids.length === 0) {
    hideContextMenu();
    return;
  }
  const canvasEl = event.currentTarget.closest('.modeling-canvas');
  if (!canvasEl) {
    hideContextMenu();
    return;
  }
  const rect = canvasEl.getBoundingClientRect();
  contextMenu.value.x = event.clientX - rect.left;
  contextMenu.value.y = event.clientY - rect.top;
  contextMenu.value.targetType = 'group';
  contextMenu.value.itemId = null;
  contextMenu.value.groupIds = [...group.ids];
  contextMenu.value.visible = true;
};

const getContextMenuItem = () => {
  if (contextMenu.value.targetType !== 'item' || !contextMenu.value.itemId) return null;
  return items.value.find(i => i.id === contextMenu.value.itemId) || null;
};

const removeItemConnections = (itemId) => {
  connections.value = connections.value.filter(conn => {
    const involvesItem = conn.from.id === itemId || conn.to.id === itemId;
    if (involvesItem) {
      const fromItem = items.value.find(i => i.id === conn.from.id);
      const toItem = items.value.find(i => i.id === conn.to.id);
      if (fromItem) fromItem.connectors[conn.from.type].snapped = false;
      if (toItem) toItem.connectors[conn.to.type].snapped = false;
    }
    return !involvesItem;
  });
};

const cloneItem = (item) => {
  const rawLeft = parseFloat(item.style.left) || 0;
  const rawTop = parseFloat(item.style.top) || 0;
  const base = JSON.parse(JSON.stringify(item));
  base.id = `item-${idCounter++}`;
  base.style = { ...item.style, left: `${rawLeft + 20}px`, top: `${rawTop + 20}px`, zIndex: 1 };
  base.connectors = {
    in: { x: 0, y: 0, snapped: false },
    out: { x: 0, y: 0, snapped: false }
  };

  if (Array.isArray(base.branches)) {
    base.branches = base.branches.map(branch => ({
      components: Array.isArray(branch.components)
        ? branch.components.map(comp => createComponentInstance(comp))
        : []
    }));
  }

  if (Array.isArray(base.components)) {
    base.components = base.components.map(comp => createComponentInstance(comp, comp.slot));
  }

  return base;
};

const deleteGroupItems = (groupIds) => {
  const uniqueIds = new Set(groupIds);
  if (uniqueIds.size === 0) return;
  uniqueIds.forEach(id => removeItemConnections(id));
  items.value = items.value.filter(item => !uniqueIds.has(item.id));
  if (hoveredGroup.value && hoveredGroup.value.ids.some(id => uniqueIds.has(id))) {
    hoveredGroup.value = null;
  }
  emit('select', null);
};

const copyGroupItems = (groupIds) => {
  const uniqueIds = Array.from(new Set(groupIds));
  if (uniqueIds.length === 0) return;

  const cloneMap = new Map();
  const clones = [];

  uniqueIds.forEach(id => {
    const item = items.value.find(i => i.id === id);
    if (!item) return;
    const clone = cloneItem(item);
    clones.push(clone);
    cloneMap.set(id, clone.id);
  });

  if (!clones.length) return;

  clones.forEach(clone => items.value.push(clone));

  nextTick(() => {
    clones.forEach(clone => updateItemConnectors(clone.id));

    const newConnections = [];
    connections.value.forEach(conn => {
      const fromCloneId = cloneMap.get(conn.from.id);
      const toCloneId = cloneMap.get(conn.to.id);
      if (fromCloneId && toCloneId) {
        newConnections.push({
          from: { id: fromCloneId, type: conn.from.type },
          to: { id: toCloneId, type: conn.to.type }
        });
      }
    });

    newConnections.forEach(conn => {
      const fromItem = items.value.find(i => i.id === conn.from.id);
      const toItem = items.value.find(i => i.id === conn.to.id);
      if (!fromItem || !toItem) return;
      connections.value.push(conn);
      fromItem.connectors[conn.from.type].snapped = true;
      toItem.connectors[conn.to.type].snapped = true;
    });
  });
};

function getSeriesSlotComponents(item, slotIndex) {
  if (!Array.isArray(item.components)) return [];
  return item.components.filter(comp => (comp.slot ?? 0) === slotIndex);
}

const adjustParallelBranchCount = (item, desired) => {
  const target = Math.max(1, desired);
  const current = item.branches.length;
  if (target > current) {
    for (let i = current; i < target; i += 1) {
      item.branches.push({ components: [] });
    }
  } else if (target < current) {
    item.branches.splice(target);
  }
};

const adjustRedundancyBranchCount = (item, desired) => {
  const target = Math.max(1, desired);
  const current = item.branches.length;
  if (target > current) {
    for (let i = current; i < target; i += 1) {
      item.branches.push({ components: [] });
    }
  } else if (target < current) {
    item.branches.splice(target);
  }
};

function adjustSeriesContainerCount(item, desired) {
  const target = Math.max(1, desired);
  const current = item.containers ?? 2;
  item.containers = target;
  if (!Array.isArray(item.components)) item.components = [];
  if (target < current) {
    item.components = item.components.filter(comp => (comp.slot ?? 0) < target);
  }
  syncItemStyle(item);
}

const onDeleteItem = () => {
  if (contextMenu.value.targetType === 'group') {
    const groupIds = contextMenu.value.groupIds || [];
    hideContextMenu();
    deleteGroupItems(groupIds);
    return;
  }

  const item = getContextMenuItem();
  if (!item) return;
  hideContextMenu();
  removeItemConnections(item.id);
  const index = items.value.findIndex(i => i.id === item.id);
  if (index !== -1) {
    items.value.splice(index, 1);
    emit('select', null);
  }
};

const onCopyItem = () => {
  if (contextMenu.value.targetType === 'group') {
    const groupIds = contextMenu.value.groupIds || [];
    hideContextMenu();
    copyGroupItems(groupIds);
    return;
  }

  const source = getContextMenuItem();
  if (!source) return;
  hideContextMenu();
  const copy = cloneItem(source);
  items.value.push(copy);
  nextTick(() => updateItemConnectors(copy.id));
};

const onEditItem = () => {
  if (contextMenu.value.targetType !== 'item') {
    hideContextMenu();
    return;
  }
  const item = getContextMenuItem();
  if (!item) return;
  hideContextMenu();

  if (item.modelType === 'parallel') {
    const input = window.prompt('请输入并联模型的分支数量', item.branches.length);
    if (input === null) return;
    const desired = parseInt(input, 10);
    if (Number.isNaN(desired) || desired < 1) return;
    adjustParallelBranchCount(item, desired);
  } else if (item.modelType === 'redundancy') {
    const nInput = window.prompt('请输入冗余模型的 n 值', item.n);
    if (nInput === null) return;
    let desiredN = parseInt(nInput, 10);
    if (Number.isNaN(desiredN) || desiredN < 1) desiredN = 1;

    const kInput = window.prompt(`请输入冗余模型的 k 值 (≤ ${desiredN})`, Math.min(item.k, desiredN));
    if (kInput === null) return;
    let desiredK = parseInt(kInput, 10);
    if (Number.isNaN(desiredK) || desiredK < 1) desiredK = 1;
    if (desiredK > desiredN) desiredK = desiredN;

    item.n = desiredN;
    item.k = desiredK;
    adjustRedundancyBranchCount(item, desiredN);
  } else if (item.modelType === 'series') {
    const input = window.prompt('请输入串联容器数量', item.containers ?? 2);
    if (input === null) return;
    const desired = parseInt(input, 10);
    if (Number.isNaN(desired) || desired < 1) return;
    adjustSeriesContainerCount(item, desired);
  } else {
    const currentName = item.name || '';
    const newName = window.prompt('请输入模型名称', currentName);
    if (newName !== null && newName.trim()) {
      item.name = newName.trim();
    }
  }

  nextTick(() => updateItemConnectors(item.id));
};

const handleWindowClick = () => hideContextMenu();
const handleWindowKey = (event) => {
  if (event.key === 'Escape') hideContextMenu();
};

const restoreState = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    restoringState = true;
    const restoredItems = Array.isArray(parsed.items) ? parsed.items.map(item => ({ ...item })) : [];
    restoredItems.forEach(ensureItemDefaults);
    items.value = restoredItems;
    connections.value = Array.isArray(parsed.connections) ? parsed.connections : [];
    if (typeof parsed.idCounter === 'number') idCounter = parsed.idCounter;
    if (typeof parsed.componentInstanceCounter === 'number') componentInstanceCounter = parsed.componentInstanceCounter;
    nextTick(() => {
      items.value.forEach(it => updateItemConnectors(it.id));
      restoringState = false;
      persistState();
    });
  } catch (error) {
    restoringState = false;
    console.error('加载建模画布状态失败:', error);
  }
};

onMounted(() => {
  window.addEventListener('click', handleWindowClick);
  window.addEventListener('keydown', handleWindowKey);
  restoreState();
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleWindowClick);
  window.removeEventListener('keydown', handleWindowKey);
});


// --- Custom Dragging for EXISTING items on Canvas ---
const onItemMouseDown = (item, event) => {
  if (event.button !== 0) {
    return;
  }

  hideContextMenu();
  clearAutoLayout(getGroupIdsForItem(item.id));
  // Disconnect the item being dragged
  connections.value = connections.value.filter(conn => {
    if (conn.from.id === item.id || conn.to.id === item.id) {
      const fromItem = items.value.find(i => i.id === conn.from.id);
      const toItem = items.value.find(i => i.id === conn.to.id);
      if (fromItem) fromItem.connectors[conn.from.type].snapped = false;
      if (toItem) toItem.connectors[conn.to.type].snapped = false;
      return false;
    }
    return true;
  });

  draggedItemId.value = item.id;
  const rect = event.currentTarget.getBoundingClientRect();
  dragOffset.value = {
    x: (event.clientX - rect.left) / zoomLevel.value,
    y: (event.clientY - rect.top) / zoomLevel.value,
  };
  items.value.forEach(i => i.style.zIndex = (i.id === item.id ? 10 : 1));
};

const onCanvasMouseMove = (event) => {
  // Group dragging
  if (groupDrag.value.active) {
    const rect = canvasEl.value.getBoundingClientRect();
    const scrollLeft = canvasEl.value.scrollLeft;
    const scrollTop = canvasEl.value.scrollTop;
    const currentMouseX = (event.clientX - rect.left + scrollLeft) / zoomLevel.value;
    const currentMouseY = (event.clientY - rect.top + scrollTop) / zoomLevel.value;

    const dx = currentMouseX - groupDrag.value.startMouse.x;
    const dy = currentMouseY - groupDrag.value.startMouse.y;
    hoveredGroup.value.ids.forEach(id => {
      const startPos = groupDrag.value.startPositions[id];
      const item = items.value.find(i => i.id === id);
      if (item) {
        item.style.left = (startPos.left + dx) + 'px';
        item.style.top = (startPos.top + dy) + 'px';
        updateItemConnectors(item.id);
      }
    });
    // 更新虚线框位置
    updateHoveredGroupBBox();
    return;
  }

  if (!draggedItemId.value) {
    // 检测鼠标靠近某连接组
    detectHoveredGroup(event);
    return;
  }

  const draggedItem = items.value.find(i => i.id === draggedItemId.value);
  if (!draggedItem) return;

  const canvasRect = canvasEl.value.getBoundingClientRect();
  const scrollLeft = canvasEl.value.scrollLeft;
  const scrollTop = canvasEl.value.scrollTop;
  let newX = (event.clientX - canvasRect.left + scrollLeft) / zoomLevel.value - dragOffset.value.x;
  let newY = (event.clientY - canvasRect.top + scrollTop) / zoomLevel.value - dragOffset.value.y;

  // Snapping Logic
  potentialSnap.value = null;
  const draggedItemConnectors = getItemConnectors(draggedItem, newX, newY);

  for (const staticItem of items.value) {
    if (staticItem.id === draggedItemId.value) continue;

    const staticItemConnectors = getItemConnectors(staticItem);

    for (const draggedConnectorType of ['in', 'out']) {
      if (draggedItem.connectors[draggedConnectorType].snapped) continue;

      for (const staticConnectorType of ['in', 'out']) {
        if (staticItem.connectors[staticConnectorType].snapped) continue;

        const draggedConnector = draggedItemConnectors[draggedConnectorType];
        const staticConnector = staticItemConnectors[staticConnectorType];
        const dist = Math.hypot(draggedConnector.x - staticConnector.x, draggedConnector.y - staticConnector.y);

        if (dist < SNAP_THRESHOLD) {
          const draggedDim = getItemDimensions(draggedItem);
          const staticDim = getItemDimensions(staticItem);

          const draggedConnectorPos = {
            x: draggedConnectorType === 'in' ? 0 : draggedDim.width,
            y: draggedDim[`${draggedConnectorType}Y`]
          };

          newX = staticConnector.x - draggedConnectorPos.x;
          newY = staticConnector.y - draggedConnectorPos.y;

          potentialSnap.value = {
            from: { id: draggedItem.id, type: draggedConnectorType },
            to: { id: staticItem.id, type: staticConnectorType }
          };

          // Break all loops
          goto_snapFound.call(this);
        }
      }
    }
  }
  function goto_snapFound() {}


  draggedItem.style.left = `${newX}px`;
  draggedItem.style.top = `${newY}px`;
  updateItemConnectors(draggedItem.id);

  // Move snapped items
  moveSnappedItems(draggedItem, newX, newY);
};

function moveSnappedItems(draggedItem, newX, newY) {
    const draggedConnectors = getItemConnectors(draggedItem, newX, newY);

    connections.value.forEach(conn => {
        let staticItem, draggedConnector, staticConnectorType, staticConnector;
        if (conn.from.id === draggedItem.id) {
            staticItem = items.value.find(i => i.id === conn.to.id);
            draggedConnector = draggedConnectors[conn.from.type];
            staticConnectorType = conn.to.type;
        } else if (conn.to.id === draggedItem.id) {
            staticItem = items.value.find(i => i.id === conn.from.id);
            draggedConnector = draggedConnectors[conn.to.type];
            staticConnectorType = conn.from.type;
        } else {
            return;
        }

        if (staticItem) {
            const staticDim = getItemDimensions(staticItem);
            const staticConnectorPos = {
                x: staticConnectorType === 'in' ? 0 : staticDim.width,
                y: staticDim[`${staticConnectorType}Y`]
            };

            const newStaticX = draggedConnector.x - staticConnectorPos.x;
            const newStaticY = draggedConnector.y - staticConnectorPos.y;

            staticItem.style.left = `${newStaticX}px`;
            staticItem.style.top = `${newStaticY}px`;
            updateItemConnectors(staticItem.id);

            // Recursively move items snapped to this one
            moveSnappedItems(staticItem, newStaticX, newStaticY);
        }
    });
}


const onCanvasMouseUp = () => {
  if (groupDrag.value.active) {
    groupDrag.value.active = false;
    return;
  }
  if (!draggedItemId.value) return;

  if (potentialSnap.value) {
    const { from, to } = potentialSnap.value;
    const fromItem = items.value.find(i => i.id === from.id);
    const toItem = items.value.find(i => i.id === to.id);

    if (fromItem && toItem && !fromItem.connectors[from.type].snapped && !toItem.connectors[to.type].snapped) {
      connections.value.push({ from, to });
      fromItem.connectors[from.type].snapped = true;
      toItem.connectors[to.type].snapped = true;
      autoLayoutGroupForItem(from.id);
    }
  }

  const draggedItem = items.value.find(i => i.id === draggedItemId.value);
  if (draggedItem) {
    draggedItem.style.zIndex = 1;
  }

  draggedItemId.value = null;
  potentialSnap.value = null;
};

// 连接组相关逻辑
function buildGroups() {
  const visited = new Set();
  const groups = [];
  // 构建邻接表（按模型 id）
  const adj = new Map();
  connections.value.forEach(c => {
    const a = c.from.id;
    const b = c.to.id;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  });
  items.value.forEach(item => {
    const id = item.id;
    if (visited.has(id)) return;
    const groupIds = [];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      if (visited.has(cur)) continue;
      visited.add(cur);
      groupIds.push(cur);
      const neighbors = adj.get(cur);
      if (neighbors) neighbors.forEach(n => { if (!visited.has(n)) stack.push(n); });
    }
    if (groupIds.length > 1) {
      // 计算边界
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      groupIds.forEach(gid => {
        const it = items.value.find(i => i.id === gid);
        if (!it) return;
        const dims = getItemDimensions(it);
        const x = parseFloat(it.style.left);
        const y = parseFloat(it.style.top);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + dims.width);
        bottom = Math.max(bottom, y + dims.height);
      });
      groups.push({ ids: groupIds, bbox: { left, top, width: right - left, height: bottom - top } });
    }
  });
  return groups;
}

function detectHoveredGroup(event) {
  const groups = buildGroups();
  const canvasRect = canvasEl.value.getBoundingClientRect();
  const scrollLeft = canvasEl.value.scrollLeft;
  const scrollTop = canvasEl.value.scrollTop;
  const mx = (event.clientX - canvasRect.left + scrollLeft) / zoomLevel.value;
  const my = (event.clientY - canvasRect.top + scrollTop) / zoomLevel.value;
  const margin = 15; // 靠近阈值
  let found = null;
  for (const g of groups) {
    const { left, top, width, height } = g.bbox;
    if (mx >= left - margin && mx <= left + width + margin && my >= top - margin && my <= top + height + margin) {
      found = g;
      break;
    }
  }
  hoveredGroup.value = found;
}

function updateHoveredGroupBBox() {
  if (!hoveredGroup.value) return;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  hoveredGroup.value.ids.forEach(id => {
    const it = items.value.find(i => i.id === id);
    if (!it) return;
    const dims = getItemDimensions(it);
    const x = parseFloat(it.style.left);
    const y = parseFloat(it.style.top);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + dims.width);
    bottom = Math.max(bottom, y + dims.height);
  });
  hoveredGroup.value.bbox = { left, top, width: right - left, height: bottom - top };
}

function onGroupMouseDown(event) {
  if (!hoveredGroup.value) return;
  groupDrag.value.active = true;
  const rect = canvasEl.value.getBoundingClientRect();
  const scrollLeft = canvasEl.value.scrollLeft;
  const scrollTop = canvasEl.value.scrollTop;
  groupDrag.value.startMouse = {
    x: (event.clientX - rect.left + scrollLeft) / zoomLevel.value,
    y: (event.clientY - rect.top + scrollTop) / zoomLevel.value
  };
  groupDrag.value.startPositions = {};
  hoveredGroup.value.ids.forEach(id => {
    const it = items.value.find(i => i.id === id);
    if (it) {
      groupDrag.value.startPositions[id] = { left: parseFloat(it.style.left), top: parseFloat(it.style.top) };
    }
  });
}

function getGroupIdsForItem(itemId) {
  const groups = buildGroups();
  const group = groups.find(g => g.ids.includes(itemId));
  if (group) return [...group.ids];
  return [itemId];
}

function clearAutoLayout(ids) {
  ids.forEach(id => {
    const item = items.value.find(i => i.id === id);
    if (item) {
      item.autoLayout = null;
    }
  });
}

function orderGroupIdsLinear(groupIds) {
  if (groupIds.length <= 1) return [...groupIds];
  const idSet = new Set(groupIds);
  const adjacency = new Map();
  groupIds.forEach(id => adjacency.set(id, new Set()));

  connections.value.forEach(conn => {
    const a = conn.from.id;
    const b = conn.to.id;
    if (!idSet.has(a) || !idSet.has(b)) return;
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  });

  const endpointIds = groupIds.filter(id => (adjacency.get(id)?.size ?? 0) === 1);
  if (groupIds.length > 2 && endpointIds.length !== 2) {
    return null;
  }

  let startId;
  if (endpointIds.length >= 1) {
    startId = endpointIds.reduce((best, candidate) => {
      const candidateItem = items.value.find(i => i.id === candidate);
      const bestItem = items.value.find(i => i.id === best);
      const candidateLeft = candidateItem ? parseFloat(candidateItem.style.left) || 0 : 0;
      const bestLeft = bestItem ? parseFloat(bestItem.style.left) || 0 : 0;
      return candidateLeft < bestLeft ? candidate : best;
    });
  } else {
    // Fallback to the leftmost item when only two nodes or no clear endpoints
    startId = groupIds.reduce((best, candidate) => {
      const candidateItem = items.value.find(i => i.id === candidate);
      const bestItem = items.value.find(i => i.id === best);
      const candidateLeft = candidateItem ? parseFloat(candidateItem.style.left) || 0 : 0;
      const bestLeft = bestItem ? parseFloat(bestItem.style.left) || 0 : 0;
      return candidateLeft < bestLeft ? candidate : best;
    });
  }

  const ordered = [];
  const visited = new Set();
  let current = startId;
  let previous = null;

  while (current) {
    ordered.push(current);
    visited.add(current);
    const neighbors = Array.from(adjacency.get(current) || []);
    const next = neighbors.find(id => id !== previous && !visited.has(id));
    if (!next) break;
    previous = current;
    current = next;
  }

  if (ordered.length !== groupIds.length) {
    return null;
  }

  return ordered;
}

function autoLayoutGroupForItem(itemId) {
  const groupIds = getGroupIdsForItem(itemId);
  if (groupIds.length <= 1) return;

  clearAutoLayout(groupIds);
  const orderedIds = orderGroupIdsLinear(groupIds);
  if (!orderedIds) {
    return;
  }

  const groupItems = orderedIds.map(id => items.value.find(i => i.id === id)).filter(Boolean);
  if (groupItems.length !== orderedIds.length) return;

  const lefts = groupItems.map(item => parseFloat(item.style.left) || 0);
  const tops = groupItems.map(item => parseFloat(item.style.top) || 0);
  const baseLeft = Math.min(...lefts);
  const baseTop = Math.min(...tops);

  const dimensions = groupItems.map(item => getItemDimensions(item));
  const maxHeight = Math.max(...dimensions.map(d => d.height));

  const rowOffsets = new Map();
  orderedIds.forEach((id, index) => {
    const item = items.value.find(i => i.id === id);
    if (!item) return;
    const row = Math.floor(index / AUTO_LAYOUT_MAX_PER_ROW);
    const column = index % AUTO_LAYOUT_MAX_PER_ROW;
    const itemDims = getItemDimensions(item);
    if (!rowOffsets.has(row)) {
      rowOffsets.set(row, baseLeft);
    }
    const currentLeft = rowOffsets.get(row);
    const left = currentLeft;
    rowOffsets.set(row, currentLeft + itemDims.width + AUTO_LAYOUT_GAP_X);
    const targetRowCenter = baseTop + (maxHeight / 2) + row * (maxHeight + AUTO_LAYOUT_GAP_Y);
    const top = targetRowCenter - itemDims.inY;
    item.style.left = `${left}px`;
    item.style.top = `${top}px`;
    item.autoLayout = { row, column };
    updateItemConnectors(item.id);
  });

  if (hoveredGroup.value && hoveredGroup.value.ids.some(id => groupIds.includes(id))) {
    updateHoveredGroupBBox();
  }
}


// --- Connector and Connection Line Logic ---
const getItemDimensions = (item) => {
  let width, height, inY, outY;
  if (item.modelType === 'parallel') {
    const layout = getParallelLayout(item);
    width = layout.totalWidth;
    height = layout.height;
    inY = layout.centerY;
    outY = layout.centerY;
  } else if (item.modelType === 'redundancy') {
    const layout = getRedundancyLayout(item);
    width = layout.totalWidth;
    height = layout.height;
    inY = layout.baseCenterY;
    outY = layout.baseCenterY;
  } else { // Series
    const layout = getSeriesLayout(item);
    width = layout.width;
    height = layout.height;
    inY = layout.entryY;
    outY = layout.exitY;
  }
  return { width, height, inY, outY };
};

const getItemConnectors = (item, customLeft, customTop) => {
  const left = customLeft !== undefined ? customLeft : parseFloat(item.style.left);
  const top = customTop !== undefined ? customTop : parseFloat(item.style.top);
  const { width, inY, outY } = getItemDimensions(item);

  return {
    in: { x: left, y: top + inY },
    out: { x: left + width, y: top + outY },
  };
};

const updateItemConnectors = (itemId) => {
  const item = items.value.find(i => i.id === itemId);
  if (item) {
    ensureItemDefaults(item);
    syncItemStyle(item);
    const connectors = getItemConnectors(item);
    item.connectors.in.x = connectors.in.x;
    item.connectors.in.y = connectors.in.y;
    item.connectors.out.x = connectors.out.x;
    item.connectors.out.y = connectors.out.y;
  }
};

const connectionPaths = computed(() => {
  return connections.value.map(conn => {
    const fromItem = items.value.find(i => i.id === conn.from.id);
    const toItem = items.value.find(i => i.id === conn.to.id);
    if (!fromItem || !toItem) return '';

    const p1 = fromItem.connectors[conn.from.type];
    const p2 = toItem.connectors[conn.to.type];

    // Do not draw line if snapped (endpoints overlap)
    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    if (dist < 1) return '';

    const fromLayout = fromItem.autoLayout;
    const toLayout = toItem.autoLayout;
    const hasLayoutRows = fromLayout && toLayout && typeof fromLayout.row === 'number' && typeof toLayout.row === 'number';

    if (hasLayoutRows && fromLayout.row !== toLayout.row) {
      const upperIsFrom = fromLayout.row < toLayout.row;
      const upperItem = upperIsFrom ? fromItem : toItem;
      const lowerItem = upperIsFrom ? toItem : fromItem;
      const upperDims = getItemDimensions(upperItem);
      const upperTop = parseFloat(upperItem.style.top) || 0;
      const lowerTop = parseFloat(lowerItem.style.top) || 0;
      const upperBottom = upperTop + upperDims.height;
      let safeY = (upperBottom + lowerTop) / 2;
      const minGap = 20;
      if (safeY - upperBottom < minGap / 2) {
        safeY = upperBottom + minGap / 2;
      }
      if (lowerTop - safeY < minGap / 2) {
        safeY = lowerTop - minGap / 2;
      }
      return `M ${p1.x} ${p1.y} L ${p1.x} ${safeY} L ${p2.x} ${safeY} L ${p2.x} ${p2.y}`;
    }

    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  });
});

// Parallel dynamic layout helper
function getParallelLayout(item) {
  const branchCount = Math.max(1, Array.isArray(item.branches) ? item.branches.length : 0);
  const branchHeight = 50;
  const spacing = 10;
  const margin = 10;
  const branchWidth = getAdaptiveContainerWidth(item);
  const entryLength = 50;
  const branchGap = 20;
  const exitLength = 50;

  const leftBusX = entryLength;
  const branchStartX = leftBusX + branchGap;
  const branchEndX = branchStartX + branchWidth;
  const rightBusX = branchEndX + branchGap;
  const totalWidth = rightBusX + exitLength;

  const height = margin + branchCount * branchHeight + (branchCount - 1) * spacing + margin;
  const centerY = height / 2;
  const branchTops = Array.from({ length: branchCount }, (_, i) => margin + i * (branchHeight + spacing));
  const branchCenters = branchTops.map(t => t + branchHeight / 2);

  return {
    height,
    centerY,
    branchTops,
    branchCenters,
    branchHeight,
    branchWidth,
    branchStartX,
    branchEndX,
    leftBusX,
    rightBusX,
    totalWidth,
  };
}

// Redundancy dynamic layout helper (fixed overall size but variable branch centers)
function getRedundancyLayout(item) {
  const branchCount = Math.max(1, Array.isArray(item.branches) ? item.branches.length : 0);
  const branchHeight = 40;
  const baseCenterY = 110;
  const branchWidth = getAdaptiveContainerWidth(item);
  const entryLength = 30;
  const branchGap = 20;
  const circleGap = 50;
  const exitLength = 30;
  const circleRadius = 30;

  const branchStartX = entryLength + branchGap;
  const branchEndX = branchStartX + branchWidth;
  const circleCenterX = branchEndX + circleGap;
  const outputEndX = circleCenterX + circleRadius + exitLength;

  const minY = 35;
  const maxY = 185;
  let branchCenters;
  if (branchCount === 1) {
    branchCenters = [baseCenterY];
  } else {
    const spacing = (maxY - minY) / (branchCount - 1);
    branchCenters = Array.from({ length: branchCount }, (_, i) => minY + i * spacing);
  }
  const branchTops = branchCenters.map(cy => cy - branchHeight / 2);

  const height = baseCenterY * 2;

  return {
    branchCenters,
    branchTops,
    branchHeight,
    branchStartX,
    branchEndX,
    branchWidth: branchWidth,
    entryLength,
    circleCenterX,
    circleRadius,
    outputEndX,
    baseCenterY,
    totalWidth: outputEndX,
    height,
  };
}

const persistState = () => {
  if (restoringState || typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const payload = {
      items: items.value,
      connections: connections.value,
      idCounter,
      componentInstanceCounter,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('保存建模画布状态失败:', error);
  }
};

watch(items, () => {
  items.value.forEach(it => updateItemConnectors(it.id));
  persistState();
}, { deep: true });

watch(connections, () => {
  persistState();
}, { deep: true });

</script>

<style scoped>
.modeling-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: white;
  border: 1px solid #ccc;
  overflow: auto; /* Important for positioning */
  user-select: none; /* Prevent text selection while dragging */
  /* 添加网格背景 */
  background-image:
    linear-gradient(to right, #f0f0f0 1px, transparent 1px),
    linear-gradient(to bottom, #f0f0f0 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Custom Scrollbar */
.modeling-canvas::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.modeling-canvas::-webkit-scrollbar-track {
  background: transparent;
}

.modeling-canvas::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.modeling-canvas::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.canvas-content {
  min-width: 3000px;
  min-height: 3000px;
  position: relative;
}

.connection-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allows clicking through the SVG */
}

.group-overlay {
  position: absolute;
  border: 2px dashed #888;
  pointer-events: auto;
  background: rgba(0,0,0,0.02);
  box-sizing: border-box;
  cursor: move;
}

.canvas-item {
  background-color: transparent;
  cursor: grab;
}
.canvas-item.is-dragging {
  cursor: grabbing;
  opacity: 0.8;
}
.canvas-item:hover {
  outline: 2px dashed blue;
}

.component-container {
  padding: 5px;
  border: 1px dashed #666;
  min-height: 40px;
  min-width: 80px;
  background-color: #f9f9f9;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 4px;
  align-items: stretch;
}
.dropped-component {
  padding: 2px 4px;
  margin-top: 0;
  text-align: center;
  word-break: break-word;
  white-space: normal;
  line-height: 1.25;
  width: 100%;
  align-self: stretch;
  background: none;
  border: none;
}

/* Redundancy Model Styles */
.redundancy-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.redundancy-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.redundancy-branches {
  /* converted to absolute children; container positioning set inline */
}
.redundancy-branches .component-container {
  height: 40px;
}

/* Parallel Model Styles */
.parallel {
  width: auto;
}
.parallel-container {
  position: relative;
  width: 100%;
  /* height set inline */
}
.parallel-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.parallel-branches {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.series-container {
  position: relative;
}

.series-box {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 2px;
}

.series-box .dropped-component {
  margin-top: 0;
}

.series-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.context-menu {
  position: absolute;
  background-color: #fff;
  border: 1px solid #d0d0d0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  min-width: 120px;
  z-index: 50;
  border-radius: 4px;
  overflow: hidden;
}

.context-menu button {
  background: none;
  border: none;
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}

.context-menu button:hover {
  background-color: #f0f0f0;
}

.context-menu button.danger {
  color: #c0392b;
}
</style>
