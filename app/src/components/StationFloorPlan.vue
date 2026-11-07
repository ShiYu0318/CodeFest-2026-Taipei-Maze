<template>
  <g aria-hidden="true">
    <g v-if="floor === 'B2'" transform="translate(512.5 960) scale(.5)">
      <StationB2Plan :outline-only="outlineOnly" />
    </g>
    <g
      v-else
      :transform="
        plan.offset ? `translate(${plan.offset.join(' ')})` : undefined
      "
    >
      <path
        v-for="path in plan.outlines"
        :key="path"
        class="plan-outline"
        :d="path"
        fill-rule="evenodd"
      />
      <g v-if="!outlineOnly">
        <path
          v-for="[kind, path] in plan.regions"
          :key="path"
          :class="`plan-${kind}`"
          :d="path"
        />
        <text
          v-for="[x, y, label] in plan.labels"
          :key="label"
          class="plan-label"
          :x="x"
          :y="y"
          >{{ label }}</text
        >
      </g>
    </g>
    <g v-if="!outlineOnly">
      <g
        v-for="point in stairways"
        :key="point.id"
        class="plan-stairs"
        :transform="`translate(${point.x} ${point.y}) rotate(${point.angle})`"
      >
        <rect x="-15" y="-10" width="30" height="20" rx="2" />
        <path
          v-if="
            !pointTypes(point).includes('escalator') ||
            pointTypes(point).includes('stairs')
          "
          d="M-9-10v20m6-20v20m6-20v20m6-20v20"
        />
        <path
          v-if="
            pointTypes(point).includes('escalator') ||
            pointTypes(point).includes('stairs-escalator')
          "
          d="M-15 0h30"
        />
      </g>
    </g>
  </g>
</template>

<script>
import StationB2Plan from "./StationB2Plan.vue";
import { plans } from "../views/station-floor-plans";
import stationData from "../views/station-points.json";

const stairwayTypes = new Set([
  "stairs",
  "escalator",
  "stairs-escalator",
  "stairway",
]);

export default {
  components: { StationB2Plan },
  props: { floor: { type: String, required: true }, outlineOnly: Boolean },
  computed: {
    plan() {
      return plans[this.floor];
    },
    stairways() {
      return stationData.points[this.floor].filter((point) =>
        this.pointTypes(point).some((type) => stairwayTypes.has(type))
      );
    },
  },
  methods: {
    pointTypes(point) {
      return Array.isArray(point.type) ? point.type : [point.type];
    },
  },
};
</script>

<style scoped>
.plan-outline {
  fill: var(--tp-primary-100);
  stroke: var(--tp-primary-700);
  stroke-width: 3;
  stroke-linejoin: round;
}
.plan-context {
  fill: var(--tp-gray-50);
}
.plan-red {
  fill: var(--tp-secondary-200);
}
.plan-blue {
  fill: var(--tp-primary-200);
}
.plan-stairs {
  fill: var(--tp-surface);
  stroke: var(--tp-gray-600);
  stroke-width: 2;
}
.plan-stairs path {
  fill: none;
}
.plan-label {
  fill: var(--tp-primary-900);
  font-size: 25px;
  font-weight: 750;
  text-anchor: middle;
  paint-order: stroke;
  stroke: var(--tp-surface);
  stroke-width: 3px;
  stroke-linejoin: round;
}
</style>
