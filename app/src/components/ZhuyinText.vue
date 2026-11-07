<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <span v-if="annotate" class="zhuyin-text">
    <span class="zhuyin-readable">{{ text }}</span>
    <span aria-hidden="true">
      <template v-for="(part, index) in parts" :key="index">
        <ruby v-if="part.reading" class="zhuyin-unit">
          <span>{{ part.text }}</span>
          <rt class="zhuyin-reading">
            <span class="zhuyin-symbols">
              <span v-if="part.neutral" class="zhuyin-neutral">˙</span>
              <span v-for="(symbol, i) in part.symbols" :key="i">{{
                symbol
              }}</span>
            </span>
            <span v-if="part.tone" class="zhuyin-tone">{{ part.tone }}</span>
          </rt>
        </ruby>
        <template v-else>{{ part.text }}</template>
      </template>
    </span>
  </span>
  <template v-else>{{ text }}</template>
</template>

<script setup>
/* global defineProps */
import { computed } from "vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { annotateZhuyin, splitZhuyin } from "../display/zhuyin.mjs";
import { useI18n } from "../i18n/index.mjs";

const props = defineProps({ text: { type: String, default: "" } });
const { displayMode } = useDisplayPreferences();
const { locale } = useI18n();
// Zhuyin only helps children reading Traditional Chinese.
const annotate = computed(
  () => displayMode.value === "child" && locale.value === "zh-TW"
);
const parts = computed(() =>
  annotate.value
    ? annotateZhuyin(props.text).map((part) => ({
        ...part,
        ...(part.reading ? splitZhuyin(part.reading) : {}),
      }))
    : []
);
</script>

<style scoped>
.zhuyin-text {
  position: relative;
  line-height: 1.9;
}
/* Plain Han text is read once; visual ruby must not repeat every syllable. */
.zhuyin-readable {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.zhuyin-unit {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-inline-end: 0.06em;
  white-space: nowrap;
  line-height: 1.2;
  text-indent: 0;
}
/* Explicit side layout avoids relying on inter-character ruby support. */
.zhuyin-reading {
  display: inline-flex;
  align-items: center;
  margin-inline-start: 0.08em;
  font-size: max(10px, 0.5em);
  font-weight: 400;
  letter-spacing: normal;
  line-height: 1;
  color: inherit;
}
.zhuyin-symbols {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}
.zhuyin-symbols > span {
  display: block;
}
.zhuyin-neutral {
  position: absolute;
  top: -0.65em;
}
.zhuyin-tone {
  align-self: center;
}
</style>
