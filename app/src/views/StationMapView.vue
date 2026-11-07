<template>
  <main class="station-page" lang="zh-Hant">
    <div class="station-shell">
      <section class="station-heading" aria-labelledby="station-title">
        <div class="station-title-row">
          <h1 id="station-title">台北車站</h1>
        </div>
      </section>

      <div class="floor-controls">
        <div class="floor-switch" role="group" aria-label="選擇樓層">
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
        <button
          class="layer-toggle"
          type="button"
          role="switch"
          :aria-checked="showLayers"
          aria-label="透視其他樓層"
          :disabled="floorChanging"
          @click="toggleLayers"
        >
          <StationMapIcon name="layers" />
          <span>透視樓層</span>
          <span class="switch-track" aria-hidden="true"></span>
        </button>
      </div>

      <div class="facility-header">
        <h2 id="facility-title">設施主題</h2>
        <span>{{ floorPoints.length }} 個標點</span>
      </div>

      <div
        class="theme-group"
        role="group"
        aria-label="設施主題，可左右滑動查看更多"
        tabindex="0"
        @wheel="scrollThemesWithWheel"
      >
        <button
          v-for="type in availableThemes"
          :key="type"
          type="button"
          :aria-pressed="activeTheme === type"
          :style="pointThemeStyle(type)"
          @click="toggleTheme(type)"
        >
          <StationMapIcon :name="type" />{{ categories[type].name }}
        </button>
      </div>

      <div class="station-layout">
        <div class="station-map-column">
          <section ref="mapSection" class="map-card" aria-label="車站地圖">
            <div
              ref="mapStage"
              class="map-stage"
              :style="{ '--map-top': mapTop + 'px' }"
              @keydown.esc="closeConnectorDetails"
            >
              <div class="map-corner">
                <div class="compass" aria-label="北方朝上略偏左" role="img">
                  <span>N</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 20 21l-8-4-8 4Z" />
                  </svg>
                </div>
                <button
                  v-if="originView"
                  type="button"
                  class="map-return"
                  :disabled="floorChanging"
                  @click="returnToOrigin"
                >
                  回到起點・{{ originView.floor }}
                </button>
              </div>
              <div class="map-window" :inert="floorChanging ? '' : null">
                <div
                  ref="viewport"
                  class="map-viewport"
                  :class="{ 'map-zoomed': zoom > 1, 'map-dragging': dragging }"
                  :style="{ '--map-aspect': bounds[2] + ' / ' + bounds[3] }"
                  role="region"
                  :aria-label="level + ' 互動地圖，可用加減鍵縮放，0 鍵重設'"
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
                      :aria-label="level + ' 平面示意圖'"
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
                        'pin-themed': matchesTheme(point, activeTheme),
                        'pin-arrival': point.id === arrivalPointId,
                      }"
                      type="button"
                      :style="pinStyle(point)"
                      :aria-label="point.name"
                      :aria-pressed="point.id === selected?.id"
                      :aria-expanded="
                        isConnector(point)
                          ? point.id === selected?.id &&
                            !floorChanging &&
                            !!connectorPosition
                          : undefined
                      "
                      @click="selectMapPoint(point, $event)"
                      @focus="focusVisiblePin(point, $event)"
                    >
                      <span v-if="point.id === selected?.id" class="pin-icon">
                        <StationMapIcon :name="point.type" />
                      </span>
                      <StationMapIcon
                        v-else
                        class="point-icon"
                        :name="point.type"
                      />
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
                  {{ selected.name }}
                </h3>
                <template v-if="destinations.length">
                  <div v-for="transfer in destinations" :key="transfer.id">
                    <button
                      type="button"
                      class="floor-destination"
                      @click="visitDestination(transfer)"
                    >
                      <span
                        >{{ transfer.to.floor }}・{{
                          zoneName(transfer.to.zone)
                        }}</span
                      >
                      <StationMapIcon name="arrow" />
                    </button>
                    <p v-if="transferNote(transfer)">
                      {{ transferNote(transfer) }}
                    </p>
                  </div>
                </template>
                <p v-else>{{ selected.description }}</p>
              </section>
            </div>
          </section>
        </div>

        <footer class="station-footer">
          <span>依公開站圖重繪。標點與樓層相對位置為示意，請依現場指標。</span>
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
        </footer>
      </div>
    </div>
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
// import DestinationSearch from "../components/DestinationSearch.vue";
// import { stationCatalog } from "../search/catalog.mjs";
import StationFloorPlan from "../components/StationFloorPlan.vue";
import StationMapIcon from "../components/StationMapIcon.vue";
import { floors, stackBounds } from "./station-floor-plans";
import stationData from "./station-points.json";
import { zones, transfersFromPoint } from "./station-routing";

const { categories, points } = stationData;
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
const level = ref("B2");
const showLayers = ref(false);
const activeTheme = ref(null);
const selected = ref(null);
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
watch(level, updateMapLayout, { flush: "post" });
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
  nextTick(() => centerOn(0.5, 0.5));
});

onBeforeUnmount(() => {
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
const sources = computed(() => [
  [
    "台北捷運 " + level.value + " 資訊圖",
    "https://web.metro.taipei/img/ALL/INFOPDF/051.pdf#page=" +
      (floorIds.indexOf(level.value) + 1),
  ],
  ["台北捷運車站設施", "https://web.metro.taipei/pages2026/WebStation/051/1"],
  ["台北捷運剖面圖", "https://web.metro.taipei/pages2026/WebStation/051/4"],
]);

function isConnector(point) {
  return connectorTypes.has(point?.type);
}

function zoneName(id) {
  return zones.find((zone) => zone.id === id)?.name;
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
  return (
    point.type === type ||
    (point.type === "stairs-escalator" &&
      (type === "stairs" || type === "escalator"))
  );
}

function transferNote(transfer) {
  if (transfer.typeStatus === "unverified")
    return "平面圖顯示梯口，梯種及通行方向待確認。";
  if (transfer.typeStatus === "inferred")
    return "樓梯與電扶梯配置為推定，請依現場指標。";
  if (
    transfer.escalatorDirection === "unverified" ||
    transfer.direction === "unverified"
  )
    return "電扶梯運轉方向請依現場指標。";
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
    "--floor-on-tone": paletteColor(onTone),
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

function pointThemeStyle(type) {
  const category = categories[type];
  const colorToken = category?.colorToken || "gray-700";
  const iconColorToken = category?.iconColorToken || "gray-50";
  const iconColor = category?.iconColor;
  return {
    "--pin-color": paletteColor(colorToken),
    "--pin-icon": iconColor || paletteColor(iconColorToken),
    "--point-icon-color": iconColor || paletteColor(colorToken),
  };
}

function centerOn(x, y) {
  const frame = viewport.value;
  const board = frame.firstElementChild;
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
  return Math.min(mobileZoomQuery.matches ? 1.5 : 3, Math.max(1, scale));
}

function enforceZoomLimit() {
  const maxZoom = constrainZoom(zoom.value);
  if (maxZoom !== zoom.value) zoomAt(maxZoom, viewportCenter());
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

  connectorPosition.value = {
    left: frame.clientLeft + left + "px",
    top: frame.clientTop + top + "px",
  };
}

async function selectMapPoint(point, event) {
  if (floorChanging.value) return;
  arrivalPointId.value = null;
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
