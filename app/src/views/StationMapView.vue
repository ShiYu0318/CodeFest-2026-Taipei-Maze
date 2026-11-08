<template>
  <main
    ref="stationPage"
    class="station-page display-page"
    :lang="htmlLang(locale)"
    :data-theme="theme"
    :data-display-mode="displayMode"
  >
    <div
      class="station-shell"
      :inert="
        endpointPickerOpen || tripDialog || informationOpen || rescanOpen
          ? ''
          : null
      "
    >
      <StationDemoPanel
        v-if="demoEnabled"
        :busy="demoBusy || location.view.value.active"
        :can-advance="
          walk.type === 'success' && !!demoNextPoint(walkSteps, walkStepIndex)
        "
        :can-arrive="walk.type === 'success'"
        :has-destination="!!walkDestination"
        :notice="demoNotice"
        @scenario="loadDemoScenario"
        @advance="advanceDemo"
        @arrive="arriveDemo"
        @outage="demoElevatorOutage"
        @reset="loadDemoScenario(demoScenarioId)"
        @exit="exitDemo"
      />
      <section class="station-heading" :aria-label="t('map.toolbar')">
        <div class="station-title-row">
          <DisplayControls />
          <div class="station-utility-actions">
            <button
              class="display-icon-button"
              data-tour-target="reopen"
              type="button"
              aria-haspopup="dialog"
              :aria-label="t('tour.replay')"
              :title="displayPlainZhuyin(t('tour.replay'), displayMode, locale)"
              @click="tourOpen = true"
            >
              <StationMapIcon name="help" />
            </button>
            <button
              ref="informationButton"
              type="button"
              class="display-icon-button map-information-button"
              data-tour-target="information"
              aria-haspopup="dialog"
              :aria-label="t('map.information')"
              :title="t('map.information')"
              @click="informationOpen = true"
            >
              <StationMapIcon name="info" />
            </button>
          </div>
        </div>
        <p v-if="displayMode !== 'standard'" class="display-floor-label">
          {{ level }}・<ZhuyinText :text="t('floor.' + level)" />
        </p>
      </section>

      <StationEndpointBar
        :start-point="currentPoint"
        :target-point="targetPoint"
        :scan-available="location.view.value.available"
        :busy="location.view.value.active || demoBusy"
        @open="(role, event) => openEndpointPicker(event, role)"
        @swap="swapEndpoints"
        @scan="scanGuide"
        @share="sharePoint = $event"
      />
      <p v-if="!location.view.value.available" class="scan-app-hint">
        {{ t("scan.needAppShort") }}
      </p>
      <StationFacilityPicker
        :categories="availableThemes"
        :category="activeTheme"
        :destination-id="walkDestination"
        :busy="location.view.value.active || nearestBusy || demoBusy"
        :step-free="location.view.value.stepFree"
        @step-free="location.setStepFree"
        @category="toggleTheme"
        @go="goFacilityCategory"
      />
      <p
        v-if="nearestNotice"
        class="walk-status"
        data-state="warn"
        role="status"
      >
        <ZhuyinText :text="nearestNotice" />
      </p>

      <div
        ref="floorControls"
        class="floor-controls horizontal-scroll"
        @wheel="scrollHorizontallyWithWheel"
      >
        <div
          class="floor-switch"
          data-tour-target="floors"
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
            data-tour-target="layers"
            type="button"
            role="switch"
            :aria-checked="showLayers && level !== '1F'"
            :aria-label="t('map.layersAria')"
            :title="displayPlainZhuyin(t('map.layers'), displayMode, locale)"
            :disabled="floorChanging || level === '1F'"
            @click="toggleLayers"
          >
            <StationMapIcon name="layers" />
          </button>
        </div>
      </div>

      <div v-if="mapPickStep" class="map-pick-instructions">
        <p role="status">
          <ZhuyinText
            :text="
              mapPickStep === 'start' ? t('map.pickStart') : t('map.pickEnd')
            "
          />
        </p>
        <button type="button" @click="openEndpointPicker()">
          <ZhuyinText :text="t('map.cancel')" />
        </button>
      </div>

      <div class="station-layout">
        <div class="station-map-column">
          <section
            ref="mapSection"
            class="map-card"
            :aria-label="t('map.mapAria')"
            @keydown.esc="
              mapPickStep ? openEndpointPicker() : closeFacilityDetails()
            "
          >
            <div
              ref="mapStage"
              class="map-stage"
              :style="{
                '--map-top': mapTop * 1.5 + 'px',
                '--map-angle': mapAngle + 'deg',
              }"
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
              <div
                class="map-controls"
                role="group"
                :aria-label="t('map.zoomControls')"
              >
                <button
                  type="button"
                  class="map-compass"
                  :aria-label="t('map.compass') + '。' + t('map.zoomReset')"
                  :title="t('map.compass')"
                  :disabled="floorChanging"
                  @click="resetMapNorth"
                >
                  <svg viewBox="0 0 32 32" aria-hidden="true">
                    <text class="needle-label" x="16" y="8">N</text>
                    <path class="needle-north" d="M16 10l5 9H11z" />
                    <path class="needle-south" d="M16 29l-5-10h10z" />
                  </svg>
                </button>
                <div class="map-zoom">
                  <button
                    type="button"
                    :aria-label="t('map.zoomIn')"
                    :title="t('map.zoomIn')"
                    :disabled="floorChanging || zoom >= 3"
                    @click="zoomAt(constrainZoom(zoom + 0.5), viewportCenter())"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    :aria-label="t('map.zoomOut')"
                    :title="t('map.zoomOut')"
                    :disabled="floorChanging || zoom <= constrainZoom(0)"
                    @click="zoomAt(constrainZoom(zoom - 0.5), viewportCenter())"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="map-window" :inert="floorChanging ? '' : null">
                <div
                  ref="viewport"
                  class="map-viewport"
                  data-tour-target="marker"
                  :class="{
                    'map-zoomed': zoom > 1 || guideCamera,
                    'map-dragging': dragging,
                  }"
                  :style="{
                    '--map-height': adaptiveMapHeight
                      ? adaptiveMapHeight + 'px'
                      : undefined,
                    '--map-aspect': bounds[2] / bounds[3],
                    '--map-rotated-aspect': mapShape.aspect,
                    '--map-rotated-width': mapShape.width,
                  }"
                  role="region"
                  :aria-label="t('map.interactiveAria', { floor: level })"
                  tabindex="0"
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
                  <div
                    class="map-canvas"
                    :style="{
                      '--map-zoom': zoom,
                      '--guide-board-width': guideCamera
                        ? guideCamera.baseUnit * bounds[2] + 'px'
                        : null,
                    }"
                  >
                    <div ref="mapBoard" class="map-board">
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
                          <StationFloorPlan
                            :floor="level"
                            :visible-point-ids="
                              activeTheme
                                ? floorPoints.map((point) => point.id)
                                : null
                            "
                          />
                        </g>
                        <g class="walk-route" aria-hidden="true">
                          <polyline
                            v-for="(line, index) in walkLines"
                            :key="index"
                            :points="line.map((p) => p.join(',')).join(' ')"
                          />
                          <polyline
                            v-if="
                              currentWalkStep?.line &&
                              currentWalkStep.floor === level
                            "
                            class="walk-route-current"
                            :points="
                              currentWalkStep.line
                                .map((p) => p.join(','))
                                .join(' ')
                            "
                          />
                          <circle
                            v-for="point in walkCheckpoints"
                            :key="point.id"
                            class="walk-checkpoint"
                            :cx="point.x"
                            :cy="point.y"
                            r="9"
                          />
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
                          !mapPickStep
                            ? point.id === selected?.id && !floorChanging
                            : undefined
                        "
                        :aria-controls="
                          !mapPickStep &&
                          point.id === selected?.id &&
                          !floorChanging
                            ? 'station-facility-detail'
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
                          v-if="platformIcons[point.id]"
                          class="point-pin pin-platform-icon"
                          :style="platformIcons[point.id]"
                        >
                          <StationMapIcon class="point-icon" name="platform" />
                        </span>
                        <span
                          v-if="point.id === scanPositionId"
                          class="location-badge"
                        >
                          <ZhuyinText
                            :text="
                              t(
                                location.view.value.manualPosition
                                  ? 'transfer.manualPositionBadge'
                                  : 'map.youAreHere'
                              )
                            "
                          />
                          <span class="location-name"
                            ><ZhuyinText :text="pointName(point)"
                          /></span>
                        </span>
                        <svg
                          v-if="
                            !walkStepOnMap &&
                            (point.id === selected?.id ||
                              point.id === mapCurrentPoint?.id)
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
                          ><ZhuyinText :text="endpointBadge(point)"
                        /></span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <section
              v-if="selected && !floorChanging"
              id="station-facility-detail"
              ref="facilityDetails"
              class="display-facility-detail"
              aria-labelledby="station-facility-title"
            >
              <h3
                id="station-facility-title"
                ref="facilityHeading"
                tabindex="-1"
              >
                <ZhuyinText :text="pointName(selected)" />
              </h3>
              <InfoDisclosure v-if="showHelp" :label="t('map.information')"
                ><p>
                  <ZhuyinText :text="t('help.' + pointHelpType(selected))" /></p
              ></InfoDisclosure>
              <div
                v-if="isConnector(selected) && destinations.length"
                class="facility-transfers"
              >
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
              </div>
              <p v-else><ZhuyinText :text="pointDescription(selected)" /></p>
              <div class="facility-actions">
                <button
                  v-if="selected.id !== targetPoint?.id"
                  type="button"
                  class="facility-go"
                  @click="goHere(selected)"
                >
                  <StationMapIcon name="arrow" />
                  <ZhuyinText :text="t('map.goHere')" />
                </button>
                <button
                  type="button"
                  class="facility-staff"
                  @click="
                    staffPoint = { ...selected, floor: selected.floor ?? level }
                  "
                >
                  <ZhuyinText :text="t('staff.open')" />
                </button>
                <button
                  type="button"
                  class="facility-staff"
                  @click="
                    sharePoint = { ...selected, floor: selected.floor ?? level }
                  "
                >
                  {{ t("share.place") }}
                </button>
              </div>
            </section>
          </section>
        </div>
      </div>
      <section class="walk-panel" :aria-label="t('walk.routeTitle')">
        <p v-if="sharedPlace" class="walk-status" data-state="ok" role="status">
          {{
            t("share.received", {
              name: placeLabel(sharedPlace, i18n),
              floor: sharedPlace.floor,
            })
          }}
        </p>
        <StationRouteGuide
          v-if="walkDestination"
          :steps="walkSteps"
          :index="walkStepIndex"
          :map-angle="mapAngle"
          :points-by-id="stationById"
          :status="guideStatus"
          :available="location.view.value.available"
          :active="location.view.value.active"
          :demo="demoEnabled"
          :demo-busy="demoBusy"
          :trip-actions="!!walkDestinationPoint"
          :arrival-token="tripKey"
          :arrival-receipt="arrivalReceipt"
          :can-confirm-arrival="canConfirmArrival"
          :position-info="positionInfo"
          @arrive="confirmManualTripArrival"
          @finish="finishTrip"
          @help="staffPoint = walkDestinationPoint"
          @cancel="openTripDialog('cancel')"
          @update:index="goWalkStep"
          @scan="scanGuide"
          @demo-advance="advanceDemo"
          @demo-arrive="arriveDemo"
        />
      </section>
    </div>
    <StationInformationDialog
      v-if="informationOpen"
      :floor="level"
      @close="closeInformation"
    />
    <StationEndpointPicker
      :current-options="{
        mobilityProfile: location.view.value.stepFree ? 'stepFree' : 'standard',
        excludedEdgeTypes: location.view.value.excludedEdgeTypes,
        unavailableConnectorIds: location.view.value.unavailableConnectorIds,
      }"
      v-if="endpointPickerOpen"
      :start-point="currentPoint"
      :target-point="targetPoint"
      :initial-role="pickerRole"
      @close="closeEndpointPicker"
      @select="selectEndpoints"
      @map-pick="startMapPicking"
    />
    <StaffCard
      v-if="staffPoint"
      :point="staffPoint"
      :step-free="location.view.value.stepFree"
      @close="staffPoint = null"
    />
    <PlaceShareSheet
      v-if="sharePoint"
      :point="sharePoint"
      @close="sharePoint = null"
    />
    <StationRescanDialog
      v-if="rescanOpen"
      :location="location"
      @close="rescanOpen = false"
      @scanned="onQrScanned"
    />
    <StationTripDialog
      v-if="tripDialog"
      :key="tripDialog"
      :direction="tripDirection"
      :cancel-only="tripDialog === 'cancel'"
      @continue="continueTrip"
      @cancel="cancelTrip"
    />
    <StationMapTour
      v-if="tourOpen"
      :root="stationPage"
      @finish="finishMapTour"
    />
  </main>
