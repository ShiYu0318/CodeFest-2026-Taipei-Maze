<template>
  <main
    class="orientation-page display-page"
    lang="zh-Hant"
    :data-theme="theme"
    :data-display-mode="displayMode"
  >
    <div class="orientation-shell">
      <header class="orientation-header">
        <router-link class="orientation-back" :to="mapLink">
          <StationMapIcon name="arrow" />
          車站地圖
        </router-link>
        <h1>定位指南針</h1>
        <p>選擇你所在的標點與終點，再比對手機的面向方向。</p>
      </header>

      <div class="orientation-layout">
        <section
          class="orientation-card endpoints"
          aria-labelledby="endpoints-title"
        >
          <h2 id="endpoints-title">起點與終點</h2>
          <label
            v-for="field in endpointFields"
            :key="field.key"
            class="endpoint-field"
          >
            <span class="endpoint-label">
              <span
                :class="['endpoint-dot', field.key]"
                aria-hidden="true"
              ></span>
              <span>
                {{ field.label }}
                <small>{{ field.description }}</small>
              </span>
            </span>
            <select
              :aria-label="field.label + '（' + field.description + '）'"
              :value="endpoints[field.key]?.id || ''"
              @change="selectEndpoint(field.key, $event.target.value)"
            >
              <option value="">選擇標點</option>
              <optgroup
                v-for="(floorPoints, floor) in points"
                :key="floor"
                :label="floor"
              >
                <option
                  v-for="point in floorPoints"
                  :key="point.id"
                  :value="point.id"
                >
                  {{ floor }}・{{ point.name }}
                </option>
              </optgroup>
            </select>
          </label>
          <p class="orientation-note">
            目前位置由你手動選定。同層顯示直線方位，實際路線請依站內指標。
          </p>
        </section>

        <section
          class="orientation-card compass-card"
          aria-labelledby="compass-title"
        >
          <div class="compass-heading">
            <h2 id="compass-title">面向方向</h2>
            <span class="compass-source">{{ sourceLabel }}</span>
          </div>
          <svg
            class="orientation-dial"
            viewBox="0 0 320 320"
            role="img"
            aria-label="指南針，藍色指針顯示面向方向，金色弧線顯示目標方位範圍"
          >
            <defs>
              <linearGradient id="compass-face" x1="0" x2="1" y1="0" y2="1">
                <stop stop-color="var(--surface)" />
                <stop offset="1" stop-color="var(--tp-primary-100)" />
              </linearGradient>
              <linearGradient id="needle-light" x1="0" x2="1" y1="0" y2="1">
                <stop stop-color="#a8d2dd" />
                <stop offset="1" stop-color="#5ab4c5" />
              </linearGradient>
              <linearGradient id="needle-dark" x1="0" x2="1" y1="0" y2="1">
                <stop stop-color="#608c99" />
                <stop offset="1" stop-color="#2f464d" />
              </linearGradient>
            </defs>
            <circle cx="160" cy="164" r="140" fill="#c2e1e9" />
            <circle
              cx="160"
              cy="160"
              r="140"
              fill="url(#compass-face)"
              stroke="#c2e1e9"
            />
            <circle cx="160" cy="160" r="97" fill="none" stroke="#c2e1e9" />
            <path
              d="M160 77v166M77 160h166"
              fill="none"
              stroke="#c2e1e9"
              stroke-dasharray="3 5"
            />
            <line
              v-for="tick in 24"
              :key="tick"
              x1="160"
              y1="57"
              x2="160"
              :y2="(tick - 1) % 6 ? 62 : 67"
              stroke="#608c99"
              stroke-linecap="round"
              :transform="'rotate(' + (tick - 1) * 15 + ' 160 160)'"
            />
            <g class="compass-cardinals" text-anchor="middle">
              <text x="160" y="46">N</text>
              <text x="280" y="165">E</text>
              <text x="160" y="283">S</text>
              <text x="40" y="165">W</text>
            </g>
            <circle
              v-if="bearing !== null"
              class="target-arc"
              cx="160"
              cy="160"
              r="97"
              pathLength="360"
              :stroke-dasharray="
                HEADING_TOLERANCE * 2 + ' ' + (360 - HEADING_TOLERANCE * 2)
              "
              :transform="
                'rotate(' + (bearing - HEADING_TOLERANCE - 90) + ' 160 160)'
              "
            />
            <g
              v-if="sample"
              class="facing-needle"
              :transform="'rotate(' + sample.degrees + ' 160 160)'"
            >
              <path
                d="M160 76 196 207 160 185 124 207Z"
                fill="url(#needle-dark)"
              />
              <path d="M160 76 160 185 124 207Z" fill="url(#needle-light)" />
              <path
                d="M160 76 196 207 160 185 124 207Z"
                fill="none"
                stroke="#fdfefe"
                stroke-width="2"
              />
            </g>
            <circle cx="160" cy="160" r="5" fill="#fdfefe" stroke="#608c99" />
          </svg>

          <div class="compass-readings">
            <div>
              <span>目前面向</span>
              <strong>{{
                sample ? formatDegrees(sample.degrees) : "—"
              }}</strong>
            </div>
            <div class="target-reading">
              <span>目標方位 ±{{ HEADING_TOLERANCE }}°</span>
              <strong>{{
                bearing === null ? "—" : formatDegrees(bearing)
              }}</strong>
            </div>
          </div>
          <p class="compass-status" :class="{ aligned }" role="status">
            {{ status }}
          </p>
          <button
            class="simulation-toggle"
            type="button"
            :aria-pressed="simulating"
            @click="toggleSimulation"
          >
            {{ simulating ? "結束模擬" : "模擬手機方位" }}
          </button>
          <label v-if="simulating" class="simulation-control">
            模擬方位 {{ formatDegrees(simulatedDegrees) }}
            <input
              v-model.number="simulatedDegrees"
              type="range"
              min="0"
              max="359"
            />
          </label>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import StationMapIcon from "../components/StationMapIcon.vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import "../display/display-preferences.css";
