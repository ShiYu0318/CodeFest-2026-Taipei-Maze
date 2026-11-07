<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="station-scan-panel" aria-labelledby="station-scan-heading">
    <div class="scan-heading">
      <h2 id="station-scan-heading">
        {{ view.mode === "navigation" ? "導航模式" : "瀏覽模式" }}
      </h2>
      <label><input v-model="easyRead" type="checkbox" />簡明模式</label>
    </div>
    <p class="scan-caveat">
      定位碼尚未現地布設；目前提供設施與樓層關係，完整步行路網待補。
    </p>
    <p v-if="view.mode === 'browsing'">
      掃描點位 QR，進入導航模式並顯示「您在這裡」。
    </p>
    <template
      v-if="view.mode === 'navigation' && (!easyRead || !view.destinationId)"
    >
      <label for="station-destination">選擇目的地</label>
      <select
        id="station-destination"
        :value="view.destinationId ?? ''"
        :disabled="active"
        @change="choose($event.target.value)"
      >
        <option disabled value="">請選擇要去的設施</option>
        <option v-for="point in catalog" :key="point.id" :value="point.id">
          {{ point.floor }} · {{ point.name }}
        </option>
      </select>
      <button
        v-if="props.selectedPoint"
        :disabled="active"
        @click="choose(props.selectedPoint.id)"
      >
        將地圖上選取的「{{ props.selectedPoint.name }}」設為終點
      </button>
      <details ref="searchDetails">
        <summary>用名稱搜尋（七語詞典原型）</summary>
        <DestinationSearch
          id="station-navigation-search"
          :catalog="searchEntries"
          navigation
          :disabled="active"
          :current-options="options"
          @select="searchSelect"
        />
      </details>
      <label
        ><input
          :checked="view.stepFree"
          type="checkbox"
          :disabled="active"
          @change="changeStepFree($event.target.checked)"
        />只參考無階梯連結</label
      >
    </template>
    <p v-if="destination" class="scan-target">
      <strong>終點：{{ destination.floor }} · {{ destination.name }}</strong>
    </p>
    <p role="status">
      {{
        position
          ? `您在這裡：${position.floor} · ${position.name}`
          : "目前尚未定位，可先掃描所在點位。"
      }}
    </p>
    <p v-if="view.position?.source === 'qr'" class="scan-time">
      {{ confirmedTime }}
      掃碼定位；位置不會隨走動自動更新。
    </p>
    <p v-else-if="view.position" class="scan-time">
      由定位連結帶入，請核對現場位置；不是即時追蹤。
    </p>
    <button class="scan-start" :disabled="!available || active" @click="start">
      {{ active ? "等待掃碼結果…" : position ? "重新掃描定位" : "掃描定位" }}
    </button>
    <p v-if="!available" class="scan-note">
      請由城市通 App 開啟以使用原生掃碼；瀏覽器可查看點位連結。
    </p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <div
      v-if="position && destination"
      class="scan-overview"
      aria-live="polite"
    >
      <h3>{{ view.arrived ? "你已確認抵達" : "目前提示" }}</h3>
      <p>{{ instruction }}</p>
      <ol v-if="!easyRead && view.relation.steps.length">
        <li v-for="step in view.relation.steps" :key="step.id">
          {{ stopLabel(step.from) }} ↔ {{ stopLabel(step.to)
          }}<button :disabled="active" @click="unavailable(step.id)">
            此設備無法使用
          </button>
        </li>
      </ol>
      <button
        v-if="view.relation.status === 'at_destination' && !view.arrived"
        :disabled="active"
        @click="confirm(view.token)"
      >
        現場名稱與樓層相符，確認已抵達
      </button>
      <p v-if="view.excludedEdgeTypes.length">
        搜尋帶入的排除條件：{{
          view.excludedEdgeTypes.join("、")
        }}（重新開始可清除）
      </p>
    </div>
    <button
      v-if="view.mode === 'navigation' || view.destinationId"
      :disabled="active"
      @click="emit('cancel-trip')"
    >
      {{ view.mode === "navigation" ? "退出導航，返回瀏覽模式" : "取消行程" }}
    </button>
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, ref } from "vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import DestinationSearch from "./DestinationSearch.vue";
import { stationCatalog } from "../search/catalog.mjs";
import { stationPoints } from "../station/scan.mjs";
import data from "../views/station-points.json";
const props = defineProps({
  selectedPoint: { type: Object, default: null },
  location: { type: Object, required: true },
});
const emit = defineEmits(["destination", "scanned", "cancel-trip"]);
const view = computed(() => props.location.view.value);
const catalog = stationPoints(data),
  searchEntries = stationCatalog(data);
const byId = new Map(catalog.map((p) => [p.id, p]));
const { displayMode } = useDisplayPreferences();
const searchDetails = ref(null),
  easyRead = ref(displayMode.value !== "standard");
