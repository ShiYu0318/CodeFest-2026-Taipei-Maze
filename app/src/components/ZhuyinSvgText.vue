<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <text :y="annotate ? Number(y) + readingInset : y">
    <tspan :x="x">{{ text }}</tspan>
    <tspan
      v-if="annotate"
      :x="x"
      :dy="readingBelow ? '1.4em' : '-2.6em'"
      class="svg-zhuyin-reading"
      :textLength="readingWidth + 'em'"
      lengthAdjust="spacingAndGlyphs"
      aria-hidden="true"
      >{{ reading }}</tspan
    >
  </text>
</template>
<script setup>
/* global defineProps */
import { computed } from "vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { useI18n } from "../i18n/index.mjs";
import { annotateZhuyin } from "../display/zhuyin.mjs";

const props = defineProps({
  text: { type: String, default: "" },
  x: { type: [String, Number], default: 0 },
  y: { type: [String, Number], default: 0 },
  readingBelow: { type: Boolean, default: false },
  readingInset: { type: Number, default: 0 },
});
const { displayMode } = useDisplayPreferences();
const { locale } = useI18n();
const parts = computed(() => annotateZhuyin(props.text));
const annotate = computed(
  () =>
    displayMode.value === "child" &&
    locale.value === "zh-TW" &&
    parts.value.some((part) => part.reading)
);
const reading = computed(() =>
  parts.value.map((part) => part.reading || part.text).join(" ")
);
// Keep the phonetic row within the original label width, preserving map coordinates.
const readingWidth = computed(
  () =>
    Array.from(props.text).reduce(
      (sum, character) => sum + (/\p{Script=Han}/u.test(character) ? 1 : 0.6),
      0
    ) / 0.45
);
</script>
<style scoped>
.svg-zhuyin-reading {
  font-size: 0.45em;
  font-weight: 400;
  letter-spacing: normal;
  stroke: none;
}
</style>
