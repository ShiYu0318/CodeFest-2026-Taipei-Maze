<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div class="display-controls" role="group" :aria-label="t('display.group')">
    <label
      class="display-language"
      data-tour-target="language"
      :title="t('lang.label')"
    >
      <span class="display-visually-hidden">{{ t("lang.label") }}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        />
        <path
          d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        />
      </svg>
      <span class="display-language-code" aria-hidden="true">{{
        shortCode
      }}</span>
      <select :value="locale" @change="setLocale($event.target.value)">
        <option
          v-for="item in LOCALES"
          :key="item.code"
          :value="item.code"
          :lang="item.htmlLang"
        >
          {{ item.nativeName }}
        </option>
      </select>
    </label>
    <label class="display-mode-label" data-tour-target="mode">
      <span class="display-visually-hidden">{{ t("display.mode") }}</span>
      <select
        :value="displayMode"
        @change="setDisplayMode($event.target.value)"
      >
        <option value="standard">{{ t("display.standard") }}</option>
        <option value="child">{{ t("display.child") }}</option>
        <option value="senior">{{ t("display.senior") }}</option>
      </select>
    </label>
    <button
      class="display-icon-button"
      data-tour-target="theme"
      type="button"
      role="switch"
      :aria-checked="theme === 'dark'"
      :title="theme === 'dark' ? t('display.toLight') : t('display.toDark')"
      @click="toggleTheme"
    >
      <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="4.2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
      <span class="display-visually-hidden"
        ><ZhuyinText :text="t('display.dark')"
      /></span>
    </button>
    <button
      class="display-icon-button display-contrast-switch"
      data-tour-target="contrast"
      type="button"
      role="switch"
      :aria-checked="contrast === 'high'"
      :title="t('display.contrast')"
      @click="toggleContrast"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" />
      </svg>
      <span class="display-visually-hidden">{{ t("display.contrast") }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { LOCALES, useI18n } from "../i18n/index.mjs";
import ZhuyinText from "./ZhuyinText.vue";
import "../display/display-preferences.css";

const {
  theme,
  displayMode,
  contrast,
  toggleTheme,
  toggleContrast,
  setDisplayMode,
} = useDisplayPreferences();
const { locale, setLocale, t } = useI18n();
const shortCode = computed(() =>
  locale.value === "zh-TW" ? "中" : locale.value.toUpperCase()
);
</script>