</template>

<script setup>
import { displayPlainZhuyin } from "../display/zhuyin.mjs";
import { availableMapHeight } from "../station/map-layout.mjs";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import StationFloorPlan from "../components/StationFloorPlan.vue";
import StaffCard from "../components/StaffCard.vue";
import PlaceShareSheet from "../components/PlaceShareSheet.vue";
import { readSharedPlace } from "../station/place-share.mjs";
import StationEndpointPicker from "../components/StationEndpointPicker.vue";
import StationFacilityPicker from "../components/StationFacilityPicker.vue";
import StationEndpointBar from "../components/StationEndpointBar.vue";
import StationInformationDialog from "../components/StationInformationDialog.vue";
import StationDemoPanel from "../components/StationDemoPanel.vue";
import {
  DEMO_SCENARIOS,
  demoScenarioQuery,
  demoPositionQuery,
  leaveDemoQuery,
  demoNextPoint,
} from "../station/demo-scenarios.mjs";
import StationRescanDialog from "../components/StationRescanDialog.vue";
import InfoDisclosure from "../components/InfoDisclosure.vue";
import StationRouteGuide from "../components/StationRouteGuide.vue";
import StationTripDialog from "../components/StationTripDialog.vue";
import StationMapTour from "../components/StationMapTour.vue";
import StationMapIcon from "../components/StationMapIcon.vue";
import DisplayControls from "../components/DisplayControls.vue";
import ZhuyinText from "../components/ZhuyinText.vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { useStationLocation } from "../station/useStationLocation";
import { stationPoints } from "../station/scan.mjs";
import { htmlLang, useI18n } from "../i18n/index.mjs";
import { placeLabel, placeName } from "../i18n/places.mjs";
import { useMapFocus } from "../station/map-focus.mjs";
import {
  tripIdentity,
  confirmManualArrival as makeManualArrival,
  isCurrentArrival,
  positionDetails,
} from "../station/trip-progress.mjs";
import { findNearestFacility } from "../station/nearest-action.mjs";
import walkingNetwork from "../station/walking-network.json";
import {
  routeSteps,
  planWalk,
  routeLines,
  walkingRouter,
} from "../station/walk-route.mjs";
import {
  navigationMapState,
  navigationPointVisible,
} from "../station/navigation-view.mjs";
import { hasSeenMapTour, rememberMapTour } from "../station/map-tour.mjs";
import { boundarySegments, insetBoundaryMarker } from "../station/boundary.mjs";
import { floors, plans, stackBounds } from "./station-floor-plans.mjs";
import stationData from "./station-points.json";
import stationConnections from "./station-connections.json";
import { zones, transfersFromPoint } from "./station-routing";

