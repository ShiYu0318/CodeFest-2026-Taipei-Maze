<template>
  <main
    class="station-page display-page"
    :lang="htmlLang(locale)"
    :data-theme="theme"
    :data-display-mode="displayMode"
  >
    <div
      class="station-shell"
      :inert="endpointPickerOpen || tripDialog ? '' : null"
    >
      <section class="station-heading" :aria-label="t('display.group')">
        <div class="station-title-row">
          <!-- <h1 id="station-title"><ZhuyinText text="台北車站" /></h1> -->
          <DisplayControls />
        </div>
        <p v-if="displayMode !== 'standard'" class="display-floor-label">
          {{ level }}・<ZhuyinText :text="t('floor.' + level)" />
        </p>
        <p v-if="displayMode === 'child'" class="display-hint">
          <ZhuyinText :text="t('map.childHint')" />
        </p>
      </section>

      <StationScanPanel
        :location="location"
        :selected-point="selected"
        @destination="planDestination"
        @scanned="onQrScanned"
        @cancel-trip="openTripDialog('cancel')"
      />
      <div ref="floorControls" class="floor-controls">
        <div
          class="floor-switch"
          role="group"
          :aria-label="t('map.floorGroup')"
        >
          <button
            v-for="floor in floorIds"
            :key="floor"
            type="button"
            :style="floorStyle(floor)"
            :aria-pressed="level === floor"
            :disabled="floorChanging"
            @click="showFloor(floor)"
          >
            {{ floor }}
          </button>
        </div>
        <div class="floor-actions">
          <button
            class="display-icon-button"
            type="button"
            role="switch"
            :aria-checked="showLayers"
            :aria-label="t('map.layersAria')"
            :title="t('map.layers')"
            :disabled="floorChanging"
            @click="toggleLayers"
          >
            <StationMapIcon name="layers" />
          </button>
          <button
            class="display-icon-button"
            type="button"
            :aria-label="t('map.locate')"
            aria-haspopup="dialog"
            :title="t('map.locate')"
            :disabled="floorChanging"
            @click="openEndpointPicker"
          >
            <StationMapIcon name="locate" />
          </button>
        </div>
      </div>

      <div
        class="theme-group"
        role="group"
        :aria-label="t('map.themesAria')"
        tabindex="0"
        @wheel="scrollThemesWithWheel"
      >
        <button
          v-for="type in availableThemes"
          :key="type"
          type="button"
          :aria-pressed="activeTheme === type"
          @click="toggleTheme(type)"
        >
          <StationMapIcon :name="type" /><ZhuyinText
            :text="t('type.' + type)"
          />
        </button>
      </div>

      <div v-if="mapPickStep" class="map-pick-instructions">
        <p role="status">
          {{ mapPickStep === "start" ? t("map.pickStart") : t("map.pickEnd") }}
        </p>
        <button type="button" @click="openEndpointPicker()">
          {{ t("map.cancel") }}
        </button>
      </div>

      <div class="station-layout">
        <div class="station-map-column">
          <section
            ref="mapSection"
            class="map-card"
            :aria-label="t('map.mapAria')"
          >
            <div
              ref="mapStage"
              class="map-stage"
              :style="{ '--map-top': mapTop * 1.5 + 'px' }"
              @keydown.esc="
                mapPickStep ? openEndpointPicker() : closeConnectorDetails()
              "
            >
              <div class="map-corner">
                <button
                  v-if="originView"
                  type="button"
                  class="map-return"
                  :disabled="floorChanging"
                  @click="returnToOrigin"
                >
                  <ZhuyinText :text="t('map.backToStart')" />・{{
                    originView.floor
                  }}
                </button>
              </div>
              <div class="map-window" :inert="floorChanging ? '' : null">
                <div
                  ref="viewport"
                  class="map-viewport"
                  :class="{ 'map-zoomed': zoom > 1, 'map-dragging': dragging }"
                  :style="{
                    '--map-aspect': bounds[2] + ' / ' + bounds[3],
                    '--map-viewport-aspect':
                      bounds[2] + ' / ' + bounds[3] * 1.5,
                  }"
                  role="region"
                  :aria-label="t('map.interactiveAria', { floor: level })"
                  tabindex="0"
                  @scroll.passive="placeConnectorPanel"
                  @wheel="zoomWithWheel"
                  @keydown.self="zoomWithKeyboard"
                  @pointerdown="startMapDrag"
                  @pointermove="moveMapDrag"
                  @pointerup="endMapDrag"
                  @pointercancel="endMapDrag"
                  @pointerleave="leaveMapDrag"
                  @lostpointercapture="endMapDrag"
                  @click.capture="ignoreDragClick"
                >
                  <div class="map-board" :style="{ '--map-zoom': zoom }">
                    <svg
                      class="floor-plan"
                      :viewBox="bounds.join(' ')"
                      role="img"
                      :aria-label="t('map.planAria', { floor: level })"
                    >
                      <g
                        v-for="layer in backgroundLayers"
                        :key="layer.floor"
                        class="ghost-layer"
                        :style="{ '--ghost-ink': layer.color }"
                        :transform="layer.transform"
                        aria-hidden="true"
                      >
                        <StationFloorPlan :floor="layer.floor" outline-only />
                      </g>
                      <g
                        :class="{
                          'active-with-layers': backgroundLayers.length,
                        }"
                      >
                        <StationFloorPlan :floor="level" />
                      </g>
                    </svg>
                    <button
                      v-for="point in floorPoints"
                      :key="point.id"
                      class="map-pin"
                      :class="{
                        'pin-filtered-out': !isPointVisible(point),
                        'pin-themed': matchesTheme(point, activeTheme),
                        'pin-scan-position': point.id === scanPositionId,
                        'pin-scan-target': point.id === scanTargetId,
                        'pin-arrival': point.id === arrivalPointId,
                        'pin-location':
                          point.id === selected?.id ||
                          point.id === mapCurrentPoint?.id,
                        'pin-endpoint':
                          point.id === mapCurrentPoint?.id ||
                          point.id === mapTargetPoint?.id,
                      }"
                      type="button"
                      :style="pinStyle(point)"
                      :aria-label="mapPointLabel(point)"
                      :aria-pressed="point.id === selected?.id"
                      :aria-hidden="!isPointVisible(point)"
                      :tabindex="isPointVisible(point) ? undefined : -1"
                      :aria-expanded="
                        isConnector(point) && !mapPickStep
                          ? point.id === selected?.id &&
                            !floorChanging &&
                            !!connectorPosition
                          : undefined
                      "
                      @click="selectMapPoint(point, $event)"
                      @focus="focusVisiblePin(point, $event)"
                    >
                      <span
                        v-if="
                          point.id === selected?.id ||
                          point.id === mapCurrentPoint?.id
                        "
                        class="pin-icon"
                      >
                        <StationMapIcon :name="pointIconType(point)" />
                      </span>
                      <span v-else class="point-pin">
                        <StationMapIcon
                          class="point-icon"
                          :name="pointIconType(point)"
                        />
                      </span>
                      <span
                        v-if="point.id === scanPositionId"
                        class="location-badge"
                      >
                        <ZhuyinText :text="t('map.youAreHere')" />
                        <span class="location-name"
                          ><ZhuyinText :text="pointName(point)"
                        /></span>
                      </span>
                      <svg
                        v-if="
                          point.id === selected?.id ||
                          point.id === mapCurrentPoint?.id
                        "
                        class="map-location-arrow"
                        viewBox="0 0 80 80"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient
                            :id="'location-arrow-' + point.id"
                            x2="0"
                            y2="1"
                          >
                            <stop stop-color="#fff" stop-opacity="0" />
                            <stop
                              offset="1"
                              stop-color="#fff"
                              stop-opacity=".55"
                            />
                          </linearGradient>
                        </defs>
                        <path :d="facingMarkerPath" fill="currentColor" />
                        <path
                          :d="facingMarkerPath"
                          :fill="'url(#location-arrow-' + point.id + ')'"
                        />
                      </svg>
                      <span
                        v-if="
                          point.id === mapCurrentPoint?.id ||
                          point.id === mapTargetPoint?.id
                        "
                        class="map-endpoint"
                        :class="{
                          'map-endpoint-target':
                            point.id === mapTargetPoint?.id,
                        }"
                        aria-hidden="true"
                        >{{ endpointBadge(point) }}</span
                      >
                    </button>
                  </div>
                </div>
              </div>

              <section
                v-if="isConnector(selected) && !floorChanging"
                id="connector-panel"
                ref="connectorPanel"
                class="connector-panel"
                :style="connectorPosition || { visibility: 'hidden' }"
                aria-labelledby="connector-title"
              >
                <h3 id="connector-title" ref="connectorHeading" tabindex="-1">
                  <ZhuyinText :text="pointName(selected)" />
                </h3>
                <p v-if="showHelp" class="display-hint">
                  <ZhuyinText :text="t('help.' + pointHelpType(selected))" />
                </p>
                <template v-if="destinations.length">
                  <div v-for="transfer in destinations" :key="transfer.id">
                    <button
                      type="button"
                      class="floor-destination"
                      @click="visitDestination(transfer)"
                    >
                      <span
                        >{{ transfer.to.floor }}・<ZhuyinText
                          :text="zoneName(transfer.to.zone)"
                      /></span>
                      <StationMapIcon name="arrow" />
                    </button>
                    <p v-if="transferNote(transfer)">
                      <ZhuyinText :text="transferNote(transfer)" />
                    </p>
                  </div>
                </template>
                <p v-else><ZhuyinText :text="pointDescription(selected)" /></p>
              </section>
            </div>
            <div
              v-if="
                selected && !isConnector(selected) && displayMode !== 'standard'
              "
              class="display-facility-detail"
              role="status"
            >
              <h3><ZhuyinText :text="pointName(selected)" /></h3>
              <p v-if="showHelp" class="display-hint">
                <ZhuyinText :text="t('help.' + pointHelpType(selected))" />
              </p>
              <p><ZhuyinText :text="pointDescription(selected)" /></p>
            </div>
          </section>
        </div>

        <footer class="station-footer">
          <span>{{ t("map.footerNote") }}</span>
          <div>
            <a
              v-for="[label, url] in sources"
              :key="url"
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
              >{{ label }}</a
            >
          </div>
          <p class="station-data-status">
            {{
              t("map.dataStatus", {
                points: dataStatus.points,
                connections: dataStatus.connections,
                unverified: dataStatus.unverifiedConnections,
              })
            }}
          </p>
          <router-link to="/about" class="station-about-link">{{
            t("map.about", { version: buildInfo.short })
          }}</router-link>
        </footer>
      </div>
    </div>
    <StationEndpointPicker
      v-if="endpointPickerOpen"
      :start-point="currentPoint"
      :target-point="targetPoint"
      @close="closeEndpointPicker"
      @select="chooseEndpoint"
      @map-pick="startMapPicking"
    />
    <StationTripDialog
      v-if="tripDialog"
      :key="tripDialog"
      :direction="tripDirection"
      :cancel-only="tripDialog === 'cancel'"
      @continue="closeTripDialog"
      @cancel="cancelTrip"
    />
  </main>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
