<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Interaction patterns (avatar bubbles, typing dots, starter chips, pill
     composer) adapted in spirit from EmbAId-Agent (MIT); no code copied. -->
<template>
  <Teleport to="body">
    <button
      v-if="!opened"
      ref="launcher"
      class="maze-chat-launcher"
      :data-theme="theme"
      :aria-label="t('chat.open')"
      aria-haspopup="dialog"
      :aria-expanded="opened"
      @click="open"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
        <path
          d="M8 9h8M8 13h5"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      <span>{{ t("chat.launcher") }}</span>
    </button>
    <div
      v-if="opened"
      class="maze-chat-backdrop display-page"
      :data-theme="theme"
      :data-display-mode="displayMode"
      :style="{
        height: viewportHeight + 'px',
        top: viewportTop + 'px',
        bottom: 'auto',
        '--chat-viewport-height': viewportHeight + 'px',
      }"
      @click.self="close"
    >
      <section
        ref="panel"
        class="maze-chat-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maze-chat-title"
        @keydown="handleKeys"
      >
        <header class="maze-chat-header">
          <button
            ref="closeButton"
            type="button"
            class="maze-chat-icon"
            :aria-label="t('chat.close')"
            @click="close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m6 9 6 6 6-6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div class="maze-chat-heading">
            <h2 id="maze-chat-title">{{ t("chat.title") }}</h2>
            <p class="maze-chat-presence" :data-ready="!checking" role="status">
              <span aria-hidden="true"></span>{{ statusText }}
            </p>
          </div>
          <button
            type="button"
            class="maze-chat-icon"
            :aria-label="t('chat.clear')"
            :disabled="busy || listening || !messages.length"
            @click="clear"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </header>
        <div
          ref="thread"
          class="maze-chat-thread"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          :aria-label="t('chat.log')"
        >
          <article class="maze-chat-message assistant">
            <span class="maze-chat-avatar" aria-hidden="true"
              ><svg viewBox="0 0 24 24">
                <path
                  d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="10" r="2.4" fill="currentColor" /></svg
            ></span>
            <p class="maze-chat-bubble maze-chat-static">
              {{ t("chat.welcome2") }}
            </p>
          </article>
          <div
            v-if="nativeAvailable && !modelReady && !checking"
            class="maze-chat-setup"
          >
            <p>{{ t("chat.optionalModel") }}</p>
            <div class="maze-chat-setup-actions">
              <button
                type="button"
                class="maze-chat-secondary"
                @click="setupModel"
              >
                {{ t("chat.install") }}
              </button>
            </div>
          </div>
          <article
            v-for="message in messages"
            :key="message.id"
            :class="['maze-chat-message', message.role]"
            :aria-label="
              message.role === 'user' ? t('chat.you') : t('chat.bot')
            "
          >
            <span
              v-if="message.role === 'assistant'"
              class="maze-chat-avatar"
              aria-hidden="true"
              ><svg viewBox="0 0 24 24">
                <path
                  d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="10" r="2.4" fill="currentColor" /></svg
            ></span>
            <div class="maze-chat-content">
              <p class="maze-chat-bubble">{{ message.text }}</p>
              <ul v-if="message.places?.length" class="maze-chat-places">
                <li v-for="place in message.places" :key="place.id">
                  <button type="button" @click="showPlace(place.id)">
                    <span class="maze-chat-floor">{{ place.floor }}</span>
                    <span class="maze-chat-place-name"
                      ><StationMapIcon
                        class="maze-chat-place-icon"
                        :name="place.icon"
                      />{{ place.label }}</span
                    >
                    <span class="maze-chat-place-action">{{
                      t("chat.showOnMap")
                    }}</span>
                  </button>
                </li>
              </ul>
              <p v-if="message.more" class="maze-chat-more">
                {{ message.more }}
              </p>
            </div>
          </article>
          <div v-if="busy" class="maze-chat-message assistant" role="status">
            <span class="maze-chat-avatar" aria-hidden="true"
              ><svg viewBox="0 0 24 24">
                <path
                  d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="10" r="2.4" fill="currentColor" /></svg
            ></span>
            <p class="maze-chat-typing">
              <i></i><i></i><i></i>
              <span class="display-visually-hidden">{{
                t("chat.thinking")
              }}</span>
            </p>
          </div>
        </div>
        <p v-if="notice" class="maze-chat-notice" role="status">{{ notice }}</p>
        <div
          v-if="!messages.length && !busy"
          class="maze-chat-tray"
          :aria-label="t('chat.starters')"
        >
          <button
            v-for="(starter, index) in starters"
            :key="starter"
            type="button"
            :style="{ '--i': index }"
            :disabled="listening"
            @click="ask(starter)"
          >
            {{ starter }}
          </button>
        </div>
        <form class="maze-chat-compose" @submit.prevent="send">
          <label for="maze-chat-input" class="display-visually-hidden">{{
            t("chat.ask")
          }}</label>
          <div class="maze-chat-field" :data-listening="listening">
            <textarea
              id="maze-chat-input"
              ref="input"
              v-model="draft"
              rows="1"
              maxlength="500"
              :placeholder="
                listening ? t('chat.listening') : t('chat.placeholder')
              "
              :disabled="busy || listening"
              @keydown="composerKey"
              @input="grow"
            />
            <button
              v-if="listening"
              type="button"
              class="maze-chat-round listening"
              :aria-label="t('chat.stopRecording')"
              @click="stopVoice"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="7"
                  y="7"
                  width="10"
                  height="10"
                  rx="2"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              v-else
              type="button"
              class="maze-chat-round"
              :aria-label="t('chat.voice')"
              :disabled="busy || !voiceAvailable"
              @click="record"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="9"
                  y="3"
                  width="6"
                  height="11"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <path
                  d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button
              v-if="busy"
              type="button"
              class="maze-chat-round maze-chat-send"
              :aria-label="t('chat.stop')"
              @click="cancelGeneration"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="7"
                  y="7"
                  width="10"
                  height="10"
                  rx="2"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              v-else
              class="maze-chat-round maze-chat-send"
              type="submit"
              :aria-label="t('chat.send')"
              :disabled="listening || !draft.trim()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 19V5M6 11l6-6 6 6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
          <div class="maze-chat-meta">
            <label class="maze-chat-language">
              <span class="display-visually-hidden">{{
                t("chat.voiceLanguage")
              }}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="8.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
                <path
                  d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                />
              </svg>
              <select
                v-model="locale"
                :disabled="busy || listening"
                @change="refreshStatus"
              >
                <option
                  v-for="language in languages"
                  :key="language[0]"
                  :value="language[0]"
                >
                  {{ language[1] }}
                </option>
              </select>
            </label>
            <p class="maze-chat-caption">
              {{
                voiceAvailable ? t("chat.voiceDraft") : t("chat.typeInstead")
              }}
            </p>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplayPreferences } from "../display/preferences.mjs";
