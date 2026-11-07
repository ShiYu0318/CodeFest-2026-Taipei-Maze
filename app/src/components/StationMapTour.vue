<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <dialog
    ref="dialog"
    class="map-tour"
    :class="{ 'map-tour-unanchored': !spotlight }"
    :data-step="targetId"
    aria-labelledby="map-tour-title"
    aria-describedby="map-tour-description"
    @cancel.prevent="finish"
    @click.self="advance"
    @touchmove.prevent
    @wheel.prevent
  >
    <div
      v-if="spotlight"
      class="map-tour-spotlight"
      :style="spotlight"
      aria-hidden="true"
    >
      <span :key="targetId" class="map-tour-pulse"></span>
    </div>
    <section
      :key="targetId"
      class="map-tour-card"
      :style="cardStyle"
      :data-side="side"
    >
      <header class="map-tour-header">
        <span
          ><ZhuyinText :text="t('tour.step', { step: index + 1, total })"
        /></span>
        <button type="button" class="map-tour-skip" @click="finish">
          <ZhuyinText :text="t('tour.skip')" />
        </button>
      </header>
      <div class="map-tour-copy" @touchmove.stop @wheel.stop>
        <h2 id="map-tour-title" ref="heading" tabindex="-1" autofocus>
          <ZhuyinText :text="t(titleKey)" />
        </h2>
        <p id="map-tour-description">
          <ZhuyinText :text="t(descriptionKey)" />
        </p>
      </div>
      <footer class="map-tour-actions">
        <span><ZhuyinText :text="t('tour.tapOutside')" /></span>
        <button type="button" class="map-tour-next" @click="advance">
          <ZhuyinText
            :text="t(index === total - 1 ? 'tour.finish' : 'tour.next')"
          />
        </button>
      </footer>
    </section>
  </dialog>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "../i18n/index.mjs";
import { mapTourSteps } from "../station/map-tour.mjs";
import ZhuyinText from "./ZhuyinText.vue";

const props = defineProps({ root: { type: Object, required: true } });
const emit = defineEmits(["finish"]);
const { t } = useI18n();
const dialog = ref(null);
const heading = ref(null);
const index = ref(0);
const spotlight = ref(null);
const cardStyle = ref(null);
const side = ref(null);
const total = mapTourSteps.length;
const targetId = computed(() => mapTourSteps[index.value][0]);
const titleKey = computed(() => mapTourSteps[index.value][1]);
const descriptionKey = computed(() => "tour." + targetId.value);
const gap = 12;
let target;
let startScroll;
let controlScrollPositions;

function findTarget() {
  // The floating helper is teleported to the document body.
  const root = targetId.value === "helper" ? document : props.root;
  const element = root.querySelector(`[data-tour-target="${targetId.value}"]`);
  if (targetId.value !== "marker" || !element) return element;

  const frame = element.getBoundingClientRect();
  const centerX = frame.left + frame.width / 2;
  const centerY = frame.top + frame.height / 2;
  let nearest;
  let nearestDistance = Infinity;
  const pins = element.querySelectorAll(".map-pin:not(.pin-filtered-out)");
  for (const pin of pins) {
    const rect = pin.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (
      rect.left < frame.left ||
      rect.right > frame.right ||
      rect.top < frame.top ||
      rect.bottom > frame.bottom
    )
      continue;
    const distance = Math.hypot(x - centerX, y - centerY);
    if (distance < nearestDistance) {
      nearest = pin;
      nearestDistance = distance;
    }
  }
  return nearest ?? pins[0] ?? element;
}

function positionTour() {
  const width = dialog.value.clientWidth;
  const height = dialog.value.clientHeight;
  const rect = target?.getBoundingClientRect();
  if (!rect || rect.bottom <= 0 || rect.top >= height) {
    spotlight.value = null;
    cardStyle.value = null;
    side.value = null;
    return;
  }
  const top = Math.max(0, rect.top - 5);
  const left = Math.max(0, rect.left - 5);
  const right = Math.min(width, rect.right + 5);
  const bottom = Math.min(height, rect.bottom + 5);
  const center = (left + right) / 2;
  const cardWidth = Math.min(height <= 420 ? 480 : 360, width - 2 * gap);
  const cardLeft = Math.max(
    gap,
    Math.min(center - cardWidth / 2, width - cardWidth - gap)
  );
  const above = top > height - bottom;

  spotlight.value = {
    top: top + "px",
    left: left + "px",
    width: right - left + "px",
    height: bottom - top + "px",
  };
  side.value = above ? "above" : "below";
  cardStyle.value = {
    left: cardLeft + "px",
    width: cardWidth + "px",
    top: above ? "auto" : bottom + gap + "px",
    bottom: above ? height - top + gap + "px" : "auto",
    maxHeight: (above ? top : height - bottom) - 2 * gap + "px",
    "--map-tour-arrow":
      Math.max(14, Math.min(center - cardLeft, cardWidth - 14)) + "px",
  };
}

