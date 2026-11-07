<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <details class="demo-panel">
    <summary>{{ t("demo.title") }} · {{ t("demo.notice") }}</summary>
    <div class="demo-scenarios">
      <button
        v-for="scenario in DEMO_SCENARIOS"
        :key="scenario.id"
        type="button"
        :disabled="busy"
        @click="emit('scenario', scenario.id)"
      >
        <StationMapIcon :name="icons[scenario.id]" /><span>{{
          t("demo." + scenario.id)
        }}</span>
      </button>
    </div>
    <div class="demo-actions">
      <button
        type="button"
        :disabled="busy || !canAdvance"
        @click="emit('advance')"
      >
        {{ t("demo.advance") }}
      </button>
      <button
        type="button"
        :disabled="busy || !canArrive"
        @click="emit('arrive')"
      >
        {{ t("demo.arrive") }}
      </button>
      <button
        type="button"
        :disabled="busy || !hasDestination"
        @click="emit('outage')"
      >
        {{ t("demo.noElevator") }}
      </button>
      <button type="button" :disabled="busy" @click="emit('reset')">
        {{ t("demo.reset") }}
      </button>
      <button type="button" :disabled="busy" @click="emit('exit')">
        {{ t("demo.exit") }}
      </button>
    </div>
    <p v-if="notice" role="status">{{ notice }}</p>
  </details>
</template>
<script setup>
/* global defineProps, defineEmits */
import { DEMO_SCENARIOS } from "../station/demo-scenarios.mjs";
import { useI18n } from "../i18n/index.mjs";
import StationMapIcon from "./StationMapIcon.vue";
defineProps({
  busy: { type: Boolean, default: false },
  canAdvance: { type: Boolean, default: false },
  canArrive: { type: Boolean, default: false },
  hasDestination: { type: Boolean, default: false },
  notice: { type: String, default: "" },
});
const emit = defineEmits([
  "scenario",
  "advance",
  "arrive",
  "outage",
  "reset",
  "exit",
]);
const { t } = useI18n();
const icons = {
  restroom: "restroom",
  crossFloor: "layers",
  accessible: "accessible",
  blocked: "help",
};
</script>
<style scoped>
.demo-panel {
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 2px dashed var(--tp-primary-500);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  overflow-wrap: anywhere;
}
.demo-panel summary {
  min-height: 44px;
  cursor: pointer;
  font-weight: 700;
}
.demo-scenarios,
.demo-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
  gap: 8px;
  margin-top: 10px;
}
.demo-panel button {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: var(--display-control-height, 44px);
  border: 1px solid var(--border);
  padding: 10px;
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  overflow-wrap: anywhere;
}
.demo-panel svg {
  width: 24px;
  height: 24px;
  flex: none;
}
.demo-panel button:disabled {
  opacity: 0.5;
}
</style>
