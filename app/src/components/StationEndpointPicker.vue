<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div
    class="endpoint-backdrop"
    @click.self="emit('close')"
    @touchmove.prevent
    @wheel.prevent
  >
    <section
      ref="panel"
      class="endpoint-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="endpoint-dialog-title"
      @keydown.esc.stop.prevent="emit('close')"
      @keydown.tab="keepFocus"
    >
      <header>
        <h2 id="endpoint-dialog-title">
          <ZhuyinText :text="t('map.locate')" />
        </h2>
        <button
          ref="closeButton"
          class="endpoint-close"
          type="button"
          :aria-label="t('endpoint.close')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div
        class="endpoint-roles"
        role="group"
        :aria-label="t('endpoint.roles')"
      >
        <button
          v-for="(label, role) in labels"
          :key="role"
          type="button"
          :data-endpoint-role="role"
          :aria-label="label"
          :aria-pressed="role === activeRole"
          @click="showRole(role)"
        >
          <strong><ZhuyinText :text="label" /></strong>
          <span
            class="endpoint-value"
            @touchmove="displayMode === 'child' && $event.stopPropagation()"
            @wheel="displayMode === 'child' && $event.stopPropagation()"
          >
            <ZhuyinText
              :text="
                choices[role]
                  ? choices[role].floor + '・' + placeName(choices[role], i18n)
                  : t('endpoint.none')
              "
            />
          </span>
        </button>
      </div>
      <div
        ref="list"
        class="endpoint-selection-body"
        @touchmove.stop
        @wheel.stop
      >
        <DestinationSearch
          :key="activeRole"
          :id="'endpoint-' + activeRole + '-search'"
          :catalog="searchEntries"
          :selection-role="activeRole"
          :current-options="currentOptions"
          navigation
          @select="chooseSearch"
        />
        <p class="endpoint-browse-title">
          <ZhuyinText :text="t('endpoint.browse')" />
        </p>
        <div
          class="endpoint-types"
          role="group"
          :aria-label="t('endpoint.browse')"
          @touchmove.stop
          @wheel.stop
        >
          <button
            v-for="type in browseTypes"
            :key="type || 'all'"
            type="button"
            :aria-pressed="browseType === type"
            @click="browseType = type"
          >
            <StationMapIcon :name="type || 'map'" />
            <ZhuyinText
              :text="type ? t('type.' + type) : t('endpoint.allTypes')"
            />
          </button>
        </div>
        <div
          class="endpoint-list"
          :aria-label="t('endpoint.pointsAria', { role: labels[activeRole] })"
        >
          <details
            v-for="(floorPoints, floor) in browsePoints"
            :key="floor"
            class="endpoint-floor"
            :data-endpoint-floor="floor"
            :open="floor === (choices[activeRole]?.floor ?? 'B1')"
          >
            <summary>{{ floor }}</summary>
            <ul>
              <li v-for="point in floorPoints" :key="point.id">
                <button
                  type="button"
                  :aria-pressed="point.id === choices[activeRole]?.id"
                  @click="choosePoint({ ...point, floor })"
                >
                  <ZhuyinText :text="placeLabel(point, i18n)" />
                </button>
              </li>
            </ul>
          </details>
        </div>
      </div>
      <footer>
        <button
          type="button"
          :disabled="!choices[activeRole]"
          @click="choosePoint(null)"
        >
          <ZhuyinText
            :text="t('endpoint.clear', { role: labels[activeRole] })"
          />
        </button>
        <button
          type="button"
          class="endpoint-map-pick"
          @click="emit('map-pick')"
        >
          <ZhuyinText :text="t('endpoint.mapPick')" />
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import ZhuyinText from "./ZhuyinText.vue";
/* global defineProps, defineEmits */
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { useI18n } from "../i18n/index.mjs";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { placeLabel, placeName } from "../i18n/places.mjs";
import stationData from "../views/station-points.json";
import StationMapIcon from "./StationMapIcon.vue";
import DestinationSearch from "./DestinationSearch.vue";
import { stationCatalog } from "../search/catalog.mjs";

const props = defineProps({
  startPoint: { type: Object, default: null },
  targetPoint: { type: Object, default: null },
  // Which field the visitor tapped in the endpoint bar.
  initialRole: { type: String, default: null },
  currentOptions: {
    type: Object,
    default: () => ({
      mobilityProfile: "standard",
      excludedEdgeTypes: [],
      unavailableConnectorIds: [],
    }),
  },
});
const emit = defineEmits(["select", "close", "map-pick"]);
const { points } = stationData;
const searchEntries = stationCatalog(stationData);
const i18n = useI18n();
const { t } = i18n;
const { displayMode } = useDisplayPreferences();
const labels = computed(() => ({
  start: t("endpoint.start"),
  destination: t("endpoint.destination"),
}));
const choices = reactive({
  start: props.startPoint,
  destination: props.targetPoint,
});
const activeRole = ref(
  ["start", "destination"].includes(props.initialRole)
    ? props.initialRole
    : choices.start && !choices.destination
    ? "destination"
    : "start"
);
// Secondary browsing: filter the floor lists by facility type.
const typeOrder = [
  "restroom",
  "elevator",
  "exit",
  "info",
  "ticket",
  "escalator",
  "stairs",
  "nursing",
  "water",
  "locker",
  "aed",
  "accessible",
];
const typesOf = (point) => [point.type].flat();
const browseTypes = [
  null,
  ...typeOrder.filter((type) =>
    Object.values(points).some((list) =>
      list.some((point) => typesOf(point).includes(type))
    )
  ),
];
const browseType = ref(null);
const browsePoints = computed(() =>
  Object.fromEntries(
    Object.entries(points)
      .map(([floor, list]) => [
        floor,
        browseType.value
          ? list.filter((point) => typesOf(point).includes(browseType.value))
          : list,
      ])
      .filter(([, list]) => list.length)
  )
);
const panel = ref(null);
const list = ref(null);
const closeButton = ref(null);
// Opened from a field in the endpoint bar: searching comes first.
onMounted(() => {
  const search = props.initialRole && list.value?.querySelector("input");
  (search || closeButton.value).focus({ preventScroll: true });
});

