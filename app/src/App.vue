<template>
  <nav
    v-if="!['station-map', 'meeting', 'about'].includes($route.name)"
    class="app-nav"
  >
    <router-link to="/">Home</router-link>
    <router-link to="/test">Test</router-link>
    <router-link to="/station-map">台北車站 B1–B4 地圖</router-link>
  </nav>
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

const { theme } = useDisplayPreferences();
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

<style lang="scss">
body {
  margin: 0;
}
html[data-maze-theme="dark"] #app {
  color: #e6f2f5;
}
html[data-maze-theme="dark"] .app-nav a {
  color: #add5df;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.app-nav {
  padding: 30px;

  a + a {
    margin-left: 16px;
  }

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