const { categories, points } = stationData;
const { theme, displayMode } = useDisplayPreferences();
const i18n = useI18n();
const { locale, t } = i18n;
const stationPage = ref(null);
const tourOpen = ref(false);

function finishMapTour() {
  rememberMapTour();
  tourOpen.value = false;
}

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
const demoEnabled = computed(() => route.query.demo === "1");
const demoBusy = ref(false),
  demoNotice = ref(""),
  demoScenarioId = ref("restroom");
const stationById = new Map(
  stationPoints(stationData).map((point) => [point.id, point])
);
const location = useStationLocation(stationData, stationConnections);
const currentPoint = computed(() =>
  stationById.get(route.query.start ?? location.view.value.position?.pointId)
);
const targetPoint = computed(() => stationById.get(route.query.destination));
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
  "1F": {
    tone: "primary-400",
    tint: "primary-50",
    ink: "primary-700",
    onTone: "primary-950",
  },
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
const rescanOpen = ref(false);
const nearestBusy = ref(false);
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
  if (!walkSteps.value.length) focusScanPoint(point);
}
const originView = ref(null);
const facilityHeading = ref(null);
const facilityDetails = ref(null);
const floorChanging = ref(false);
const arrivalPointId = ref(null);
let floorAnimation = null;
let cameraAnimation = null;
const zoom = ref(level.value === "1F" ? 1 : initialMapZoom);
const guideCamera = ref(null);
const adaptiveMapHeight = ref(null);
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
const mapBoard = ref(null);
const mapBoardWidth = ref(0);
let mapBoardObserver;
let mapLayoutObserver;
let mapLayoutFrame = null;