// import DestinationSearch from "../components/DestinationSearch.vue";
// import { stationCatalog } from "../search/catalog.mjs";
import StationFloorPlan from "../components/StationFloorPlan.vue";
import StationScanPanel from "../components/StationScanPanel.vue";
import StationEndpointPicker from "../components/StationEndpointPicker.vue";
import StationTripDialog from "../components/StationTripDialog.vue";
import StationMapIcon from "../components/StationMapIcon.vue";
import DisplayControls from "../components/DisplayControls.vue";
import ZhuyinText from "../components/ZhuyinText.vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { useStationLocation } from "../station/useStationLocation";
import { stationPoints } from "../station/scan.mjs";
import { buildInfo, summarizeStationData } from "../about/about.mjs";
import { htmlLang, useI18n } from "../i18n/index.mjs";
import { placeName } from "../i18n/places.mjs";
import { useMapFocus } from "../station/map-focus.mjs";
import { floors, stackBounds } from "./station-floor-plans";
import stationData from "./station-points.json";
import stationConnections from "./station-connections.json";
import { zones, transfersFromPoint } from "./station-routing";

const { categories, points } = stationData;
const { theme, displayMode } = useDisplayPreferences();
const i18n = useI18n();
const { locale, t } = i18n;
const pointName = (point) => placeName(point, i18n);
// Visitors who do not read Chinese get the plain-language help instead.
const showHelp = computed(
  () => displayMode.value === "child" || locale.value !== "zh-TW"
);
const pointDescription = (point) =>
  locale.value === "zh-TW"
    ? point.description
    : t("map.originalName", { name: point.name });
