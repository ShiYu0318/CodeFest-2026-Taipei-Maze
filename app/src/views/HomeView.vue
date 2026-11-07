<template>
  <main class="home">
    <h1>Taipei Maze 北車不迷路</h1>
    <router-link to="/station-map">開啟台北車站 B1–B4 地圖</router-link>
    <p><router-link to="/navigation-demo">開啟合成導航流程測試</router-link></p>
  </main>
</template>

<script>
export default {
  name: "HomeView",
};
</script>
