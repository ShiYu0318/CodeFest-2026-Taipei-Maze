<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <main
    class="meeting-page display-page"
    lang="zh-Hant"
    :data-theme="theme"
    :data-display-mode="displayMode"
  >
    <DisplayControls />
    <router-link to="/station-map">← 回車站地圖</router-link>
    <h1>朋友分享的集合點</h1>
    <p v-if="displayMode === 'child'" class="display-hint">
      這是朋友約好的地方，不是你現在的位置。
    </p>
    <p class="banner">
      合成場景示範，不是北車實際等候地點。分享者位置非即時資訊。
    </p>
    <section v-if="resolved.type === 'success'">
      <h2>{{ graph.messages[resolved.point.name_key] }}</h2>
      <p>
        <strong>{{ resolved.node.floor_id.toUpperCase() }}</strong> ·
        {{ resolved.point.original_signage }}
      </p>
      <p>{{ graph.messages[resolved.point.waiting_guidance_key] }}</p>
      <p>
        分享者定位確認時間：{{
          resolved.confirmedAt
        }}（來自分享端，未經伺服器驗證）
      </p>
      <p role="status">{{ timeText }}</p>
      <NavigationDemoMap
        :graph="graph"
        :floor-id="resolved.node.floor_id"
        :destination-node-id="resolved.node.id"
      />
      <p>
        這是目的地，不是你的位置。請先與朋友確認仍在等候；開始時需掃你自己附近的定位碼。
      </p>
      <router-link class="primary" :to="navigationTarget"
        >帶我到這個集合點（合成導航）</router-link
      >
      <p>
        一般瀏覽器可查看此卡，沒有城市通橋接時只能使用明確標示的合成測試定位。未驗證自動開啟城市通，不會自行跳轉外部
        App。
      </p>
    </section>
    <section v-else role="alert">
      <h2>集合連結無法使用</h2>
      <p>
        格式、版本或點位可能不支援，請向分享者取得新連結。未載入任何位置或路線。
      </p>
    </section>
  </main>
</template>
<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import DisplayControls from "../components/DisplayControls.vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import graph from "../navigation/demo-graph.json";
import points from "../meeting/meeting-points.json";
import { parseMeetingLink, timeNotice } from "../meeting/meeting.mjs";
import NavigationDemoMap from "../components/NavigationDemoMap.vue";
const route = useRoute();
const { theme, displayMode } = useDisplayPreferences();
const fullLink = computed(
  () => new URL(route.fullPath, window.location.origin).href
);
const resolved = computed(() =>
  parseMeetingLink(fullLink.value, graph, points)
);
const navigationTarget = computed(() => ({
  path: "/navigation-demo",
  query: { meeting: fullLink.value },
}));
const timeText = computed(
  () =>
    ({
      stale: "確認時間已超過 30 分鐘，請先聯絡分享者確認是否仍在場。",
      future: "此時間在未來，可能是裝置時鐘或連結遭修改；請先確認。",
      unverified: "即使時間較新，也不能證明分享者此刻仍在這裡。",
    }[timeNotice(resolved.value.confirmedAt)] ?? "時間無法驗證，請重新確認。")
);
</script>
<style scoped>
.meeting-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 18px 48px;
  text-align: left;
  color: var(--meeting-ink);
  background: var(--surface);
  line-height: 1.75;
  font-family: system-ui, sans-serif;
}
.banner {
  background: var(--warning-bg);
  border-left: 4px solid var(--warning-border);
  padding: 14px;
}
a {
  color: var(--meeting-link);
}
.display-controls {
  margin-bottom: 16px;
}
.meeting-page:not([data-display-mode="standard"]) {
  font-size: var(--display-main-size);
  overflow-wrap: anywhere;
}
.meeting-page:not([data-display-mode="standard"]) a {
  display: inline-flex;
  align-items: center;
  min-height: var(--display-control-height);
}
.meeting-page:not([data-display-mode="standard"]) h1 {
  font-size: 1.75em;
  line-height: 1.35;
}
.meeting-page:not([data-display-mode="standard"]) h2 {
  font-size: 1.3em;
  line-height: 1.45;
}
.meeting-page a:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.primary {
  display: inline-block;
  padding: 12px 18px;
  border-radius: 6px;
  background: #326875;
  color: white;
  margin: 16px 0;
  text-decoration: none;
}
</style>
