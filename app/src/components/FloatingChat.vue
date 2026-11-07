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
      aria-label="開啟站內小幫手聊天"
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
      <span>小幫手</span>
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
            aria-label="收合聊天"
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
            <h2 id="maze-chat-title">站內小幫手</h2>
            <p
              class="maze-chat-presence"
              :data-ready="modelReady"
              role="status"
            >
              <span aria-hidden="true"></span>{{ statusText }}
            </p>
          </div>
          <button
            type="button"
            class="maze-chat-icon"
            aria-label="清除對話"
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
          aria-label="聊天訊息"
        >
          <article class="maze-chat-message assistant">
            <span class="maze-chat-avatar" aria-hidden="true">北</span>
            <p class="maze-chat-bubble maze-chat-static">
              你好！我是站內小幫手，可以回答掃碼導航與 App
              操作問題。實際路線請以地圖與導航指示為準。
            </p>
          </article>
          <div v-if="!modelReady" class="maze-chat-setup">
            <p>
              {{
                checking
                  ? "正在確認這支手機能否使用裝置端聊天…"
                  : nativeAvailable
                  ? "這支手機還沒有聊天模型。下載一次約 584 MB，之後可離線使用。"
                  : "請在最新版城市通 App 開啟，才能使用裝置端聊天。"
              }}
            </p>
            <div class="maze-chat-setup-actions">
              <button
                v-if="nativeAvailable"
                type="button"
                class="maze-chat-primary"
                @click="setupModel"
              >
                安裝聊天模型
              </button>
              <button
                type="button"
                class="maze-chat-secondary"
                :disabled="busy || listening || checking"
                @click="refreshStatus"
              >
                重新檢查
              </button>
            </div>
          </div>
          <article
            v-for="message in messages"
            :key="message.id"
            :class="['maze-chat-message', message.role]"
            :aria-label="message.role === 'user' ? '你的訊息' : '小幫手回覆'"
          >
            <span
              v-if="message.role === 'assistant'"
              class="maze-chat-avatar"
              aria-hidden="true"
              >北</span
            >
            <p class="maze-chat-bubble">{{ message.text }}</p>
          </article>
          <div v-if="busy" class="maze-chat-message assistant" role="status">
            <span class="maze-chat-avatar" aria-hidden="true">北</span>
            <p class="maze-chat-typing">
              <i></i><i></i><i></i>
              <span class="display-visually-hidden">正在手機上思考…</span>
            </p>
          </div>
        </div>
        <p v-if="notice" class="maze-chat-notice" role="status">{{ notice }}</p>
        <div
          v-if="!messages.length && modelReady && !busy"
          class="maze-chat-tray"
          aria-label="建議問題"
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
          <label for="maze-chat-input" class="display-visually-hidden"
            >想問什麼？</label
          >
          <div class="maze-chat-field" :data-listening="listening">
            <textarea
              id="maze-chat-input"
              ref="input"
              v-model="draft"
              rows="1"
              maxlength="500"
              :placeholder="listening ? '正在聆聽…' : '輸入你的問題'"
              :disabled="busy || listening"
              @keydown="composerKey"
              @input="grow"
            />
            <button
              v-if="listening"
              type="button"
              class="maze-chat-round listening"
              aria-label="完成錄音"
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
              aria-label="語音輸入"
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
              aria-label="停止"
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
              aria-label="送出"
              :disabled="!modelReady || listening || !draft.trim()"
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
              <span class="display-visually-hidden">語音語言</span>
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
                voiceAvailable ? "語音轉成草稿，確認後送出" : "此語言請改用打字"
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
import { useRoute } from "vue-router";
import { useDisplayPreferences } from "../display/preferences.mjs";
import "../display/display-preferences.css";
import {
  buildChatPrompt,
  createChatBridge,
  shouldSendOnEnter,
  isUsableChatReply,
} from "../chat/bridge.mjs";
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
const locale = ref("zh-TW");
const languages = [
  ["zh-TW", "繁體中文"],
  ["en-US", "English"],
  ["vi-VN", "Tiếng Việt"],
  ["id-ID", "Bahasa Indonesia"],
  ["th-TH", "ไทย"],
  ["ko-KR", "한국어"],
  ["ja-JP", "日本語"],
];
const starters = [
  "怎麼更新目前位置？",
  "無障礙路線會避開什麼？",
  "掃不到定位碼怎麼辦？",
];
const bridge = createChatBridge(window.flutterObject);
const route = useRoute();
const { theme, displayMode } = useDisplayPreferences();
let epoch = 0,
  serial = 0,
  priorFocus = null,
  previousInert = false;
const statusText = computed(() =>
  checking.value
    ? "正在確認裝置狀態…"
    : !nativeAvailable.value
    ? "裝置端聊天尚不可用"
    : modelReady.value
    ? "Gemma 3 · 裝置端對話"
    : "聊天模型尚未準備好"
);
const errors = {
  cancelled: "已停止，可修改問題後再送出。",
  timeout: "處理時間較長，已停止這次請求。請縮短問題後重試。",
  model_missing: "請先安裝聊天模型。",
  busy: "手機正在處理上一個請求，請稍後重試。",
  no_speech: "沒有辨識到語音，請重試或改用文字。",
  permission_denied: "未取得麥克風或語音權限，可繼續使用文字輸入。",
  unavailable: "這個裝置目前無法使用此功能。",
  voice_unavailable: "此語言沒有可用的裝置端語音辨識，請改用文字。",
};
const explain = (result) =>
  errors[result.code] || "這次處理未完成，請重試或使用文字輸入。";
async function setupModel() {
  notice.value = "請在 App 安裝畫面完成模型授權與下載。";
  const result = await bridge.request("setup");
  if (!opened.value) return;
  if (result.status !== "success") notice.value = explain(result);
  else notice.value = "已返回，正在重新確認模型狀態。";
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
async function send() {
  if (busy.value || listening.value || !modelReady.value) return;
  const text = draft.value.trim(),
    prompt = buildChatPrompt(messages.value, text);
  if (!prompt) return;
  const current = epoch;
  messages.value = [
    ...messages.value.slice(-18),
    { id: ++serial, role: "user", text },
  ];
  draft.value = "";
  notice.value = "";
  busy.value = true;
  nextTick(grow);
  scroll();
  const result = await bridge.request("generate", { prompt });
  if (current !== epoch || !opened.value) return;
  busy.value = false;
  if (
    result.status === "success" &&
    typeof result.text === "string" &&
    isUsableChatReply(result.text)
  )
    messages.value.push({ id: ++serial, role: "assistant", text: result.text });
  else {
    notice.value =
      result.status === "success"
        ? "這次回覆出現重複或不完整內容，請縮短問題後重試；導航請以地圖提示為準。"
        : explain(result);
    if (!draft.value) draft.value = text;
  }
  scroll();
  await nextTick();
  grow();
  input.value?.focus();
}
function cancelGeneration() {
  bridge.cancelAll();
}
async function record() {
  if (busy.value || listening.value || !voiceAvailable.value) return;
  const current = epoch;
  listening.value = true;
  notice.value = "正在聆聽，最長 30 秒。";
  const result = await bridge.request("voice", { locale: locale.value });
  if (current !== epoch || !opened.value) return;
  listening.value = false;
  if (result.status === "success" && typeof result.text === "string") {
    draft.value = [draft.value.trim(), result.text.trim()]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);
    notice.value = "已轉成草稿，請確認後送出。";
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
  notice.value = "對話已清除。";
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
