<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div class="trip-backdrop" @touchmove.prevent @wheel.prevent>
    <section
      ref="panel"
      class="trip-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-dialog-title"
      @keydown.esc.stop.prevent="handleEscape"
      @keydown.tab="keepFocus"
    >
      <header>
        <span v-if="!confirming" class="trip-step">{{
          t("trip.step", { step })
        }}</span>
        <button
          v-if="!confirming"
          type="button"
          class="trip-close"
          :aria-label="t('trip.cancel')"
          @click="askToCancel"
        >
          ×
        </button>
      </header>
      <h2 id="trip-dialog-title" ref="heading" tabindex="-1">
        {{
          confirming
            ? t("trip.confirmTitle")
            : step === 1
            ? t("trip.faceQr")
            : direction
        }}
      </h2>
      <p v-if="confirming">{{ t("trip.cancelNote") }}</p>
      <footer v-if="confirming">
        <button type="button" :disabled="cancelling" @click="keepTrip">
          {{ t("trip.keep") }}
        </button>
        <button
          type="button"
          :disabled="cancelling"
          @click="confirmCancellation"
        >
          {{ t("trip.confirmCancel") }}
        </button>
      </footer>
      <footer v-else>
        <button
          class="trip-continue"
          type="button"
          :disabled="!ready"
          @click="continueTrip"
        >
          {{ t("trip.continue") }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "../i18n/index.mjs";

const props = defineProps({
  direction: { type: String, required: true },
  cancelOnly: { type: Boolean, default: false },
});
const emit = defineEmits(["continue", "cancel"]);
const { t } = useI18n();
const panel = ref(null);
const heading = ref(null);
const step = ref(1);
const ready = ref(false);
const confirming = ref(props.cancelOnly);
const cancelling = ref(false);
let timer;

function startWait() {
  clearTimeout(timer);
  ready.value = false;
  timer = setTimeout(() => {
    ready.value = true;
  }, 2000);
}

function focusHeading() {
  nextTick(() => heading.value?.focus({ preventScroll: true }));
}

onMounted(() => {
  if (!confirming.value) startWait();
  focusHeading();
});
onBeforeUnmount(() => clearTimeout(timer));

function continueTrip() {
  if (!ready.value || confirming.value) return;
  if (step.value === 2) {
    emit("continue");
    return;
  }
  step.value = 2;
  startWait();
  focusHeading();
}

function askToCancel() {
  clearTimeout(timer);
  confirming.value = true;
  focusHeading();
}

function keepTrip() {
  if (props.cancelOnly) {
    emit("continue");
    return;
  }
  confirming.value = false;
  startWait();
  focusHeading();
}

function confirmCancellation() {
  if (cancelling.value) return;
  cancelling.value = true;
  emit("cancel");
}

function handleEscape() {
  if (cancelling.value) return;
  if (confirming.value) keepTrip();
  else askToCancel();
}

function keepFocus(event) {
  const buttons = panel.value.querySelectorAll("button:not(:disabled)");
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (
    document.activeElement !== (event.shiftKey ? first : last) &&
    document.activeElement !== heading.value
  )
    return;
  event.preventDefault();
  (event.shiftKey ? last : first)?.focus();
}
</script>

<style scoped>
.trip-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgb(12 19 21 / 48%);
}
.trip-dialog {
  box-sizing: border-box;
  width: min(100%, 420px);
  padding: 16px;
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
}
.trip-dialog header,
.trip-dialog footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.trip-dialog h2 {
  margin: 12px 0 16px;
  font-size: max(1.25rem, var(--display-main-size, 1.25rem));
  line-height: 1.45;
}
.trip-dialog p,
.trip-step {
  color: var(--muted);
  font-size: var(--display-secondary-size, 0.875rem);
}
.trip-dialog footer {
  margin-top: 12px;
}
.trip-dialog button {
  min-height: var(--display-control-height, 44px);
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
.trip-dialog button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.trip-dialog .trip-close {
  min-width: var(--display-control-height, 44px);
  font-size: 1.5rem;
}
.trip-dialog .trip-continue {
  width: 100%;
  border-color: var(--accent);
  background: var(--accent);
  color: var(--surface);
  font-weight: 700;
}
.trip-dialog button:disabled {
  border-color: var(--border);
  background: var(--tp-gray-100);
  color: var(--muted);
  cursor: default;
}
</style>
