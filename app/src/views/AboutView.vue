<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <main
    class="about-page display-page"
    :lang="htmlLang(locale)"
    :data-theme="theme"
    :data-display-mode="displayMode"
  >
    <div class="about-toolbar">
      <button
        v-if="embedded"
        class="about-back"
        type="button"
        :aria-label="t('meeting.back')"
        :title="t('meeting.back')"
        @click="emit('close')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m15 5-7 7 7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <router-link
        v-else
        to="/station-map"
        class="about-back"
        :aria-label="t('meeting.back')"
        :title="displayPlainZhuyin(t('meeting.back'), displayMode, locale)"
        ><svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m15 5-7 7 7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          /></svg
      ></router-link>
      <DisplayControls />
    </div>

    <h1 id="about-page-title">
      <ZhuyinText :text="t(embedded ? 'map.information' : 'title.about')" />
    </h1>

    <section class="about-card" aria-labelledby="about-direction-help">
      <h2 id="about-direction-help"><ZhuyinText :text="t('guide.help')" /></h2>
      <p><ZhuyinText :text="t('walk.arrowNote')" /></p>
      <p><ZhuyinText :text="t('scan.caveat')" /></p>
      <p v-if="displayMode === 'child'">
        <ZhuyinText :text="t('map.childHint')" />
      </p>
    </section>

    <section class="about-card" aria-labelledby="about-map-notes">
      <h2 id="about-map-notes"><ZhuyinText :text="t('about.mapNotes')" /></h2>
      <p>
        <ZhuyinText
          :text="t(floor === '1F' ? 'map.firstFloorNote' : 'map.footerNote')"
        />
      </p>
      <ul v-if="mapSources.length" class="about-links">
        <li v-for="source in mapSources" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
            source.label
          }}</a>
        </li>
      </ul>
    </section>

    <section class="about-card" aria-labelledby="about-version">
      <h2 id="about-version"><ZhuyinText :text="t('about.version')" /></h2>
      <dl>
        <dt><ZhuyinText :text="t('about.versionLabel')" /></dt>
        <dd>
          <code>{{ build.short }}</code>
          <span v-if="build.date" class="about-date"
            ><ZhuyinText :text="t('about.builtOn', { date: build.date })"
          /></span>
        </dd>
        <template v-if="build.known">
          <dt><ZhuyinText :text="t('about.fullCommit')" /></dt>
          <dd>
            <code class="about-hash">{{ build.commit }}</code>
          </dd>
        </template>
      </dl>
      <p v-if="!build.known" class="about-note">
        <ZhuyinText :text="t('about.unknownBuild')" />
      </p>
    </section>

    <section class="about-card" aria-labelledby="about-source">
      <h2 id="about-source"><ZhuyinText :text="t('about.source')" /></h2>
      <p><ZhuyinText :text="t('about.licenseIntro')" /></p>
      <p>
        <a
          href="https://www.gnu.org/licenses/agpl-3.0.html"
          target="_blank"
          rel="noopener noreferrer"
          >GNU AGPL-3.0-or-later</a
        >
      </p>
      <p>
        <ZhuyinText :text="t('about.repository')" /><strong>{{
          repository
        }}</strong>
      </p>
      <p class="about-warning"><ZhuyinText :text="t('about.privateRepo')" /></p>
      <details>
        <summary><ZhuyinText :text="t('about.noticeSummary')" /></summary>
        <pre lang="en">{{ notice }}</pre>
      </details>
    </section>

    <section class="about-card" aria-labelledby="about-data">
      <h2 id="about-data"><ZhuyinText :text="t('about.data')" /></h2>
      <ul class="about-facts">
        <li>
          <ZhuyinText
            :text="
              t('about.points', {
                count: data.points,
                floors: data.floors.join(' · '),
              })
            "
          />
        </li>
        <li>
          <ZhuyinText
            :text="
              t('about.connections', {
                count: data.connections,
                unverified: data.unverifiedConnections,
              })
            "
          />
        </li>
        <li>
          <ZhuyinText
            :text="
              data.walkingNetwork ? t('about.networkYes') : t('about.networkNo')
            "
          />
        </li>
      </ul>
      <p><ZhuyinText :text="t('about.mapSource')" /></p>
      <p class="about-links">
        <a
          href="https://web.metro.taipei/pages2026/WebStation/051/1"
          target="_blank"
          rel="noopener noreferrer"
          ><ZhuyinText :text="t('about.linkFacilities')"
        /></a>
        <a
          href="https://web.metro.taipei/img/ALL/INFOPDF/051.pdf"
          target="_blank"
          rel="noopener noreferrer"
          ><ZhuyinText :text="t('about.linkInfo')"
        /></a>
      </p>
      <p><ZhuyinText :text="t('about.openData')" /></p>
      <p>
        <a
          href="https://data.gov.tw/license"
          target="_blank"
          rel="noopener noreferrer"
          ><ZhuyinText :text="t('about.openDataLicense')"
        /></a>
      </p>
    </section>

    <section class="about-card" aria-labelledby="about-third">
      <h2 id="about-third"><ZhuyinText :text="t('about.thirdParty')" /></h2>
      <ul class="about-list">
        <li v-for="item in components" :key="item.name">
          <span><ZhuyinText :text="item.name" /></span>
          <small>{{ item.license }}</small>
        </li>
      </ul>
      <p class="about-note"><ZhuyinText :text="t('about.gemmaNote')" /></p>
    </section>
  </main>