function showRole(role) {
  if (role === activeRole.value) return;
  activeRole.value = role;
  list.value.scrollTop = 0;
}

function chooseSearch(selection) {
  if (selection.role !== activeRole.value) return;
  const point = Object.entries(points)
    .flatMap(([floor, list]) => list.map((point) => ({ ...point, floor })))
    .find((point) => point.id === selection.poiId);
  if (point)
    choosePoint(
      point,
      activeRole.value === "destination" ? selection.proposedOptions : undefined
    );
}
async function choosePoint(point, proposedOptions) {
  choices[activeRole.value] = point;
  emit(
    "select",
    choices.start?.id,
    choices.destination?.id,
    point,
    activeRole.value,
    proposedOptions
  );
  if (point && activeRole.value === "start" && !choices.destination) {
    showRole("destination");
    panel.value.querySelector('[data-endpoint-role="destination"]').focus();
  } else if (!point) {
    await nextTick();
    closeButton.value?.focus({ preventScroll: true });
  }
}

function keepFocus(event) {
  const buttons = panel.value.querySelectorAll(
    "button:not(:disabled), input:not(:disabled), select:not(:disabled)"
  );
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (document.activeElement !== (event.shiftKey ? first : last)) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}
</script>

<style scoped>
.endpoint-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgb(12 19 21 / 48%);
}
.endpoint-dialog {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: min(100%, 440px);
  height: 75vh;
  height: 75svh;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
}
.endpoint-dialog header,
.endpoint-dialog footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
}
.endpoint-dialog h2 {
  margin: 0;
  font-size: var(--display-main-size, 1rem);
}
.endpoint-dialog button {
  box-sizing: border-box;
  min-height: var(--display-control-height, 44px);
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: var(--display-control-size, 0.875rem);
  cursor: pointer;
}
.endpoint-dialog button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -3px;
}
.endpoint-dialog .endpoint-close {
  min-width: var(--display-control-height, 44px);
  font-size: 1.5rem;
  line-height: 1;
}
.endpoint-dialog :deep(.destination-search) {
  margin: 0 12px 8px;
  padding: 10px;
  overscroll-behavior: contain;
}
.endpoint-roles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 0 12px 8px;
}
.endpoint-roles button {
  display: grid;
  gap: 2px;
  min-width: 0;
  text-align: left;
}
.endpoint-value {
  overflow: hidden;
  color: var(--muted);
  font-size: var(--display-secondary-size, 0.75rem);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.endpoint-roles button[aria-pressed="true"],
.endpoint-dialog .endpoint-map-pick {
  border-color: var(--tp-primary-500);
  background: var(--wash);
}
.endpoint-dialog button:disabled {
  opacity: 0.55;
  cursor: default;
}
.endpoint-dialog header,
.endpoint-dialog footer,
.endpoint-roles {
  flex: none;
}
.endpoint-selection-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.endpoint-list {
  padding-inline: 12px;
}
.endpoint-floor > summary {
  position: sticky;
  z-index: 1;
  top: 0;
  margin: 0;
  min-height: var(--display-control-height, 44px);
  box-sizing: border-box;
  padding: 12px 4px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  color: var(--accent);
  font-size: var(--display-secondary-size, 0.875rem);
}
.endpoint-list ul {
  display: grid;
  gap: 4px;
  margin: 6px 0 12px;
  padding: 0;
  list-style: none;
}
.endpoint-list button {
  width: 100%;
  scroll-margin-top: 40px;
  text-align: left;
}
.endpoint-list button[aria-pressed="true"] {
  border-color: var(--tp-primary-500);
  background: var(--wash);
  font-weight: 700;
}
@media (max-height: 420px) {
  .endpoint-dialog {
    height: calc(100vh - 24px);
    height: calc(100svh - 24px);
  }
  .endpoint-dialog header,
  .endpoint-dialog footer {
    padding-block: 4px;
  }
}
.endpoint-browse-title {
  margin: 16px 0 8px;
  color: var(--muted);
  font-size: var(--display-secondary-size, 0.8125rem);
  font-weight: 600;
}
.endpoint-types {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.endpoint-types button {
  flex: none;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--tp-primary-300, #9fd2dc);
  border-radius: 18px;
  background: var(--surface);
  color: var(--tp-primary-700);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}
.endpoint-types button[aria-pressed="true"] {
  border-color: var(--tp-primary-600);
  background: var(--tp-primary-600);
  color: #fff;
}
.endpoint-types button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.endpoint-types svg {
  width: 22px;
  height: 22px;
  flex: none;
}
</style>
