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

    <!-- Canvas Items -->
    <div
      v-for="item in items"
      :key="item.id"
      :style="item.style"
      :class="['canvas-item', item.modelType, { 'is-dragging': item.id === draggedItemId }]"
      @mousedown.stop="onItemMouseDown(item, $event)"
    >
      <!-- Redundancy Model -->
      <template v-if="item.modelType === 'redundancy'">
        <div class="redundancy-container">
          <svg class="redundancy-svg">
            <path d="M 0 110 L 30 110 L 80 35" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 30 110 L 80 85" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 30 110 L 80 135" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 30 110 L 80 185" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 180 35 L 230 110" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 180 85 L 230 110" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 180 135 L 230 110" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 180 185 L 230 110" fill="none" stroke="black" stroke-width="2"/>
            <circle cx="260" cy="110" r="30" fill="white" stroke="black" stroke-width="2"/>
            <text x="260" y="115" text-anchor="middle" font-size="16">{{ item.k }}/{{ item.n }}</text>
            <line x1="290" y1="110" x2="320" y2="110" stroke="black" stroke-width="2"/>
          </svg>
          <div class="redundancy-branches">
            <div v-for="(branch, index) in item.branches" :key="branch.id" class="component-container" :data-item-id="item.id" :data-branch-index="index">
              <div v-for="comp in branch.components" :key="comp.id" class="dropped-component">
                {{ comp.name }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Parallel Model -->
      <template v-else-if="item.modelType === 'parallel'">
        <div class="parallel-container">
          <svg class="parallel-svg">
            <path d="M 0 75 L 50 75" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 190 75 L 240 75" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 50 75 L 50 35 L 70 35" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 170 35 L 190 35 L 190 75" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 50 75 L 50 115 L 70 115" fill="none" stroke="black" stroke-width="2"/>
            <path d="M 170 115 L 190 115 L 190 75" fill="none" stroke="black" stroke-width="2"/>
          </svg>
          <div class="parallel-branches">
            <div class="component-container" :data-item-id="item.id" data-branch-index="0">
              <div v-for="comp in item.branches[0].components" :key="comp.id" class="dropped-component">
                {{ comp.name }}
              </div>
            </div>
            <div class="component-container" :data-item-id="item.id" data-branch-index="1">
              <div v-for="comp in item.branches[1].components" :key="comp.id" class="dropped-component">
                {{ comp.name }}
              </div>
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
import { ref, computed, nextTick } from 'vue';

const items = ref([]);
const connections = ref([]);
let idCounter = 0;

const draggedItemId = ref(null);
const dragOffset = ref({ x: 0, y: 0 });
const potentialConnection = ref(null);
const SNAP_THRESHOLD = 20;

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
      style: {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 1,
      },
      connectors: { in: {x:0, y:0}, out: {x:0, y:0} }
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

// Expose to parent if needed, or handle drop here
defineExpose({ onCanvasDrop });


// --- Custom Dragging for EXISTING items on Canvas ---
const onItemMouseDown = (item, event) => {
  // Remove any existing connections to this item
  connections.value = connections.value.filter(c => c.from !== item.id && c.to !== item.id);

  draggedItemId.value = item.id;
  const rect = event.currentTarget.getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  item.style.zIndex = 10; // Bring to front
};

const onCanvasMouseMove = (event) => {
  if (!draggedItemId.value) return;

  const draggedItem = items.value.find(i => i.id === draggedItemId.value);
  if (!draggedItem) return;

  const canvasRect = event.currentTarget.getBoundingClientRect();
  let newX = event.clientX - canvasRect.left - dragOffset.value.x;
  let newY = event.clientY - canvasRect.top - dragOffset.value.y;

  // Snapping Logic
  potentialConnection.value = null;
  const draggedConnector = getItemConnectors(draggedItem).out;

  for (const staticItem of items.value) {
    if (staticItem.id === draggedItemId.value) continue;

    const staticConnector = getItemConnectors(staticItem).in;
    const dist = Math.hypot(draggedConnector.x - staticConnector.x, draggedConnector.y - staticConnector.y);

    if (dist < SNAP_THRESHOLD) {
      newX -= (draggedConnector.x - staticConnector.x);
      newY -= (draggedConnector.y - staticConnector.y);
      potentialConnection.value = { from: draggedItem.id, to: staticItem.id };
      break; // Snap to the first one found
    }
  }

  draggedItem.style.left = `${newX}px`;
  draggedItem.style.top = `${newY}px`;
  updateItemConnectors(draggedItem.id);
};

const onCanvasMouseUp = () => {
  if (!draggedItemId.value) return;

  const draggedItem = items.value.find(i => i.id === draggedItemId.value);
  if (draggedItem) {
    draggedItem.style.zIndex = 1;
  }

  if (potentialConnection.value) {
    // Avoid duplicate connections
    if (!connections.value.some(c => c.from === potentialConnection.value.from && c.to === potentialConnection.value.to)) {
      connections.value.push(potentialConnection.value);
    }
  }

  draggedItemId.value = null;
  potentialConnection.value = null;
};


// --- Connector and Connection Line Logic ---
const getItemConnectors = (item) => {
  const left = parseFloat(item.style.left);
  const top = parseFloat(item.style.top);
  let width, height, inY, outY;

  // These dimensions should match the CSS
  if (item.modelType === 'parallel') {
    width = 240; height = 150; inY = 75; outY = 75;
  } else if (item.modelType === 'redundancy') {
    width = 320; height = 220; inY = 110; outY = 110;
  } else { // Series
    width = 124; height = 74; inY = height / 2; outY = height / 2;
  }

  return {
    in: { x: left, y: top + inY },
    out: { x: left + width, y: top + outY },
  };
};

const updateItemConnectors = (itemId) => {
  const item = items.value.find(i => i.id === itemId);
  if (item) {
    item.connectors = getItemConnectors(item);
  }
};

const connectionPaths = computed(() => {
  return connections.value.map(conn => {
    const fromItem = items.value.find(i => i.id === conn.from);
    const toItem = items.value.find(i => i.id === conn.to);
    if (!fromItem || !toItem) return '';

    const p1 = fromItem.connectors.out;
    const p2 = toItem.connectors.in;
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  });
});

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
  position: absolute;
  top: 10px;
  left: 80px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100px;
}
.redundancy-branches .component-container {
  height: 40px;
}

/* Parallel Model Styles */
.parallel {
  width: 240px;
  height: 150px;
}
.parallel-container {
  position: relative;
  width: 100%;
  height: 100%;
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
  top: 10px;
  left: 70px;
  width: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 130px;
}
.parallel-branches .component-container {
  height: 50px;
}
</style>
