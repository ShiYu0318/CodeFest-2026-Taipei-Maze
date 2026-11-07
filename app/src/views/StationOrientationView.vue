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
        <h1>指南針</h1>
      </header>

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
          aria-label="指南針，藍色指針顯示目前面向方向"
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
          <g
            v-if="heading !== null"
            class="facing-needle"
            :transform="'rotate(' + heading + ' 160 160)'"
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

        <div class="compass-reading">
          <span>目前面向</span>
          <strong>{{ heading === null ? "—" : formatDegrees(heading) }}</strong>
        </div>
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
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import StationMapIcon from "../components/StationMapIcon.vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { findStationPoint } from "../navigation/orientation.mjs";
import { stationHeading } from "../navigation/station-compass";
import stationData from "./station-points.json";

const route = useRoute();
const { theme, displayMode } = useDisplayPreferences();
const { points } = stationData;
const mapLink = computed(() => ({
  name: "station-map",
  query: {
    start: findStationPoint(points, route.query.start)?.id,
    destination: findStationPoint(points, route.query.destination)?.id,
  },
}));
const simulating = ref(false);
const simulatedDegrees = ref(0);
const heading = computed(() =>
  simulating.value
    ? simulatedDegrees.value
    : stationHeading.value?.degrees ?? null
);
const sourceLabel = computed(() =>
  simulating.value
    ? "模擬方位"
    : heading.value === null
    ? "等待手機方位"
    : "手機方位"
);

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