const route = useRoute();
const router = useRouter();
const stationById = new Map(
  stationPoints(stationData).map((point) => [point.id, point])
);
const currentPoint = computed(() => stationById.get(route.query.start));
const targetPoint = computed(() => stationById.get(route.query.destination));
// const searchCatalogEntries = stationCatalog(stationData);
// let searchPointRevision = 0;
const mobileZoomQuery = window.matchMedia(
  "(max-width: 719px), (pointer: coarse)"
);
const connectorTypes = new Set([
  "elevator",
  "stairs",
  "escalator",
  "stairs-escalator",
  "stairway",
]);
const floorIds = Object.keys(floors);
const initialMapZoom = 1.15;
const floorPalette = {
  B1: {
    tone: "primary-500",
    tint: "primary-100",
    ink: "primary-800",
    onTone: "primary-950",
  },
  B2: {
    tone: "primary-600",
    tint: "primary-200",
    ink: "primary-800",
    onTone: "primary-950",
  },
  B3: {
    tone: "primary-700",
    tint: "primary-300",
    ink: "primary-900",
    onTone: "gray-50",
  },
  B4: {
    tone: "primary-800",
    tint: "primary-400",
    ink: "primary-950",
    onTone: "gray-50",
  },
};
const level = ref(
  currentPoint.value?.floor ?? targetPoint.value?.floor ?? "B2"
);
const showLayers = ref(false);
const activeTheme = ref(null);
const selected = ref(null);
const endpointPickerOpen = ref(false);
const tripDialog = ref(null);
let tripTrigger = null;
const mapPickStep = ref(null);
const draftStart = ref(null);
const floorControls = ref(null);
let endpointTrigger = null;
let pickerFocusPoint = null;
const mapCurrentPoint = computed(() =>
  mapPickStep.value ? draftStart.value : currentPoint.value
);
const mapTargetPoint = computed(() =>
  mapPickStep.value ? null : targetPoint.value
);
const facingMarkerPath =
  "M40 1 47.5 14C53 15.8 58 18.7 61 22H57C47.3 12.8 32.7 12.8 23 22H19C22 18.7 27 15.8 32.5 14Z";
