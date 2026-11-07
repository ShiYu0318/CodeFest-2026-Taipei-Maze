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
        <h2 id="endpoint-dialog-title">定位</h2>
        <button
          ref="closeButton"
          class="endpoint-close"
          type="button"
          aria-label="關閉定位"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <div class="endpoint-roles" role="group" aria-label="選擇起點或終點">
        <button
          v-for="(label, role) in labels"
          :key="role"
          type="button"
          :data-endpoint-role="role"
          :aria-label="label"
          :aria-pressed="role === activeRole"
          @click="showRole(role)"
        >
          <strong>{{ label }}</strong>
          <span class="endpoint-value">
            {{
              choices[role]
                ? choices[role].floor + "・" + choices[role].name
                : "尚未選擇"
            }}
          </span>
        </button>
      </div>
      <div
        ref="list"
        class="endpoint-list"
        :aria-label="labels[activeRole] + '標點'"
        @touchmove.stop
        @wheel.stop
      >
        <section v-for="(floorPoints, floor) in points" :key="floor">
          <h3>{{ floor }}</h3>
          <ul>
            <li v-for="point in floorPoints" :key="point.id">
              <button
                type="button"
                :aria-pressed="point.id === choices[activeRole]?.id"
                @click="choosePoint({ ...point, floor })"
              >
                {{ point.name }}
              </button>
            </li>
          </ul>
        </section>
      </div>
      <footer>
        <button
          type="button"
          :disabled="!choices[activeRole]"
          @click="choosePoint(null)"
        >
          清除{{ labels[activeRole] }}
        </button>
        <button
          type="button"
          class="endpoint-map-pick"
          @click="emit('map-pick')"
        >
          地圖選點
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { nextTick, onMounted, reactive, ref } from "vue";
import stationData from "../views/station-points.json";

const props = defineProps({
  startPoint: { type: Object, default: null },
  targetPoint: { type: Object, default: null },
});
const emit = defineEmits(["select", "close", "map-pick"]);
const { points } = stationData;
const labels = { start: "起點", destination: "終點" };
const choices = reactive({
  start: props.startPoint,
  destination: props.targetPoint,
});
const activeRole = ref(
  choices.start && !choices.destination ? "destination" : "start"
);
const panel = ref(null);
const list = ref(null);
const closeButton = ref(null);
onMounted(() => closeButton.value.focus({ preventScroll: true }));

function showRole(role) {
  if (role === activeRole.value) return;
  activeRole.value = role;
  list.value.scrollTop = 0;
}

async function choosePoint(point) {
  choices[activeRole.value] = point;
  emit(
    "select",
    choices.start?.id,
    choices.destination?.id,
    point,
    activeRole.value
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
  const buttons = panel.value.querySelectorAll("button:not(:disabled)");
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
.endpoint-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-inline: 12px;
}
.endpoint-list h3 {
  position: sticky;
  z-index: 1;
  top: 0;
  margin: 0;
  padding: 8px 4px;
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
</style>
