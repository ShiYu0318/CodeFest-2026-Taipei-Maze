<template>
  <router-view />
  <FloatingChat />
</template>

<script setup>
import { onMounted, watch } from "vue";
import FloatingChat from "./components/FloatingChat.vue";
import { useDisplayPreferences } from "./display/preferences.mjs";
import { useRoute } from "vue-router";
import { htmlLang, useI18n } from "./i18n/index.mjs";
import { pageTitle } from "./router";
import "./display/display-preferences.css";

const { theme, contrast } = useDisplayPreferences();
const { locale } = useI18n();
const route = useRoute();
onMounted(() => {
  watch(
    theme,
    (value) => {
      document.documentElement.dataset.mazeTheme = value;
    },
    { immediate: true }
  );
  watch(
    contrast,
    (value) => {
      document.documentElement.dataset.mazeContrast = value;
    },
    { immediate: true }
  );
  watch(
    locale,
    (value) => {
      document.documentElement.lang = htmlLang(value);
      // The native TownPass app bar shows this title.
      document.title = pageTitle(route);
    },
    { immediate: true }
  );
});
</script>

<style>
body {
  margin: 0;
}
html[data-maze-theme="dark"] #app {
  color: #e6f2f5;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