const scanPositionId = ref(null);
const scanTargetId = ref(null);
let scanFocusRevision = 0;
async function focusScanPoint(point) {
  const revision = ++scanFocusRevision;
  if (
    !point ||
    mapPickStep.value ||
    endpointPickerOpen.value ||
    tripDialog.value
  )
    return;
  floorAnimation?.cancel();
  clearMapDrag();
  clearPinch();
  originView.value = null;
  level.value = point.floor;
  selected.value = point;
  await nextTick();
  if (revision !== scanFocusRevision || !viewport.value?.isConnected) return;
  await zoomAt(2, viewportCenter(), normalizedPoint(point));
  if (revision !== scanFocusRevision || !viewport.value?.isConnected) return;
  const [x, y] = normalizedPoint(point);
  centerOn(x, y);
}
function setScanPosition(point) {
  scanPositionId.value = point?.id ?? null;
  focusScanPoint(point);
}
function setScanTarget(point) {
  scanTargetId.value = point?.id ?? null;
  focusScanPoint(point);
}
const originView = ref(null);
const connectorHeading = ref(null);
const connectorPanel = ref(null);
const connectorPosition = ref(null);
const floorChanging = ref(false);
const arrivalPointId = ref(null);
let floorAnimation = null;
const zoom = ref(initialMapZoom);
const viewport = ref(null);
const dragging = ref(false);
let mapDrag = null;
let ignoreMouseClick = false;
let pinch = null;
let webkitPinch = null;
let zoomRevision = 0;
const captureGesture = { capture: true, passive: false };
const webkitGestures = ["gesturestart", "gesturechange", "gestureend"];
const mapSection = ref(null);
const mapStage = ref(null);
const mapTop = ref(0);
const location = useStationLocation(stationData, stationConnections);
const tripDirection = computed(() => {
  const { destinationId, relation } = location.view.value;
  const connector = stationById.get(relation.steps[0]?.from.pointId);
  if (connector)
    return t("map.faceConnector", { name: placeName(connector, i18n) });
  if (relation.status === "at_destination") return t("map.faceDestination");
  return destinationId ? t("map.faceToDestination") : t("map.faceChoose");
});
watch(
  () => {
    const position = location.view.value.position;
    return position
      ? `${position.pointId}:${position.source}:${position.confirmedAt}`
      : null;
  },
  () => setScanPosition(stationById.get(location.view.value.position?.pointId)),
  { flush: "post" }
);
// Requests from the floating chat ("show on map").
const mapFocus = useMapFocus();
watch(
  () => mapFocus.request.value,
  async (request) => {
    const point = stationById.get(request?.pointId);
    if (!point) return;
    mapFocus.clear();
    await nextTick();
    // Bring the map itself into view; the scan panel sits above it.
    mapSection.value?.scrollIntoView({ block: "start", behavior: "smooth" });
    focusScanPoint(point);
  },
  { immediate: true, flush: "post" }
);
watch(
  () => location.view.value.destinationId,
  (id) => setScanTarget(stationById.get(id)),
  { flush: "post" }
);
watch([level, mapPickStep], updateMapLayout, { flush: "post" });
watch(displayMode, async () => {
  const frame = viewport.value;
  if (!frame) return;
  const center = zoomAnchor(viewportCenter());
  await nextTick();
  if (!frame.isConnected) return;
  updateMapLayout();
  await nextTick();
  if (!frame.isConnected) return;
  centerOn(...center);
  placeConnectorPanel();
});
watch([selected, zoom, showLayers, floorChanging], placeConnectorPanel, {
  flush: "post",
});

onMounted(() => {
  updateMapLayout();
  window.addEventListener("resize", updateMapLayout);
  mobileZoomQuery.addEventListener("change", enforceZoomLimit);
  document.addEventListener("click", dismissConnectorOutside, true);
  document.addEventListener("touchstart", startPinch, captureGesture);
  document.addEventListener("touchend", endPinch, captureGesture);
  document.addEventListener("touchcancel", endPinch, captureGesture);
  for (const type of webkitGestures) {
    document.addEventListener(type, handleWebkitGesture, captureGesture);
  }
  nextTick(() => {
    const point = currentPoint.value ?? targetPoint.value;
    centerOn(...(point ? normalizedPoint(point) : [0.5, 0.5]));
  });
});

onBeforeUnmount(() => {
  scanFocusRevision++;
  zoomRevision++;
  window.removeEventListener("resize", updateMapLayout);
  mobileZoomQuery.removeEventListener("change", enforceZoomLimit);
  document.removeEventListener("click", dismissConnectorOutside, true);
  floorAnimation?.cancel();
  clearMapDrag();
  clearPinch();
  document.removeEventListener("touchstart", startPinch, true);
  document.removeEventListener("touchend", endPinch, true);
  document.removeEventListener("touchcancel", endPinch, true);
  for (const type of webkitGestures) {
    document.removeEventListener(type, handleWebkitGesture, true);
  }
});

const destinations = computed(() => transfersFromPoint(selected.value?.id));
const floorPoints = computed(() => {
  const current = points[level.value];
  return [
    ...current.filter((point) => !isConnector(point)),
    ...current.filter((point) => isConnector(point)),
  ];
});
const availableThemes = computed(() =>
  Object.keys(categories).filter((type) =>
    floorPoints.value.some((point) => matchesTheme(point, type))
  )
);
const bounds = computed(() => {
  return showLayers.value ? stackBounds : floors[level.value].bounds;
});
const backgroundLayers = computed(() => {
  if (!showLayers.value) return [];
  const activeIndex = floorIds.indexOf(level.value);
  return floorIds.flatMap((floor, index) => {
    if (floor === level.value) return [];
    const offset = index - activeIndex;
    return [
      {
        floor,
        color: paletteColor(floorPalette[floor].tone),
        ink: paletteColor(floorPalette[floor].ink),
        transform: "translate(" + offset * 18 + " " + offset * 24 + ")",
      },
    ];
  });
});
const dataStatus = summarizeStationData(stationData, stationConnections);
const sources = computed(() => [
  [
    t("map.sourceInfo", { floor: level.value }),
    "https://web.metro.taipei/img/ALL/INFOPDF/051.pdf#page=" +
      (floorIds.indexOf(level.value) + 1),
  ],
  [
    t("map.sourceFacilities"),
    "https://web.metro.taipei/pages2026/WebStation/051/1",
  ],
  [
    t("map.sourceSection"),
    "https://web.metro.taipei/pages2026/WebStation/051/4",
  ],
]);

function isConnector(point) {
  return pointTypes(point).some((type) => connectorTypes.has(type));
}

