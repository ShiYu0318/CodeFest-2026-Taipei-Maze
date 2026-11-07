<template>
  <div>
    <div
      class="landing-plan"
      :style="{ aspectRatio: `${bounds[2]} / ${bounds[3]}` }"
    >
      <svg
        :viewBox="bounds.join(' ')"
        role="img"
        :aria-label="`${arrival.floor} ${arrival.point.name}位置圖`"
      >
        <StationFloorPlan :floor="arrival.floor" />
      </svg>
      <span
        v-for="marker in markers"
        :key="marker.stop.pointId"
        class="landing-marker"
        :style="markerStyle(marker.stop.point)"
        aria-hidden="true"
      >
        <StationMapIcon :name="markerIconType(marker.stop.point)" />
      </span>
    </div>
    <ul class="landing-list">
      <li v-for="marker in markers" :key="marker.stop.pointId">
        <StationMapIcon :name="markerIconType(marker.stop.point)" />
        <span
          ><strong><ZhuyinText :text="marker.label" /></strong>
          <ZhuyinText :text="marker.stop.point.name"
        /></span>
      </li>
    </ul>
  </div>
</template>

<script>
import ZhuyinText from "./ZhuyinText.vue";
import StationFloorPlan from "./StationFloorPlan.vue";
import StationMapIcon from "./StationMapIcon.vue";
import { floors } from "../views/station-floor-plans.mjs";

export default {
  components: { ZhuyinText, StationFloorPlan, StationMapIcon },
  props: { arrival: { type: Object, required: true }, departure: Object },
  computed: {
    bounds() {
      return floors[this.arrival.floor].bounds;
    },
    markers() {
      const markers = [{ label: "抵達", stop: this.arrival }];
      if (this.departure)
        markers.push({ label: "接著轉乘", stop: this.departure });
      return markers;
    },
  },
  methods: {
    markerIconType(point) {
      return Array.isArray(point.type) ? point.type[0] : point.type;
    },
    markerStyle(point) {
      const [left, top, width, height] = this.bounds;
      return {
        left: `${((point.x - left) / width) * 100}%`,
        top: `${((point.y - top) / height) * 100}%`,
      };
    },
  },
};
</script>

<style scoped>
.landing-plan {
  position: relative;
  background: var(--station-map-background, var(--tp-primary-50));
  border: 1px solid var(--tp-primary-100);
  border-radius: 8px;
}
.landing-plan > svg {
  display: block;
  width: 100%;
  height: 100%;
}
.landing-marker {
  position: absolute;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 2px solid var(--tp-surface);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: var(--tp-primary-800);
  color: var(--tp-surface);
  box-shadow: 0 0 0 2px var(--tp-primary-800);
}
.landing-marker + .landing-marker {
  background: var(--tp-secondary-800);
  box-shadow: 0 0 0 2px var(--tp-secondary-800);
}
.landing-marker svg,
.landing-list svg {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
}
.landing-list {
  padding: 0;
  margin: 8px 0 0;
  list-style: none;
  display: grid;
  gap: 4px;
}
.landing-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  line-height: 1.5;
}
</style>
