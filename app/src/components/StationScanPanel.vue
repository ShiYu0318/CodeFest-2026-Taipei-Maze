<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section
    class="station-scan-panel"
    :class="{ 'is-embedded': embedded }"
    :aria-labelledby="embedded ? undefined : 'station-scan-heading'"
    :aria-label="embedded ? t('scan.scan') : undefined"
  >
    <template v-if="embedded">
      <div class="compact-scan-actions">
        <StationNavigationRescan
          v-if="persistentScan || position"
          compact
          :location="location"
          @scanned="emit('scanned', $event)"
        />
        <button
          v-else
          type="button"
          class="scan-start"
          data-tour-target="scan"
          :disabled="!available || active"
          @click="start"
        >
          <StationMapIcon name="qrcode" /><ZhuyinText
            :text="active ? t('scan.waiting') : t('scan.scan')"
          />
        </button>
        <button
          v-if="view.destinationId"
          type="button"
          class="scan-staff"
          :aria-label="t('staff.open')"
          :disabled="active"
          @click="staffOpen = true"
        >
          <StationMapIcon name="help" /><ZhuyinText :text="t('staff.short')" />
        </button>
        <button
          v-if="view.destinationId"
          type="button"
          :aria-label="t('scan.cancelTrip')"
          :disabled="active"
          @click="emit('cancel-trip')"
        >
          <ZhuyinText :text="t('map.cancel')" />
        </button>
      </div>
      <p v-if="!available" class="scan-note">{{ t("scan.needAppShort") }}</p>
      <details
        v-if="
          notice &&
          !['notice.located', 'notice.linkLoaded', 'notice.Cancelled'].includes(
            view.noticeKey
          )
        "
        class="scan-status-details"
      >
        <summary>{{ t("scan.status") }}</summary>
        <p role="status">{{ notice }}</p>
      </details>
      <StaffCard
        v-if="staffOpen && destination"
        :point="destination"
        :step-free="view.stepFree"
        @close="closeStaffCard"
      />
    </template>
    <template v-else>
      <div class="scan-heading" :class="{ 'visually-hidden': embedded }">
        <h2 id="station-scan-heading">
          <ZhuyinText
            :text="
              view.mode === 'navigation' || persistentScan
                ? t('scan.navigation')
                : t('scan.browsing')
            "
          />
        </h2>
      </div>
      <p class="scan-caveat">
        {{ t("scan.caveat") }}
      </p>
      <p v-if="view.mode === 'browsing' && !embedded">
        <ZhuyinText :text="t('scan.browseHint')" />
      </p>
      <template v-if="view.mode === 'navigation'">
        <DestinationSearch
          id="station-navigation-search"
          :catalog="searchEntries"
          navigation
          :disabled="active"
          :current-options="options"
          @select="searchSelect"
        />
        <details class="scan-destination-list">
          <summary><ZhuyinText :text="t('scan.chooseDestination')" /></summary>
          <label for="station-destination"
            ><ZhuyinText :text="t('scan.chooseDestination')"
          /></label>
          <select
            id="station-destination"
            :value="view.destinationId ?? ''"
            :disabled="active"
            @change="choose($event.target.value)"
          >
            <option disabled value="">
              <ZhuyinText :text="t('scan.choosePlaceholder')" plain />
            </option>
            <option v-for="point in catalog" :key="point.id" :value="point.id">
              <ZhuyinText :text="point.floor" plain /> ·
              <ZhuyinText :text="label(point)" plain />
            </option>
          </select>
        </details>
        <button
          v-if="props.selectedPoint"
          :disabled="active"
          @click="choose(props.selectedPoint.id)"
        >
          <ZhuyinText
            :text="t('scan.useSelected', { name: name(props.selectedPoint) })"
          />
        </button>
        <label
          ><input
            :checked="view.stepFree"
            type="checkbox"
            :disabled="active"
            @change="changeStepFree($event.target.checked)" /><ZhuyinText
            :text="t('scan.stepFree')"
        /></label>
      </template>
      <p v-if="destination" class="scan-target">
        <strong
          ><ZhuyinText
            :text="t('scan.destination', { place: place(destination) })"
        /></strong>
      </p>
      <StaffCard
        v-if="staffOpen && destination"
        :point="destination"
        :step-free="view.stepFree"
        @close="closeStaffCard"
      />
      <p v-if="view.manualPosition && position" role="status">
        <ZhuyinText
          :text="t('transfer.previousLocation', { place: place(position) })"
        />
      </p>
      <p v-else-if="position || view.mode !== 'browsing'" role="status">
        <ZhuyinText
          :text="
            position
              ? t('scan.youAreHere', { place: place(position) })
              : t('scan.notLocated')
          "
        />
      </p>
      <p v-if="view.position?.source === 'qr'" class="scan-time">
        <ZhuyinText :text="t('scan.scannedAt', { time: confirmedTime })" />
      </p>
      <p v-else-if="view.position" class="scan-time">
        <ZhuyinText :text="t('scan.fromLink')" />
      </p>

      <p v-if="!persistentScan && !available" class="scan-note">
        {{ t("scan.needApp") }}
      </p>
      <p v-if="!persistentScan && notice" role="status">
        <ZhuyinText :text="notice" />
      </p>
      <div
        v-if="position && destination"
        class="scan-overview"
        aria-live="polite"
      >
        <h3>
          <ZhuyinText
            :text="
              view.arrived ? t('scan.arrivedTitle') : t('scan.currentHint')
            "
          />
        </h3>
        <p><ZhuyinText :text="instruction" /></p>
        <StationTransferStep v-if="!persistentScan" :location="location" />
        <ol v-if="view.relation.steps.length">
          <li v-for="step in view.relation.steps" :key="step.id">
            <ZhuyinText :text="stopLabel(step.from)" /> →
            <ZhuyinText :text="stopLabel(step.to)" /><button
              :disabled="active"
              @click="unavailable(step.id)"
            >
              <ZhuyinText :text="t('scan.unavailable')" />
            </button>
          </li>
        </ol>
        <button
          v-if="view.relation.status === 'at_destination' && !view.arrived"
          :disabled="active"
          @click="confirm(view.token)"
        >
          <ZhuyinText :text="t('scan.confirmArrival')" />
        </button>
        <p v-if="view.excludedEdgeTypes.length">
          <ZhuyinText
            :text="
              t('scan.excluded', {
                list: view.excludedEdgeTypes.join(t('scan.listSeparator')),
              })
            "
          />
        </p>
      </div>

      <div class="scan-actions" role="group" :aria-label="t('scan.actions')">
        <StationNavigationRescan
          v-if="persistentScan || position"
          :location="location"
          @scanned="emit('scanned', $event)"
        />
        <button
          v-else
          class="scan-start"
          data-tour-target="scan"
          :disabled="!available || active"
          @click="start"
        >
          <StationMapIcon name="qrcode" />
          <ZhuyinText
            :text="
              active
                ? t('scan.waiting')
                : position
                ? t('scan.rescan')
                : t('scan.scan')
            "
          />
        </button>
        <div
          v-if="destination || view.mode === 'navigation'"
          class="scan-secondary-actions"
        >
          <button
            v-if="destination"
            type="button"
            class="scan-staff"
            :disabled="active"
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
            <ZhuyinText :text="t('staff.open')" />
          </button>
          <button
            v-if="view.mode === 'navigation' || view.destinationId"
            type="button"
            class="scan-cancel"
            :disabled="active"
            @click="emit('cancel-trip')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m7 7 10 10M17 7 7 17"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            <ZhuyinText
              :text="
                view.mode === 'browsing' ? t('scan.cancelTrip') : t('scan.exit')
              "
            />
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, ref } from "vue";
import DestinationSearch from "./DestinationSearch.vue";
import StaffCard from "./StaffCard.vue";
import ZhuyinText from "./ZhuyinText.vue";
import StationTransferStep from "./StationTransferStep.vue";
import StationNavigationRescan from "./StationNavigationRescan.vue";
import StationMapIcon from "./StationMapIcon.vue";
import { stationCatalog } from "../search/catalog.mjs";
import { stationPoints } from "../station/scan.mjs";
import data from "../views/station-points.json";
import { htmlLang, useI18n } from "../i18n/index.mjs";
import { placeLabel, placeName } from "../i18n/places.mjs";
const props = defineProps({
  selectedPoint: { type: Object, default: null },
  location: { type: Object, required: true },
  persistentScan: { type: Boolean, default: false },
  // Rendered inside the start field instead of as its own card.
  embedded: { type: Boolean, default: false },
});
const emit = defineEmits(["destination", "scanned", "cancel-trip"]);
const view = computed(() => props.location.view.value);
const catalog = stationPoints(data),
  searchEntries = stationCatalog(data);