function pointTypes(point) {
  return Array.isArray(point?.type) ? point.type : [point?.type];
}

function pointIconType(point) {
  return pointTypes(point)[0];
}

function pointHelpType(point) {
  const types = pointTypes(point);
  return types.includes("stairs") && types.includes("escalator")
    ? "stairs-escalator"
    : pointIconType(point);
}

function zoneName(id) {
  const key = `zone.${id}`;
  const name = t(key);
  return name === key ? zones.find((zone) => zone.id === id)?.name : name;
}

function scrollThemesWithWheel(event) {
  const element = event.currentTarget;
  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
  const normalizedDelta =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? delta * 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? delta * element.clientWidth
      : delta;
  const canScroll =
    (normalizedDelta < 0 && element.scrollLeft > 0) ||
    (normalizedDelta > 0 &&
      element.scrollLeft + element.clientWidth < element.scrollWidth);
  if (!canScroll) return;
  event.preventDefault();
  element.scrollLeft += normalizedDelta;
}

function matchesTheme(point, type) {
  const types = pointTypes(point);
  return (
    types.includes(type) ||
    (types.includes("stairs-escalator") &&
      (type === "stairs" || type === "escalator"))
  );
}

function isPointVisible(point) {
  return !activeTheme.value || matchesTheme(point, activeTheme.value);
}

function transferNote(transfer) {
  if (transfer.typeStatus === "unverified") return t("map.connectorUnknown");
  if (transfer.typeStatus === "inferred") return t("map.connectorInferred");
  if (
    transfer.escalatorDirection === "unverified" ||
    transfer.direction === "unverified"
  )
    return t("map.escalatorDirection");
  return "";
}

function paletteColor(token) {
  return `var(--tp-${token})`;
}

function floorStyle(floor) {
  const { tone, tint, ink, onTone } = floorPalette[floor];
  return {
    "--floor-tone": paletteColor(tone),
    "--floor-tint": paletteColor(tint),
    "--floor-ink": paletteColor(ink),
    "--floor-on-tone":
      theme.value === "dark" ? "#0c1315" : paletteColor(onTone),
  };
}

function normalizedPoint(point) {
  const [left, top, width, height] = bounds.value;
  return [(point.x - left) / width, (point.y - top) / height];
}

function pinStyle(point) {
  const [x, y] = normalizedPoint(point);
  return {
    left: x * 100 + "%",
    top: y * 100 + "%",
    ...pointThemeStyle(point.type),
  };
}

function endpointBadge(point) {
  const start =
    point.id === mapCurrentPoint.value?.id ? t("map.badgeStart") : "";
  const destination =
    point.id === mapTargetPoint.value?.id ? t("map.badgeEnd") : "";
  return start + destination;
}

function mapPointLabel(point) {
  const badge = endpointBadge(point);
  return (
    pointName(point) +
    (badge ? "・" + badge : "") +
    (point.id === scanPositionId.value ? t("map.ariaYouAreHere") : "") +
    (point.id === scanTargetId.value ? t("map.ariaDestination") : "")
  );
}

function pointThemeStyle(type) {
  const primaryType = Array.isArray(type) ? type[0] : type;
  const category = categories[primaryType];
  const colorToken = category?.colorToken || "gray-700";
  const iconColor = category?.iconColor;
  return {
    "--point-icon-color": iconColor || paletteColor(colorToken),
    "--marker-base-color": iconColor || "#4a5258",
    "--location-icon-ink": iconColor ? "#fdfefe" : "var(--surface)",
  };
}

function centerOn(x, y) {
  const frame = viewport.value;
  if (!frame?.isConnected) return;
  const board = frame.firstElementChild;
  if (!board) return;
  frame.scrollLeft =
    board.offsetLeft + x * board.clientWidth - frame.clientWidth / 2;
  frame.scrollTop =
    board.offsetTop + y * board.clientHeight - frame.clientHeight / 2;
}

function focusVisiblePin(point, event) {
  if (zoom.value > 1 && event.currentTarget.matches(":focus-visible")) {
    centerOn(...normalizedPoint(point));
  }
}

function constrainZoom(scale) {
  const minZoom = mobileZoomQuery.matches ? 1.5 : 1;
  return Math.min(3, Math.max(minZoom, scale));
}

function enforceZoomLimit() {
  const constrainedZoom = constrainZoom(zoom.value);
  if (constrainedZoom !== zoom.value) zoomAt(constrainedZoom, viewportCenter());
}

function viewportPoint(clientX, clientY) {
  const frame = viewport.value;
  const rect = frame.getBoundingClientRect();
  return [
    clientX - rect.left - frame.clientLeft,
    clientY - rect.top - frame.clientTop,
  ];
}

function zoomAnchor([x, y]) {
  const frame = viewport.value;
  const board = frame.firstElementChild;
  return [
    (frame.scrollLeft + x - board.offsetLeft) / board.clientWidth,
    (frame.scrollTop + y - board.offsetTop) / board.clientHeight,
  ];
}

async function zoomAt(scale, [x, y], anchor = zoomAnchor([x, y])) {
  scale = constrainZoom(scale);
  clearMapDrag();
  const frame = viewport.value;
  const board = frame.firstElementChild;
  const revision = ++zoomRevision;
  zoom.value = scale;
  await nextTick();
  if (revision !== zoomRevision || !frame.isConnected) return;
  if (scale === 1) frame.scrollTo(0, 0);
  else
    frame.scrollTo(
      board.offsetLeft + anchor[0] * board.clientWidth - x,
      board.offsetTop + anchor[1] * board.clientHeight - y
    );
}

