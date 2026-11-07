<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <main
    class="meeting-page display-page"
    lang="zh-Hant"
    :data-theme="theme"
    :data-display-mode="displayMode"
  >
    <div class="meeting-toolbar">
      <router-link to="/station-map" class="meeting-back"
        ><svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m15 5-7 7 7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          /></svg
        ><ZhuyinText text="回車站地圖"
      /></router-link>
      <DisplayControls />
    </div>
    <h1><ZhuyinText text="朋友分享的集合點" /></h1>
    <p v-if="displayMode === 'child'" class="display-hint">
      <ZhuyinText text="這是朋友約好的地方，不是你現在的位置。" />
    </p>
    <p class="banner">
      <ZhuyinText
        text="合成場景示範，不是北車實際等候地點。分享者位置非即時資訊。"
      />
    </p>
    <section v-if="resolved.type === 'success'">
      <h2><ZhuyinText :text="graph.messages[resolved.point.name_key]" /></h2>
      <p>
        <strong>{{ resolved.node.floor_id.toUpperCase() }}</strong> ·
        <ZhuyinText :text="resolved.point.original_signage" />
      </p>
      <p>
        <ZhuyinText
          :text="graph.messages[resolved.point.waiting_guidance_key]"
        />
      </p>
      <p>
        <ZhuyinText text="分享者定位確認時間" />：{{ resolved.confirmedAt
        }}<ZhuyinText text="（來自分享端，未經伺服器驗證）" />
      </p>
      <p role="status"><ZhuyinText :text="timeText" /></p>
      <p>
        <ZhuyinText
          text="此舊版合成集合點尚未對應正式地圖的已核准等候區，不能據此提供北車實際路線，也不代表你目前的位置。"
        />
      </p>
      <router-link class="primary" to="/station-map"
        ><ZhuyinText text="前往正式地圖選擇實際設施"
      /></router-link>
    </section>
    <section v-else role="alert">
      <h2><ZhuyinText text="集合連結無法使用" /></h2>
      <p>
        <ZhuyinText
          text="格式、版本或點位可能不支援，請向分享者取得新連結。未載入任何位置或路線。"
        />
      </p>
    </section>
  </main>
</template>
<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import DisplayControls from "../components/DisplayControls.vue";
import ZhuyinText from "../components/ZhuyinText.vue";
import { useDisplayPreferences } from "../display/preferences.mjs";
import graph from "../navigation/demo-graph.json";
import points from "../meeting/meeting-points.json";
import { parseMeetingLink, timeNotice } from "../meeting/meeting.mjs";
const route = useRoute();
const { theme, displayMode } = useDisplayPreferences();
const fullLink = computed(
  () => new URL(route.fullPath, window.location.origin).href
);
const resolved = computed(() =>
  parseMeetingLink(fullLink.value, graph, points)
);
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
  min-height: 100dvh;
  box-sizing: border-box;
  padding: 0 16px calc(88px + env(safe-area-inset-bottom));
  text-align: left;
  color: var(--meeting-ink);
  background: var(--surface);
  line-height: 1.75;
  font-family: var(--tp-font);
  -webkit-font-smoothing: antialiased;
}
.meeting-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 -16px 8px;
  padding: max(8px, env(safe-area-inset-top)) 16px 8px;
  background: var(--tp-surface);
  box-shadow: 0 1px 0 var(--tp-gray-100);
}
.meeting-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  min-height: 44px;
  font-weight: 600;
  text-decoration: none;
}
.meeting-back svg {
  flex: none;
  width: 22px;
  height: 22px;
}
.meeting-page h1 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.4;
}
.banner {
  background: var(--warning-bg);
  border-radius: var(--tp-radius-card);
  padding: 12px 14px;
  color: var(--tp-secondary-800);
  font-size: 0.875rem;
}
a {
  color: var(--meeting-link);
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
  border-radius: var(--tp-radius-button);
  background: var(--tp-primary-600);
  color: #fff;
  font-weight: 600;
  margin: 16px 0;
  text-decoration: none;
}
</style>