import "../display/display-preferences.css";
import {
  buildChatPrompt,
  createChatBridge,
  shouldSendOnEnter,
  isUsableChatReply,
} from "../chat/bridge.mjs";
import StationMapIcon from "./StationMapIcon.vue";
import { LOCALES, useI18n } from "../i18n/index.mjs";
import { answerLocally } from "../chat/answers.mjs";
import { useMapFocus } from "../station/map-focus.mjs";
import { stationPoints } from "../station/scan.mjs";
import stationData from "../views/station-points.json";
const opened = ref(false),
  draft = ref(""),
  messages = ref([]),
  notice = ref(""),
  busy = ref(false),
  listening = ref(false);
const modelReady = ref(false),
  nativeAvailable = ref(false),
  voiceAvailable = ref(false),
  checking = ref(false);
const launcher = ref(null),
  panel = ref(null),
  closeButton = ref(null),
  input = ref(null),
  thread = ref(null);
const viewportHeight = ref(window.visualViewport?.height ?? window.innerHeight);
const viewportTop = ref(window.visualViewport?.offsetTop ?? 0);
function updateViewport() {
  viewportHeight.value = window.visualViewport?.height ?? window.innerHeight;
  viewportTop.value = window.visualViewport?.offsetTop ?? 0;
}
window.visualViewport?.addEventListener("resize", updateViewport);
window.visualViewport?.addEventListener("scroll", updateViewport);
window.addEventListener("resize", updateViewport);
const i18n = useI18n();
const { locale: uiLocale, t } = i18n;
const chatPoints = stationPoints(stationData);
const mapFocus = useMapFocus();
const router = useRouter();
// Voice input follows the interface language until the visitor picks another.
const voiceLocales = {
  "zh-TW": "zh-TW",
  en: "en-US",
  vi: "vi-VN",
  id: "id-ID",
  th: "th-TH",
  ko: "ko-KR",
  ja: "ja-JP",
};
const locale = ref(voiceLocales[uiLocale.value] ?? "zh-TW");
watch(uiLocale, (value) => {
  if (busy.value || listening.value) return;
  locale.value = voiceLocales[value] ?? locale.value;
  if (opened.value) refreshStatus();
});
const languages = [
  ["zh-TW", "繁體中文"],
  ["en-US", "English"],
  ["vi-VN", "Tiếng Việt"],
  ["id-ID", "Bahasa Indonesia"],
  ["th-TH", "ไทย"],
  ["ko-KR", "한국어"],
  ["ja-JP", "日本語"],
];
const starters = computed(() => [
  t("chat.starter1"),
  t("chat.starter2"),
  t("chat.starter3"),
]);
const bridge = createChatBridge(window.flutterObject);
const route = useRoute();
const { theme, displayMode } = useDisplayPreferences();
let epoch = 0,
  serial = 0,
  priorFocus = null,
  previousInert = false;
