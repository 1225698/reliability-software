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
        stroke-width="1"
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
            <path :d="`M 0 ${getRedundancyLayout(item).baseCenterY} L ${getRedundancyLayout(item).entryLength} ${getRedundancyLayout(item).baseCenterY}`" fill="none" stroke="black" stroke-width="1"/>
            <template v-for="(cy,i) in getRedundancyLayout(item).branchCenters" :key="i">
              <path :d="`M ${getRedundancyLayout(item).entryLength} ${getRedundancyLayout(item).baseCenterY} L ${getRedundancyLayout(item).branchStartX} ${cy}`" fill="none" stroke="black" stroke-width="1" />
              <path :d="`M ${getRedundancyLayout(item).branchEndX} ${cy} L ${getRedundancyLayout(item).circleCenterX - getRedundancyLayout(item).circleRadius} ${getRedundancyLayout(item).baseCenterY}`" fill="none" stroke="black" stroke-width="1" />
            </template>
            <circle :cx="getRedundancyLayout(item).circleCenterX" :cy="getRedundancyLayout(item).baseCenterY" :r="getRedundancyLayout(item).circleRadius" fill="white" stroke="black" stroke-width="1"/>
            <text :x="getRedundancyLayout(item).circleCenterX" :y="getRedundancyLayout(item).baseCenterY + 5" text-anchor="middle" font-size="16">{{ item.k }}/{{ item.n }}</text>
            <line :x1="getRedundancyLayout(item).circleCenterX + getRedundancyLayout(item).circleRadius" :y1="getRedundancyLayout(item).baseCenterY" :x2="getRedundancyLayout(item).outputEndX" :y2="getRedundancyLayout(item).baseCenterY" stroke="black" stroke-width="1"/>
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
            <path :d="`M 0 ${getParallelLayout(item).centerY} L ${getParallelLayout(item).leftBusX} ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="1"/>
            <path :d="`M ${getParallelLayout(item).rightBusX} ${getParallelLayout(item).centerY} L ${getParallelLayout(item).totalWidth} ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="1"/>
            <template v-for="(cy, i) in getParallelLayout(item).branchCenters" :key="i">
              <path :d="`M ${getParallelLayout(item).leftBusX} ${getParallelLayout(item).centerY} L ${getParallelLayout(item).leftBusX} ${cy} L ${getParallelLayout(item).branchStartX} ${cy}`" fill="none" stroke="black" stroke-width="1"/>
              <path :d="`M ${getParallelLayout(item).branchEndX} ${cy} L ${getParallelLayout(item).rightBusX} ${cy} L ${getParallelLayout(item).rightBusX} ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="1"/>
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
              stroke-width="1"
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

      <!-- Ellipsis Model -->
      <template v-else-if="item.modelType === 'ellipsis'">
        <div class="ellipsis-box" :style="{ width: '100px', height: '50px', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontSize: '20px', letterSpacing: '4px' }">
          ......
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

      <!-- Repetition Bracket (Single Item) -->
      <div v-if="item.repetition && item.repetition > 1" class="repetition-bracket" :style="{ position: 'absolute', top: getItemDimensions(item).height + 'px', left: 0, width: getItemDimensions(item).width + 'px', height: '30px', pointerEvents: 'none' }">
         <svg :width="getItemDimensions(item).width" height="40" style="overflow: visible;">
             <path :d="`M 10 5 L 20 25 L ${getItemDimensions(item).width - 20} 25 L ${getItemDimensions(item).width - 10} 5`" stroke="#333" stroke-width="1" fill="none" />
             <rect :x="getItemDimensions(item).width/2 - 20" y="25" width="40" height="18" rx="4" fill="white" stroke="#333" />
             <text :x="getItemDimensions(item).width/2" y="38" text-anchor="middle" font-size="11">n={{ item.repetition }}</text>
         </svg>
      </div>
    </div>

    <!-- Collapsed Group Brackets -->
    <div v-for="group in collapsedGroups" :key="group.id"
         class="repetition-bracket-group"
         :style="{ position: 'absolute', left: group.rect.x + 'px', top: (group.rect.y + group.rect.height) + 'px', width: group.rect.width + 'px', height: '60px', pointerEvents: 'none' }">
         <svg :width="group.rect.width" height="60" style="overflow: visible;">
             <template v-if="group.connectionType === 'voting'">
                <line :x1="group.rect.width/2" y1="0" :x2="group.rect.width/2" y2="20" stroke="#333" stroke-width="1" />
                <circle :cx="group.rect.width/2" cy="35" r="15" fill="white" stroke="#333" stroke-width="1" />
                <text :x="group.rect.width/2" y="39" text-anchor="middle" font-size="11">{{ group.votingK }}/{{ group.count }}</text>
                <path :d="`M 10 0 L ${group.rect.width - 10} 0`" stroke="#333" stroke-width="1" fill="none" />
             </template>
             <template v-else>
                <path :d="`M 10 5 L 20 25 L ${group.rect.width - 20} 25 L ${group.rect.width - 10} 5`" stroke="#333" stroke-width="1" fill="none" />
                <rect :x="group.rect.width/2 - 20" y="25" width="40" height="18" rx="4" fill="white" stroke="#333" />
                <text :x="group.rect.width/2" y="38" text-anchor="middle" font-size="11">n={{ group.count }}</text>
             </template>
         </svg>
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
      <button type="button" @click="onCopyMultipleItem">复制多项</button>
      <button type="button" class="danger" @click="onDeleteItem">删除</button>
    </div>

    <!-- Copy Multiple Dialog -->
    <div v-if="showCopyMultipleDialog" class="modal-overlay" @click.self="showCopyMultipleDialog = false">
      <div class="modal-content">
        <h3>复制多项</h3>
        <div class="form-group">
          <label>复制数量:</label>
          <input type="number" v-model.number="copyMultipleConfig.count" min="2" max="100" />
        </div>
        <div class="form-group">
          <label>显示方式:</label>
          <div class="radio-group">
            <label><input type="radio" v-model="copyMultipleConfig.mode" value="expand" /> 展开 (创建多个副本)</label>
            <label><input type="radio" v-model="copyMultipleConfig.mode" value="collapse" /> 收拢 (单个聚合视图)</label>
          </div>
        </div>

        <div class="form-group" v-if="copyMultipleConfig.mode === 'collapse'">
          <label>连接方式:</label>
          <div class="radio-group">
            <label><input type="radio" v-model="copyMultipleConfig.connectionType" value="series" /> 串联 (n=数量)</label>
            <label><input type="radio" v-model="copyMultipleConfig.connectionType" value="voting" /> 表决 (k/n)</label>
          </div>
        </div>

        <div class="form-group" v-if="copyMultipleConfig.mode === 'collapse' && copyMultipleConfig.connectionType === 'voting'">
          <label>表决�?(k):</label>
          <input type="number" v-model.number="copyMultipleConfig.votingK" min="1" :max="copyMultipleConfig.count" />
        </div>

        <div class="preview-area">
           <div class="preview-label">预览:</div>
           <div class="preview-canvas">
              <div v-if="copyMultipleConfig.mode === 'collapse'" class="preview-collapsed">
                 <div class="preview-item-box">
                    {{ copyMultipleConfig.targetItem?.name || (copyMultipleConfig.isGroup ? '组合容器' : '组件') }}
                 </div>
                 <div class="preview-bracket">
                    <svg width="120" height="60" style="overflow: visible;">
                       <template v-if="copyMultipleConfig.connectionType === 'voting'">
                          <line x1="60" y1="0" x2="60" y2="20" stroke="#333" stroke-width="1" />
                          <circle cx="60" cy="35" r="15" fill="white" stroke="#333" stroke-width="1" />
                          <text x="60" y="39" text-anchor="middle" font-size="11">{{ copyMultipleConfig.votingK }}/{{ copyMultipleConfig.count }}</text>
                          <path d="M 10 0 L 110 0" stroke="#333" stroke-width="1" fill="none" />
                       </template>
                       <template v-else>
                          <path d="M 10 5 L 20 20 L 100 20 L 110 5" stroke="#333" stroke-width="1" fill="none" />
                          <rect x="45" y="20" width="30" height="18" rx="4" fill="white" stroke="#333" />
                          <text x="60" y="33" text-anchor="middle" font-size="11">n={{ copyMultipleConfig.count }}</text>
                       </template>
                    </svg>
                 </div>
              </div>
              <div v-else class="preview-expanded">
                 <div v-for="i in Math.min(copyMultipleConfig.count, 4)" :key="i" class="preview-item-box small">
                    {{ copyMultipleConfig.targetItem?.name || (copyMultipleConfig.isGroup ? '组合容器' : '组件') }}
                 </div>
                 <div v-if="copyMultipleConfig.count > 4" style="align-self: center;">...</div>
              </div>
           </div>
        </div>

        <div class="modal-actions">
          <button @click="showCopyMultipleDialog = false">取消</button>
          <button class="primary" @click="confirmCopyMultiple">确定</button>
        </div>
      </div>
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
const draggedPeers = ref([]);

