<template>
  <nav
    v-if="!['station-map', 'navigation-demo', 'meeting'].includes($route.name)"
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
import FloatingChat from "./components/FloatingChat.vue";
</script>

<style lang="scss">
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