function revealTarget() {
  target = findTarget();
  const inMap = target && props.root.contains(target);
  if (inMap) target.scrollIntoView({ block: "nearest", inline: "nearest" });
  if (inMap && !target.closest(".station-heading")) {
    const rect = target.getBoundingClientRect();
    const height = dialog.value.clientHeight;
    const anchorY = height * (height <= 420 ? 0.4 : 0.5);
    window.scrollBy(0, rect.top + rect.height / 2 - anchorY);
  }
  positionTour();
}

async function advance() {
  if (index.value === total - 1) return finish();
  index.value++;
  revealTarget();
  await nextTick();
  heading.value?.focus({ preventScroll: true });
}

function finish() {
  dialog.value.close();
  for (const [element, left, top] of controlScrollPositions)
    element.scrollTo(left, top);
  window.scrollTo(window.scrollX, startScroll);
  emit("finish");
}

onMounted(() => {
  if (typeof dialog.value.showModal !== "function") {
    emit("finish");
    return;
  }
  startScroll = window.scrollY;
  controlScrollPositions = Array.from(
    props.root.querySelectorAll(".floor-controls, .map-viewport"),
    (element) => [element, element.scrollLeft, element.scrollTop]
  );
  dialog.value.showModal();
  revealTarget();
  window.addEventListener("resize", revealTarget);
  window.addEventListener("scroll", positionTour, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", revealTarget);
  window.removeEventListener("scroll", positionTour, true);
});
</script>

<style scoped>
.map-tour {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  color: var(--ink);
}
.map-tour::backdrop {
  background: transparent;
}
.map-tour-unanchored {
  background: rgb(8 19 21 / 66%);
}
.map-tour-spotlight {
  position: absolute;
  border: 2px solid var(--tp-primary-500);
  border-radius: 9px;
  box-shadow: 0 0 0 150vmax rgb(8 19 21 / 66%);
  pointer-events: none;
  transition: top 260ms ease, left 260ms ease, width 260ms ease,
    height 260ms ease;
}
.map-tour-pulse {
  position: absolute;
  inset: -2px;
  border: 2px solid var(--tp-primary-500);
  border-radius: inherit;
  pointer-events: none;
  animation: map-tour-pulse 900ms ease-out 2;
  opacity: 0;
}
.map-tour-card {
  position: absolute;
  inset: 12px 12px auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 6px 24px rgb(8 19 21 / 30%);
  animation: map-tour-card-in 240ms ease-out;
}
.map-tour-card[data-side="below"] {
  --map-tour-entry-offset: -8px;
}
.map-tour-card[data-side]::before {
  position: absolute;
  left: var(--map-tour-arrow);
  width: 10px;
  height: 10px;
  background: var(--surface);
  content: "";
  transform: translateX(-50%) rotate(45deg);
}
.map-tour-card[data-side="above"]::before {
  bottom: -5px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.map-tour-card[data-side="below"]::before {
  top: -5px;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
}
.map-tour-header,
.map-tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: var(--display-secondary-size, 0.8125rem);
}
.map-tour-copy {
  overflow-y: auto;
  overscroll-behavior: contain;
  font-size: var(--display-secondary-size, 1rem);
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.map-tour-copy h2 {
  margin: 0 0 4px;
  font-size: var(--display-main-size, 1.125rem);
}
.map-tour-copy p {
  margin: 0;
}
.map-tour-copy h2:focus {
  outline: none;
}
.map-tour-header button,
.map-tour-actions button {
  min-height: 44px;
  padding: 4px 10px;
  border: 1px solid var(--tp-primary-600);
  border-radius: 8px;
  font-weight: 650;
}
.map-tour-skip {
  background: var(--surface);
  color: var(--accent);
}
.map-tour-next {
  flex: none;
  background: var(--tp-primary-100);
  color: var(--tp-primary-900);
}
@keyframes map-tour-card-in {
  from {
    opacity: 0;
    transform: translateY(var(--map-tour-entry-offset, 8px));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes map-tour-pulse {
  from {
    opacity: 0.8;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.06);
  }
}
@media (prefers-reduced-motion: reduce) {
  .map-tour-spotlight {
    transition: none;
  }
  .map-tour-card,
  .map-tour-pulse {
    animation: none;
  }
}
@media (max-height: 420px) {
  .map-tour-card {
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 4px;
    padding: 8px;
  }
  .map-tour-header,
  .map-tour-actions {
    display: contents;
  }
  .map-tour-header span,
  .map-tour-skip,
  .map-tour-next {
    align-self: center;
    grid-row: 1;
  }
  .map-tour-skip {
    grid-column: 2;
  }
  .map-tour-next {
    grid-column: 3;
  }
  .map-tour-copy {
    grid-area: 2 / 1 / 3 / 4;
  }
  .map-tour-actions span {
    display: none;
  }
}
</style>
