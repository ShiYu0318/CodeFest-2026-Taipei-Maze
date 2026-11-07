<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <dialog
    ref="panel"
    class="navigation-guide"
    aria-modal="true"
    aria-labelledby="navigation-guide-title"
    @cancel.prevent="emit('close')"
    @keydown.esc.stop.prevent="emit('close')"
    @keydown.tab="keepFocus"
  >
    <header class="guide-header">
      <h2 id="navigation-guide-title">
        <ZhuyinText :text="t('guide.title')" />
      </h2>
      <button class="guide-back" type="button" @click="emit('close')">
        <ZhuyinText :text="t('guide.map')" />
      </button>
    </header>
    <p v-if="demo" class="guide-demo-note">{{ t("demo.notice") }}</p>
    <div class="guide-body">
      <p v-if="active" role="status">{{ t("notice.waiting") }}</p>
      <StationRouteSteps
        v-else-if="steps.length"
        :steps="steps"
        :index="index"
        :points-by-id="pointsById"
        @update:index="emit('update:index', $event)"
      />
      <p v-else class="guide-status" role="status">
        <ZhuyinText :text="status" />
      </p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="!available">{{ t("scan.needApp") }}</p>
    </div>
    <details class="guide-help">
      <summary>{{ t("guide.help") }}</summary>
      <p>{{ t("walk.arrowNote") }}</p>
      <p>{{ t("scan.caveat") }}</p>
    </details>
    <footer class="guide-actions">
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
      <button
        type="button"
        :disabled="active || !available"
        @click="emit('scan')"
      >
        <ZhuyinText :text="t('scan.scan')" />
      </button>
      <button
        v-if="!hasDestination"
        type="button"
        :disabled="active"
        @click="emit('destination')"
      >
        <ZhuyinText :text="t('scan.chooseDestination')" />
      </button>
    </footer>
  </dialog>
</template>
<script setup>
/* global defineProps, defineEmits */
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import StationRouteSteps from "./StationRouteSteps.vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
defineProps({
  steps: { type: Array, required: true },
  index: { type: Number, required: true },
  pointsById: { type: Map, required: true },
  status: { type: String, default: "" },
  notice: { type: String, default: "" },
  available: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  hasDestination: { type: Boolean, default: true },
  demo: { type: Boolean, default: false },
  demoBusy: { type: Boolean, default: false },
});
const emit = defineEmits([
  "close",
  "scan",
  "destination",
  "update:index",
  "demo-advance",
  "demo-arrive",
]);
const { t } = useI18n();
const panel = ref(null);
let trigger;
onMounted(async () => {
  trigger = document.activeElement;
  if (typeof panel.value.showModal === "function") panel.value.showModal();
  else panel.value.setAttribute("open", "");
  await nextTick();
  panel.value?.querySelector(".guide-back")?.focus({ preventScroll: true });
});
onBeforeUnmount(() => {
  panel.value?.close?.();
  nextTick(() => {
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
});
function keepFocus(event) {
  const nodes = [
    ...panel.value.querySelectorAll("button:not(:disabled), summary"),
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
.navigation-guide {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: max(16px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  box-sizing: border-box;
  border: 0;
  background: var(--tp-page, #f5f8f9);
  color: var(--ink, #112629);
  overflow-y: auto;
  overscroll-behavior: contain;
  font: inherit;
  font-size: var(--display-main-size, 1rem);
}
.navigation-guide[open] {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.navigation-guide::backdrop {
  background: var(--tp-page, #f5f8f9);
}
.guide-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.guide-header h2 {
  margin: 0;
  font-size: var(--display-main-size, 1.25rem);
}
.guide-body {
  flex: 1 0 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}
.guide-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: 12px;
}
.navigation-guide button {
  min-width: 0;
  max-width: 100%;
  min-height: var(--display-control-height, 48px);
  padding: 12px 18px;
  border: 1px solid var(--tp-primary-500);
  border-radius: 12px;
  background: var(--surface, white);
  color: var(--ink);
  font: inherit;
  overflow-wrap: anywhere;
}
.navigation-guide button:disabled {
  opacity: 0.5;
}
.navigation-guide :focus-visible {
  outline: 3px solid var(--tp-primary-600);
  outline-offset: 2px;
}
.guide-body :deep(.route-step-card) {
  grid-template-columns: minmax(0, 1fr);
  text-align: center;
}
.guide-body :deep(.route-step-arrow) {
  width: min(56vw, 240px);
  height: min(56vw, 240px);
  justify-self: center;
}
.guide-body :deep(.route-step-main) {
  font-size: max(1.5rem, var(--display-main-size, 1.5rem));
}
.guide-body :deep(.route-step-text) {
  animation: guide-reveal 240ms ease-out;
}
@keyframes guide-reveal {
  from {
    opacity: 0.3;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .guide-body :deep(.route-step-text) {
    animation: none;
  }
}
.guide-demo-note {
  margin: 0;
  padding: 8px;
  border: 2px dashed var(--tp-primary-500);
  border-radius: 10px;
  font-weight: 700;
}
.guide-help summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
</style>
