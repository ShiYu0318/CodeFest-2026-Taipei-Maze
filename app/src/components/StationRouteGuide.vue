<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section
    class="station-route-guide"
    data-tour-target="route"
    :aria-label="t('route.title')"
  >
    <p v-if="demo" class="route-demo-note">{{ t("demo.notice") }}</p>
    <p v-if="active" role="status">{{ t("scan.waiting") }}</p>
    <div v-else-if="arrivalReceipt" class="arrival-confirmed" role="status">
      <StationMapIcon name="check" /><ZhuyinText
        :text="t('progress.confirmed')"
      />
    </div>
    <StationRouteSteps
      v-else-if="steps.length"
      :steps="steps"
      :index="index"
      :map-angle="mapAngle"
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
      <button
        v-if="canConfirmArrival && !arrivalReceipt"
        type="button"
        class="confirm-trip-arrival"
        :disabled="active || demoBusy"
        @click="confirmAction"
      >
        <StationMapIcon name="check" /><ZhuyinText
          :text="t('progress.confirm')"
        />
      </button>
      <button
        v-if="arrivalReceipt"
        type="button"
        class="finish-trip"
        ref="finishButton"
        :disabled="active || demoBusy"
        @click="finishAction"
      >
        <ZhuyinText :text="t('progress.finish')" />
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
        <dl class="position-information">
          <dt>{{ t("progress.source") }}</dt>
          <dd>
            <ZhuyinText :text="t('progress.source.' + positionInfo.kind)" />
          </dd>
          <template v-if="positionInfo.confirmedAt"
            ><dt>{{ t("progress.lastScan") }}</dt>
            <dd>{{ formatTime(positionInfo.confirmedAt) }}</dd></template
          >
          <template v-if="arrivalReceipt"
            ><dt>{{ t("progress.confirmedAt") }}</dt>
            <dd>{{ formatTime(arrivalReceipt.confirmedAt) }}</dd></template
          >
        </dl>
        <p><ZhuyinText :text="t('walk.arrowNote')" /></p>
        <p><ZhuyinText :text="t('scan.caveat')" /></p>
      </InfoDisclosure>
    </div>
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, nextTick, ref, watch } from "vue";
import InfoDisclosure from "./InfoDisclosure.vue";
import StationRouteSteps from "./StationRouteSteps.vue";
import StationMapIcon from "./StationMapIcon.vue";
import ZhuyinText from "./ZhuyinText.vue";
import { htmlLang, useI18n } from "../i18n/index.mjs";
const props = defineProps({
  steps: { type: Array, required: true },
  index: { type: Number, required: true },
  mapAngle: { type: Number, default: 0 },
  pointsById: { type: Map, required: true },
  status: { type: String, default: "" },
  available: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  demo: { type: Boolean, default: false },
  demoBusy: { type: Boolean, default: false },
  tripActions: { type: Boolean, default: false },
  arrivalToken: { type: String, default: null },
  arrivalReceipt: { type: Object, default: null },
  canConfirmArrival: { type: Boolean, default: false },
  positionInfo: {
    type: Object,
    default: () => ({ kind: "none", confirmedAt: null }),
  },
});
const emit = defineEmits([
  "scan",
  "arrive",
  "finish",
  "help",
  "cancel",
  "update:index",
  "demo-advance",
  "demo-arrive",
]);
const { t, locale } = useI18n();
const confirmAction = computed(() => {
  const token = props.arrivalToken;
  return () => emit("arrive", token);
});
const finishAction = computed(() => {
  const token = props.arrivalToken;
  return () => emit("finish", token);
});
const finishButton = ref(null);
watch(
  () => props.arrivalReceipt,
  async (receipt) => {
    if (!receipt) return;
    await nextTick();
    finishButton.value?.focus({ preventScroll: true });
  }
);
const formatTime = (value) =>
  new Date(value).toLocaleString(htmlLang(locale.value));
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
.arrival-confirmed {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid var(--tp-primary-500);
  border-radius: 12px;
  font-weight: 700;
}
.arrival-confirmed svg {
  width: 48px;
  height: 48px;
  flex: none;
}
.inline-route-actions > .confirm-trip-arrival,
.inline-route-actions > .finish-trip {
  background: var(--tp-primary-600);
  color: #fff;
  font-weight: 700;
}
.position-information {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  margin: 0 0 12px;
}
.position-information dt {
  font-weight: 700;
}
.position-information dd {
  margin: 0 0 8px;
}
</style>
