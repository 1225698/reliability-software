<template>
  <div
    class="modeling-canvas"
    @mousemove="onCanvasMouseMove"
    @mouseup="onCanvasMouseUp"
    @mouseleave="onCanvasMouseUp"
  >
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
    ></div>

    <!-- Canvas Items -->
    <div
      v-for="item in items"
      :key="item.id"
      :style="item.style"
      :class="['canvas-item', item.modelType, { 'is-dragging': item.id === draggedItemId }]"
      @mousedown.stop="onItemMouseDown(item, $event)"
      @click.stop="onItemClick(item)"
    >
      <!-- Redundancy Model -->
      <template v-if="item.modelType === 'redundancy'">
        <div class="redundancy-container">
          <svg class="redundancy-svg">
            <path d="M 0 110 L 30 110" fill="none" stroke="black" stroke-width="2"/>
            <template v-for="(cy,i) in getRedundancyLayout(item).branchCenters" :key="i">
              <path :d="`M 30 110 L 80 ${cy}`" fill="none" stroke="black" stroke-width="2" />
              <path :d="`M 180 ${cy} L 230 110`" fill="none" stroke="black" stroke-width="2" />
            </template>
            <circle cx="260" cy="110" r="30" fill="white" stroke="black" stroke-width="2"/>
            <text x="260" y="115" text-anchor="middle" font-size="16">{{ item.k }}/{{ item.n }}</text>
            <line x1="290" y1="110" x2="320" y2="110" stroke="black" stroke-width="2"/>
          </svg>
          <div class="redundancy-branches" :style="{ position: 'absolute', top: 0, left: '80px', width: '100px', height: '100%' }">
            <div v-for="(branch, index) in item.branches" :key="branch.id" class="component-container" :data-item-id="item.id" :data-branch-index="index" :style="{ position:'absolute', top: getRedundancyLayout(item).branchTops[index] + 'px', height: getRedundancyLayout(item).branchHeight + 'px', width:'100px' }">
              <div v-for="comp in branch.components" :key="comp.id" class="dropped-component">
                {{ comp.name }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Parallel Model (dynamic) -->
      <template v-else-if="item.modelType === 'parallel'">
        <div class="parallel-container" :style="{ height: getParallelLayout(item).height + 'px' }">
          <svg class="parallel-svg" :style="{ height: getParallelLayout(item).height + 'px' }">
            <path :d="`M 0 ${getParallelLayout(item).centerY} L 50 ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="2"/>
            <path :d="`M 190 ${getParallelLayout(item).centerY} L 240 ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="2"/>
            <template v-for="(cy, i) in getParallelLayout(item).branchCenters" :key="i">
              <path :d="`M 50 ${getParallelLayout(item).centerY} L 50 ${cy} L 70 ${cy}`" fill="none" stroke="black" stroke-width="2"/>
              <path :d="`M 170 ${cy} L 190 ${cy} L 190 ${getParallelLayout(item).centerY}`" fill="none" stroke="black" stroke-width="2"/>
            </template>
          </svg>
          <div class="parallel-branches" :style="{ height: getParallelLayout(item).height + 'px' }">
            <div
              v-for="(branch, bIndex) in item.branches"
              :key="bIndex"
              class="component-container"
              :data-item-id="item.id"
              :data-branch-index="bIndex"
              :style="{ position: 'absolute', top: getParallelLayout(item).branchTops[bIndex] + 'px', left: '70px', width: '100px', height: getParallelLayout(item).branchHeight + 'px' }"
            >
              <div v-for="comp in branch.components" :key="comp.id" class="dropped-component">{{ comp.name }}</div>
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
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';

const items = ref([]);
const connections = ref([]);
let idCounter = 0;

const draggedItemId = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const potentialSnap = ref(null); // { draggedItem, draggedConnectorType, staticItem, staticConnectorType }
const SNAP_THRESHOLD = 20;
const hoveredGroup = ref(null); // { ids:[], bbox }
const groupDrag = ref({ active: false, offset: {x:0,y:0}, startMouse: {x:0,y:0}, startPositions: {} });

// --- Drag and Drop for NEW items from Palette ---
const onCanvasDrop = (event) => {
  event.preventDefault();
  const dataString = event.dataTransfer.getData('application/json');
  if (!dataString) return;

  const data = JSON.parse(dataString);
  const canvasRect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - canvasRect.left;
  const y = event.clientY - canvasRect.top;

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
      newItem.components = [];
      newItem.style = { ...newItem.style, border: '2px solid blue', padding: '10px', minWidth: '100px', minHeight: '50px' };
    }
    items.value.push(newItem);
    nextTick(() => updateItemConnectors(newItem.id));
  } else if (data.type === 'component') {
    const targetElement = document.elementFromPoint(event.clientX, event.clientY);
    const container = targetElement.closest('.component-container');
    if (container) {
      const itemId = container.getAttribute('data-item-id');
      const branchIndex = container.getAttribute('data-branch-index');
      const targetItem = items.value.find(item => item.id === itemId);
      if (targetItem) {
        const branch = branchIndex ? targetItem.branches[parseInt(branchIndex, 10)] : targetItem;
        branch.components.push(data.component);
      }
    }
  }
};

