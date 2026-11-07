<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <figure class="demo-map">
    <svg
      viewBox="0 0 560 340"
      role="img"
      :aria-label="floorLabel + '合成路網；非真實車站地圖'"
    >
      <title>{{ floorLabel }} 合成路網</title>
      <defs>
        <marker
          id="demo-route-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10Z" fill="var(--demo-accent, #326875)" />
        </marker>
      </defs>
      <rect
        x="0"
        y="0"
        width="560"
        height="340"
        rx="12"
        fill="var(--demo-wash, #f0f8fa)"
      />
      <text x="24" y="32" class="floor-title">{{ floorLabel }} · 合成測試</text>
      <path
        v-for="edge in floorEdges"
        :key="edge.id"
        :d="path(edge.geometry)"
        fill="none"
        stroke="var(--demo-edge, #c5d7dc)"
        stroke-width="10"
        stroke-linecap="round"
      />
      <path
        v-for="edge in routeEdges"
        :key="'route_' + edge.id"
        :d="path(edge.geometry)"
        fill="none"
        :stroke="
          edge.id === currentEdgeId
            ? 'var(--demo-current, #8a501b)'
            : 'var(--demo-accent, #326875)'
        "
        :stroke-width="edge.id === currentEdgeId ? 9 : 5"
        marker-end="url(#demo-route-arrow)"
      />
      <g v-for="node in floorNodes" :key="node.id">
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="node.id === positionNodeId ? 10 : 7"
          :fill="
            node.id === positionNodeId
              ? 'var(--demo-current, #8a501b)'
              : node.id === destinationNodeId
              ? 'var(--demo-destination, #21604d)'
              : 'var(--demo-surface, #fff)'
          "
          stroke="var(--demo-accent, #326875)"
          stroke-width="2"
        />
        <text :x="node.x" :y="node.y + 27" text-anchor="middle">
          {{ graph.messages[node.label_key] }}
        </text>
        <text
          v-if="node.id === positionNodeId"
          :x="node.x"
          :y="node.y - 19"
          text-anchor="middle"
          class="position-label"
        >
          上次確認位置
        </text>
      </g>
    </svg>
    <figcaption>
      粗線：目前指引路段；圓點：路網節點。按「下一步」不會移動上次確認位置。跨層只顯示落點，不跨圖畫線。
    </figcaption>
  </figure>
</template>

<script setup>
/* global defineProps */
import { computed } from "vue";
const props = defineProps({
  graph: { type: Object, required: true },
  floorId: { type: String, required: true },
  route: { type: Object, default: null },
  currentEdgeId: { type: String, default: null },
  positionNodeId: { type: String, default: null },
  destinationNodeId: { type: String, default: null },
});
const floorLabel = computed(() => props.floorId.toUpperCase());
const floorNodes = computed(() =>
  props.graph.nodes.filter((n) => n.floor_id === props.floorId)
);
const floorEdges = computed(() =>
  props.graph.edges.filter(
    (e) =>
      e.geometry.length && floorNodes.value.some((n) => n.id === e.from_node_id)
  )
);
const routeEdges = computed(() =>
  floorEdges.value.filter((e) => props.route?.edgeIds.includes(e.id))
);
const path = (geometry) =>
  geometry.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
</script>

<style scoped>
.demo-map {
  margin: 0;
}
.demo-map svg {
  width: 100%;
  display: block;
}
.demo-map text {
  font: 13px system-ui, sans-serif;
  fill: var(--demo-ink, #263d44);
}
.demo-map .floor-title {
  font-size: 17px;
  font-weight: 700;
}
.demo-map .position-label {
  fill: var(--demo-current, #76400d);
  font-weight: 700;
}
.demo-map figcaption {
  font-size: 0.85rem;
  line-height: 1.6;
  margin-top: 10px;
  color: var(--demo-muted, #465b62);
}
</style>
