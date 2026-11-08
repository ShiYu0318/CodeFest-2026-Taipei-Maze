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
        :disabled="busy"
        aria-haspopup="dialog"
        :aria-label="t('endpoint.start') + '：' + describe(startPoint, 'start')"
        @click="emit('open', 'start', $event)"
      >
        <ZhuyinText :text="describe(startPoint, 'start')" />
      </button>
      <button
        type="button"
        class="endpoint-bar-scan"
        :disabled="busy || !scanAvailable"
        :aria-label="startPoint ? t('scan.rescan') : t('scan.scan')"
        :title="startPoint ? t('scan.rescan') : t('scan.scan')"
        @click="emit('scan')"
      >
        <StationMapIcon name="qrcode" />
      </button>
      <button
        type="button"
        class="endpoint-bar-share"
        data-endpoint-share="start"
        :disabled="busy || !startPoint"
        :aria-label="t('share.start')"
        :title="t('share.start')"
        @click="emit('share', startPoint)"
      >
        <StationMapIcon name="share" />
      </button>
    </div>

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
        :disabled="busy"
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
      <button
        type="button"
        class="endpoint-bar-swap"
        :aria-label="t('endpoint.swap')"
        :title="t('endpoint.swap')"
        :disabled="busy || (!startPoint && !targetPoint)"
        @click="emit('swap')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4v15M4 8l4-4 4 4M16 20V5M12 16l4 4 4-4" />
        </svg>
      </button>
      <button
        type="button"
        class="endpoint-bar-share"
        data-endpoint-share="destination"
        :disabled="busy || !targetPoint"
        :aria-label="t('share.destination')"
        :title="t('share.destination')"
        @click="emit('share', targetPoint)"
      >
        <StationMapIcon name="share" />
      </button>
    </div>
  </section>
</template>

<script setup>
/* global defineProps, defineEmits */
import StationMapIcon from "./StationMapIcon.vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
import { placeName } from "../i18n/places.mjs";

defineProps({
  startPoint: { type: Object, default: null },
  targetPoint: { type: Object, default: null },
  scanAvailable: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(["open", "swap", "scan", "share"]);
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
  grid-template-columns: max-content minmax(0, 1fr) repeat(
      2,
      var(--display-control-height, 44px)
    );
  align-items: center;
  gap: 4px 8px;
  margin: 0 0 12px;
  padding: 12px;
  border-radius: var(--tp-radius-card, 12px);
  background: var(--surface);
  box-shadow: var(--tp-shadow-card);
}
.endpoint-bar-field {
  display: contents;
}
.endpoint-bar-label {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
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
  width: var(--display-control-height, 44px);
  height: var(--display-control-height, 44px);
  margin: 0;
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
.endpoint-bar-label {
  white-space: nowrap;
  overflow-wrap: normal;
  min-width: 0;
}
.endpoint-bar-dot {
  flex: none;
}
.endpoint-bar-value {
  min-width: 0;
}
.endpoint-bar-scan,
.endpoint-bar-share {
  display: grid;
  place-items: center;
  width: var(--display-control-height, 44px);
  height: var(--display-control-height, 44px);
  padding: 8px;
  border: 1px solid var(--tp-primary-500);
  border-radius: 10px;
  color: var(--tp-primary-700);
  background: var(--surface);
  cursor: pointer;
}
.endpoint-bar-scan svg,
.endpoint-bar-share svg {
  width: 24px;
  height: 24px;
}
.endpoint-bar button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