const statusText = computed(() =>
  modelReady.value
    ? t("chat.status.ready")
    : checking.value
    ? t("chat.status.checking")
    : t("chat.status.offline")
);
const errorCodes = new Set([
  "cancelled",
  "timeout",
  "model_missing",
  "busy",
  "no_speech",
  "permission_denied",
  "unavailable",
  "voice_unavailable",
]);
const explain = (result) =>
  errorCodes.has(result.code)
    ? t(`chat.error.${result.code}`)
    : t("chat.error.generic");
async function setupModel() {
  notice.value = t("chat.setupHint");
  const result = await bridge.request("setup");
  if (!opened.value) return;
  if (result.status !== "success") notice.value = explain(result);
  else notice.value = t("chat.setupReturned");
  refreshStatus();
}
async function refreshStatus() {
  const current = epoch;
  checking.value = true;
  const result = await bridge.request("status", { locale: locale.value });
  if (!opened.value || current !== epoch) return;
  checking.value = false;
  nativeAvailable.value = result.status === "success";
  modelReady.value = result.status === "success" && result.modelReady === true;
  voiceAvailable.value =
    result.status === "success" && result.voiceAvailable === true;
}
async function open() {
  updateViewport();
  priorFocus = document.activeElement;
  opened.value = true;
  const app = document.getElementById("app");
  previousInert = !!app?.inert;
  if (app) app.inert = true;
  await nextTick();
  closeButton.value?.focus();
  refreshStatus();
}
function close() {
  epoch++;
  bridge.cancelAll();
  bridge.request("unload");
  busy.value = false;
  listening.value = false;
  opened.value = false;
  const app = document.getElementById("app");
  if (app) app.inert = previousInert;
  nextTick(() =>
    (priorFocus?.isConnected ? priorFocus : launcher.value)?.focus()
  );
}
async function scroll() {
  await nextTick();
  thread.value?.scrollTo({ top: thread.value.scrollHeight });
}
function grow() {
  const field = input.value;
  if (!field) return;
  if (!field.value) {
    field.style.height = "";
    return;
  }
  field.style.height = "auto";
  field.style.height = Math.min(field.scrollHeight, 120) + "px";
}
function ask(text) {
  if (busy.value || listening.value) return;
  draft.value = text;
  if (modelReady.value) send();
  else nextTick(grow);
}
function composerKey(event) {
  if (!shouldSendOnEnter(event)) return;
  event.preventDefault();
  send();
}
function addReply(reply) {
  messages.value.push({ id: ++serial, role: "assistant", ...reply });
}
async function send() {
  if (busy.value || listening.value) return;
  const text = draft.value.trim();
  if (!text || [...text].length > 500) return;
  const current = epoch;
  const history = messages.value;
  messages.value = [
    ...messages.value.slice(-18),
    { id: ++serial, role: "user", text },
  ];
  draft.value = "";
  notice.value = "";
  nextTick(grow);
  scroll();
  // Grounded, offline answers first: facilities come from station data.
  const here = chatPoints.find(
    (point) => point.id === route.query.point || point.id === route.query.start
  );
  const local = answerLocally(text, chatPoints, i18n, {
    nearFloor: here?.floor,
  });
  if (local) {
    addReply({
      text: local.text,
      places: local.places,
      more:
        local.total > (local.places?.length ?? 0)
          ? t("chat.answer.more", {
              count: local.total - local.places.length,
            })
          : "",
    });
  } else if (!modelReady.value) {
    addReply({ text: t("chat.answer.fallback") });
  } else {
    const prompt = buildChatPrompt(history, text, {
      languageName: LOCALES.find((item) => item.code === uiLocale.value)
        ?.nativeName,
    });
    busy.value = true;
    const result = await bridge.request("generate", { prompt });
    if (current !== epoch || !opened.value) return;
    busy.value = false;
    if (
      result.status === "success" &&
      typeof result.text === "string" &&
      isUsableChatReply(result.text)
    )
      addReply({ text: result.text });
    else {
      notice.value =
        result.status === "success" ? t("chat.badReply") : explain(result);
      if (!draft.value) draft.value = text;
    }
  }
  scroll();
  await nextTick();
  grow();
  input.value?.focus();
}
async function showPlace(pointId) {
  close();
  if (route.name !== "station-map") await router.push("/station-map");
  mapFocus.focus(pointId);
}
function cancelGeneration() {
  bridge.cancelAll();
}
async function record() {
  if (busy.value || listening.value || !voiceAvailable.value) return;
  const current = epoch;
  listening.value = true;
  notice.value = t("chat.listeningNotice");
  const result = await bridge.request("voice", { locale: locale.value });
  if (current !== epoch || !opened.value) return;
  listening.value = false;
  if (result.status === "success" && typeof result.text === "string") {
    draft.value = [draft.value.trim(), result.text.trim()]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);
    notice.value = t("chat.drafted");
  } else notice.value = explain(result);
  await nextTick();
  grow();
  input.value?.focus();
}
function stopVoice() {
  bridge.request("stopVoice");
}
function clear() {
  messages.value = [];
  notice.value = t("chat.cleared");
}
function handleKeys(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
  }
  if (event.key !== "Tab") return;
  const nodes = [
    ...panel.value.querySelectorAll(
      "button:not(:disabled), textarea:not(:disabled), select:not(:disabled)"
    ),
  ];
  const first = nodes[0],
    last = nodes.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
