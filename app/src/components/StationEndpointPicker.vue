<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div class="endpoint-backdrop" @click.self="emit('close')">
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
        <h2 id="endpoint-dialog-title">選擇{{ label }}</h2>
        <button ref="closeButton" type="button" @click="emit('close')">
          關閉
        </button>
      </header>
      <div class="endpoint-list">
        <section v-for="(floorPoints, floor) in points" :key="floor">
          <h3>{{ floor }}</h3>
          <ul>
            <li v-for="point in floorPoints" :key="point.id">
              <button
                type="button"
                :aria-pressed="point.id === selectedId"
                @click="emit('select', point.id)"
              >
                {{ point.name }}
              </button>
            </li>
          </ul>
        </section>
      </div>
      <footer v-if="selectedId">
        <button type="button" @click="emit('select', null)">
          清除{{ label }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { onMounted, ref } from "vue";
import stationData from "../views/station-points.json";

defineProps({
  label: { type: String, required: true },
  selectedId: { type: String, default: null },
});
const emit = defineEmits(["select", "close"]);
const { points } = stationData;
const panel = ref(null);
const closeButton = ref(null);
onMounted(() => closeButton.value.focus({ preventScroll: true }));

function keepFocus(event) {
  const buttons = panel.value.querySelectorAll("button");
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
  max-height: min(78vh, 620px);
  max-height: min(78svh, 620px);
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
.endpoint-list {
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
</style>