const byId = new Map(catalog.map((p) => [p.id, p]));
const i18n = useI18n();
const { locale, t } = i18n;
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

.scan-actions {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.scan-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: var(--display-control-height, 44px);
  margin: 0;
  padding: 12px;
  line-height: 1.4;
  white-space: normal;
  text-align: center;
}
.scan-actions svg {
  flex: none;
  width: 24px;
  height: 24px;
}
.scan-secondary-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
  gap: 10px;
}
.scan-secondary-actions .scan-staff {
  border-color: var(--tp-primary-300);
  background: var(--wash);
  color: var(--ink);
}
.scan-secondary-actions .scan-cancel {
  border-color: var(--border);
  background: transparent;
  color: var(--muted);
  font-weight: 500;
}
.scan-actions :deep(.navigation-rescan-bar) {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
}
.scan-actions :deep(.navigation-rescan-bar button) {
  margin: 8px 0 0;
}
/* Inside the start field: no card, compact copy, secondary scan button. */
.station-scan-panel.is-embedded {
  margin: 4px 0 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font-size: var(--display-secondary-size, 0.875rem);
}
.station-scan-panel.is-embedded p {
  margin: 4px 0;
}
.station-scan-panel.is-embedded .scan-actions {
  margin-top: 8px;
  padding-top: 0;
  border-top: 0;
}
.station-scan-panel.is-embedded .scan-start {
  min-height: 44px;
  background: var(--surface, #fff);
  color: var(--tp-primary-700, #356c77);
  border: 1px solid var(--tp-primary-500, #5ab4c5);
}
.station-scan-panel.is-embedded .scan-start:active:not(:disabled) {
  background: var(--tp-primary-50, #e6f4f7);
}
.station-scan-panel.is-embedded :deep(.navigation-rescan-bar) {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
}
.station-scan-panel.is-embedded :deep(.navigation-rescan-bar p) {
  margin: 2px 0;
}
.station-scan-panel.is-embedded :deep(.navigation-rescan-bar button) {
  margin-top: 6px;
  background: var(--surface, #fff);
  color: var(--tp-primary-700, #356c77);
  border: 1px solid var(--tp-primary-500, #5ab4c5);
}
.station-scan-panel.is-embedded .scan-caveat {
  color: var(--muted);
  font-size: 0.75rem;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.compact-scan-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.compact-scan-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: auto;
  min-width: 0;
  margin: 0;
  padding: 8px 12px;
}
.compact-scan-actions svg {
  width: 22px;
  height: 22px;
  flex: none;
}
.compact-scan-actions :deep(.navigation-rescan-bar) {
  flex: 1 1 10rem;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
}
.compact-scan-actions :deep(.navigation-rescan-bar button) {
  margin: 0;
}
.scan-status-details summary {
  min-height: 44px;
  display: flex;
  align-items: center;
}
</style>