function visibility() {
  if (document.hidden && opened.value) close();
}
watch(
  () => route.fullPath,
  () => {
    if (opened.value) close();
  }
);
document.addEventListener("visibilitychange", visibility);
onBeforeUnmount(() => {
  if (opened.value) close();
  bridge.dispose();
  window.visualViewport?.removeEventListener("resize", updateViewport);
  window.visualViewport?.removeEventListener("scroll", updateViewport);
  window.removeEventListener("resize", updateViewport);
  document.removeEventListener("visibilitychange", visibility);
});
</script>
<style scoped>
.maze-chat-launcher {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 48px;
  padding: 0 18px 0 14px;
  border: 0;
  border-radius: 24px;
  background: #468d9b;
  color: #fff;
  box-shadow: 0 6px 16px rgb(17 38 41 / 22%), 0 1px 3px rgb(17 38 41 / 18%);
  font: 600 15px / 1 "PingFang TC", -apple-system, system-ui, sans-serif;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 150ms ease;
}
.maze-chat-launcher:active {
  transform: scale(0.95);
  background: #356c77;
}
.maze-chat-launcher[data-theme="dark"] {
  background: #71c5d5;
  color: #081315;
  box-shadow: 0 6px 18px rgb(0 0 0 / 45%);
}
.maze-chat-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px;
  background: rgb(11 13 14 / 40%);
  animation: maze-fade 200ms ease both;
}
.maze-chat-panel {
  --chat-ink: var(--tp-gray-900);
  --chat-muted: var(--tp-gray-600);
  --chat-line: var(--tp-gray-100);
  --chat-bot: var(--tp-gray-50);
  --chat-user: var(--tp-primary-600);
  width: min(420px, 100%);
  height: min(700px, calc(var(--chat-viewport-height, 100dvh) - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  background: var(--tp-surface);
  box-shadow: 0 12px 40px rgb(0 0 0 / 22%);
  color: var(--chat-ink);
  text-align: left;
  font: 16px / 1.5 var(--tp-font);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  transform-origin: bottom right;
  animation: maze-rise 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.maze-chat-panel[data-theme="dark"],
[data-theme="dark"] > .maze-chat-panel {
  --chat-user: var(--tp-primary-300);
}
.maze-chat-panel *,
.maze-chat-panel *::before,
.maze-chat-panel *::after {
  box-sizing: border-box;
}
.maze-chat-panel button {
  font: inherit;
  cursor: pointer;
}
.maze-chat-panel button:disabled {
  cursor: default;
}

/* TownPass TPAppBar: white, 56px, centered SemiBold title. */
.maze-chat-header {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  min-height: 56px;
  padding: 4px 4px;
  background: var(--tp-surface);
  box-shadow: 0 1px 0 var(--chat-line);
}
.maze-chat-heading {
  min-width: 0;
  text-align: center;
}
.maze-chat-heading h2 {
  margin: 0;
  overflow: hidden;
  color: var(--chat-ink);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.maze-chat-presence {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 1px 0 0;
  color: var(--chat-muted);
  font-size: 12px;
  line-height: 1.4;
}
.maze-chat-presence span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tp-secondary-600);
}
.maze-chat-presence[data-ready="true"] span {
  background: #2e9a6c;
}
.maze-chat-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: 0 auto;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--tp-gray-700);
  transition: background-color 150ms ease, opacity 150ms ease;
}
.maze-chat-icon svg {
  width: 24px;
  height: 24px;
}
.maze-chat-icon:active:not(:disabled) {
  background: var(--tp-gray-50);
}
.maze-chat-icon:disabled {
  opacity: 0.35;
}

