<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="route-steps" :aria-labelledby="'route-steps-title'">
    <header class="route-steps-head">
      <h3 id="route-steps-title"><ZhuyinText :text="t('route.title')" /></h3>
      <span class="route-steps-count" aria-live="polite">{{
        t("route.step", { current: index + 1, total: steps.length })
      }}</span>
    </header>
    <div v-if="step" class="route-step-card" :data-kind="step.kind">
      <svg
        class="route-step-arrow"
        viewBox="0 0 120 120"
        aria-hidden="true"
        :style="
          step.kind === 'walk'
            ? { transform: `rotate(${step.angle}deg)` }
            : null
        "
      >
        <path v-if="step.kind === 'arrive'" d="M30 62l20 20 40-44" />
        <path
          v-else-if="step.kind === 'floor' && step.direction === 'down'"
          d="M60 18v70M30 62l30 30 30-30"
        />
        <path v-else d="M60 102V32M30 58l30-30 30 30" />
      </svg>
      <div :key="index" class="route-step-text">
        <p class="route-step-main"><ZhuyinText :text="describe(step)" /></p>
        <details v-if="step.viaIds?.length" class="route-step-via">
          <summary>{{ t("route.viaLabel") }}</summary>
          <p>
            <ZhuyinText
              :text="
                t('route.via', {
                  list: step.viaIds.map(name).join(t('search.listSeparator')),
                })
              "
            />
          </p>
        </details>
        <p v-if="step.kind === 'walk'" class="route-step-note">
          <span aria-hidden="true">↑ N · </span>{{ t("walk.mapBearing") }}
        </p>
      </div>
    </div>
    <div class="route-step-nav">
      <button type="button" :disabled="index === 0" @click="go(index - 1)">
        <ZhuyinText :text="t('route.prev')" />
      </button>
      <button
        type="button"
        class="route-step-next"
        :disabled="index >= steps.length - 1"
        @click="go(index + 1)"
      >
        <ZhuyinText :text="t('route.next')" />
      </button>
    </div>
    <details class="route-step-all">
      <summary><ZhuyinText :text="t('route.all')" /></summary>
      <ol>
        <li v-for="item in steps" :key="item.index">
          <button
            type="button"
            :aria-current="item.index === index ? 'step' : undefined"
            @click="go(item.index)"
          >
            <span class="route-step-number">{{ item.index + 1 }}</span>
            <ZhuyinText :text="describe(item)" />
          </button>
        </li>
      </ol>
    </details>
  </section>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed } from "vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
import { placeName } from "../i18n/places.mjs";
import { describeStep } from "../station/step-text.mjs";

const props = defineProps({
  steps: { type: Array, required: true },
  index: { type: Number, required: true },
  pointsById: { type: Map, required: true },
});
const emit = defineEmits(["update:index"]);
const i18n = useI18n();
const { t } = i18n;
const step = computed(() => props.steps[props.index] ?? props.steps[0]);
const name = (id) => {
  const point = props.pointsById.get(id);
  return point ? placeName(point, i18n) : id;
};
const describe = (item) => describeStep(item, t, name);
function go(next) {
  if (next >= 0 && next < props.steps.length) emit("update:index", next);
}
</script>

<style scoped>
.route-steps {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: var(--tp-radius-card, 12px);
  background: var(--surface);
  box-shadow: var(--tp-shadow-card);
}
.route-steps-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.route-steps-head h3 {
  margin: 0;
  font-size: var(--display-main-size, 1rem);
  font-weight: 600;
}
.route-steps-count {
  color: var(--muted);
  font-size: 0.875rem;
  white-space: nowrap;
}
.route-step-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}
.route-step-arrow {
  width: 72px;
  height: 72px;
  fill: none;
  stroke: var(--tp-primary-600);
  stroke-width: 12;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 400ms cubic-bezier(0.23, 1, 0.32, 1);
}
.route-step-card[data-kind="arrive"] .route-step-arrow {
  stroke: #2e9a6c;
}
.route-step-text p {
  margin: 0;
  overflow-wrap: anywhere;
}
.route-step-main {
  font-size: var(--display-main-size, 1rem);
  font-weight: 600;
  line-height: 1.5;
}
.route-step-via,
.route-step-note {
  margin-top: 4px !important;
  color: var(--muted);
  font-size: var(--display-secondary-size, 0.8125rem);
  line-height: 1.5;
}
.route-step-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.route-step-nav button {
  min-width: 0;
  overflow-wrap: anywhere;
  min-height: var(--display-control-height, 44px);
  border: 1px solid var(--tp-primary-500);
  border-radius: var(--tp-radius-button, 10px);
  background: var(--surface);
  color: var(--tp-primary-700);
  font: inherit;
  font-weight: 600;
}
.route-step-nav .route-step-next {
  border-color: var(--tp-primary-600);
  background: var(--tp-primary-600);
  color: #fff;
}
[data-theme="dark"] .route-step-nav .route-step-next {
  color: var(--tp-primary-950);
}
.route-step-nav button:disabled {
  border-color: var(--tp-gray-100);
  background: var(--tp-gray-100);
  color: var(--tp-gray-500);
}
.route-step-all summary {
  min-height: 36px;
  display: flex;
  align-items: center;
  color: var(--tp-primary-700);
  font-weight: 600;
  cursor: pointer;
}
.route-step-all ol {
  display: grid;
  gap: 4px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}
.route-step-all li button {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
}
.route-step-all li button[aria-current="step"] {
  background: var(--tp-primary-50);
  font-weight: 600;
}
.route-step-number {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--tp-primary-600);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
}
:focus-visible {
  outline: 3px solid var(--tp-primary-500);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .route-step-arrow {
    transition: none;
  }
}
@media (max-width: 420px) {
  .route-step-card {
    grid-template-columns: minmax(0, 1fr);
  }
  .route-step-arrow {
    justify-self: center;
  }
}
</style>