function startMapDrag(event) {
  ignoreMouseClick = false;
  if (event.pointerType !== "mouse" || event.button !== 0 || zoom.value <= 1)
    return;
  const frame = viewport.value;
  mapDrag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: frame.scrollLeft,
    top: frame.scrollTop,
  };
}

function moveMapDrag(event) {
  if (event.pointerId !== mapDrag?.pointerId) return;
  if (!(event.buttons & 1)) {
    clearMapDrag();
    return;
  }
  const dx = event.clientX - mapDrag.x;
  const dy = event.clientY - mapDrag.y;
  const frame = viewport.value;
  if (!dragging.value) {
    // A small movement should still count as a tap on a facility marker.
    if (Math.hypot(dx, dy) < 5) return;
    frame.setPointerCapture(event.pointerId);
    dragging.value = true;
    ignoreMouseClick = true;
  }
  event.preventDefault();
  frame.scrollTo(mapDrag.left - dx, mapDrag.top - dy);
}

function clearMapDrag() {
  if (!mapDrag) return;
  const { pointerId } = mapDrag;
  const frame = viewport.value;
  mapDrag = null;
  dragging.value = false;
  if (frame?.hasPointerCapture(pointerId))
    frame.releasePointerCapture(pointerId);
}

function endMapDrag(event) {
  if (event.pointerId === mapDrag?.pointerId) clearMapDrag();
}

function leaveMapDrag(event) {
  if (!dragging.value) endMapDrag(event);
}

function ignoreDragClick(event) {
  if (!ignoreMouseClick || event.detail === 0) return;
  ignoreMouseClick = false;
  event.preventDefault();
  event.stopPropagation();
}

function resetZoom() {
  clearPinch();
  webkitPinch = null;
  return zoomAt(1, [0, 0], [0, 0]);
}

function zoomWithWheel(event) {
  // Chromium trackpad pinches arrive as Ctrl+wheel. Claim them only on the map.
  const zoomGesture = event.ctrlKey || event.metaKey;
  if (
    !zoomGesture &&
    (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
  )
    return;
  const unit =
    event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
      ? viewport.value.clientHeight
      : 1;
  const scale = constrainZoom(
    zoom.value * Math.exp((-event.deltaY * unit) / 600)
  );
  if (zoomGesture || scale !== zoom.value) event.preventDefault();
  if (scale === zoom.value) return;
  zoomAt(scale, viewportPoint(event.clientX, event.clientY));
}

function pinchPosition(touches) {
  if (touches.length !== 2) return null;
  const [first, second] = touches;
  const distance = Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY
  );
  if (distance === 0) return null;
  const center = viewportPoint(
    (first.clientX + second.clientX) / 2,
    (first.clientY + second.clientY) / 2
  );
  return { distance, center };
}

function startPinch(event) {
  if (floorChanging.value || event.touches.length < 2) return;
  // The second finger may land outside the map and dispatch its own touchstart there.
  if (
    !pinch &&
    !Array.from(event.touches).some((touch) =>
      viewport.value.contains(touch.target)
    )
  )
    return;
  if (event.cancelable) event.preventDefault();
  const position = pinchPosition(event.touches);
  if (!position) return;
  if (webkitPinch) webkitPinch.usesTouch = true;
  pinch = {
    distance: position.distance,
    scale: zoom.value,
    anchor: zoomAnchor(position.center),
  };
  document.addEventListener("touchmove", movePinch, captureGesture);
}

function movePinch(event) {
  if (!pinch) return;
  if (event.cancelable) event.preventDefault();
  const position = pinchPosition(event.touches);
  if (!position) return;
  const scale = constrainZoom(
    (pinch.scale * position.distance) / pinch.distance
  );
  zoomAt(scale, position.center, pinch.anchor);
}

function endPinch(event) {
  if (!pinch) return;
  if (event.cancelable) event.preventDefault();
  clearPinch();
}

function clearPinch() {
  pinch = null;
  document.removeEventListener("touchmove", movePinch, true);
}

function handleWebkitGesture(event) {
  if (floorChanging.value) return;
  // WebKit can also send native gesture events for the same pinch.
  if (event.type === "gesturestart") {
    webkitPinch = null;
    const frame = viewport.value;
    if (!pinch && !frame.contains(event.target)) return;
    const center =
      Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
        ? viewportPoint(event.clientX, event.clientY)
        : [frame.clientWidth / 2, frame.clientHeight / 2];
    webkitPinch = {
      center,
      anchor: zoomAnchor(center),
      scale: zoom.value,
      usesTouch: Boolean(pinch),
    };
  }
  if (!webkitPinch && !pinch) return;
  if (event.cancelable) event.preventDefault();
  if (event.type === "gestureend") webkitPinch = null;
  if (
    event.type === "gesturechange" &&
    webkitPinch &&
    !webkitPinch.usesTouch &&
    Number.isFinite(event.scale)
  ) {
    zoomAt(
      constrainZoom(webkitPinch.scale * event.scale),
      webkitPinch.center,
      webkitPinch.anchor
    );
  }
}

function zoomWithKeyboard(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "0") {
    event.preventDefault();
    resetZoom();
    return;
  }
  if (event.key !== "+" && event.key !== "=" && event.key !== "-") return;
  event.preventDefault();
  const scale = constrainZoom(zoom.value + (event.key === "-" ? -0.5 : 0.5));
  zoomAt(scale, viewportCenter());
}