.maze-chat-thread {
  flex: 1;
  min-height: 80px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--tp-page);
}
.maze-chat-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 88%;
  animation: maze-in 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.maze-chat-message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.maze-chat-avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--tp-primary-500);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.maze-chat-avatar svg {
  width: 18px;
  height: 18px;
}
[data-theme="dark"] .maze-chat-avatar {
  color: var(--tp-primary-950);
}
.maze-chat-bubble {
  position: relative;
  margin: 0;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.maze-chat-static {
  white-space: normal;
}
.maze-chat-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.maze-chat-places {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.maze-chat-places button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas: "floor name" "floor action";
  align-items: center;
  gap: 0 10px;
  width: 100%;
  min-height: 52px;
  padding: 8px 12px;
  border: 1px solid var(--tp-primary-200);
  border-radius: 12px;
  background: var(--tp-surface);
  color: var(--chat-ink);
  text-align: left;
  transition: background-color 150ms ease, transform 120ms ease;
}
.maze-chat-places button:active {
  transform: scale(0.98);
  background: var(--tp-primary-50);
}
.maze-chat-floor {
  grid-area: floor;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--tp-primary-600);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
}
[data-theme="dark"] .maze-chat-floor {
  color: var(--tp-primary-950);
}
.maze-chat-place-name {
  grid-area: name;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.maze-chat-place-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  vertical-align: -2px;
  color: var(--tp-primary-700);
}
.maze-chat-place-action {
  grid-area: action;
  color: var(--tp-primary-700);
  font-size: 13px;
}
.maze-chat-more {
  margin: 0;
  color: var(--chat-muted);
  font-size: 13px;
}
.maze-chat-message.assistant .maze-chat-bubble {
  border-top-left-radius: 4px;
  background: var(--tp-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
  color: var(--chat-ink);
}
.maze-chat-message.user .maze-chat-bubble {
  border-top-right-radius: 4px;
  background: var(--chat-user);
  color: #fff;
}
[data-theme="dark"] .maze-chat-message.user .maze-chat-bubble {
  color: var(--tp-primary-950);
}
.maze-chat-typing {
  display: inline-flex;
  gap: 4px;
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  border-top-left-radius: 4px;
  background: var(--tp-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
}
.maze-chat-typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tp-gray-400);
  animation: maze-bounce 1.2s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}