const active = computed(() => view.value.active);
const available = computed(() => view.value.available);
const notice = computed(() => view.value.notice);
const destination = computed(() => byId.get(view.value.destinationId));
const confirmedTime = computed(() =>
  view.value.position?.confirmedAt
    ? new Date(view.value.position.confirmedAt).toLocaleTimeString()
    : ""
);
const position = computed(() => byId.get(view.value.position?.pointId));
const options = computed(() => ({
  mobilityProfile: view.value.stepFree ? "stepFree" : "standard",
  excludedEdgeTypes: view.value.excludedEdgeTypes,
  unavailableConnectorIds: view.value.unavailableConnectorIds,
}));
const stopLabel = (stop) =>
  `${stop.floor} ${byId.get(stop.pointId)?.name ?? stop.pointId}`;
const instruction = computed(() => {
  if (view.value.arrived)
    return "已由你確認抵達。可退出導航，或選擇下一個目的地。";
  if (view.value.relation.status === "at_destination")
    return "目前定位點與目的地相同。請確認現場名稱與樓層是否相符，再確認已抵達。";
  if (view.value.relation.status === "same_zone")
    return "目前與終點在同一區域。尚無可驗證的走廊指引，請依現場標示確認，沿途掃碼更新。";
  if (view.value.relation.status === "connections")
    return `可參考的樓層連結：${view.value.relation.steps
      .map((step) => `${stopLabel(step.from)} 到 ${stopLabel(step.to)}`)
      .join("；")}。這是樓層關係，不是完整步行路線，請依現場標示確認。`;
  return "沒有符合目前條件的已知跨區連結。請洽詢站務，不會用樓梯或未知設備替代無階梯需求。";
});
function choose(id) {
  if (props.location.choose(id)) emit("destination", id);
}
function searchSelect(selection) {
  if (!props.location.searchSelect(selection)) return;
  if (searchDetails.value) searchDetails.value.open = false;
  emit("destination", selection.poiId);
}
function changeStepFree(value) {
  props.location.setStepFree(value);
}
function unavailable(id) {
  props.location.markUnavailable(id);
}
function confirm(token) {
  props.location.confirmArrival(token);
}
async function start() {
  const result = await props.location.scan();
  if (result.type === "success") emit("scanned");
}
</script>
<style scoped>
.station-scan-panel {
  padding: 14px 16px;
  margin: 0 0 16px;
  border: 0;
  border-radius: var(--tp-radius-card, 12px);
  background: var(--surface, #fff);
  box-shadow: var(--tp-shadow-card, 0 2px 12px rgb(0 0 0 / 4%));
  text-align: left;
  color: var(--ink, #112629);
  font: var(--display-main-size, 15px) / 1.55 var(--tp-font, system-ui),
    sans-serif;
}
.scan-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.scan-heading h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.scan-heading label {
  font-size: 13px;
  white-space: nowrap;
}
.station-scan-panel p {
  margin: 8px 0;
}
.scan-caveat,
.scan-note,
.scan-time {
  font-size: 12px;
  color: var(--muted, #526676);
}
.station-scan-panel select {
  display: block;
  max-width: 100%;
  width: 100%;
  min-height: var(--display-control-height, 44px);
  font: inherit;
  border: 1px solid var(--tp-gray-200, #cad1d5);
  border-radius: var(--tp-radius-button, 10px);
  background: var(--surface, #fff);
  padding: 8px;
  margin: 6px 0;
}
.station-scan-panel button {
  min-height: var(--display-control-height, 44px);
  margin: 6px 6px 0 0;
  padding: 8px 16px;
  background: var(--surface, #fff);
  border: 1px solid var(--tp-primary-500, #5ab4c5);
  border-radius: var(--tp-radius-button, 10px);
  font: inherit;
  font-weight: 600;
  color: var(--tp-primary-700, #356c77);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 150ms ease, transform 120ms ease;
}
.station-scan-panel button:active:not(:disabled) {
  transform: scale(0.98);
  background: var(--tp-primary-50, #edf8fa);
}
.station-scan-panel .scan-start {
  background: var(--tp-primary-600, #468d9b);
  color: #fff;
  width: 100%;
  border-color: var(--tp-primary-600, #468d9b);
}
.station-scan-panel .scan-start:active:not(:disabled) {
  background: var(--tp-primary-700, #356c77);
}
.station-scan-panel button:disabled {
  background: var(--tp-gray-100, #e3e7e9);
  border-color: var(--tp-gray-100, #e3e7e9);
  color: var(--tp-gray-500, #738995);
  cursor: default;
}
.station-scan-panel details {
  margin: 8px 0;
}
.station-scan-panel summary {
  cursor: pointer;
  min-height: 36px;
}
.station-scan-panel :focus-visible {
  outline: 3px solid var(--tp-primary-500, #5ab4c5);
  outline-offset: 2px;
}
.scan-overview {
  border-top: 1px solid var(--tp-gray-100, #e3e7e9);
  margin-top: 12px;
  padding-top: 6px;
}
.scan-overview h3 {
  font-size: 16px;
  margin: 8px 0;
}
.scan-overview li {
  padding-bottom: 8px;
}
.scan-target {
  font-size: 16px;
}
.station-scan-panel :deep(.destination-search) {
  background: var(--surface, #fff);
  color: var(--ink, #173649);
}
.station-scan-panel :deep(.search-hint),
.station-scan-panel :deep(small) {
  color: var(--muted, #526676);
}
.station-scan-panel button {
  max-width: 100%;
  overflow-wrap: anywhere;
}
</style>