// selection emit
const emit = defineEmits(['select']);
const onItemClick = (item) => emit('select', item);
// Expose to parent if needed, or handle drop here
defineExpose({ onCanvasDrop });


// --- Custom Dragging for EXISTING items on Canvas ---
const onItemMouseDown = (item, event) => {
  // Disconnect the item being dragged
  const connectionsToRemove = [];
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
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  items.value.forEach(i => i.style.zIndex = (i.id === item.id ? 10 : 1));
};

const onCanvasMouseMove = (event) => {
  // Group dragging
  if (groupDrag.value.active) {
    const dx = event.clientX - groupDrag.value.startMouse.x;
    const dy = event.clientY - groupDrag.value.startMouse.y;
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

  const canvasRect = event.currentTarget.getBoundingClientRect();
  let newX = event.clientX - canvasRect.left - dragOffset.value.x;
  let newY = event.clientY - canvasRect.top - dragOffset.value.y;

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
  const canvasRect = event.currentTarget.getBoundingClientRect();
  const mx = event.clientX - canvasRect.left;
  const my = event.clientY - canvasRect.top;
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
  groupDrag.value.startMouse = { x: event.clientX, y: event.clientY };
  groupDrag.value.startPositions = {};
  hoveredGroup.value.ids.forEach(id => {
    const it = items.value.find(i => i.id === id);
    if (it) {
      groupDrag.value.startPositions[id] = { left: parseFloat(it.style.left), top: parseFloat(it.style.top) };
    }
  });
}


// --- Connector and Connection Line Logic ---
const getItemDimensions = (item) => {
  let width, height, inY, outY;
  if (item.modelType === 'parallel') {
    const layout = getParallelLayout(item);
    width = 240; height = layout.height; inY = layout.centerY; outY = layout.centerY;
  } else if (item.modelType === 'redundancy') {
    width = 320; height = 220; inY = 110; outY = 110;
  } else { // Series
    width = 124; height = 74; inY = height / 2; outY = height / 2;
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

    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  });
});

// Parallel dynamic layout helper
function getParallelLayout(item) {
  const branchCount = item.branches.length;
  const branchHeight = 50;
  const spacing = 10;
  const margin = 10;
  const height = margin + branchCount * branchHeight + (branchCount - 1) * spacing + margin;
  const centerY = height / 2;
  const branchTops = Array.from({ length: branchCount }, (_, i) => margin + i * (branchHeight + spacing));
  const branchCenters = branchTops.map(t => t + branchHeight / 2);
  return { height, centerY, branchTops, branchCenters, branchHeight };
}

// Redundancy dynamic layout helper (fixed overall size but variable branch centers)
function getRedundancyLayout(item) {
  const branchCount = item.branches.length;
  const branchHeight = 40;
  // Target symmetric bounds from original static positions (approx): 35 .. 185 around center 110
  const minY = 35;
  const maxY = 185;
  let branchCenters;
  if (branchCount === 1) {
    branchCenters = [110];
  } else {
    const spacing = (maxY - minY) / (branchCount - 1);
    branchCenters = Array.from({ length: branchCount }, (_, i) => minY + i * spacing);
  }
  const branchTops = branchCenters.map(cy => cy - branchHeight / 2);
  return { branchCenters, branchTops, branchHeight };
}

watch(items, () => {
  items.value.forEach(it => updateItemConnectors(it.id));
}, { deep: true });

</script>

<style scoped>
.modeling-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: white;
  border: 1px solid #ccc;
  overflow: hidden; /* Important for positioning */
  user-select: none; /* Prevent text selection while dragging */
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
}
.dropped-component {
  background-color: lightgreen;
  padding: 2px;
  margin-top: 2px;
  text-align: center;
}

/* Redundancy Model Styles */
.redundancy {
  width: 320px;
  height: 220px;
}
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
  width: 240px; /* height dynamic */
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
</style>