async function showFloor(floor, { arrival, origin } = {}) {
  if (floorChanging.value || (floor === level.value && !origin)) return;
  const frame = viewport.value;
  const currentFloor = floorIds.indexOf(level.value);
  const targetFloor = floorIds.indexOf(floor);
  const animate =
    currentFloor !== targetFloor &&
    typeof frame.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const goingUp = targetFloor < currentFloor;
  const scale = zoom.value;
  floorChanging.value = true;
  clearMapDrag();
  clearPinch();
  webkitPinch = null;

  try {
    await nextTick();
    if (animate) {
      floorAnimation = frame.animate(
        {
          transform: ["scale(1)", goingUp ? "scale(.72)" : "scale(1.3)"],
          opacity: [1, 0],
        },
        { duration: 180, easing: "ease-in", fill: "forwards" }
      );
      await floorAnimation.finished;
    }
    if (!frame.isConnected) return;

    level.value = floor;
    selected.value = origin?.point ?? null;
    arrivalPointId.value = arrival?.point.id ?? null;
    if (origin) {
      showLayers.value = origin.layers;
      activeTheme.value = origin.theme;
    } else if (!availableThemes.value.includes(activeTheme.value)) {
      activeTheme.value = null;
    }
    await resetZoom();
    if (!frame.isConnected) return;
    if (!origin) await zoomAt(initialMapZoom, viewportCenter());
    if (origin) await zoomAt(origin.scale, viewportCenter(), origin.center);
    else if (arrival)
      await zoomAt(scale, viewportCenter(), normalizedPoint(arrival.point));
    if (!frame.isConnected) return;

    if (animate) {
      floorAnimation.cancel();
      floorAnimation = frame.animate(
        {
          transform: [goingUp ? "scale(1.3)" : "scale(.72)", "scale(1)"],
          opacity: [0, 1],
        },
        { duration: 220, easing: "ease-out" }
      );
      await floorAnimation.finished;
    }
  } catch (error) {
    if (error.name !== "AbortError") throw error;
  } finally {
    floorAnimation?.cancel();
    floorAnimation = null;
    floorChanging.value = false;
  }
}

function toggleLayers() {
  showLayers.value = !showLayers.value;
  resetZoom();
}

// async function selectSearchPoint({ poiId }) {
//   const requestRevision = ++searchPointRevision;
//   const entry = searchCatalogEntries.find((p) => p.id === poiId);
//   if (!entry) return;
//   const point = points[entry.floorId].find((p) => p.id === poiId);
//   if (!point) return;
//   await showFloor(entry.floorId);
//   if (requestRevision !== searchPointRevision || level.value !== entry.floorId)
//     return;
//   activeTheme.value = null;
//   selected.value = point;
//   await nextTick();
//   if (zoom.value > 1) centerOn(...normalizedPoint(point));
//   mapSection.value?.scrollIntoView({ block: "start" });
// }

function updateMapLayout() {
  mapTop.value = mapStage.value.getBoundingClientRect().top + window.scrollY;
  enforceZoomLimit();
  nextTick(placeConnectorPanel);
}

function placeConnectorPanel() {
  const panel = connectorPanel.value;
  if (!panel || !selected.value || floorChanging.value) {
    connectorPosition.value = null;
    return;
  }

  const frame = viewport.value;
  const board = frame.firstElementChild;
  const [pointX, pointY] = normalizedPoint(selected.value);
  const x = board.offsetLeft + pointX * board.clientWidth - frame.scrollLeft;
  const y = board.offsetTop + pointY * board.clientHeight - frame.scrollTop;
  const width = frame.clientWidth;
  const height = frame.clientHeight;
  if (x < 0 || x > width || y < 0 || y > height) {
    connectorPosition.value = null;
    return;
  }

  const margin = 8;
  const gap = 23;
  panel.style.maxHeight =
    Math.max(
      48,
      Math.min(
        displayMode.value === "standard" ? 230 : 480,
        height - margin * 2,
        window.innerHeight * (displayMode.value === "standard" ? 0.45 : 0.7)
      )
    ) + "px";
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const leftLimit = width - panelWidth - margin;
  const topLimit = height - panelHeight - margin;
  let left = x + gap;
  let top = Math.max(margin, Math.min(topLimit, y - panelHeight / 2));
  if (left > leftLimit) {
    left = x - gap - panelWidth;
    if (left < margin) {
      left = Math.max(margin, Math.min(leftLimit, x - panelWidth / 2));
      const above = y - gap - panelHeight;
      const below = y + gap;
      const frameTop = frame.getBoundingClientRect().top;
      const aboveClearance = frameTop + above;
      const belowClearance =
        window.innerHeight - (frameTop + below + panelHeight);
      if (above >= margin && aboveClearance >= 0) top = above;
      else if (below + panelHeight <= height && belowClearance >= 0)
        top = below;
      else top = aboveClearance >= belowClearance ? above : below;
    }
  }

  if (displayMode.value !== "standard") {
    left = Math.max(margin, Math.min(leftLimit, left));
    top = Math.max(margin, Math.min(topLimit, top));
  }

  connectorPosition.value = {
    left: frame.clientLeft + left + "px",
    top: frame.clientTop + top + "px",
  };
}

