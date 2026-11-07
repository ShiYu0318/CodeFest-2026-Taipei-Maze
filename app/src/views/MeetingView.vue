<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <main
    class="meeting-page display-page"
    :lang="htmlLang(locale)"
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
        ><ZhuyinText :text="t('meeting.back')"
      /></router-link>
      <DisplayControls />
    </div>
    <h1><ZhuyinText :text="t('meeting.title')" /></h1>
    <p v-if="displayMode === 'child'" class="display-hint">
      <ZhuyinText :text="t('meeting.childHint')" />
    </p>
    <p class="banner">
      <ZhuyinText :text="t('meeting.banner')" />
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
        <ZhuyinText
          :text="t('meeting.confirmedAt', { time: resolved.confirmedAt })"
        /><ZhuyinText :text="t('meeting.unverifiedSource')" />
      </p>
      <p role="status"><ZhuyinText :text="timeText" /></p>
      <p>
        <ZhuyinText :text="t('meeting.legacy')" />
      </p>
      <router-link class="primary" to="/station-map"
        ><ZhuyinText :text="t('meeting.toMap')"
      /></router-link>
    </section>
    <section v-else role="alert">
      <h2><ZhuyinText :text="t('meeting.invalidTitle')" /></h2>
      <p>
        <ZhuyinText :text="t('meeting.invalidBody')" />
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
import { htmlLang, useI18n } from "../i18n/index.mjs";
const route = useRoute();
const { theme, displayMode } = useDisplayPreferences();
const { locale, t } = useI18n();
const fullLink = computed(
  () => new URL(route.fullPath, window.location.origin).href
);
const resolved = computed(() =>
  parseMeetingLink(fullLink.value, graph, points)
);
const timeText = computed(() => {
  const notice = timeNotice(resolved.value.confirmedAt);
  return ["stale", "future", "unverified"].includes(notice)
    ? t(`meeting.time.${notice}`)
    : t("meeting.time.unknown");
});
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
