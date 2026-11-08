<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="facility-picker" :aria-label="t('facility.category')">
    <div
      class="theme-group horizontal-scroll"
      data-tour-target="facilities"
      role="group"
      :aria-label="t('map.themesAria')"
      tabindex="0"
    >
      <button
        v-for="type in categories"
        :key="type"
        type="button"
        :disabled="busy"
        :aria-pressed="category === type"
        @click="emit('category', type)"
      >
        <StationMapIcon :name="type" /><ZhuyinText :text="t('type.' + type)" />
      </button>
    </div>
    <div class="facility-choice">
      <div class="facility-options">
        <label class="facility-nearest-option"
          ><input
            v-model="nearest"
            type="checkbox"
            :disabled="busy" /><ZhuyinText :text="t('facility.nearest')"
        /></label>
        <label class="facility-step-free-option"
          ><input
            type="checkbox"
            data-route-step-free
            :checked="stepFree"
            :disabled="busy"
            @change="emit('step-free', $event.target.checked)" /><StationMapIcon
            name="accessible" /><ZhuyinText :text="t('scan.stepFree')"
        /></label>
      </div>
      <label v-if="!nearest && category" class="facility-destination">
        <ZhuyinText :text="t('scan.chooseDestination')" />
        <select v-model="chosenPointId" :disabled="busy || !category">
          <option value="" disabled>{{ t("scan.choosePlaceholder") }}</option>
          <option
            v-for="point in matchingPoints"
            :key="point.id"
            :value="point.id"
          >
            {{ point.floor }} · {{ placeName(point, i18n) }}
          </option>
        </select>
      </label>
      <button
        type="button"
        class="facility-category-go"
        :disabled="busy || (nearest ? !category : !chosenPointId)"
        @click="emit('go', { category, nearest, pointId: chosenPointId })"
      >
        <ZhuyinText :text="t('map.goHere')" />
      </button>
    </div>
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, ref, watch } from "vue";
import StationMapIcon from "./StationMapIcon.vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
import { placeName } from "../i18n/places.mjs";
const props = defineProps({
  categories: { type: Array, required: true },
  category: { type: String, default: null },
  points: { type: Array, required: true },
  busy: { type: Boolean, default: false },
  destinationId: { type: String, default: null },
  stepFree: { type: Boolean, default: false },
});
const emit = defineEmits(["category", "go", "step-free"]);
const i18n = useI18n();
const { t } = i18n;
const nearest = ref(!props.destinationId),
  pointId = ref("");
const matchingPoints = computed(() =>
  props.points.filter((point) => {
    const types = [point.type].flat();
    return (
      point.enabled !== false &&
      (types.includes(props.category) ||
        (types.includes("stairs-escalator") &&
          ["stairs", "escalator"].includes(props.category)))
    );
  })
);
const chosenPointId = computed({
  get: () =>
    pointId.value ||
    (!props.category ||
    matchingPoints.value.some((point) => point.id === props.destinationId)
      ? props.destinationId
      : null),
  set: (value) => {
    pointId.value = value;
  },
});
watch(
  () => props.destinationId,
  () => {
    nearest.value = false;
    pointId.value = "";
  }
);
watch(
  () => props.category,
  () => {
    pointId.value = "";
  }
);
</script>
<style scoped>
.facility-picker {
  min-width: 0;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: var(--tp-radius-card, 12px);
  background: var(--surface);
}
.theme-group {
  display: flex;
  gap: 8px;
  max-width: 100%;
  overflow-x: auto;
  padding: 4px 0 10px;
}
.theme-group button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
}
.theme-group svg {
  width: 22px;
  height: 22px;
  flex: none;
}
.facility-choice {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}
.facility-nearest-option,
.facility-step-free-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--display-control-height, 44px);
  overflow-wrap: anywhere;
}
.facility-nearest-option input,
.facility-step-free-option input {
  width: 22px;
  height: 22px;
  flex: none;
}
.facility-destination {
  grid-column: 1 / -1;
  display: grid;
  gap: 8px;
  min-width: 0;
}
.facility-destination select {
  width: 100%;
  min-width: 0;
}
.facility-picker button,
.facility-picker select {
  min-height: var(--display-control-height, 44px);
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: var(--display-control-size, 1rem);
}
.theme-group button[aria-pressed="true"] {
  border-color: var(--tp-primary-600);
  background: var(--wash);
}
.facility-choice .facility-category-go {
  background: var(--tp-primary-600);
  color: #fff;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.facility-picker button:disabled {
  opacity: 0.5;
}
.facility-picker :focus-visible {
  outline: 3px solid var(--tp-primary-600);
  outline-offset: 2px;
}
@media (max-width: 420px) {
  .facility-choice {
    grid-template-columns: minmax(0, 1fr);
  }
}
.facility-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  min-width: 0;
}
.facility-step-free-option svg {
  width: 22px;
  height: 22px;
  flex: none;
}
.facility-options label {
  cursor: pointer;
}
</style>