const collapsedGroups = computed(() => {
  const groups = {};
  items.value.forEach(item => {
    if (item.collapsedInfo) {
      const gid = item.collapsedInfo.id;
      if (!groups[gid]) {
        groups[gid] = {
           id: gid,
           count: item.collapsedInfo.count,
           connectionType: item.collapsedInfo.connectionType,
           votingK: item.collapsedInfo.votingK,
           items: []
        };
      }
      groups[gid].items.push(item);
    }
  });
  return Object.values(groups).map(g => {
     if (g.items.length === 0) return null;
     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
     g.items.forEach(item => {
        const dims = getItemDimensions(item);
        const x = parseFloat(item.style.left) || 0;
        const y = parseFloat(item.style.top) || 0;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + dims.width);
        maxY = Math.max(maxY, y + dims.height);
     });
     return {
        id: g.id,
        count: g.count,
        connectionType: g.connectionType,
        votingK: g.votingK,
        rect: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
     };
  }).filter(Boolean);
});

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
            if (targetItem.modelType === 'redundancy') {
              // Redundancy: Fill all branches with numbered components
              targetItem.branches.forEach((branch, i) => {
                const comp = createComponentInstance(data.component);
                comp.name = `${data.component.name}${i + 1}`;
                branch.components = [comp];
              });
            } else {
              targetItem.branches[index].components.push(createComponentInstance(data.component));
            }
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

  if (item.collapsedInfo) {
    const peers = items.value.filter(i => i.collapsedInfo?.id === item.collapsedInfo.id);
    peers.forEach(p => {
      removeItemConnections(p.id);
    });
    items.value = items.value.filter(i => i.collapsedInfo?.id !== item.collapsedInfo.id);
    emit('select', null);
    return;
  }

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