</template>

<script setup>
/* global defineProps, defineEmits */
import { displayPlainZhuyin } from "../display/zhuyin.mjs";
import ZhuyinText from "../components/ZhuyinText.vue";
import { computed } from "vue";
import DisplayControls from "../components/DisplayControls.vue";
import { htmlLang, useI18n } from "../i18n/index.mjs";
import { useDisplayPreferences } from "../display/preferences.mjs";
import { buildInfo, summarizeStationData } from "../about/about.mjs";
import points from "./station-points.json";
import connections from "./station-connections.json";

const props = defineProps({
  embedded: { type: Boolean, default: false },
  floor: { type: String, default: "B2" },
});
const emit = defineEmits(["close"]);
const { theme, displayMode } = useDisplayPreferences();
const { locale, t } = useI18n();
const mapSources = computed(() => {
  if (props.floor === "1F") return [];
  const floors = ["B1", "B2", "B3", "B4"];
  const floor = floors.includes(props.floor) ? props.floor : "B2";
  return [
    {
      label: t("map.sourceInfo", { floor }),
      url:
        "https://web.metro.taipei/img/ALL/INFOPDF/051.pdf#page=" +
        (floors.indexOf(floor) + 1),
    },
    {
      label: t("map.sourceFacilities"),
      url: "https://web.metro.taipei/pages2026/WebStation/051/1",
    },
    {
      label: t("map.sourceSection"),
      url: "https://web.metro.taipei/pages2026/WebStation/051/4",
    },
  ];
});
const build = buildInfo;
const data = summarizeStationData(points, connections);
const repository = "github.com/yoyo899843/Taipei-Codefest-2026-Big-Dumb";
const components = computed(() => [
  { name: "Vue 3.5", license: "MIT" },
  { name: "Vue Router 4.6", license: "MIT" },
  { name: "Vuex 4.1", license: "MIT" },
  { name: "core-js 3.51", license: "MIT" },
  { name: t("about.compLitert"), license: "Apache-2.0" },
  { name: t("about.compGemma"), license: "Gemma Terms of Use" },
  { name: t("about.compTownpass"), license: "GPL-3.0" },
]);
const notice = `Taipei Maze - QR-based indoor wayfinding with multilingual accessible guidance.
Copyright (C) 2026 Taipei Maze contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.`;
</script>

<style scoped>
.about-page {
  max-width: 720px;
  min-height: 100dvh;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 16px calc(88px + env(safe-area-inset-bottom));
  background: var(--tp-page);
  color: var(--ink);
  font: 15px / 1.7 var(--tp-font);
  text-align: left;
  -webkit-font-smoothing: antialiased;
}
.about-page *,
.about-page *::before,
.about-page *::after {
  box-sizing: border-box;
}
.about-page[data-display-mode="senior"] {
  font-size: 1.125rem;
}
.about-toolbar {
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
.about-back {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 44px;
  min-height: 44px;
  border-radius: 10px;
  color: var(--tp-primary-700);
  font-weight: 600;
  text-decoration: none;
}
.about-back svg {
  width: 22px;
  height: 22px;
}
h1 {
  margin: 12px 0 16px;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.4;
}
.about-card {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: var(--tp-radius-card);
  background: var(--tp-surface);
  box-shadow: var(--tp-shadow-card);
}
.about-card h2 {
  margin: 0 0 8px;
  font-size: 1.0625rem;
  font-weight: 600;
}
.about-card p {
  margin: 8px 0 0;
}
dl {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 12px;
  margin: 0;
}
dt {
  color: var(--muted);
}
dd {
  margin: 0;
  min-width: 0;
}
code {
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 0.9em;
}
.about-date {
  display: block;
  color: var(--muted);
  font-size: 0.875rem;
}
.about-hash {
  overflow-wrap: anywhere;
}
a {
  color: var(--tp-primary-700);
}
.about-note {
  color: var(--muted);
  font-size: 0.875rem;
}
.about-warning {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--warning-bg);
  color: var(--tp-secondary-800);
  font-size: 0.875rem;
}
details {
  margin-top: 12px;
}
summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--tp-primary-700);
  font-weight: 600;
  cursor: pointer;
}
pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--tp-gray-50);
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
.about-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}
.about-facts,
.about-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.about-facts li {
  padding: 6px 0;
  border-bottom: 1px solid var(--tp-gray-100);
}
.about-facts li:last-child {
  border-bottom: 0;
}
.about-list li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2px 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--tp-gray-100);
}
.about-list small {
  color: var(--muted);
}
:focus-visible {
  outline: 3px solid var(--tp-primary-500);
  outline-offset: 2px;
}
</style>
