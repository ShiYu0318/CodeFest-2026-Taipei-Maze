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
            <div class="map-stage">
              <div class="compass" aria-label="北方朝上略偏左" role="img">
                <span>N</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3 20 21l-8-4-8 4Z" />
                </svg>
              </div>
              <div
                ref="viewport"
                class="map-viewport"
                :class="{ 'map-zoomed': zoom > 1, 'map-dragging': dragging }"
                :style="{ '--map-aspect': bounds[2] + ' / ' + bounds[3] }"
                role="region"
                :aria-label="level + ' 互動地圖，可用加減鍵縮放，0 鍵重設'"
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
                <div class="map-board" :style="{ width: zoom * 100 + '%' }">
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
                      :class="{ 'active-with-layers': backgroundLayers.length }"
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
                      'pin-route': point.id === routeOrigin?.pointId,
                    }"
                    type="button"
                    :style="pinStyle(point)"
                    :aria-label="point.name"
                    :aria-pressed="point.id === selected?.id"
                    @click="togglePoint(point)"
                    @focus="focusVisiblePin(point, $event)"
                  >
                    <span
                      v-if="
                        (matchesTheme(point, activeTheme) &&
                          categories[activeTheme]) ||
                        (point.id === routeOrigin?.pointId &&
                          categories[point.type])
                      "
                      class="pin-icon"
                      ><StationMapIcon
                        :name="
                          matchesTheme(point, activeTheme)
                            ? activeTheme
                            : point.type
                        "
                    /></span>
                    <svg
                      v-else
                      class="point-dot"
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                    >
                      <circle cx="6" cy="6" r="5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="map-tools">
              <span v-if="selected" class="map-selection">{{
                selected.name
              }}</span>
              <span v-else-if="activeTheme" class="map-selection"
                >{{ categories[activeTheme].name }}・{{
                  listedPoints.length
                }}
                處</span
              >
            </div>
            <div
              v-if="backgroundLayers.length"
              class="layer-key"
              aria-label="背景樓層圖例"
            >
              <span
                v-for="layer in backgroundLayers"
                :key="layer.floor"
                :style="{ '--ghost-ink': layer.ink }"
                >{{ layer.floor }}</span
              >
            </div>
            <p class="map-note">
              <span aria-hidden="true"></span>{{ mapNote }}
            </p>
          </section>

          <section class="transfer-card" aria-labelledby="transfer-title">
            <div class="transfer-heading">
              <h2 id="transfer-title">跨樓層預覽</h2>
              <span class="floor-tag" :style="floorStyle(level)"
                >目前 {{ level }}</span
              >
            </div>
            <form class="transfer-form" @submit.prevent="previewRoute">
              <label v-if="startOptions.length > 1">
                出發區域
                <select v-model="startZone" required>
                  <option disabled value="">選擇目前區域</option>
                  <option
                    v-for="zone in startOptions"
                    :key="zone.id"
                    :value="zone.id"
                  >
                    {{ zone.name }}
                  </option>
                </select>
              </label>
              <label>
                前往樓層
                <select v-model="targetZone" required>
                  <option disabled value="">選擇目的樓層</option>
                  <option
                    v-for="zone in targetOptions"
                    :key="zone.id"
                    :value="zone.id"
                  >
                    {{ zone.floor }}・{{ zone.name }}
                  </option>
                </select>
              </label>
              <button type="submit">展開轉乘圖</button>
            </form>
            <p class="transfer-hint">
              預覽依示意資料列出跨樓層接點，尚未完成現場通行核對。樓層內步行與驗票請依站內指標。
            </p>
            <p v-if="routeMessage" class="transfer-message" role="status">
              {{ routeMessage }}
            </p>
          </section>

          <Transition name="floor-reveal">
            <div v-if="previewSteps.length" class="transfer-reveal">
              <div class="transfer-reveal-content">
                <section
                  class="transfer-card transfer-results"
                  aria-labelledby="transfer-results-title"
                >
                  <div class="transfer-heading">
                    <h2
                      id="transfer-results-title"
                      ref="previewHeading"
                      tabindex="-1"
                    >
                      {{ level }} 往
                      {{ previewSteps[previewSteps.length - 1].to.floor }}
                    </h2>
                    <button
                      type="button"
                      class="clear-selection"
                      @click="previewSteps = []"
                    >
                      收起轉乘圖
                    </button>
                  </div>
                  <p class="transfer-hint">
                    從 {{ routeOrigin.floor }} 的「{{
                      routeOrigin.point.name
                    }}」出發。
                  </p>
                  <ol class="transfer-results-list">
                    <li
                      v-for="(step, index) in previewSteps"
                      :key="step.id"
                      class="transfer-step"
                    >
                      <header>
                        <span
                          class="floor-tag"
                          :style="floorStyle(step.to.floor)"
                          >{{ step.to.floor }}</span
                        >
                        <div>
                          <h3>{{ zoneName(step.to.zone) }}</h3>
                          <p>
                            {{ connectionCategoryName(step.type) }}・{{
                              step.from.point.name
                            }}
                          </p>
                        </div>
                      </header>
                      <StationTransferMap
                        :arrival="step.to"
                        :departure="previewSteps[index + 1]?.from"
                      />
                      <p v-if="transferNote(step)" class="transfer-hint">
                        {{ transferNote(step) }}
                      </p>
                    </li>
                  </ol>
                </section>
              </div>
            </div>
          </Transition>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
