<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <dialog
    ref="panel"
    class="rescan-dialog"
    aria-modal="true"
    aria-labelledby="rescan-dialog-title"
    @cancel.prevent="close"
    @keydown.esc.stop.prevent="close"
    @keydown.tab="keepFocus"
  >
    <h2 id="rescan-dialog-title"><ZhuyinText :text="t('scan.rescan')" /></h2>
    <p><ZhuyinText :text="t('scan.relocateHint')" /></p>
    <p v-if="!view.available">{{ t("scan.needApp") }}</p>
    <p v-if="view.noticeKey" role="status">
      <ZhuyinText :text="t(view.noticeKey)" />
    </p>
    <div class="rescan-dialog-actions">
      <button type="button" :disabled="view.active" @click="close">
        <ZhuyinText :text="t('map.cancel')" />
      </button>
      <button
        type="button"
        data-rescan-confirm
        :disabled="!view.available || view.active"
        :aria-busy="view.active"
        @click="scan"
      >
        <ZhuyinText :text="view.active ? t('scan.waiting') : t('scan.scan')" />
      </button>
    </div>
  </dialog>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
const props = defineProps({ location: { type: Object, required: true } });
const emit = defineEmits(["close", "scanned"]);
const { t } = useI18n();
const panel = ref(null),
  view = computed(() => props.location.view.value);
let trigger,
  disposed = false;
onMounted(async () => {
  trigger = document.activeElement;
  if (typeof panel.value.showModal === "function") panel.value.showModal();
  else panel.value.setAttribute("open", "");
  await nextTick();
  panel.value?.querySelector("button")?.focus({ preventScroll: true });
});
onBeforeUnmount(() => {
  disposed = true;
  panel.value?.close?.();
  nextTick(() => {
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
});
function close() {
  if (!view.value.active) emit("close");
}
async function scan() {
  if (view.value.active || !view.value.available) return;
  const result = await props.location.scan();
  if (disposed) return;
  if (result.type === "success") {
    emit("close");
    emit("scanned", { rescan: true });
  }
}
function keepFocus(event) {
  const nodes = [...panel.value.querySelectorAll("button:not(:disabled)")];
  if (!nodes.length) return event.preventDefault();
  if (event.shiftKey && document.activeElement === nodes[0]) {
    event.preventDefault();
    nodes.at(-1).focus();
  } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
    event.preventDefault();
    nodes[0].focus();
  }
}
</script>
<style scoped>
.rescan-dialog {
  width: min(480px, calc(100% - 32px));
  max-height: calc(100% - 32px);
  box-sizing: border-box;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface, white);
  color: var(--ink);
  overflow-y: auto;
  font: inherit;
  font-size: var(--display-main-size, 1rem);
  overflow-wrap: anywhere;
}
.rescan-dialog::backdrop {
  background: rgb(0 0 0 / 45%);
}
.rescan-dialog h2 {
  margin: 0;
  font-size: var(--display-main-size, 1.25rem);
}
.rescan-dialog-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: 12px;
}
.rescan-dialog button {
  min-width: 0;
  min-height: var(--display-control-height, 48px);
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  overflow-wrap: anywhere;
}
.rescan-dialog button[data-rescan-confirm] {
  background: var(--tp-primary-600);
  color: #fff;
}
.rescan-dialog button:disabled {
  opacity: 0.5;
}
.rescan-dialog :focus-visible {
  outline: 3px solid var(--tp-primary-600);
  outline-offset: 2px;
}
</style>
