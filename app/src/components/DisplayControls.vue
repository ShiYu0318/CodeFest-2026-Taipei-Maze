<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div class="display-controls" role="group" aria-label="顯示設定">
    <button
      class="display-theme-switch"
      type="button"
      role="switch"
      :aria-checked="theme === 'dark'"
      @click="toggleTheme"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
      <ZhuyinText text="深色模式" />
      <span class="display-switch-track" aria-hidden="true"></span>
    </button>
    <label class="display-mode-label">
      <span><ZhuyinText text="介面模式" /></span>
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
