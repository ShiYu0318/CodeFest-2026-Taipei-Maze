<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section
    v-if="steps.length || view.manualPosition"
    class="floor-transfer-step"
    aria-live="polite"
  >
    <p v-if="view.manualPosition" class="manual-floor-note">
      <ZhuyinText
        :text="
          t('transfer.manualFloor', {
            floor: floorLabel(view.manualPosition.floor),
          })
        "
      />
    </p>
    <article v-for="step in steps" :key="step.token">
      <h3>
        <ZhuyinText
          :text="
            t('transfer.goTo', {
              kind: t('type.' + step.type),
              floor: floorLabel(step.to.floor),
            })
          "
        />
      </h3>
      <p class="transfer-connector">
        <ZhuyinText :text="connectorLabel(step)" />
      </p>
      <p><ZhuyinText :text="t('transfer.checkFloor')" /></p>
      <p v-if="step.escalatorDirection === 'unverified'">
        <ZhuyinText :text="t('transfer.checkDirection')" />
      </p>
      <button
        type="button"
        class="confirm-floor-transfer"
        :disabled="view.active"
        @click="location.confirmTransfer(step.token)"
      >
        <ZhuyinText
          :text="
            t(
              step.movement === 'up'
                ? 'transfer.confirmUp'
                : 'transfer.confirmDown'
            )
          "
        />
      </button>
    </article>
  </section>
</template>
<script setup>
/* global defineProps */
import { computed } from "vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
import { placeLabel } from "../i18n/places.mjs";
import { stationPoints } from "../station/scan.mjs";
import data from "../views/station-points.json";
const props = defineProps({ location: { type: Object, required: true } });
const i18n = useI18n();
const { t } = i18n;
const view = computed(() => props.location.view.value);
// A render-scoped step captures its displayed token, so a double tap cannot
// confirm the next transfer before Vue has replaced the old button.
const steps = computed(() =>
  view.value.transfer ? [view.value.transfer] : []
);
const byId = new Map(stationPoints(data).map((point) => [point.id, point]));
const floorLabel = (floor) => {
  const key = `floor.${floor}`;
  return t(key) === key ? floor : `${floor} · ${t(key)}`;
};
const connectorLabel = (step) => {
  const point = byId.get(step.from.pointId);
  return point ? placeLabel(point, i18n) : t("type." + step.type);
};
</script>
<style scoped>
.floor-transfer-step {
  margin-bottom: 8px;
}
.floor-transfer-step h3 {
  margin: 0 0 4px;
  font-size: var(--display-main-size, 16px);
  line-height: 1.45;
}
.floor-transfer-step p {
  margin: 4px 0;
  font-size: var(--display-secondary-size, 13px);
  line-height: 1.5;
}
.transfer-connector {
  font-weight: 600;
}
.manual-floor-note {
  color: var(--muted);
}
.confirm-floor-transfer {
  width: 100%;
  min-height: var(--display-control-height, 44px);
  margin-top: 8px;
  padding: 10px 14px;
  border: 2px solid var(--accent);
  border-radius: var(--tp-radius-button, 10px);
  background: var(--surface);
  color: var(--accent);
  font: inherit;
  font-weight: 700;
}
.confirm-floor-transfer:disabled {
  opacity: 0.6;
  cursor: default;
}
.confirm-floor-transfer:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
</style>
