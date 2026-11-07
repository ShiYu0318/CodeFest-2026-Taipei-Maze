<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <Teleport to="body">
    <div
      class="staff-backdrop display-page"
      :data-theme="theme"
      :data-display-mode="displayMode"
      @click.self="emit('close')"
    >
      <section
        class="staff-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-card-title"
        @keydown.esc.stop.prevent="emit('close')"
        @keydown.tab.prevent="closeButton?.focus()"
      >
        <header class="staff-head">
          <h2 id="staff-card-title" lang="zh-Hant-TW">
            <ZhuyinText :text="zh['staff.title']" />
          </h2>
          <button
            ref="closeButton"
            type="button"
            class="staff-close"
            :aria-label="t('staff.close')"
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
        <div class="staff-place" lang="zh-Hant-TW">
          <span class="staff-icon" aria-hidden="true"
            ><StationMapIcon :name="card.icon"
          /></span>
          <span class="staff-floor"><ZhuyinText :text="card.floor" /></span>
        </div>
        <div class="staff-chinese" lang="zh-Hant-TW">
          <p v-for="line in card.chinese" :key="line">
            <ZhuyinText :text="line" />
          </p>
        </div>
        <div
          v-if="card.visitor.length"
          class="staff-visitor"
          :lang="htmlLang(card.visitorLang)"
        >
          <p class="staff-instruction">
            <ZhuyinText :text="t('staff.showThis')" />
          </p>
          <p v-for="line in card.visitor" :key="line">
            <ZhuyinText :text="line" />
          </p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import ZhuyinText from "./ZhuyinText.vue";
/* global defineProps, defineEmits */
import { computed, nextTick, onMounted, ref } from "vue";
import StationMapIcon from "./StationMapIcon.vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { catalogs, htmlLang, useI18n } from "../i18n/index.mjs";
import { staffCard } from "../staff/staff-card.mjs";

const props = defineProps({
  point: { type: Object, required: true },
  stepFree: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);
const i18n = useI18n();
const { t } = i18n;
const zh = catalogs["zh-TW"];
const { theme, displayMode } = useDisplayPreferences();
const closeButton = ref(null);
const card = computed(() =>
  staffCard(props.point, { stepFree: props.stepFree }, i18n)
);
onMounted(async () => {
  await nextTick();
  closeButton.value?.focus();
});
</script>

<style scoped>
.staff-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top)) 16px
    max(16px, env(safe-area-inset-bottom));
  background: rgb(11 13 14 / 55%);
  animation: staff-fade 180ms ease both;
}
.staff-card {
  box-sizing: border-box;
  width: min(520px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  color: #0b0d0e;
  text-align: left;
  font-family: var(--tp-font);
  box-shadow: 0 12px 40px rgb(0 0 0 / 30%);
  animation: staff-rise 260ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
/* The card is for someone else to read, so it stays black on white even in
   dark mode, like a printed sign. */
.staff-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.staff-head h2 {
  margin: 0;
  color: #356c77;
  font-size: 1rem;
  font-weight: 600;
}
.staff-close {
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  border: 1px solid #cad1d5;
  border-radius: 12px;
  background: #ffffff;
  color: #30383d;
  cursor: pointer;
}
.staff-close svg {
  width: 24px;
  height: 24px;
}
.staff-place {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 8px;
}
.staff-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #edf8fa;
  color: #22474e;
}
.staff-icon :deep(svg) {
  width: 40px;
  height: 40px;
}
.staff-floor {
  font-size: 1.5rem;
  font-weight: 700;
}
.staff-chinese p {
  margin: 12px 0 0;
  font-size: clamp(1.75rem, 7.5vw, 2.25rem);
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.staff-chinese p + p {
  font-size: clamp(1.25rem, 5.5vw, 1.5rem);
  font-weight: 600;
}
.staff-visitor {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 2px dashed #cad1d5;
  color: #30383d;
  font-size: 1rem;
  line-height: 1.55;
}
.staff-visitor p {
  margin: 6px 0 0;
}
.staff-instruction {
  color: #356c77;
  font-weight: 600;
}
.staff-close:focus-visible {
  outline: 3px solid #5ab4c5;
  outline-offset: 2px;
}
@keyframes staff-fade {
  from {
    opacity: 0;
  }
}
@keyframes staff-rise {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
}
@media (prefers-reduced-motion: reduce) {
  .staff-backdrop,
  .staff-card {
    animation: none;
  }
}
</style>
