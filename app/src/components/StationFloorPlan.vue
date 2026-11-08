<template>
  <g aria-hidden="true">
    <g
      v-if="floor === 'B2'"
      :transform="`translate(${plan.offset.join(' ')}) scale(${plan.scale})`"
    >
      <StationB2Plan :outline-only="outlineOnly" />
    </g>
    <g
      v-else
      :transform="
        plan.offset ? `translate(${plan.offset.join(' ')})` : undefined
      "
    >
      <path
        v-for="path in outlines"
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
        <path
          v-for="path in plan.outlineDetails"
          :key="path"
          class="plan-outline"
          :d="path"
          fill-rule="evenodd"
        />
        <ZhuyinSvgText
          v-for="[x, y, label] in plan.labels"
          :key="label"
          class="plan-label"
          :x="x"
          :y="y"
          :text="label"
          :reading-below="floor === '1F' && y < 50"
        />
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
import ZhuyinSvgText from "./ZhuyinSvgText.vue";
import StationB2Plan from "./StationB2Plan.vue";
import { plans } from "../views/station-floor-plans.mjs";
import stationData from "../views/station-points.json";

const stairwayTypes = new Set([
  "stairs",
  "escalator",
  "stairs-escalator",
  "stairway",
]);

export default {
  components: { ZhuyinSvgText, StationB2Plan },
  props: {
    floor: { type: String, required: true },
    outlineOnly: Boolean,
    visiblePointIds: { type: Array, default: null },
  },
  computed: {
    plan() {
      return plans[this.floor];
    },
    outlines() {
      const { outlines, outlineDetails } = this.plan;
      return this.outlineOnly || !outlineDetails
        ? outlines
        : outlines.filter((_, index) => !outlineDetails[index]);
    },
    stairways() {
      return stationData.points[this.floor].filter(
        (point) =>
          this.pointTypes(point).some((type) => stairwayTypes.has(type)) &&
          (!this.visiblePointIds || this.visiblePointIds.includes(point.id))
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
  fill: #d12d33;
  fill-opacity: 0.22;
  stroke: #d12d33;
  stroke-width: 3;
}
.plan-blue {
  fill: #0072c6;
  fill-opacity: 0.2;
  stroke: #0072c6;
  stroke-width: 3;
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
