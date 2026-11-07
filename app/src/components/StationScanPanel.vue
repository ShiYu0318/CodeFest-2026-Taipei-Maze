<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="station-scan-panel" aria-labelledby="station-scan-heading">
    <div class="scan-heading">
      <h2 id="station-scan-heading">
        {{
          view.mode === "navigation" ? t("scan.navigation") : t("scan.browsing")
        }}
      </h2>
      <label
        ><input v-model="easyRead" type="checkbox" />{{
          t("scan.easyRead")
        }}</label
      >
    </div>
    <p class="scan-caveat">
      {{ t("scan.caveat") }}
    </p>
    <p v-if="view.mode === 'browsing'">
      {{ t("scan.browseHint") }}
    </p>
    <template
      v-if="view.mode === 'navigation' && (!easyRead || !view.destinationId)"
    >
      <label for="station-destination">{{ t("scan.chooseDestination") }}</label>
      <select
        id="station-destination"
        :value="view.destinationId ?? ''"
        :disabled="active"
        @change="choose($event.target.value)"
      >
        <option disabled value="">{{ t("scan.choosePlaceholder") }}</option>
        <option v-for="point in catalog" :key="point.id" :value="point.id">
          {{ point.floor }} · {{ label(point) }}
        </option>
      </select>
      <button
        v-if="props.selectedPoint"
        :disabled="active"
        @click="choose(props.selectedPoint.id)"
      >
        {{ t("scan.useSelected", { name: name(props.selectedPoint) }) }}
      </button>
      <details ref="searchDetails">
        <summary>{{ t("scan.searchByName") }}</summary>
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
        />{{ t("scan.stepFree") }}</label
      >
    </template>
    <p v-if="destination" class="scan-target">
      <strong>{{
        t("scan.destination", { place: place(destination) })
      }}</strong>
    </p>
    <button
      v-if="destination"
      type="button"
      class="scan-staff"
      @click="staffOpen = true"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="2.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      {{ t("staff.open") }}
    </button>
    <StaffCard
      v-if="staffOpen && destination"
      :point="destination"
      :step-free="view.stepFree"
      @close="closeStaffCard"
    />
    <p v-if="position || view.mode !== 'browsing'" role="status">
      {{
        position
          ? t("scan.youAreHere", { place: place(position) })
          : t("scan.notLocated")
      }}
    </p>
    <p v-if="view.position?.source === 'qr'" class="scan-time">
      {{ t("scan.scannedAt", { time: confirmedTime }) }}
    </p>
    <p v-else-if="view.position" class="scan-time">
      {{ t("scan.fromLink") }}
    </p>
    <button class="scan-start" :disabled="!available || active" @click="start">
      {{
        active
          ? t("scan.waiting")
          : position
          ? t("scan.rescan")
          : t("scan.scan")
      }}
    </button>
    <p v-if="!available" class="scan-note">
      {{ t("scan.needApp") }}
    </p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <div
      v-if="position && destination"
      class="scan-overview"
      aria-live="polite"
    >
      <h3>
        {{ view.arrived ? t("scan.arrivedTitle") : t("scan.currentHint") }}
      </h3>
      <p>{{ instruction }}</p>
      <ol v-if="!easyRead && view.relation.steps.length">
        <li v-for="step in view.relation.steps" :key="step.id">
          {{ stopLabel(step.from) }} ↔ {{ stopLabel(step.to)
          }}<button :disabled="active" @click="unavailable(step.id)">
            {{ t("scan.unavailable") }}
          </button>
        </li>
      </ol>
      <button
        v-if="view.relation.status === 'at_destination' && !view.arrived"
        :disabled="active"
        @click="confirm(view.token)"
      >
        {{ t("scan.confirmArrival") }}
      </button>
      <p v-if="view.excludedEdgeTypes.length">
        {{
          t("scan.excluded", {
            list: view.excludedEdgeTypes.join(t("scan.listSeparator")),
          })
        }}
      </p>
    </div>
    <button
      v-if="view.mode === 'navigation' || view.destinationId"
      :disabled="active"
      @click="emit('cancel-trip')"
    >
      {{ view.mode === "navigation" ? t("scan.exit") : t("scan.cancelTrip") }}
    </button>
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, ref } from "vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import DestinationSearch from "./DestinationSearch.vue";
import StaffCard from "./StaffCard.vue";
import { stationCatalog } from "../search/catalog.mjs";
import { stationPoints } from "../station/scan.mjs";
import data from "../views/station-points.json";
import { htmlLang, useI18n } from "../i18n/index.mjs";
import { placeLabel, placeName } from "../i18n/places.mjs";
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
const i18n = useI18n();
const { locale, t } = i18n;
const searchDetails = ref(null),
  easyRead = ref(displayMode.value !== "standard");
const active = computed(() => view.value.active);
const available = computed(() => view.value.available);
const notice = computed(() =>
  view.value.noticeKey ? t(view.value.noticeKey) : ""
);
const destination = computed(() => byId.get(view.value.destinationId));
const staffOpen = ref(false);
function closeStaffCard(event) {
  staffOpen.value = false;
  // Return focus to the button that opened the card.
  document.querySelector(".scan-staff")?.focus();
  return event;
}
const confirmedTime = computed(() =>
  view.value.position?.confirmedAt
    ? new Date(view.value.position.confirmedAt).toLocaleTimeString(
        htmlLang(locale.value)
      )
    : ""
);
const position = computed(() => byId.get(view.value.position?.pointId));
const options = computed(() => ({
  mobilityProfile: view.value.stepFree ? "stepFree" : "standard",
  excludedEdgeTypes: view.value.excludedEdgeTypes,
  unavailableConnectorIds: view.value.unavailableConnectorIds,
}));
const name = (point) => placeName(point, i18n);
const label = (point) => placeLabel(point, i18n);
const place = (point) => `${point.floor} · ${label(point)}`;
const stopLabel = (stop) => {
  const point = byId.get(stop.pointId);
  return `${stop.floor} ${point ? name(point) : stop.pointId}`;
};
const instruction = computed(() => {
  if (view.value.arrived) return t("scan.instr.arrived");
  const status = view.value.relation.status;
  if (status === "at_destination") return t("scan.instr.atDestination");
  if (status === "same_zone") return t("scan.instr.sameZone");
  if (status === "connections")
    return t("scan.instr.connections", {
      steps: view.value.relation.steps
        .map((step) =>
          t("scan.stepPair", {
            from: stopLabel(step.from),
            to: stopLabel(step.to),
          })
        )
        .join(t("scan.listSeparator")),
    });
  return t("scan.instr.none");
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
.station-scan-panel .scan-staff {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.scan-staff svg {
  width: 22px;
  height: 22px;
  flex: none;
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