function openEndpointPicker(event) {
  if (event) endpointTrigger = event.currentTarget;
  selected.value = null;
  mapPickStep.value = null;
  draftStart.value = null;
  endpointPickerOpen.value = true;
}

async function closeEndpointPicker() {
  const trigger = endpointTrigger;
  const point = pickerFocusPoint;
  endpointTrigger = null;
  pickerFocusPoint = null;
  endpointPickerOpen.value = false;
  await nextTick();
  if (point && viewport.value) {
    await showFloor(point.floor);
    if (viewport.value && level.value === point.floor)
      centerOn(...normalizedPoint(point));
  }
  trigger?.focus({ preventScroll: true });
}

function saveEndpoints(start, destination) {
  return router.replace({
    name: "station-map",
    query: {
      ...route.query,
      start: start || undefined,
      destination: destination || undefined,
    },
  });
}

function chooseEndpoint(start, destination, point, role) {
  if (role === "destination" && !location.choose(destination ?? null)) return;
  pickerFocusPoint = point;
  const saved = saveEndpoints(start, destination);
  if (role === "destination" && destination) openTripDialog();
  return saved;
}

function planDestination(destination) {
  const saved = saveEndpoints(currentPoint.value?.id, destination);
  openTripDialog();
  return saved;
}

function onQrScanned() {
  const destination = targetPoint.value?.id;
  if (destination && !location.view.value.destinationId)
    location.choose(destination);
  openTripDialog();
}

function openTripDialog(mode = "orientation") {
  if (tripDialog.value || !viewport.value?.isConnected) return;
  tripTrigger = endpointTrigger ?? document.activeElement;
  endpointTrigger = null;
  pickerFocusPoint = null;
  endpointPickerOpen.value = false;
  selected.value = null;
  mapPickStep.value = null;
  draftStart.value = null;
  tripDialog.value = mode;
}

async function closeTripDialog() {
  const trigger = tripTrigger;
  tripTrigger = null;
  tripDialog.value = null;
  await nextTick();
  (trigger?.isConnected ? trigger : viewport.value)?.focus({
    preventScroll: true,
  });
}

async function cancelTrip() {
  originView.value = null;
  arrivalPointId.value = null;
  try {
    await location.reset();
    if (viewport.value?.isConnected) await saveEndpoints();
  } finally {
    await closeTripDialog();
  }
}

async function startMapPicking() {
  endpointPickerOpen.value = false;
  pickerFocusPoint = null;
  selected.value = null;
  draftStart.value = null;
  mapPickStep.value = "start";
  await nextTick();
  const controls = floorControls.value;
  controls?.scrollIntoView({ block: "start" });
  controls
    ?.querySelector('.floor-switch button[aria-pressed="true"]')
    ?.focus({ preventScroll: true });
}

async function selectMapPoint(point, event) {
  if (floorChanging.value) return;
  arrivalPointId.value = null;
  if (mapPickStep.value === "start") {
    draftStart.value = point;
    mapPickStep.value = "destination";
    return;
  }
  if (mapPickStep.value === "destination") {
    const start = draftStart.value.id;
    if (!location.choose(point.id)) return;
    const saved = saveEndpoints(start, point.id);
    openTripDialog();
    return saved;
  }
  selected.value = selected.value?.id === point.id ? null : point;
  if (!selected.value) return;
  if (zoom.value > 1) centerOn(...normalizedPoint(point));
  if (isConnector(point) && event.detail === 0) {
    await nextTick();
    connectorHeading.value?.focus();
  }
}

function closeConnectorDetails() {
  if (!isConnector(selected.value)) return;
  const trigger = viewport.value.querySelector('.map-pin[aria-pressed="true"]');
  selected.value = null;
  trigger?.focus({ preventScroll: true });
}

function dismissConnectorOutside(event) {
  const panel = connectorPanel.value;
  if (!panel || panel.contains(event.target)) return;
  if (event.target.closest?.(".display-controls")) return;
  if (viewport.value.contains(event.target)) {
    // Marker clicks handle selection, and a click following a drag is ignored.
    const dragClick = ignoreMouseClick && event.detail !== 0;
    if (event.target.closest?.(".map-pin") || dragClick) return;
  }
  selected.value = null;
}

function viewportCenter() {
  const frame = viewport.value;
  return [frame.clientWidth / 2, frame.clientHeight / 2];
}

async function visitDestination(transfer) {
  if (floorChanging.value) return;
  const arrival = transfer.to;
  if (!originView.value) {
    originView.value = {
      floor: level.value,
      point: selected.value,
      layers: showLayers.value,
      theme: activeTheme.value,
      scale: zoom.value,
      center: zoomAnchor(viewportCenter()),
    };
  }
  await showFloor(arrival.floor, { arrival });
  if (!viewport.value) return;
  mapSection.value.scrollIntoView({ block: "nearest" });
  viewport.value.querySelector(".pin-arrival")?.focus({ preventScroll: true });
}

async function returnToOrigin() {
  const origin = originView.value;
  if (!origin || floorChanging.value) return;
  await showFloor(origin.floor, { origin });
  originView.value = null;
  await nextTick();
  if (!viewport.value) return;
  mapSection.value.scrollIntoView({ block: "nearest" });
  viewport.value.focus({ preventScroll: true });
}

function toggleTheme(type) {
  activeTheme.value = activeTheme.value === type ? null : type;
  if (selected.value && !matchesTheme(selected.value, activeTheme.value))
    selected.value = null;
}
</script>

<style scoped src="./station-map.css"></style>
