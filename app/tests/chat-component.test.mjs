// SPDX-License-Identifier: AGPL-3.0-or-later
/* global globalThis */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import { compileScript, parse } from "@vue/compiler-sfc";
import { transformSync } from "@babel/core";
import * as Vue from "vue";
import * as bridge from "../src/chat/bridge.mjs";
import * as answers from "../src/chat/answers.mjs";
import * as stream from "../src/chat/stream.mjs";
import * as i18n from "../src/i18n/index.mjs";
import * as zhuyin from "../src/display/zhuyin.mjs";
import * as scan from "../src/station/scan.mjs";
// Node 18 file execution lacks the browser Web Crypto global.
// Supply the real standard implementation for the simulated WebView.
if (!globalThis.crypto)
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL("../src/components/FloatingChat.vue", import.meta.url),
  "utf8"
);
const script = compileScript(parse(source).descriptor, {
  id: "chat-test",
}).content;
const { code } = transformSync(script, {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
});
function mountChat({ reducedMotion = false } = {}) {
  const listeners = new Set(),
    sent = [],
    cleanups = [];
  const native = {
    postMessage: (json) => sent.push(JSON.parse(json).data),
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };
  const window = {
    flutterObject: native,
    innerHeight: 800,
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: reducedMotion }),
  };
  const document = {
    getElementById: () => null,
    addEventListener() {},
    removeEventListener() {},
  };
  const modules = {
    vue: { ...Vue, onBeforeUnmount: (fn) => cleanups.push(fn) },
    "vue-router": { useRoute: () => ({ query: {} }), useRouter: () => ({}) },
    "../display/preferences.mjs": {
      useDisplayPreferences: () => ({
        theme: Vue.ref("light"),
        displayMode: Vue.ref("standard"),
      }),
    },
    "../chat/bridge.mjs": bridge,
    "../chat/answers.mjs": answers,
    "../chat/stream.mjs": stream,
    "../i18n/index.mjs": i18n,
    "../display/zhuyin.mjs": zhuyin,
    "../station/scan.mjs": scan,
    "../station/map-focus.mjs": { useMapFocus: () => ({}) },
    "../views/station-points.json": JSON.parse(
      readFileSync(new URL("../src/views/station-points.json", import.meta.url))
    ),
  };
  const compiled = { exports: {} };
  new Function("require", "module", "exports", "window", "document", code)(
    (name) => modules[name] ?? {},
    compiled,
    compiled.exports,
    window,
    document
  );
  const scope = Vue.effectScope();
  const chat = scope.run(() =>
    compiled.exports.default.setup({}, { expose() {} })
  );
  chat.opened.value = true;
  return {
    chat,
    sent,
    reply(data) {
      for (const fn of listeners)
        fn({ data: JSON.stringify({ name: "codefest_ai", data }) });
    },
    dispose() {
      for (const fn of cleanups) fn();
      scope.stop();
    },
  };
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("stopping a progressively revealed model answer preserves only visible text", async () => {
  const h = mountChat();
  try {
    h.chat.modelReady.value = true;
    h.chat.draft.value = "Write a short poem about sunshine";
    const pending = h.chat.send();
    const request = h.sent.find((item) => item.action === "generate");
    assert.ok(request, "question reaches the model rather than offline FAQ");
    const full =
      "Sunshine warms the quiet station while travellers greet a brand new day.";
    h.reply({ requestId: request.requestId, status: "success", text: full });
    await pause(25);
    const reply = h.chat.messages.value.at(-1);
    assert.ok(reply.text.length > 0 && reply.text.length < full.length);
    h.chat.cancelGeneration();
    const visible = reply.text;
    await pending;
    assert.equal(reply.text, visible);
    assert.equal(reply.streaming, false);
  } finally {
    h.dispose();
  }
});

test("closing during offline progress clears retained animation before reopening", async () => {
  const h = mountChat();
  try {
    h.chat.draft.value = "廁所在哪裡？";
    const pending = h.chat.send();
    await pause(5);
    const reply = h.chat.messages.value.at(-1);
    h.chat.close();
    assert.equal(reply.streaming, false);
    assert.notEqual(reply.thinking.state, "active");
    const snapshot = reply.text;
    h.chat.opened.value = true;
    await pending;
    assert.equal(reply.text, snapshot);
    assert.equal(h.chat.busy.value, false);
  } finally {
    h.dispose();
  }
});

test("a closed request cannot clear a newer request's busy state", async () => {
  const h = mountChat();
  try {
    h.chat.modelReady.value = true;
    h.chat.draft.value = "Write a short poem about sunshine";
    const old = h.chat.send();
    h.chat.close();
    h.chat.opened.value = true;
    h.chat.draft.value = "Write a story about moonlight";
    const current = h.chat.send();
    await old;
    assert.equal(h.chat.busy.value, true);
    h.chat.cancelGeneration();
    await current;
    assert.equal(h.chat.busy.value, false);
    assert.ok(h.chat.messages.value.every((item) => !item.streaming));
  } finally {
    h.dispose();
  }
});

test("reduced motion holds partial model text until the final answer", async () => {
  const h = mountChat({ reducedMotion: true });
  try {
    h.chat.modelReady.value = true;
    h.chat.draft.value = "Write a short poem about sunshine";
    const pending = h.chat.send();
    const requestId = h.sent.find(
      (item) => item.action === "generate"
    ).requestId;
    h.reply({ requestId, status: "partial", seq: 1, text: "Sunshine" });
    assert.equal(h.chat.messages.value.at(-1).text, "");
    h.reply({
      requestId,
      status: "success",
      text: "Sunshine warms the quiet station.",
    });
    await pending;
    assert.equal(
      h.chat.messages.value.at(-1).text,
      "Sunshine warms the quiet station."
    );
    assert.equal(h.chat.messages.value.at(-1).streaming, false);
  } finally {
    h.dispose();
  }
});