// Walking network: routes, nearest facilities and the first-step arrow.
const walkRouter = walkingRouter(walkingNetwork);
const walkStart = computed(
  () => currentPoint.value?.id ?? location.view.value.position?.pointId ?? null
);
const walkDestination = computed(
  () => targetPoint.value?.id ?? location.view.value.destinationId ?? null
);
const walk = computed(() =>
  walkDestination.value
    ? planWalk(walkRouter, {
        startId: walkStart.value,
        destinationId: walkDestination.value,
        excludedEdgeTypes: location.view.value.excludedEdgeTypes,
        stepFree: location.view.value.stepFree,
        unavailableConnectorIds: location.view.value.unavailableConnectorIds,
      })
    : { type: "Idle" }
);
const walkLines = computed(() =>
  walk.value.type === "success" ? routeLines(walk.value.route, level.value) : []
);
// Shared map/guide steps: diagram turns, named facilities, floor changes, arrival.
const walkSteps = computed(() =>
  walk.value.type === "success" ? routeSteps(walk.value.route) : []
);
const tripContext = computed(() => ({
  startId: walkStart.value,
  destinationId: walkDestination.value,
  positionToken: location.view.value.token,
  stepFree: location.view.value.stepFree,
  excludedEdgeTypes: location.view.value.excludedEdgeTypes,
  unavailableConnectorIds: location.view.value.unavailableConnectorIds,
}));
const tripKey = computed(() => tripIdentity(tripContext.value));
const manualArrival = ref(null);
const arrivalReceipt = computed(() =>
  isCurrentArrival(manualArrival.value, tripKey.value)
    ? manualArrival.value
    : null
);
const positionInfo = computed(() =>
  positionDetails({
    startId: walkStart.value,
    position: location.view.value.position,
    demo: demoEnabled.value,
  })
);
watch(tripKey, () => {
  manualArrival.value = null;
});
const walkStepIndex = ref(0);
const mapHeading = ref({ floor: null, angle: 0 });
const mapAngle = computed(() =>
  mapHeading.value.floor === level.value ? mapHeading.value.angle : 0
);
watch(walkSteps, (steps) => {
  walkStepIndex.value = 0;
  if (!steps.length) restoreGuideCamera();
});
const currentWalkStep = computed(
  () => walkSteps.value[walkStepIndex.value] ?? null
);
const canConfirmArrival = computed(
  () =>
    !arrivalReceipt.value &&
    (walk.value.type === "Arrived" ||
      (walk.value.type === "success" &&
        currentWalkStep.value?.kind === "arrive"))
);
function confirmManualTripArrival(expectedIdentity) {
  if (location.view.value.active || demoBusy.value || arrivalReceipt.value)
    return;
  const result = makeManualArrival({
    trip: tripContext.value,
    expectedIdentity,
    routeType: walk.value.type,
    stepKind: currentWalkStep.value?.kind,
  });
  if (result.type === "success") manualArrival.value = result.receipt;
}
async function finishTrip(expectedIdentity) {
  if (
    location.view.value.active ||
    demoBusy.value ||
    expectedIdentity !== tripKey.value ||
    !arrivalReceipt.value
  )
    return;
  const startId = walkStart.value;
  if (!location.choose(null)) return;
  manualArrival.value = null;
  await saveEndpoints(startId, null);
  await nextTick();
  mapSection.value?.scrollIntoView({ block: "start" });
}
const walkStepOnMap = computed(
  () => currentWalkStep.value?.floor === level.value
);

function nearestAngle(from, to) {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta;
}

function setMapAngle(target) {
  mapHeading.value = {
    floor: level.value,
    angle: nearestAngle(mapAngle.value, target),
  };
}

async function resetMapNorth() {
  const before = readMapPose();
  setMapAngle(0);
  await resetZoom(constrainZoom(1));
  animateMapFrom(before);
}

const walkCheckpoints = computed(() => {
  const step = currentWalkStep.value;
  if (!step || step.floor !== level.value) return [];
  const ids =
    step.kind === "walk"
      ? [step.fromId, ...step.viaIds, step.toId]
      : [step.kind === "floor" ? step.fromId : step.toId];
  return ids.map((id) => stationById.get(id)).filter(Boolean);
});
async function goWalkStep(index, { zoomIn = false } = {}) {
  await nextTick();
  const step = walkSteps.value[index];
  if (!Number.isInteger(index) || !step || floorChanging.value) return;
  const board = mapBoard.value;
  if (!board?.clientWidth || !viewport.value?.isConnected) return;
  if (!guideCamera.value) {
    guideCamera.value = {
      floor: level.value,
      center: zoomAnchor(viewportCenter()),
      zoom: zoom.value,
      baseUnit: board.clientWidth / bounds.value[2] / zoom.value,
      preferredZoom: zoom.value,
    };
  }
  if (zoomIn)
    guideCamera.value.preferredZoom = Math.min(
      3,
      guideCamera.value.zoom * 1.15
    );
  walkStepIndex.value = index;
  // A pending zoom to a scanned point must not move the current step offscreen.
  scanFocusRevision++;
  if (step.floor !== level.value) {
    await showFloor(step.floor, {
      prepare: () => {
        if (currentWalkStep.value === step) return frameWalkStep(step);
      },
    });
  } else {
    await frameWalkStep(step, readMapPose());
  }
}

