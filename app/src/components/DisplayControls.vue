<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div class="display-controls" role="group" aria-label="顯示設定">
    <button
      class="display-theme-switch"
      type="button"
      role="switch"
      :aria-checked="theme === 'dark'"
      :title="theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'"
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
        ><ZhuyinText text="深色模式"
      /></span>
    </button>
    <label class="display-mode-label">
      <span class="display-visually-hidden">介面模式</span>
      <select
        :value="displayMode"
        @change="setDisplayMode($event.target.value)"
      >
        <option value="standard">標準</option>
        <option value="child">兒童</option>
        <option value="senior">長者</option>
      </select>
    </label>
  </div>
</template>

<script setup>
import { useDisplayPreferences } from "../display/preferences.mjs";
import ZhuyinText from "./ZhuyinText.vue";
import "../display/display-preferences.css";

const { theme, displayMode, toggleTheme, setDisplayMode } =
  useDisplayPreferences();
</script>