.maze-chat-typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.maze-chat-typing i:nth-child(3) {
  animation-delay: 0.3s;
}
.maze-chat-setup {
  margin-left: 40px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--tp-surface);
  box-shadow: var(--tp-shadow-card);
  color: var(--chat-muted);
  font-size: 14px;
}
.maze-chat-setup p {
  margin: 0 0 10px;
}
.maze-chat-setup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.maze-chat-primary,
.maze-chat-secondary {
  min-height: var(--display-control-height, 44px);
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  transition: background-color 150ms ease, transform 120ms ease;
}
.maze-chat-primary {
  border: 1px solid var(--tp-primary-600);
  background: var(--tp-primary-600);
  color: #fff;
}
.maze-chat-secondary {
  border: 1px solid var(--tp-primary-500);
  background: var(--tp-surface);
  color: var(--tp-primary-700);
}
:is(.maze-chat-primary, .maze-chat-secondary):active:not(:disabled) {
  transform: scale(0.97);
}
.maze-chat-secondary:disabled {
  border-color: var(--tp-gray-100);
  color: var(--tp-gray-500);
}
.maze-chat-notice {
  margin: 0;
  padding: 8px 16px;
  background: var(--tp-secondary-50);
  color: var(--tp-secondary-800);
  font-size: 13px;
  line-height: 1.5;
}

.maze-chat-tray {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 16px 0;
  scrollbar-width: none;
  background: var(--tp-surface);
}
.maze-chat-tray::-webkit-scrollbar {
  display: none;
}
.maze-chat-tray button {
  flex: none;
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid var(--tp-primary-300);
  border-radius: 999px;
  background: var(--tp-primary-50);
  color: var(--tp-primary-700);
  font-size: 14px;
  white-space: nowrap;
  animation: maze-chip 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-delay: calc(var(--i, 0) * 60ms + 120ms);
  transition: transform 120ms ease;
}
.maze-chat-tray button:active {
  transform: scale(0.96);
}

