<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <details class="info-disclosure">
    <summary :aria-label="label" :title="label">
      <StationMapIcon name="info" />
    </summary>
    <div class="info-disclosure-panel"><slot /></div>
  </details>
</template>
<script setup>
/* global defineProps */
import StationMapIcon from "./StationMapIcon.vue";
defineProps({ label: { type: String, required: true } });
</script>
<style scoped>
.info-disclosure {
  min-width: 0;
  max-width: 100%;
  color: var(--ink);
}
.info-disclosure > summary {
  display: grid;
  place-items: center;
  width: var(--display-control-height, 44px);
  min-height: var(--display-control-height, 44px);
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--tp-primary-700);
  background: var(--surface);
  cursor: pointer;
  list-style: none;
}
.info-disclosure > summary::-webkit-details-marker {
  display: none;
}
.info-disclosure > summary svg {
  width: 24px;
  height: 24px;
}
.info-disclosure > summary:focus-visible {
  outline: 3px solid var(--tp-primary-600);
  outline-offset: 2px;
}
.info-disclosure[open] {
  flex-basis: 100%;
  width: 100%;
}
.info-disclosure[open] > summary {
  margin-left: auto;
  background: var(--wash);
}
.info-disclosure-panel {
  padding: 12px;
  margin-top: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  font-size: var(--display-secondary-size, 0.875rem);
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.info-disclosure-panel :deep(p) {
  margin: 0 0 8px;
}
.info-disclosure-panel :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
