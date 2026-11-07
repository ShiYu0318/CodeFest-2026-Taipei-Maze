<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <dialog
    ref="panel"
    class="station-information"
    aria-modal="true"
    aria-labelledby="about-page-title"
    @cancel.prevent="emit('close')"
    @keydown.esc.stop.prevent="emit('close')"
    @keydown.tab="keepFocus"
  >
    <AboutView embedded :floor="floor" @close="emit('close')" />
  </dialog>
</template>
<script setup>
/* global defineProps, defineEmits */
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import AboutView from "../views/AboutView.vue";
defineProps({ floor: { type: String, default: "B2" } });
const emit = defineEmits(["close"]);
const panel = ref(null);
onMounted(async () => {
  if (typeof panel.value.showModal === "function") panel.value.showModal();
  else panel.value.setAttribute("open", "");
  await nextTick();
  panel.value?.querySelector(".about-back")?.focus({ preventScroll: true });
});
onBeforeUnmount(() => panel.value?.close?.());
function keepFocus(event) {
  const nodes = [
    ...panel.value.querySelectorAll(
      "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary"
    ),
  ].filter((node) => node.getClientRects().length > 0);
  const first = nodes[0],
    last = nodes.at(-1);
  if (!first) {
    event.preventDefault();
    return;
  }
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
.station-information {
  position: fixed;
  inset: 0;
  z-index: 3000;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--tp-page);
  color: var(--ink);
}
.station-information[open] {
  display: block;
}
.station-information::backdrop {
  background: var(--tp-page);
}
</style>