async function frameWalkStep(step, before) {
  const frame = viewport.value;
  const camera = guideCamera.value;
  if (!camera || !frame?.isConnected) return;
  setMapAngle(step.kind === "walk" ? -step.angle : 0);
  const { cos, sin } = mapShape.value;
  const anchor = stationById.get(step.fromId) ?? stationById.get(step.toId);
  const line = step.line ?? (anchor ? [[anchor.x, anchor.y]] : []);
  if (!line.length) return;
  const rotated = line.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);
  const xs = rotated.map(([x]) => x);
  const ys = rotated.map(([, y]) => y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  // Leave space for the endpoint dots and keep the preferred scale on short steps.
  const gutter = 48;
  zoom.value = Math.min(
    camera.preferredZoom,
    Math.max(1, frame.clientWidth - gutter) / ((maxX - minX) * camera.baseUnit),
    Math.max(1, frame.clientHeight - gutter) / ((maxY - minY) * camera.baseUnit)
  );
  camera.fitZoom = zoom.value;
  const revision = ++zoomRevision;
  await nextTick();
  if (revision !== zoomRevision || !frame.isConnected) return;
  const x = (minX + maxX) / 2;
  const y = (minY + maxY) / 2;
  centerOn(...normalizedPoint({ x: x * cos + y * sin, y: -x * sin + y * cos }));
  animateMapFrom(before);
}

async function restoreGuideCamera() {
  const camera = guideCamera.value;
  const before = camera ? readMapPose() : null;
  guideCamera.value = null;
  setMapAngle(0);
  if (!camera) return;
  zoom.value = constrainZoom(camera.zoom);
  const revision = ++zoomRevision;
  await nextTick();
  if (revision !== zoomRevision) return;
  centerOn(...(camera.floor === level.value ? camera.center : [0.5, 0.5]));
  animateMapFrom(before);
}
const walkStatus = computed(() => {
  const type = walk.value.type;
  if (type === "success") return t("walk.routeTitle");
  if (type === "NoStart") return t("walk.noStart");
  if (type === "UnknownStart") return t("walk.unknownStart");
  if (type === "UnknownDestination") return t("walk.unknownDestination");
  if (type === "NoRoute")
    return location.view.value.stepFree
      ? t("walk.noRouteStepFree")
      : t("walk.noRoute");
  return "";
});
const guideStatus = computed(() => {
  if (walk.value.type === "Arrived")
    return t("route.arrive", {
      name: walkDestinationPoint.value
        ? placeName(walkDestinationPoint.value, i18n)
        : "",
    });
  return walkStatus.value || t("scan.chooseDestination");
});
async function goNearest(category) {
  if (
    location.view.value.active ||
    nearestBusy.value ||
    !Object.hasOwn(categories, category)
  )
    return;
  nearestBusy.value = true;
  nearestNotice.value = "";
  try {
    nearestNotice.value = !walkStart.value ? t("walk.noStart") : "";
    const found = await findNearestFacility(location, walkRouter, {
      startId: walkStart.value,
      category,
    });
    if (found.type === "NoStart") {
      nearestNotice.value = t("walk.noStart") + " " + t("scan.needApp");
      return;
    }
    if (!found.startId) {
      nearestNotice.value = location.view.value.noticeKey
        ? t(location.view.value.noticeKey)
        : t("walk.noStart");
      return;
    }
    const point = found.type === "success" && stationById.get(found.pointId);
    if (!point) {
      nearestNotice.value =
        found.type === "UnknownStart"
          ? t("walk.unknownStart")
          : t("walk.nearestNone", { type: t(`type.${category}`) });
      return;
    }
    nearestNotice.value = "";
    await chooseEndpoint(found.startId, point.id, point, "destination");
  } finally {
    nearestBusy.value = false;
  }
}
async function goFacilityCategory({ category, nearest, pointId }) {
  if (location.view.value.active) return;
  if (nearest) return goNearest(category);
  const point = stationById.get(pointId);
  if (!point || point.enabled === false) return;
  return chooseEndpoint(walkStart.value, point.id, point, "destination");
}
const nearestNotice = ref("");
// Place sharing: a fixed place for a friend, never a live position.
const sharePoint = ref(null);
const sharedPlace = computed(() => readSharedPlace(route.query, stationData));
const walkDestinationPoint = computed(() =>
  walkDestination.value ? stationById.get(walkDestination.value) : null
);
const navigationMap = computed(() =>
  navigationMapState(location.view.value, {
    startId: currentPoint.value?.id,
    targetId: targetPoint.value?.id,
    picking: !!mapPickStep.value,
  })
);
watch(
  navigationMap,
  () => {
    if (selected.value && !isPointVisible(selected.value))
      selected.value = null;
  },
  { flush: "post" }
);
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
    const position = location.view.value.navigationPosition;
    return position
      ? `${position.pointId}:${position.source}:${position.confirmedAt}`
      : null;
  },
  () =>
    setScanPosition(
      stationById.get(location.view.value.navigationPosition?.pointId)
    ),
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
});

