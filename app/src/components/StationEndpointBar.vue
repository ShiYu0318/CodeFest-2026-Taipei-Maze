<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section
    class="endpoint-bar"
    data-tour-target="locate"
    :aria-label="t('endpoint.roles')"
  >
    <div class="endpoint-bar-field">
      <span class="endpoint-bar-label" aria-hidden="true">
        <span class="endpoint-bar-dot" data-role="start"></span>
        <ZhuyinText :text="t('endpoint.start')" />
      </span>
      <button
        type="button"
        class="endpoint-bar-value"
        data-endpoint-bar="start"
        :data-empty="!startPoint || null"
        aria-haspopup="dialog"
        :aria-label="t('endpoint.start') + '：' + describe(startPoint, 'start')"
        @click="emit('open', 'start', $event)"
      >
        <ZhuyinText :text="describe(startPoint, 'start')" />
      </button>
    </div>
    <button
      type="button"
      class="endpoint-bar-swap"
      :aria-label="t('endpoint.swap')"
      :title="t('endpoint.swap')"
      :disabled="!startPoint && !targetPoint"
      @click="emit('swap')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4v15M4 8l4-4 4 4M16 20V5M12 16l4 4 4-4" />
      </svg>
    </button>
    <div class="endpoint-bar-field">
      <span class="endpoint-bar-label" aria-hidden="true">
        <span class="endpoint-bar-dot" data-role="destination"></span>
        <ZhuyinText :text="t('endpoint.destination')" />
      </span>
      <button
        type="button"
        class="endpoint-bar-value"
        data-endpoint-bar="destination"
        :data-empty="!targetPoint || null"
        aria-haspopup="dialog"
        :aria-label="
          t('endpoint.destination') +
          '：' +
          describe(targetPoint, 'destination')
        "
        @click="emit('open', 'destination', $event)"
      >
        <ZhuyinText :text="describe(targetPoint, 'destination')" />
      </button>
    </div>
  </section>
</template>

<script setup>
/* global defineProps, defineEmits */
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
import { placeName } from "../i18n/places.mjs";

defineProps({
  startPoint: { type: Object, default: null },
  targetPoint: { type: Object, default: null },
});
const emit = defineEmits(["open", "swap"]);
const i18n = useI18n();
const { t } = i18n;
const describe = (point, role) =>
  point
    ? `${point.floor}・${placeName(point, i18n)}`
    : t(
        role === "start"
          ? "endpoint.startPlaceholder"
          : "endpoint.destinationPlaceholder"
      );
</script>

<style scoped>
.endpoint-bar {
  display: grid;
  gap: 4px;
  margin: 0 0 12px;
  padding: 12px;
  border-radius: var(--tp-radius-card, 12px);
  background: var(--surface);
  box-shadow: var(--tp-shadow-card);
}
.endpoint-bar-field {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.endpoint-bar-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: var(--display-secondary-size, 0.8125rem);
  font-weight: 600;
}
.endpoint-bar-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 3px solid var(--tp-primary-600);
}
.endpoint-bar-dot[data-role="destination"] {
  border-color: #d45251;
  background: #d45251;
}
.endpoint-bar-value {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: calc(var(--display-control-height, 44px) + 8px);
  padding: 8px 14px;
  border: 1px solid var(--tp-gray-300, #d0d5d7);
  border-radius: var(--tp-radius-button, 10px);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: var(--display-main-size, 1.0625rem);
  font-weight: 700;
  line-height: 1.4;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.endpoint-bar-value[data-empty] {
  color: var(--tp-gray-500, #7a8a8e);
  font-weight: 500;
}
.endpoint-bar-swap {
  display: grid;
  place-items: center;
  justify-self: center;
  width: 44px;
  height: 44px;
  margin: 2px 0 -2px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--tp-gray-100, #eef1f2);
  color: var(--tp-gray-700, #4c5a5d);
  cursor: pointer;
  transition: transform 240ms cubic-bezier(0.23, 1, 0.32, 1);
}
.endpoint-bar-swap svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.endpoint-bar-swap:active:not(:disabled) {
  transform: rotate(180deg) scale(0.94);
}
.endpoint-bar-swap:disabled {
  opacity: 0.45;
  cursor: default;
}
.endpoint-bar :focus-visible {
  outline: 3px solid var(--tp-primary-500);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .endpoint-bar-swap {
    transition: none;
  }
}
</style>
