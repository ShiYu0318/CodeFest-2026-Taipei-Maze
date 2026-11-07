<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <Teleport to="body">
    <div
      class="share-backdrop display-page"
      :data-theme="theme"
      :data-display-mode="displayMode"
      @click.self="emit('close')"
    >
      <section
        class="share-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        @keydown.esc.stop.prevent="emit('close')"
      >
        <header class="share-head">
          <h2 id="share-sheet-title">{{ t("share.title") }}</h2>
          <button
            ref="closeButton"
            type="button"
            class="share-close"
            :aria-label="t('share.close')"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>
        <p class="share-place">
          <strong>{{ point.floor }}</strong> · {{ name }}
        </p>
        <p class="share-intro">{{ t("share.intro") }}</p>
        <label class="share-link">
          <span>{{ t("share.linkLabel") }}</span>
          <input
            ref="linkInput"
            :value="link"
            readonly
            @focus="$event.target.select()"
          />
        </label>
        <div class="share-actions">
          <button
            v-if="canShare"
            type="button"
            class="share-primary"
            @click="systemShare"
          >
            {{ t("share.system") }}
          </button>
          <button
            type="button"
            :class="canShare ? 'share-secondary' : 'share-primary'"
            @click="copy"
          >
            {{ t("share.copy") }}
          </button>
        </div>
        <p v-if="notice" class="share-notice" role="status">{{ notice }}</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, nextTick, onMounted, ref } from "vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { useI18n } from "../i18n/index.mjs";
import { placeLabel } from "../i18n/places.mjs";
import { createPlaceLink } from "../station/place-share.mjs";
import stationData from "../views/station-points.json";

const props = defineProps({ point: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const i18n = useI18n();
const { t } = i18n;
const { theme, displayMode } = useDisplayPreferences();
const closeButton = ref(null),
  linkInput = ref(null),
  notice = ref("");
const link = computed(() => createPlaceLink(props.point.id, stationData));
const name = computed(() => placeLabel(props.point, i18n));
// The message keeps the on-site Chinese name so any friend can match signs.
const message = computed(() =>
  t("share.message", { name: props.point.name, floor: props.point.floor })
);
const canShare = typeof navigator !== "undefined" && !!navigator.share;

async function systemShare() {
  try {
    await navigator.share({
      title: t("share.title"),
      text: message.value,
      url: link.value,
    });
  } catch {
    /* The visitor closed the share sheet; nothing to report. */
  }
}
async function copy() {
  try {
    await navigator.clipboard.writeText(`${message.value} ${link.value}`);
    notice.value = t("share.copied");
  } catch {
    linkInput.value?.focus();
    notice.value = t("share.copyFailed");
  }
}
onMounted(async () => {
  await nextTick();
  closeButton.value?.focus();
});
</script>

<style scoped>
.share-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(11 13 14 / 45%);
}
.share-sheet {
  box-sizing: border-box;
  width: min(520px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 16px 16px max(20px, env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  background: var(--tp-surface);
  color: var(--ink);
  text-align: left;
  font-family: var(--tp-font);
  box-shadow: var(--tp-shadow-sheet);
  animation: share-rise 260ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.share-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.share-head h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}
.share-close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--tp-gray-200);
  border-radius: 10px;
  background: var(--surface);
  color: var(--tp-gray-700);
}
.share-close svg {
  width: 22px;
  height: 22px;
}
.share-place {
  margin: 12px 0 4px;
  font-size: var(--display-main-size, 1.0625rem);
  overflow-wrap: anywhere;
}
.share-intro,
.share-notice {
  margin: 4px 0 12px;
  color: var(--muted);
  font-size: var(--display-secondary-size, 0.875rem);
  line-height: 1.55;
}
.share-link {
  display: grid;
  gap: 4px;
  font-size: 0.8125rem;
  color: var(--muted);
}
.share-link input {
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--tp-gray-200);
  border-radius: 10px;
  background: var(--tp-gray-50);
  color: var(--ink);
  font: 16px / 1.4 ui-monospace, Menlo, monospace;
}
.share-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.share-actions button {
  flex: 1 1 140px;
  min-height: var(--display-control-height, 44px);
  padding: 8px 16px;
  border-radius: 10px;
  font: inherit;
  font-weight: 600;
}
.share-primary {
  border: 1px solid var(--tp-primary-600);
  background: var(--tp-primary-600);
  color: #fff;
}
[data-theme="dark"] .share-primary {
  color: var(--tp-primary-950);
}
.share-secondary {
  border: 1px solid var(--tp-primary-500);
  background: var(--surface);
  color: var(--tp-primary-700);
}
:focus-visible {
  outline: 3px solid var(--tp-primary-500);
  outline-offset: 2px;
}
@keyframes share-rise {
  from {
    transform: translateY(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .share-sheet {
    animation: none;
  }
}
</style>