onMounted(() => {
  updateMapLayout();
  mapLayoutObserver = new ResizeObserver(scheduleMapLayout);
  mapLayoutObserver.observe(stationPage.value.querySelector(".station-shell"));
  window.addEventListener("scroll", scheduleMapLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleMapLayout);
  window.visualViewport?.addEventListener("scroll", scheduleMapLayout);
  mapBoardObserver = new ResizeObserver(([entry]) => {
    mapBoardWidth.value = entry.contentRect.width;
  });
  mapBoardObserver.observe(mapBoard.value);
  window.addEventListener("resize", updateMapLayout);
  mobileZoomQuery.addEventListener("change", enforceZoomLimit);
  document.addEventListener("touchstart", startPinch, captureGesture);
  document.addEventListener("touchend", endPinch, captureGesture);
  document.addEventListener("touchcancel", endPinch, captureGesture);
  for (const type of webkitGestures) {
    document.addEventListener(type, handleWebkitGesture, captureGesture);
  }
  nextTick(() => {
    const point = currentPoint.value ?? targetPoint.value;
    centerOn(...(point ? normalizedPoint(point) : [0.5, 0.5]));
    tourOpen.value = !hasSeenMapTour();
  });
});

onBeforeUnmount(() => {
  mapBoardObserver?.disconnect();
  mapLayoutObserver?.disconnect();
  if (mapLayoutFrame !== null) cancelAnimationFrame(mapLayoutFrame);
  window.removeEventListener("scroll", scheduleMapLayout);
  window.visualViewport?.removeEventListener("resize", scheduleMapLayout);
  window.visualViewport?.removeEventListener("scroll", scheduleMapLayout);
  scanFocusRevision++;
  zoomRevision++;
  window.removeEventListener("resize", updateMapLayout);
  mobileZoomQuery.removeEventListener("change", enforceZoomLimit);
  floorAnimation?.cancel();
  cameraAnimation?.cancel();
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
const allFloorPoints = computed(() => {
  const current = points[level.value];
  return [
    ...current.filter((point) => !isConnector(point)),
    ...current.filter((point) => isConnector(point)),
  ];
});
const floorPoints = computed(() => allFloorPoints.value.filter(isPointVisible));
const availableThemes = computed(() => Object.keys(categories));

const bounds = computed(() => {
  const floor = floors[level.value];
  const [left, top, width, height] =
    showLayers.value && level.value !== "1F" ? stackBounds : floor.bounds;
  const [x, y] = floor.center;
  const halfWidth = Math.max(x - left, left + width - x);
  const halfHeight = Math.max(y - top, top + height - y);
  return [x - halfWidth, y - halfHeight, 2 * halfWidth, 2 * halfHeight];
});
const mapShape = computed(() => {
  const radians = (mapAngle.value * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const ratio = bounds.value[3] / bounds.value[2];
  const width = Math.abs(cos) + Math.abs(sin) * ratio;
  const height = Math.abs(sin) + Math.abs(cos) * ratio;
  return { cos, sin, width, aspect: width / height };
});
const platformIcons = computed(() => {
  const scale = mapBoardWidth.value / bounds.value[2];
  const platforms = floorPoints.value.filter(
    (point) => point.boundary && matchesTheme(point, "platform")
  );
  if (!scale || !platforms.length) return {};
  const edges = boundarySegments(plans[level.value]);
  return Object.fromEntries(
    platforms.map((point) => [point.id, platformIconStyle(point, edges, scale)])
  );
});
const backgroundLayers = computed(() => {
  if (!showLayers.value || level.value === "1F") return [];
  const activeIndex = floorIds.indexOf(level.value);
  return floorIds.flatMap((floor, index) => {
    if (floor === level.value || floor === "1F") return [];
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
const informationOpen = ref(false);
const informationButton = ref(null);
async function closeInformation() {
  informationOpen.value = false;
  await nextTick();
  informationButton.value?.focus({ preventScroll: true });
}

function isConnector(point) {
  return pointTypes(point).some((type) => connectorTypes.has(type));
}

function pointTypes(point) {
  return Array.isArray(point?.type) ? point.type : [point?.type];
}

function pointIconType(point) {
  const types = pointTypes(point);
  return types[0] === "exit" && types.includes(activeTheme.value)
    ? activeTheme.value
    : types[0];
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

function scrollHorizontallyWithWheel(event) {
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
  if (!activeTheme.value) return true;
  return navigationPointVisible(
    point,
    navigationMap.value,
    !activeTheme.value || matchesTheme(point, activeTheme.value),
    !!activeTheme.value
  );
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
    ...pointThemeStyle(pointIconType(point)),
  };
}

function platformIconStyle(point, edges, scale) {
  const enlarged = displayMode.value === "senior";
  const active =
    point.id === selected.value?.id || point.id === mapCurrentPoint.value?.id;
  // Allow for the primary marker's outer ring when the QR point is selected.
  const qrRadius = (active ? 26 : 7) * (enlarged ? 2 : 1);
  for (const iconScale of enlarged ? [2, 1] : [1]) {
    const radius = 7 * iconScale;
    const offset = insetBoundaryMarker(
      point,
      edges,
      (qrRadius + radius + 2) / scale,
      (radius + 1) / scale
    );
    if (offset) {
      return {
        left: `calc(50% + ${offset[0] * scale}px)`,
        top: `calc(50% + ${offset[1] * scale}px)`,
        "--marker-base-color": categories.platform.iconColor,
        "--platform-icon-scale": iconScale,
      };
    }
  }
  return null;
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
    (matchesTheme(point, "platform") ? "・" + t("type.platform") : "") +
    (badge ? "・" + badge : "") +
    (point.id === scanPositionId.value
      ? t(
          location.view.value.manualPosition
            ? "transfer.manualPositionBadge"
            : "map.ariaYouAreHere"
        )
      : "") +
    (point.id === scanTargetId.value ? t("map.ariaDestination") : "")
  );
}

function pointThemeStyle(type) {
  const category = categories[type];
  const colorToken = category?.colorToken || "gray-700";
  const iconColor = category?.iconColor;
  return {
    "--point-icon-color": iconColor || paletteColor(colorToken),
    "--marker-base-color": iconColor || "#4a5258",
    "--location-icon-ink": iconColor ? "#fdfefe" : "var(--surface)",
  };
}

function mapCanvasCenter() {
  const canvas = viewport.value.firstElementChild;
  return [
    canvas.offsetLeft + canvas.clientWidth / 2,
    canvas.offsetTop + canvas.clientHeight / 2,
  ];
}

function mapScrollPoint([x, y]) {
  const board = mapBoard.value;
  const [centerX, centerY] = mapCanvasCenter();
  const { cos, sin } = mapShape.value;
  const dx = (x - 0.5) * board.clientWidth;
  const dy = (y - 0.5) * board.clientHeight;
  return [centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos];
}

function readMapPose() {
  const board = mapBoard.value;
  if (
    !board?.isConnected ||
    !board.animate ||
    !window.DOMMatrixReadOnly ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return null;
  const rect = board.getBoundingClientRect();
  const matrix = new window.DOMMatrixReadOnly(
    getComputedStyle(board).transform
  );
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    angle: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
    unit:
      (board.clientWidth / bounds.value[2]) * Math.hypot(matrix.a, matrix.b),
  };
}

function animateMapFrom(before) {
  cameraAnimation?.cancel();
  if (!before) return;
  const after = readMapPose();
  if (!after?.unit) return;
  // The layout and scroll offsets are already final. Animate the artwork from
  // its last visible pose so the frame and the dotted background stay still.
  const transform = (x, y, angle, scale) =>
    `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
  const angle = mapAngle.value;
  cameraAnimation = mapBoard.value.animate(
    [
      {
        transform: transform(
          before.x - after.x,
          before.y - after.y,
          nearestAngle(angle, before.angle),
          before.unit / after.unit
        ),
      },
      { transform: transform(0, 0, angle, 1) },
    ],
    { duration: 360, easing: "cubic-bezier(0.2, 0, 0.2, 1)" }
  );
}

function centerOn(x, y) {
  const frame = viewport.value;
  if (!frame?.isConnected || !mapBoard.value) return;
  const [left, top] = mapScrollPoint([x, y]);
  frame.scrollLeft = left - frame.clientWidth / 2;
  frame.scrollTop = top - frame.clientHeight / 2;
}

function focusVisiblePin(point, event) {
  if (zoom.value > 1 && event.currentTarget.matches(":focus-visible")) {
    centerOn(...normalizedPoint(point));
  }
}

function constrainZoom(scale) {
  const minZoom = guideCamera.value
    ? Math.min(1, guideCamera.value.fitZoom ?? 1)
    : mobileZoomQuery.matches && level.value !== "1F"
    ? 1.5
    : 1;
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
  const board = mapBoard.value;
  const [centerX, centerY] = mapCanvasCenter();
  const { cos, sin } = mapShape.value;
  const dx = frame.scrollLeft + x - centerX;
  const dy = frame.scrollTop + y - centerY;
  return [
    0.5 + (dx * cos + dy * sin) / board.clientWidth,
    0.5 + (-dx * sin + dy * cos) / board.clientHeight,
  ];
}

async function zoomAt(scale, [x, y], anchor) {
  cameraAnimation?.cancel();
  anchor ??= zoomAnchor([x, y]);
  scale = constrainZoom(scale);
  clearMapDrag();
  const frame = viewport.value;
  const revision = ++zoomRevision;
  zoom.value = scale;
  await nextTick();
  if (revision !== zoomRevision || !frame.isConnected) return;
  if (scale === 1 && !guideCamera.value) frame.scrollTo(0, 0);
  else {
    const [left, top] = mapScrollPoint(anchor);
    frame.scrollTo(left - x, top - y);
  }
}

function startMapDrag(event) {
  ignoreMouseClick = false;
  if (
    event.pointerType !== "mouse" ||
    event.button !== 0 ||
    (zoom.value <= 1 && !guideCamera.value)
  )
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

function resetZoom(scale = 1) {
  clearPinch();
  webkitPinch = null;
  return zoomAt(scale, viewportCenter(), [0.5, 0.5]);
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

async function showFloor(floor, { arrival, origin, prepare } = {}) {
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
  cameraAnimation?.cancel();
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
    if (prepare) await prepare();
    else await resetZoom(floor === "1F" ? 1 : initialMapZoom);
    if (!frame.isConnected) return;
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

function scheduleMapLayout() {
  if (mapLayoutFrame !== null) return;
  mapLayoutFrame = requestAnimationFrame(() => {
    mapLayoutFrame = null;
    updateMapLayout();
  });
}

function updateMapLayout() {
  if (!mapStage.value || !viewport.value) return;
  const frame = viewport.value.getBoundingClientRect();
  const shell = stationPage.value.querySelector(".station-shell");
  const visual = window.visualViewport;
  adaptiveMapHeight.value = availableMapHeight({
    height: visual?.height ?? window.innerHeight,
    top: frame.top - (visual?.offsetTop ?? 0),
    below: Math.max(0, shell.getBoundingClientRect().bottom - frame.bottom),
    bottom: Math.max(
      24,
      parseFloat(getComputedStyle(stationPage.value).paddingBottom) || 0
    ),
  });
  mapTop.value = mapStage.value.getBoundingClientRect().top + window.scrollY;
  enforceZoomLimit();
}

const pickerRole = ref(null);
function openEndpointPicker(event, role = null) {
  if (location.view.value.active) return;
  if (event) endpointTrigger = event.currentTarget;
  pickerRole.value = role;
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

async function chooseEndpoint(
  start,
  destination,
  point,
  role,
  proposedOptions,
  showGuide = true
) {
  if (location.view.value.active) return;
  if (role === "destination") {
    const selected =
      proposedOptions && destination
        ? location.searchSelect({ poiId: destination, proposedOptions })
        : location.choose(destination ?? null);
    if (!selected) return;
  }
  pickerFocusPoint = point;
  await saveEndpoints(start, destination);
  await nextTick();
  if (
    showGuide &&
    role === "destination" &&
    destination &&
    walkDestination.value === destination
  )
    openGuide();
}

// Endpoint selection stays on the map until the explicit Go action.
async function selectEndpoints(start, destination, point, role, options) {
  if (role === "destination") activeTheme.value = null;
  await chooseEndpoint(start, destination, point, role, options, false);
  if (start && destination) await closeEndpointPicker();
}

// Swap start and destination without opening the trip dialog.
function swapEndpoints() {
  if (location.view.value.active) return;
  activeTheme.value = null;
  const start = currentPoint.value?.id ?? null,
    destination = targetPoint.value?.id ?? null;
  if (!start && !destination) return;
  if (!location.choose(start)) return;
  return saveEndpoints(destination, start);
}

const staffPoint = ref(null);
// One tap from a facility card to trip guidance.
function goHere(point) {
  return chooseEndpoint(currentPoint.value?.id, point.id, point, "destination");
}

function onQrScanned({ rescan = false } = {}) {
  const destination = targetPoint.value?.id;
  if (destination && !location.view.value.destinationId)
    location.choose(destination);
  if (!rescan) openGuide();
  else if (walkSteps.value.length) goWalkStep(0);
}

async function loadDemoScenario(id) {
  if (!demoEnabled.value || demoBusy.value || location.view.value.active)
    return;
  const scenario = DEMO_SCENARIOS.find((item) => item.id === id);
  const query = demoScenarioQuery(route.query, id);
  if (!scenario || !query) return;
  demoBusy.value = true;
  demoNotice.value = "";
  try {
    await location.reset();
    activeTheme.value = null;
    location.setStepFree(scenario.stepFree);
    await router.replace({ name: "station-map", query });
    await nextTick();
    location.choose(scenario.destination);
    demoScenarioId.value = id;
    nearestNotice.value = "";
    if (walkSteps.value.length) await goWalkStep(0, { zoomIn: true });
  } catch {
    demoNotice.value = t("demo.error");
  } finally {
    demoBusy.value = false;
  }
}
async function simulateDemoPosition(pointId) {
  if (
    !demoEnabled.value ||
    demoBusy.value ||
    location.view.value.active ||
    walk.value.type !== "success"
  )
    return;
  const query = demoPositionQuery(route.query, pointId, stationData);
  if (!query) return;
  demoBusy.value = true;
  demoNotice.value = "";
  try {
    await router.replace({ name: "station-map", query });
    await nextTick();
    if (walkSteps.value.length) await goWalkStep(0);
  } catch {
    demoNotice.value = t("demo.error");
  } finally {
    demoBusy.value = false;
  }
}
function advanceDemo() {
  return simulateDemoPosition(
    demoNextPoint(walkSteps.value, walkStepIndex.value)
  );
}
function arriveDemo() {
  return simulateDemoPosition(walkDestination.value);
}
function demoElevatorOutage() {
  if (
    !demoEnabled.value ||
    demoBusy.value ||
    location.view.value.active ||
    !walkDestination.value
  )
    return;
  location.searchSelect({
    poiId: walkDestination.value,
    proposedOptions: { excludedEdgeTypes: ["elevator"] },
  });
}
async function exitDemo() {
  if (!demoEnabled.value || demoBusy.value || location.view.value.active)
    return;
  demoBusy.value = true;
  demoNotice.value = "";
  try {
    await location.reset();
    location.setStepFree(false);
    await router.replace({
      name: "station-map",
      query: leaveDemoQuery(route.query),
    });
  } catch {
    demoNotice.value = t("demo.error");
  } finally {
    demoBusy.value = false;
  }
}

async function openGuide() {
  if (tripDialog.value || !viewport.value?.isConnected) return;
  endpointPickerOpen.value = false;
  endpointTrigger = null;
  pickerFocusPoint = null;
  selected.value = null;
  mapPickStep.value = null;
  draftStart.value = null;
  if (walkSteps.value.length)
    await goWalkStep(walkStepIndex.value, { zoomIn: true });
  await nextTick();
  mapSection.value?.scrollIntoView({ block: "start" });
  viewport.value?.focus({ preventScroll: true });
}
function scanGuide() {
  if (!location.view.value.active) rescanOpen.value = true;
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

async function continueTrip() {
  const shouldGuide = tripDialog.value === "orientation";
  await closeTripDialog();
  if (shouldGuide) await openGuide();
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
  await nextTick();
  if (selected.value?.id !== point.id || floorChanging.value) return;
  if (event.detail === 0) {
    facilityHeading.value?.focus({ preventScroll: true });
  }
  revealFacilityDetails();
}

function revealFacilityDetails() {
  const card = facilityDetails.value;
  if (!card) return;
  const headingHeight =
    card
      .closest(".station-page")
      .querySelector(".station-heading")
      ?.getBoundingClientRect().height ?? 0;
  // Align the start of even a tall child-mode card below the sticky controls.
  // The card remains normal page content, with no clipped or nested scroll area.
  const top =
    window.scrollY +
    card.getBoundingClientRect().top -
    headingHeight -
    (window.visualViewport?.offsetTop ?? 0) -
    12;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function closeFacilityDetails() {
  if (!selected.value) return;
  const trigger = viewport.value.querySelector('.map-pin[aria-pressed="true"]');
  selected.value = null;
  trigger?.focus({ preventScroll: true });
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