const showCopyMultipleDialog = ref(false);
const copyMultipleConfig = ref({
  count: 2,
  mode: 'expand',
  targetItem: null,
  connectionType: 'series',
  votingK: 1
});

const onCopyMultipleItem = () => {
  if (contextMenu.value.targetType === 'group') {
    // For groups, we currently only support "Expand" mode implicitly or we can show dialog.
    // Let's show dialog but maybe disable collapse if it's too complex, or implement it.
    // For now, let's support Expand for groups.
    copyMultipleConfig.value = {
      count: 2,
      mode: 'expand',
      targetItem: null, // targetItem is null for groups
      isGroup: true,
      groupIds: contextMenu.value.groupIds || [],
      connectionType: 'series',
      votingK: 1
    };
    showCopyMultipleDialog.value = true;
    hideContextMenu();
    return;
  }

  const source = getContextMenuItem();
  if (!source) {
    hideContextMenu();
    return;
  }
  hideContextMenu();
  copyMultipleConfig.value = {
    count: 2,
    mode: 'expand',
    targetItem: source,
    isGroup: false,
    connectionType: 'series',
    votingK: 1
  };
  showCopyMultipleDialog.value = true;
};

const confirmCopyMultiple = () => {
  const { count, mode, targetItem, isGroup, groupIds, connectionType, votingK } = copyMultipleConfig.value;

  if (isGroup) {
    if (mode === 'expand') {
       for (let i = 0; i < count; i++) {
          // Copy group logic
          const uniqueIds = Array.from(new Set(groupIds));
          if (uniqueIds.length === 0) continue;

          const cloneMap = new Map();
          const clones = [];
          const offset = (i + 1) * 20;

          uniqueIds.forEach(id => {
            const item = items.value.find(it => it.id === id);
            if (!item) return;
            const clone = cloneItem(item);
            // Apply offset
            const rawLeft = parseFloat(clone.style.left) || 0;
            const rawTop = parseFloat(clone.style.top) || 0;
            clone.style.left = `${rawLeft + offset}px`;
            clone.style.top = `${rawTop + offset}px`;

            clones.push(clone);
            cloneMap.set(id, clone.id);
          });

          if (!clones.length) continue;
          clones.forEach(clone => items.value.push(clone));

          nextTick(() => {
            clones.forEach(clone => updateItemConnectors(clone.id));
            // Recreate internal connections
            connections.value.forEach(conn => {
              const fromCloneId = cloneMap.get(conn.from.id);
              const toCloneId = cloneMap.get(conn.to.id);
              if (fromCloneId && toCloneId) {
                 connections.value.push({
                    from: { id: fromCloneId, type: conn.from.type },
                    to: { id: toCloneId, type: conn.to.type }
                 });
                 const fromItem = items.value.find(it => it.id === fromCloneId);
                 const toItem = items.value.find(it => it.id === toCloneId);
                 if (fromItem) fromItem.connectors[conn.from.type].snapped = true;
                 if (toItem) toItem.connectors[conn.to.type].snapped = true;
              }
            });
          });
       }
    } else {
       // Collapse mode for Groups
       if (count < 3) {
          window.alert('收拢模式至少需要3项');
          showCopyMultipleDialog.value = false;
          return;
       }

       const uniqueIds = Array.from(new Set(groupIds));
       if (uniqueIds.length === 0) return;

       // Calculate source group bounds
       let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
       const sourceItems = [];
       uniqueIds.forEach(id => {
          const item = items.value.find(it => it.id === id);
          if (item) {
             sourceItems.push(item);
             const dims = getItemDimensions(item);
             const x = parseFloat(item.style.left) || 0;
             const y = parseFloat(item.style.top) || 0;
             minX = Math.min(minX, x);
             minY = Math.min(minY, y);
             maxX = Math.max(maxX, x + dims.width);
             maxY = Math.max(maxY, y + dims.height);
          }
       });
       const groupWidth = maxX - minX;
       const groupHeight = maxY - minY;
       const collapsedId = `group-collapse-${Date.now()}`;
       const gap = 40;
       const ellipsisWidth = 100;
       const ellipsisHeight = 50;

       // Helper to clone a group with offset
       const cloneGroup = (offsetX, offsetY, role) => {
          const map = new Map();
          const clones = [];
          sourceItems.forEach(item => {
             const clone = cloneItem(item);
             const ox = (parseFloat(item.style.left) || 0) - minX;
             const oy = (parseFloat(item.style.top) || 0) - minY;
             clone.style.left = `${minX + offsetX + ox}px`;
             clone.style.top = `${minY + offsetY + oy}px`;
             clone.collapsedInfo = { id: collapsedId, count, role, connectionType, votingK };
             clones.push(clone);
             map.set(item.id, clone.id);
          });
          return { clones, map };
       };

       // 1. Start Group
       const startOffset = 20;
       const { clones: startClones, map: startMap } = cloneGroup(startOffset, 20, 'start');

       // 2. Middle Item (Ellipsis)
       const ellipsisX = minX + startOffset + groupWidth + gap;
       const ellipsisY = minY + 20 + (groupHeight - ellipsisHeight) / 2;
       const middleItem = {
          id: `item-${idCounter++}`,
          modelType: 'ellipsis',
          name: '...',
          style: {
             position: 'absolute',
             left: `${ellipsisX}px`,
             top: `${ellipsisY}px`,
             zIndex: 1
          },
          connectors: {
             in: { x: 0, y: 0, snapped: false },
             out: { x: 0, y: 0, snapped: false }
          },
          collapsedInfo: { id: collapsedId, count, role: 'middle', connectionType, votingK }
       };

       // 3. End Group
       const endOffset = startOffset + groupWidth + gap + ellipsisWidth + gap;
       const { clones: endClones, map: endMap } = cloneGroup(endOffset, 20, 'end');

       // Add all to items
       items.value.push(...startClones, middleItem, ...endClones);

       nextTick(() => {
          // Update connectors
          [...startClones, middleItem, ...endClones].forEach(i => updateItemConnectors(i.id));

          // Recreate internal connections for Start Group
          connections.value.forEach(conn => {
             const fromId = startMap.get(conn.from.id);
             const toId = startMap.get(conn.to.id);
             if (fromId && toId) {
                connections.value.push({ from: { id: fromId, type: conn.from.type }, to: { id: toId, type: conn.to.type } });
                const f = items.value.find(i => i.id === fromId);
                const t = items.value.find(i => i.id === toId);
                if (f) f.connectors[conn.from.type].snapped = true;
                if (t) t.connectors[conn.to.type].snapped = true;
             }
          });

          // Recreate internal connections for End Group
          connections.value.forEach(conn => {
             const fromId = endMap.get(conn.from.id);
             const toId = endMap.get(conn.to.id);
             if (fromId && toId) {
                connections.value.push({ from: { id: fromId, type: conn.from.type }, to: { id: toId, type: conn.to.type } });
                const f = items.value.find(i => i.id === fromId);
                const t = items.value.find(i => i.id === toId);
                if (f) f.connectors[conn.from.type].snapped = true;
                if (t) t.connectors[conn.to.type].snapped = true;
             }
          });

          // Try to connect Start -> Middle -> End
          // Strategy: Find rightmost of Start, leftmost of End
          let rightmostStart = null;
          let maxXVal = -Infinity;
          startClones.forEach(c => {
             const dims = getItemDimensions(c);
             const r = (parseFloat(c.style.left)||0) + dims.width;
             if (r > maxXVal) { maxXVal = r; rightmostStart = c; }
          });

          let leftmostEnd = null;
          let minXVal = Infinity;
          endClones.forEach(c => {
             const l = parseFloat(c.style.left)||0;
             if (l < minXVal) { minXVal = l; leftmostEnd = c; }
          });

          if (rightmostStart) {
             connections.value.push({ from: { id: rightmostStart.id, type: 'out' }, to: { id: middleItem.id, type: 'in' } });
             rightmostStart.connectors.out.snapped = true;
             middleItem.connectors.in.snapped = true;
          }
          if (leftmostEnd) {
             connections.value.push({ from: { id: middleItem.id, type: 'out' }, to: { id: leftmostEnd.id, type: 'in' } });
             middleItem.connectors.out.snapped = true;
             leftmostEnd.connectors.in.snapped = true;
          }
       });
    }
    showCopyMultipleDialog.value = false;
    return;
  }

  if (!targetItem || count < 2) {
    showCopyMultipleDialog.value = false;
    return;
  }

  if (mode === 'expand') {
    for (let i = 0; i < count; i++) {
      const copy = cloneItem(targetItem);
      // Offset each copy slightly more
      const offset = (i + 1) * 20;
      const rawLeft = parseFloat(targetItem.style.left) || 0;
      const rawTop = parseFloat(targetItem.style.top) || 0;
      copy.style.left = `${rawLeft + offset}px`;
      copy.style.top = `${rawTop + offset}px`;
      items.value.push(copy);
      nextTick(() => updateItemConnectors(copy.id));
    }
  } else {
    // Collapse mode
    if (count < 3) {
      window.alert('收拢模式至少需要3项');
      showCopyMultipleDialog.value = false;
      return;
    }

    const groupId = `group-${Date.now()}`;
    const rawLeft = parseFloat(targetItem.style.left) || 0;
    const rawTop = parseFloat(targetItem.style.top) || 0;
    const dims = getItemDimensions(targetItem);
    const gap = 40;
    const ellipsisWidth = 100;
    const ellipsisHeight = 50;

    // 1. Start Item
    const startItem = cloneItem(targetItem);
    startItem.style.left = `${rawLeft + 20}px`;
    startItem.style.top = `${rawTop + 20}px`;
    startItem.collapsedInfo = { id: groupId, count, role: 'start', connectionType, votingK };

    // 2. Middle Item (Ellipsis)
    const middleItem = {
      id: `item-${idCounter++}`,
      modelType: 'ellipsis',
      name: '...',
      style: {
        position: 'absolute',
        left: `${rawLeft + 20 + dims.width + gap}px`,
        top: `${rawTop + 20 + (dims.height - ellipsisHeight) / 2}px`,
        zIndex: 1
      },
      connectors: {
        in: { x: 0, y: 0, snapped: false },
        out: { x: 0, y: 0, snapped: false }
      },
      collapsedInfo: { id: groupId, count, role: 'middle', connectionType, votingK }
    };

    // 3. End Item
    const endItem = cloneItem(targetItem);
    endItem.style.left = `${rawLeft + 20 + dims.width + gap + ellipsisWidth + gap}px`;
    endItem.style.top = `${rawTop + 20}px`;
    endItem.collapsedInfo = { id: groupId, count, role: 'end', connectionType, votingK };

    items.value.push(startItem, middleItem, endItem);

    nextTick(() => {
      updateItemConnectors(startItem.id);
      updateItemConnectors(middleItem.id);
      updateItemConnectors(endItem.id);

      // Add connections: Start -> Middle -> End
      connections.value.push({
        from: { id: startItem.id, type: 'out' },
        to: { id: middleItem.id, type: 'in' }
      });
      connections.value.push({
        from: { id: middleItem.id, type: 'out' },
        to: { id: endItem.id, type: 'in' }
      });

      startItem.connectors.out.snapped = true;
      middleItem.connectors.in.snapped = true;
      middleItem.connectors.out.snapped = true;
      endItem.connectors.in.snapped = true;
    });
  }

  showCopyMultipleDialog.value = false;
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
  draggedPeers.value = [];
  if (item.collapsedInfo) {
    draggedPeers.value = items.value.filter(i => i.collapsedInfo?.id === item.collapsedInfo.id && i.id !== item.id);
  }

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

  // Calculate delta for peers
  const oldX = parseFloat(draggedItem.style.left) || 0;
  const oldY = parseFloat(draggedItem.style.top) || 0;

  // Snapping Logic
  potentialSnap.value = null;
  const draggedItemConnectors = getItemConnectors(draggedItem, newX, newY);

  for (const staticItem of items.value) {
    if (staticItem.id === draggedItemId.value) continue;
    // Skip peers in same collapsed group
    if (draggedItem.collapsedInfo && staticItem.collapsedInfo?.id === draggedItem.collapsedInfo.id) continue;

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

  const deltaX = newX - oldX;
  const deltaY = newY - oldY;

  draggedItem.style.left = `${newX}px`;
  draggedItem.style.top = `${newY}px`;
  updateItemConnectors(draggedItem.id);

  // Move peers
  draggedPeers.value.forEach(peer => {
    const px = parseFloat(peer.style.left) || 0;
    const py = parseFloat(peer.style.top) || 0;
    peer.style.left = `${px + deltaX}px`;
    peer.style.top = `${py + deltaY}px`;
    updateItemConnectors(peer.id);
  });

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
  const adj = new Map();
  // 构建邻接表（按模型 id）
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
  let found = null;
  const groups = buildGroups();
  const canvasRect = canvasEl.value.getBoundingClientRect();
  const scrollLeft = canvasEl.value.scrollLeft;
  const scrollTop = canvasEl.value.scrollTop;
  const mx = (event.clientX - canvasRect.left + scrollLeft) / zoomLevel.value;
  const my = (event.clientY - canvasRect.top + scrollTop) / zoomLevel.value;
  const margin = 15; // 靠近阈值
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
  } else if (item.modelType === 'ellipsis') {
    width = 100;
    height = 50;
    inY = 25;
    outY = 25;
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
.component-container:has(.dropped-component) {
  border-style: solid;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.modal-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}
.form-group input[type="number"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.radio-group {
  display: flex;
  gap: 16px;
}
.radio-group label {
  font-weight: normal;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.preview-area {
  margin-top: 20px;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 4px;
  background: #f9f9f9;
}
.preview-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}
.preview-canvas {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  overflow: hidden;
}
.preview-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.preview-item-box {
  border: 1px solid #333;
  padding: 10px 20px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.preview-item-box.small {
  padding: 5px 10px;
  font-size: 12px;
  margin-right: 5px;
  margin-bottom: 0;
}
.preview-expanded {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
}
.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.modal-actions button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}
.modal-actions button.primary {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}
</style>
