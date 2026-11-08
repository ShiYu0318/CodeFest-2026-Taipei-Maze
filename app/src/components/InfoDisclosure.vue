<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div class="info-disclosure">
    <button
      type="button"
      class="info-trigger"
      aria-haspopup="dialog"
      :aria-expanded="opened"
      :aria-label="label"
      :title="label"
      @click="open"
    >
      <StationMapIcon name="info" />
    </button>
    <dialog
      ref="panel"
      class="info-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      @cancel.prevent="close"
      @keydown.esc.stop.prevent="close"
      @keydown.tab="keepFocus"
      @click.self="close"
    >
      <header class="info-dialog-header">
        <h2>{{ label }}</h2>
        <button
          type="button"
          class="info-close"
          data-info-close
          :aria-label="t('share.close')"
          @click="close"
        >
          <StationMapIcon name="close" />
        </button>
      </header>
      <div
        class="info-disclosure-panel"
        tabindex="0"
        role="region"
        :aria-label="label"
      >
        <slot />
      </div>
    </dialog>
  </div>
</template>
<script setup>
/* global defineProps */
import { ref, nextTick, onBeforeUnmount } from "vue";
import StationMapIcon from "./StationMapIcon.vue";
import { useI18n } from "../i18n/index.mjs";
defineProps({ label: { type: String, required: true } });
const { t } = useI18n();
const opened = ref(false),
  panel = ref(null);
let trigger;
async function open(event) {
  if (opened.value) return;
  trigger = event.currentTarget;
  opened.value = true;
  await nextTick();
  if (!panel.value || !opened.value) return;
  if (typeof panel.value.showModal === "function") panel.value.showModal();
  else panel.value.setAttribute("open", "");
  panel.value
    .querySelector("[data-info-close]")
    ?.focus({ preventScroll: true });
}
function close() {
  opened.value = false;
  if (typeof panel.value?.close === "function") panel.value.close();
  else panel.value?.removeAttribute("open");
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
}
onBeforeUnmount(() => {
  panel.value?.close?.();
});
function keepFocus(event) {
  const nodes = [
    ...panel.value.querySelectorAll(
      "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary, [tabindex]:not([tabindex='-1'])"
    ),
  ].filter((node) => node.getClientRects().length > 0);
  const first = nodes[0],
    last = nodes.at(-1);
  if (!first) return event.preventDefault();
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>
<style scoped>
.info-disclosure {
  display: inline-flex;
  flex: none;
  min-width: 0;
  max-width: 100%;
  color: var(--ink);
}
.info-trigger,
.info-close {
  display: grid;
  place-items: center;
  width: var(--display-control-height, 44px);
  min-height: var(--display-control-height, 44px);
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--tp-primary-700);
  background: var(--surface);
  cursor: pointer;
}
.info-trigger svg,
.info-close svg {
  width: 24px;
  height: 24px;
}
.info-disclosure :focus-visible {
  outline: 3px solid var(--tp-primary-600);
  outline-offset: 2px;
}
.info-dialog {
  position: fixed;
  inset: 0;
  z-index: 5000;
  width: min(34rem, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
  max-height: min(75vh, calc(100vh - 32px));
  max-height: min(75dvh, calc(100dvh - 32px));
  box-sizing: border-box;
  padding: 0;
  margin: auto;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface, #fff);
  color: var(--ink);
  font: inherit;
}
.info-dialog[open] {
  display: flex;
  flex-direction: column;
}
.info-dialog::backdrop {
  background: rgb(0 0 0 / 45%);
}
.info-dialog-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.info-dialog-header h2 {
  min-width: 0;
  margin: 0;
  font-size: var(--display-main-size, 1.125rem);
  overflow-wrap: anywhere;
}
.info-close {
  flex: none;
}
.info-disclosure-panel {
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 16px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-size: var(--display-secondary-size, 1rem);
  line-height: 1.75;
  overflow-wrap: anywhere;
}
.info-disclosure-panel :deep(p) {
  margin: 0 0 12px;
}
.info-disclosure-panel :deep(p:last-child) {
  margin-bottom: 0;
}
.info-disclosure-panel :deep(img),
.info-disclosure-panel :deep(svg) {
  max-width: 100%;
}
.info-disclosure-panel :deep(pre) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.info-disclosure-panel:focus-visible {
  outline-offset: -3px;
}
</style>
