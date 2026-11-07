<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="station-scan-panel" aria-labelledby="station-scan-heading">
    <div class="scan-heading">
      <h2 id="station-scan-heading">掃碼找目的地</h2>
      <label><input v-model="easyRead" type="checkbox" />簡明模式</label>
    </div>
    <p class="scan-caveat">
      定位碼尚未現地布設；目前提供設施與樓層關係，完整步行路網待補。
    </p>
    <template v-if="!easyRead || !view.destinationId">
      <label for="station-destination">先選終點</label>
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
      <details>
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
          ? `上次掃碼：${position.floor} · ${position.name}`
          : "目前尚未定位，選好終點後再掃描。"
      }}
    </p>
    <p v-if="view.position" class="scan-time">
      {{ confirmedTime }}
      確認；不是即時追蹤。
    </p>
    <button
      class="scan-start"
      :disabled="!view.destinationId || !available || active"
      @click="start"
    >
      {{ active ? "相機持續掃描中…" : "開啟相機，持續更新位置" }}
    </button>
    <p v-if="!available" class="scan-note">
      需要已更新的城市通 App；一般瀏覽器無法使用原生持續掃碼。
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
    <button v-if="view.destinationId" :disabled="active" @click="reset">
      {{ view.arrived ? "開始新的導航" : "結束這次導航" }}
    </button>
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import DestinationSearch from "./DestinationSearch.vue";
import { stationCatalog } from "../search/catalog.mjs";
import { createContinuousScanner } from "../navigation/continuous.mjs";
import { createStationScanSession, stationPoints } from "../station/scan.mjs";
import data from "../views/station-points.json";
import connections from "../views/station-connections.json";
const props = defineProps({ selectedPoint: { type: Object, default: null } });
const emit = defineEmits(["position", "destination"]);
const catalog = stationPoints(data),
  searchEntries = stationCatalog(data);
const byId = new Map(catalog.map((p) => [p.id, p]));
const session = createStationScanSession(data, connections),
  view = shallowRef(session.snapshot());
const active = ref(false),
  available = ref(false),
  notice = ref(""),
  easyRead = ref(false);
let disposed = false,
  guidanceVersion = 0;
const destination = computed(() => byId.get(view.value.destinationId));
const confirmedTime = computed(() =>
  view.value.position
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
  if (view.value.arrived) return "已由你確認抵達。可關閉相機，或結束這次導航。";
  if (view.value.relation.status === "at_destination")
    return "掃到的是終點設施定位碼。請確認現場名稱與樓層是否相符，再確認已抵達。";
  if (view.value.relation.status === "same_zone")
    return "目前與終點在同一區域。尚無可驗證的走廊指引，請依現場標示確認，沿途掃碼更新。";
  if (view.value.relation.status === "connections")
    return `可參考的樓層連結：${view.value.relation.steps
      .map((step) => `${stopLabel(step.from)} 到 ${stopLabel(step.to)}`)
      .join("；")}。這是樓層關係，不是完整步行路線，請依現場標示確認。`;
  if (position.value)
    return "沒有符合目前條件的已知跨區連結。請洽詢站務，不會用樓梯或未知設備替代無階梯需求。";
  return "請掃描本專案的設施定位碼。掃描後自動更新位置，終點不變。";
});
function guidance(error) {
  return {
    guidanceVersion: ++guidanceVersion,
    guidanceToken: view.value.token,
    title: destination.value ? `終點：${destination.value.name}` : "先選終點",
    floor: position.value
      ? `上次掃碼 ${position.value.floor} · ${position.value.name}`
      : "尚未定位",
    instruction: error || instruction.value,
    canAdvance:
      !error &&
      view.value.relation.status === "at_destination" &&
      !view.value.arrived,
    nextLabel: "確認已抵達",
  };
}
function refresh() {
  view.value = session.snapshot();
  if (active.value) scanner.update(guidance());
}
const scanner = createContinuousScanner(window.flutterObject, {
  onPayload(payload) {
    const result = session.scan(payload);
    if (result.type === "success") {
      notice.value = "位置已更新，終點不變；相機保持開啟。";
      refresh();
      emit("position", result.point);
    } else {
      notice.value = "不是本地圖支援的定位碼，位置與終點維持不變。";
      scanner.update(guidance(notice.value));
    }
  },
  onAction({ guidanceToken }) {
    confirm(guidanceToken);
  },
  onStatus(status) {
    active.value = ["starting", "started"].includes(status);
    if (status === "error")
      notice.value = "相機無法啟動，請關閉後重試；位置與終點保留。";
  },
});
scanner.probe().then((result) => {
  if (!disposed) available.value = result.type === "success";
});
function choose(id) {
  if (active.value || !session.setDestination(id)) return;
  notice.value = "終點已設定。掃描沿途定位碼即可更新所在位置。";
  refresh();
  emit("destination", byId.get(id));
}
function searchSelect(selection) {
  if (active.value || !session.applySearchSelection(selection)) return;
  refresh();
  emit("destination", destination.value);
  notice.value = "已選擇終點並保留通行限制；請掃描目前位置。";
}
function changeStepFree(value) {
  if (active.value) return;
  session.setStepFree(value);
  refresh();
}
function unavailable(id) {
  if (active.value) return;
  session.markUnavailable(id);
  refresh();
  notice.value = "已排除此設備；不會解除你的通行限制。";
}
function confirm(token) {
  if (session.confirmArrival(token)) refresh();
}
function start() {
  if (active.value || !view.value.destinationId) return;
  const result = scanner.start(guidance());
  if (result.type !== "success")
    notice.value = "持續掃碼尚不可用，請更新宿主 App。";
}
function reset() {
  if (active.value) return;
  session.reset();
  refresh();
  emit("position", null);
  emit("destination", null);
  notice.value = "";
}
function pagehide() {
  scanner.stop();
}
window.addEventListener("pagehide", pagehide);
onBeforeUnmount(() => {
  disposed = true;
  scanner.dispose();
  window.removeEventListener("pagehide", pagehide);
});
</script>
<style scoped>
.station-scan-panel {
  padding: 14px 16px;
  margin: 0 0 16px;
  border: 1px solid #bdd0dc;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  color: #173649;
  font: 15px/1.55 system-ui, sans-serif;
}
.scan-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.scan-heading h2 {
  font-size: 18px;
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
  color: #526676;
}
.station-scan-panel select {
  display: block;
  max-width: 100%;
  width: 100%;
  min-height: 44px;
  font: inherit;
  border: 1px solid #a3bac8;
  border-radius: 7px;
  background: #fff;
  padding: 8px;
  margin: 6px 0;
}
.station-scan-panel button {
  min-height: 44px;
  margin: 6px 6px 0 0;
  padding: 9px 12px;
  background: #eef4f7;
  border: 1px solid #afc5d2;
  border-radius: 8px;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.station-scan-panel .scan-start {
  background: #153d53;
  color: white;
  width: 100%;
  border-color: #153d53;
  font-weight: 600;
}
.station-scan-panel button:disabled {
  opacity: 0.5;
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
  outline: 3px solid #b8801f;
  outline-offset: 2px;
}
.scan-overview {
  border-top: 1px solid #d9e4ea;
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
</style>