import {
  findStationPoint,
  headingError,
  HEADING_TOLERANCE,
  previewBearing,
} from "../navigation/orientation.mjs";
import { stationHeading } from "../navigation/station-compass";
import stationData from "./station-points.json";

const route = useRoute();
const router = useRouter();
const { theme, displayMode } = useDisplayPreferences();
const { points } = stationData;
const endpointFields = [
  { key: "start", label: "起點", description: "目前位置" },
  { key: "destination", label: "終點", description: "目標" },
];
const endpoints = computed(() => ({
  start: findStationPoint(points, route.query.start),
  destination: findStationPoint(points, route.query.destination),
}));
const endpointQuery = computed(() => ({
  start: endpoints.value.start?.id,
  destination: endpoints.value.destination?.id,
}));
const mapLink = computed(() => ({
  name: "station-map",
  query: endpointQuery.value,
}));
const simulating = ref(false);
const simulatedDegrees = ref(0);
const sample = computed(() =>
  simulating.value
    ? { degrees: simulatedDegrees.value, accuracyDegrees: null }
    : stationHeading.value
);
const sourceLabel = computed(() =>
  simulating.value ? "模擬方位" : sample.value ? "手機方位" : "等待手機方位"
);
const bearing = computed(() =>
  previewBearing(endpoints.value.start, endpoints.value.destination)
);
const error = computed(() =>
  sample.value && bearing.value !== null
    ? headingError(sample.value.degrees, bearing.value)
    : null
);
const accuracyTooLow = computed(
  () => sample.value?.accuracyDegrees > HEADING_TOLERANCE
);
const aligned = computed(
  () =>
    error.value !== null &&
    !accuracyTooLow.value &&
    Math.abs(error.value) <= HEADING_TOLERANCE
);
const status = computed(() => {
  const { start, destination } = endpoints.value;
  if (!start || !destination) return "請先選擇起點和終點。";
  if (start.id === destination.id) return "起點與終點是同一個標點。";
  if (start.floorId !== destination.floorId)
    return "跨樓層方向需由路徑資料提供。";
  if (bearing.value === null) return "這兩個標點在地圖上的位置相同。";
  if (!sample.value) return "等待手機方位，或開啟模擬測試。";
  if (accuracyTooLow.value) return "目前手機的方位精度不足。";
  if (aligned.value) return "已對準目標方位";
  return error.value > 0 ? "向右轉向目標方位" : "向左轉向目標方位";
});

function selectEndpoint(field, value) {
  router.replace({
    name: "station-orientation",
    query: { ...endpointQuery.value, [field]: value || undefined },
  });
}

function toggleSimulation() {
  if (!simulating.value)
    simulatedDegrees.value =
      Math.round(stationHeading.value?.degrees ?? 0) % 360;
  simulating.value = !simulating.value;
}

function formatDegrees(degrees) {
  return (Math.round(degrees) % 360) + "°";
}
</script>

<style scoped src="./station-orientation.css"></style>