// import DestinationSearch from "../components/DestinationSearch.vue";
// import { stationCatalog } from "../search/catalog.mjs";
import StationFloorPlan from "../components/StationFloorPlan.vue";
import StationMapIcon from "../components/StationMapIcon.vue";
import StationTransferMap from "../components/StationTransferMap.vue";
import { floors, stackBounds } from "./station-floor-plans";
import stationData from "./station-points.json";
import { zones, planFloorTransfer, transferFromPoint } from "./station-routing";

const { categories, points } = stationData;
// const searchCatalogEntries = stationCatalog(stationData);
// let searchPointRevision = 0;
const floorIds = Object.keys(floors);
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
const zoom = ref(1);
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
const startZone = ref("");
const targetZone = ref("");
const previewSteps = ref([]);
const routeMessage = ref("");
const previewHeading = ref(null);

onMounted(() => {
  document.addEventListener("touchstart", startPinch, captureGesture);
  document.addEventListener("touchend", endPinch, captureGesture);
  document.addEventListener("touchcancel", endPinch, captureGesture);
  for (const type of webkitGestures) {
    document.addEventListener(type, handleWebkitGesture, captureGesture);
  }
});

onBeforeUnmount(() => {
  clearMapDrag();
  clearPinch();
  document.removeEventListener("touchstart", startPinch, true);
  document.removeEventListener("touchend", endPinch, true);
  document.removeEventListener("touchcancel", endPinch, true);
  for (const type of webkitGestures) {
    document.removeEventListener(type, handleWebkitGesture, true);
  }
});

const startOptions = computed(() =>
  zones.filter((zone) => zone.floor === level.value)
);
const targetOptions = computed(() =>
  zones.filter((zone) => zone.floor !== level.value)
);
const routeOrigin = computed(() => previewSteps.value[0]?.from);
const floorPoints = computed(() => {
  const current = points[level.value];
  return [
    ...current.filter((point) => !getDestination(point)),
    ...current.filter((point) => getDestination(point)),
  ];
});
const availableThemes = computed(() =>
  Object.keys(categories).filter((type) =>
    floorPoints.value.some((point) => matchesTheme(point, type))
  )
);
const listedPoints = computed(() =>
  activeTheme.value
    ? floorPoints.value.filter((point) =>
        matchesTheme(point, activeTheme.value)
      )
    : floorPoints.value
);
// const themeHint = computed(() =>
//   activeTheme.value
//     ? categories[activeTheme.value].name +
//       "・" +
//       listedPoints.value.length +
//       " 處，再點主題可恢復圓點。"
//     : "選一個主題，同類標點會一起顯示圖標。"
// );
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
const mapNote = computed(() => {
  if (showLayers.value) return "實線是目前樓層，淡色虛線是其他樓層的相對輪廓。";
  return "實線為目前樓層。開啟透視樓層可查看其他樓層的相對位置。";
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

function getDestination(point) {
  return transferFromPoint(point?.id);
}

function zoneName(id) {
  return zones.find((zone) => zone.id === id)?.name;
}

function connectionCategoryName(type) {
  return categories[type]?.name || "跨樓層連接";
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
  return {
    "--pin-color": paletteColor(colorToken),
    "--pin-icon": paletteColor(iconColorToken),
  };
}

function centerOn(x, y) {
  const frame = viewport.value;
  const board = frame.firstElementChild;
  frame.scrollLeft = x * board.clientWidth - frame.clientWidth / 2;
  frame.scrollTop = y * board.clientHeight - frame.clientHeight / 2;
}

function focusVisiblePin(point, event) {
  if (zoom.value > 1 && event.currentTarget.matches(":focus-visible")) {
    centerOn(...normalizedPoint(point));
  }
}

function constrainZoom(scale) {
  return Math.min(3, Math.max(1, scale));
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
    (frame.scrollLeft + x) / board.clientWidth,
    (frame.scrollTop + y) / board.clientHeight,
  ];
}

async function zoomAt(scale, [x, y], anchor = zoomAnchor([x, y])) {
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
      anchor[0] * board.clientWidth - x,
      anchor[1] * board.clientHeight - y
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
  if (event.touches.length < 2) return;
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
  const frame = viewport.value;
  const scale = constrainZoom(zoom.value + (event.key === "-" ? -0.5 : 0.5));
  zoomAt(scale, [frame.clientWidth / 2, frame.clientHeight / 2]);
}

async function showFloor(floor) {
  if (floor === level.value) return;
  level.value = floor;
  selected.value = null;
  startZone.value = "";
  targetZone.value = "";
  previewSteps.value = [];
  routeMessage.value = "";
  if (!availableThemes.value.includes(activeTheme.value))
    activeTheme.value = null;
  await resetZoom();
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

function togglePoint(point) {
  selected.value = selected.value?.id === point.id ? null : point;
  if (selected.value && startOptions.value.length > 1)
    startZone.value = point.zone;
  if (selected.value && zoom.value > 1) centerOn(...normalizedPoint(point));
}

function toggleTheme(type) {
  activeTheme.value = activeTheme.value === type ? null : type;
  if (selected.value && !matchesTheme(selected.value, activeTheme.value))
    selected.value = null;
}

function previewRoute() {
  const origin =
    startOptions.value.length === 1
      ? startOptions.value[0].id
      : startZone.value;
  previewSteps.value = planFloorTransfer(origin, targetZone.value);
  routeMessage.value = previewSteps.value.length
    ? ""
    : "目前沒有已確認的跨樓層連接。";
}

// function revealMap() {
//   mapSection.value.scrollIntoView({ block: "nearest" });
//   viewport.value.focus({ preventScroll: true });
// }
</script>

<style scoped src="./station-map.css"></style>
