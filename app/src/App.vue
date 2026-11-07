<template>
  <nav
    v-if="
      ![
        'station-map',
        'station-orientation',
        'meeting',
      ].includes($route.name)
    "
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
import { onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import FloatingChat from "./components/FloatingChat.vue";
import { useDisplayPreferences } from "./display/preferences.mjs";
import "./display/display-preferences.css";
import {
  startStationCompass,
  stopStationCompass,
} from "./navigation/station-compass";

const { theme } = useDisplayPreferences();
onMounted(() => {
  watch(
    theme,
    (value) => {
      document.documentElement.dataset.mazeTheme = value;
    },
    { immediate: true }
  );
});
const route = useRoute();
watch(
  () => route.name,
  (name) => {
    if (name === "station-orientation")
      startStationCompass(window.flutterObject);
    else if (name !== "station-map") stopStationCompass();
  },
  { immediate: true }
);
onBeforeUnmount(stopStationCompass);
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