.maze-chat-compose {
  padding: 10px 12px max(12px, env(safe-area-inset-bottom));
  background: var(--tp-surface);
}
.maze-chat-field {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 4px 4px 4px 14px;
  border: 1px solid var(--tp-gray-200);
  border-radius: 24px;
  background: var(--tp-gray-50);
  transition: border-color 150ms ease, box-shadow 200ms ease;
}
.maze-chat-field:focus-within {
  border-color: var(--tp-primary-500);
  box-shadow: 0 0 0 3px rgb(90 180 197 / 22%);
}
.maze-chat-field[data-listening="true"] {
  border-color: var(--tp-red-500);
}
.maze-chat-field textarea {
  flex: 1;
  min-width: 0;
  height: 40px;
  max-height: 120px;
  padding: 9px 0;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--chat-ink);
  /* 16px stops iOS from zooming the WebView when the field gains focus. */
  font: 16px / 1.4 var(--tp-font);
}
.maze-chat-field textarea::placeholder {
  color: var(--tp-gray-500);
}
.maze-chat-round {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--tp-gray-700);
  transition: background-color 150ms ease, opacity 150ms ease,
    transform 120ms ease;
}
.maze-chat-round svg {
  width: 22px;
  height: 22px;
}
.maze-chat-round:active:not(:disabled) {
  transform: scale(0.92);
}
.maze-chat-round:disabled {
  opacity: 0.35;
}
.maze-chat-round.listening {
  background: var(--tp-red-500);
  color: #fff;
  animation: maze-pulse 1.4s ease-in-out infinite;
}
.maze-chat-send {
  background: var(--tp-primary-600);
  color: #fff;
}
[data-theme="dark"] .maze-chat-send {
  color: var(--tp-primary-950);
}
.maze-chat-send:disabled {
  background: var(--tp-gray-200);
  color: var(--tp-gray-500);
  opacity: 1;
}
.maze-chat-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 0 4px;
}
.maze-chat-language {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  color: var(--tp-gray-600);
}
.maze-chat-language svg {
  position: absolute;
  left: 8px;
  width: 16px;
  height: 16px;
  pointer-events: none;
}
.maze-chat-language select {
  min-height: 36px;
  max-width: 150px;
  padding: 0 10px 0 28px;
  border: 1px solid var(--tp-gray-200);
  border-radius: 999px;
  background: var(--tp-surface);
  color: var(--tp-gray-700);
  font: 13px / 1 var(--tp-font);
}
.maze-chat-caption {
  min-width: 0;
  margin: 0;
  color: var(--tp-gray-500);
  font-size: 12px;
  line-height: 1.4;
}
.maze-chat-panel :focus-visible,
.maze-chat-launcher:focus-visible {
  outline: 3px solid var(--tp-primary-500, #5ab4c5);
  outline-offset: 2px;
}
.maze-chat-field textarea:focus-visible {
  outline: 0;
}
.display-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@keyframes maze-fade {
  from {
    opacity: 0;
  }
}
@keyframes maze-rise {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
}
@keyframes maze-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
@keyframes maze-chip {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
}
@keyframes maze-bounce {
  0%,
  60%,
  100% {
    transform: none;
    opacity: 0.5;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
@keyframes maze-pulse {
  50% {
    box-shadow: 0 0 0 6px rgb(212 82 81 / 22%);
  }
}

/* Age-tiered text sizes follow the display mode. */
[data-display-mode="child"] .maze-chat-bubble,
[data-display-mode="child"] .maze-chat-place-name {
  font-size: 17px;
}
[data-display-mode="senior"] .maze-chat-bubble,
[data-display-mode="senior"] .maze-chat-place-name,
[data-display-mode="senior"] .maze-chat-field textarea {
  font-size: 19px;
}
[data-display-mode="senior"] .maze-chat-tray button {
  min-height: 44px;
  font-size: 16px;
}

/* Phones: a TownPass-style bottom sheet that fills the visible viewport. */
@media (max-width: 520px) {
  .maze-chat-backdrop {
    padding: 0;
  }
  .maze-chat-panel {
    width: 100%;
    height: calc(var(--chat-viewport-height, 100dvh) - 24px);
    border-radius: 16px 16px 0 0;
    box-shadow: var(--tp-shadow-sheet);
    animation-name: maze-sheet;
  }
  .maze-chat-header::before {
    content: "";
    position: absolute;
    top: 5px;
    left: 50%;
    width: 36px;
    height: 4px;
    margin-left: -18px;
    border-radius: 2px;
    background: var(--tp-gray-200);
  }
  .maze-chat-header {
    position: relative;
    padding-top: 12px;
  }
}
@keyframes maze-sheet {
  from {
    transform: translateY(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .maze-chat-backdrop,
  .maze-chat-panel,
  .maze-chat-message,
  .maze-chat-tray button {
    animation: none;
  }
  .maze-chat-typing i,
  .maze-chat-round.listening {
    animation-duration: 0.001ms;
    animation-iteration-count: 1;
  }
}
</style>
