<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section
    class="station-route-guide"
    data-tour-target="route"
    :aria-label="t('route.title')"
  >
    <p v-if="demo" class="route-demo-note">{{ t("demo.notice") }}</p>
    <p v-if="active" role="status">{{ t("scan.waiting") }}</p>
    <StationRouteSteps
      v-else-if="steps.length"
      :steps="steps"
      :index="index"
      :points-by-id="pointsById"
      @update:index="emit('update:index', $event)"
    />
    <p v-else role="status"><ZhuyinText :text="status" /></p>
    <div class="inline-route-actions" data-tour-target="route-actions">
      <button
        type="button"
        :disabled="active || !available"
        @click="emit('scan')"
      >
        <StationMapIcon name="qrcode" /><ZhuyinText :text="t('scan.rescan')" />
      </button>
      <template v-if="tripActions">
        <button
          type="button"
          data-route-action="help"
          :disabled="active || demoBusy"
          @click="emit('help')"
        >
          <StationMapIcon name="help" /><ZhuyinText :text="t('staff.short')" />
        </button>
        <button
          type="button"
          data-route-action="cancel"
          :disabled="active || demoBusy"
          @click="emit('cancel')"
        >
          <StationMapIcon name="close" /><ZhuyinText :text="t('trip.cancel')" />
        </button>
      </template>
      <template v-if="demo">
        <button
          type="button"
          :disabled="
            active ||
            demoBusy ||
            !steps.length ||
            steps[index]?.kind === 'arrive'
          "
          @click="emit('demo-advance')"
        >
          {{ t("demo.advance") }}
        </button>
        <button
          type="button"
          :disabled="active || demoBusy || !steps.length"
          @click="emit('demo-arrive')"
        >
          {{ t("demo.arrive") }}
        </button>
      </template>
      <InfoDisclosure :label="t('guide.help')">
        <p><ZhuyinText :text="t('walk.arrowNote')" /></p>
        <p><ZhuyinText :text="t('scan.caveat')" /></p>
      </InfoDisclosure>
    </div>
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import InfoDisclosure from "./InfoDisclosure.vue";
import StationRouteSteps from "./StationRouteSteps.vue";
import StationMapIcon from "./StationMapIcon.vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
defineProps({
  steps: { type: Array, required: true },
  index: { type: Number, required: true },
  pointsById: { type: Map, required: true },
  status: { type: String, default: "" },
  available: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  demo: { type: Boolean, default: false },
  demoBusy: { type: Boolean, default: false },
  tripActions: { type: Boolean, default: false },
});
const emit = defineEmits([
  "scan",
  "help",
  "cancel",
  "update:index",
  "demo-advance",
  "demo-arrive",
]);
const { t } = useI18n();
</script>
<style scoped>
.station-route-guide {
  min-width: 0;
  overflow-wrap: anywhere;
}
.route-demo-note {
  margin: 0 0 8px;
  padding: 8px;
  border: 2px dashed var(--tp-primary-500);
  border-radius: 10px;
  font-weight: 700;
}
.inline-route-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.inline-route-actions > button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: var(--display-control-height, 44px);
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  overflow-wrap: anywhere;
}
.inline-route-actions > button svg {
  width: 24px;
  height: 24px;
  flex: none;
}
.inline-route-actions button:disabled {
  opacity: 0.5;
}
.inline-route-actions :focus-visible {
  outline: 3px solid var(--tp-primary-600);
  outline-offset: 2px;
}
</style>
