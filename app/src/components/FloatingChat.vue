<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <Teleport to="body">
    <button
      v-if="!opened"
      ref="launcher"
      class="maze-chat-launcher"
      aria-label="開啟站內小幫手聊天"
      aria-haspopup="dialog"
      :aria-expanded="opened"
      @click="open"
    >
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          stroke-width="1.8"
        />
        <path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="1.8" />
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
          <div>
            <h2 id="maze-chat-title">站內小幫手</h2>
            <p>文字與語音，在你的手機處理</p>
          </div>
          <button
            ref="closeButton"
            type="button"
            aria-label="收合聊天"
            @click="close"
          >
            ×
          </button>
        </header>
        <div class="maze-chat-status" role="status">
          <span :class="{ ready: modelReady }" aria-hidden="true"></span
          >{{ statusText
          }}<button :disabled="busy || listening" @click="refreshStatus">
            重新檢查
          </button>
        </div>
        <div
          ref="thread"
          class="maze-chat-thread"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="聊天訊息"
        >
          <p class="maze-chat-welcome">
            你好！可以問我如何使用掃碼導航。實際路線請以地圖與導航指示為準。
          </p>
          <p v-if="!modelReady" class="maze-chat-setup">
            {{
              nativeAvailable
                ? "此裝置尚未準備好 Gemma 3 模型。完成模型安裝後，按「重新檢查」即可開始。"
                : "請在已更新的城市通 App，使用安全連線開啟裝置端聊天。"
            }}
          </p>
          <button
            v-if="nativeAvailable && !modelReady"
            type="button"
            @click="setupModel"
          >
            安裝 Gemma 3 聊天模型
          </button>
          <article
            v-for="message in messages"
            :key="message.id"
            :class="['maze-chat-bubble', message.role]"
            :aria-label="message.role === 'user' ? '你的訊息' : '小幫手回覆'"
          >
            <span>{{ message.text }}</span>
          </article>
          <p v-if="busy" class="maze-chat-working" role="status">
            正在手機上思考…
          </p>
        </div>
        <p v-if="notice" class="maze-chat-notice" role="status">{{ notice }}</p>
        <form class="maze-chat-compose" @submit.prevent="send">
          <label for="maze-chat-input">想問什麼？</label>
          <textarea
            id="maze-chat-input"
            ref="input"
            v-model="draft"
            rows="2"
            maxlength="500"
            placeholder="例如：如何更新目前位置？"
            :disabled="busy || listening"
            @keydown="composerKey"
          />
          <div class="maze-chat-actions">
            <label class="maze-chat-language"
              >語音語言<select
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
              </select></label
            >
            <button v-if="listening" type="button" @click="stopVoice">
              完成錄音
            </button>
            <button
              v-else
              type="button"
              :disabled="busy || !voiceAvailable"
              @click="record"
            >
              語音輸入
            </button>
            <button v-if="busy" type="button" @click="cancelGeneration">
              停止
            </button>
            <button
              v-else
              class="maze-chat-send"
              type="submit"
              :disabled="!modelReady || listening || !draft.trim()"
            >
              送出
            </button>
          </div>
          <p class="maze-chat-caption">
            語音先轉成草稿，由你確認後送出。{{
              voiceAvailable
                ? "按語音輸入才會使用麥克風。"
                : "此語言目前無可用的裝置端辨識，請打字。"
            }}
          </p>
          <button
            type="button"
            class="maze-chat-clear"
            :disabled="busy || listening || !messages.length"
            @click="clear"
          >
            清除對話
          </button>
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
  right: 18px;
  bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 12px 18px;
  border: 0;
  border-radius: 28px;
  background: #153d53;
  color: white;
  box-shadow: 0 4px 18px #163b5233;
  font: 600 16px system-ui;
  cursor: pointer;
}
.maze-chat-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #102c4355;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px;
}
.maze-chat-panel {
  width: min(410px, 100%);
  height: min(680px, calc(var(--chat-viewport-height, 100dvh) - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface, #fff);
  border-radius: 20px;
  box-shadow: 0 12px 50px #102c4340;
  color: var(--ink, #173649);
  text-align: left;
  font: 16px/1.5 system-ui, -apple-system, "PingFang TC", sans-serif;
}
.maze-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 14px;
  background: #153d53;
  color: #fff;
}
.maze-chat-header h2 {
  margin: 0;
  font-size: 21px;
}
.maze-chat-header p {
  margin: 3px 0 0;
  font-size: 13px;
  color: #d6e8f0;
}
.maze-chat-header button {
  background: transparent;
  border: 0;
  color: white;
  font-size: 30px;
  min-width: 44px;
  min-height: var(--display-control-height, 44px);
}
.maze-chat-status {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  background: var(--wash, #eef4f7);
  font-size: 12px;
}
.maze-chat-status > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #a2782d;
}
.maze-chat-status > span.ready {
  background: #16805b;
}
.maze-chat-status button {
  margin-left: auto;
  border: 0;
  background: transparent;
  text-decoration: underline;
  min-height: 36px;
  color: var(--ink, #153d53);
}
.maze-chat-thread {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 80px;
}
.maze-chat-thread p {
  margin: 0;
}
.maze-chat-welcome {
  font-size: 15px;
}
.maze-chat-setup {
  color: var(--muted, #596b77);
  font-size: 13px;
  border-left: 3px solid #d3dfe7;
  padding-left: 10px;
}
.maze-chat-bubble {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding: 11px 14px;
  border-radius: 14px;
  max-width: 90%;
  font-size: 15px;
}
.maze-chat-bubble.user {
  background: #153d53;
  color: #fff;
  align-self: flex-end;
}
.maze-chat-bubble.assistant {
  background: var(--wash, #eef4f7);
  align-self: flex-start;
}
.maze-chat-working {
  color: var(--muted, #596b77);
  font-size: 13px;
}
.maze-chat-notice {
  margin: 0;
  padding: 8px 18px;
  font-size: 13px;
  color: #745118;
  background: #fff7e5;
}
.maze-chat-compose {
  padding: 12px 16px 16px;
  border-top: 1px solid #dce5eb;
}
.maze-chat-compose > label {
  font-weight: 600;
  font-size: 13px;
}
.maze-chat-compose textarea {
  box-sizing: border-box;
  display: block;
  width: 100%;
  resize: none;
  border: 1px solid #a8bac5;
  border-radius: 10px;
  padding: 10px;
  margin-top: 6px;
  font: inherit;
  color: inherit;
}
.maze-chat-actions {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: 8px;
}
.maze-chat-actions button {
  min-height: var(--display-control-height, 44px);
  border: 1px solid #b7c9d4;
  border-radius: 9px;
  padding: 8px 10px;
  background: var(--surface, #fff);
  color: var(--ink, #153d53);
  font-weight: 600;
}
.maze-chat-actions .maze-chat-send {
  margin-left: auto;
  background: #153d53;
  color: #fff;
  border-color: #153d53;
}
.maze-chat-language {
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.maze-chat-language select {
  min-height: 40px;
  max-width: 126px;
  font-size: 13px;
  background: var(--surface, #fff);
  border: 1px solid #b7c9d4;
  border-radius: 7px;
  color: var(--ink, #153d53);
}
.maze-chat-caption {
  font-size: 11px;
  color: var(--muted, #596b77);
  margin: 8px 0 0;
}
.maze-chat-clear {
  border: 0;
  background: transparent;
  color: var(--muted, #596b77);
  text-decoration: underline;
  padding: 8px 0;
  min-height: 36px;
}
.maze-chat-panel button {
  cursor: pointer;
}
.maze-chat-panel button:disabled {
  opacity: 0.45;
  cursor: default;
}
.maze-chat-panel :focus-visible,
.maze-chat-launcher:focus-visible {
  outline: 3px solid #d18b1b;
  outline-offset: 3px;
}
@media (max-width: 480px) {
  .maze-chat-backdrop {
    padding: 0;
  }
  .maze-chat-panel {
    width: 100%;
    height: min(730px, var(--chat-viewport-height, 100dvh));
    border-radius: 20px 20px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .maze-chat-launcher {
    right: 14px;
  }
}
</style>
