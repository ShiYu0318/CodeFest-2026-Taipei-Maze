// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as Vue from "vue";
import { renderToString } from "@vue/server-renderer";
import { compileScript, parse } from "@vue/compiler-sfc";
import { transformSync } from "@babel/core";
import * as preferences from "../src/display/preferences.mjs";
import * as zhuyin from "../src/display/zhuyin.mjs";
import * as i18n from "../src/i18n/index.mjs";
import zhTW from "../src/i18n/messages/zh-TW.mjs";
import {
  annotateZhuyin,
  splitZhuyin,
  zhuyinLexicon,
} from "../src/display/zhuyin.mjs";

test("reviewed phrases have one well-formed syllable per Han character", () => {
  const seen = new Set();
  for (const entry of zhuyinLexicon) {
    assert.equal(seen.has(entry.text), false, entry.text);
    seen.add(entry.text);
    assert.equal(
      Array.from(entry.text).length,
      entry.readings.length,
      entry.text
    );
    for (const reading of entry.readings) {
      assert.match(reading, /^(?:˙[ㄅ-ㄩ]{1,3}|[ㄅ-ㄩ]{1,3}[ˊˇˋ]?)$/u);
    }
  }
});

test("known phrases retain contextual readings for 的, 處, 載 and 重", () => {
  const readings = (text) => annotateZhuyin(text).map((part) => part.reading);
  assert.deepEqual(readings("這是目的地").slice(-3), [
    "ㄇㄨˋ",
    "ㄉㄧˋ",
    "ㄉㄧˋ",
  ]);
  assert.equal(readings("先選要找的設施")[4], "˙ㄉㄜ");
  assert.equal(readings("詢問處")[2], "ㄔㄨˋ");
  assert.equal(readings("未載入任何位置或路線")[1], "ㄗㄞˋ");
  assert.equal(readings("請重新確認")[1], "ㄔㄨㄥˊ");
});

test("unknown characters, punctuation, English and floor identifiers are preserved", () => {
  const text = "B2・4 號無障礙電梯（AED）𠮷🙂銀行";
  const parts = annotateZhuyin(text);
  assert.equal(parts.map((part) => part.text).join(""), text);
  for (const part of parts.filter((part) =>
    /[B24AED𠮷🙂銀行]/u.test(part.text)
  )) {
    assert.equal(part.reading, null, part.text);
  }
  assert.equal(annotateZhuyin("").length, 0);
});

test("facility categories, child explanations and browsing messages have annotation coverage", () => {
  const station = JSON.parse(
    readFileSync(new URL("../src/views/station-points.json", import.meta.url))
  );
  // Child explanations now live in the Traditional Chinese catalog.
  const help = Object.entries(zhTW)
    .filter(
      ([key]) =>
        key.startsWith("help.") ||
        key.startsWith("type.") ||
        key.startsWith("notice.") ||
        [
          "scan.browsing",
          "scan.navigation",
          "scan.caveat",
          "scan.browseHint",
          "scan.waiting",
          "scan.scan",
          "scan.rescan",
          "scan.destination",
          "scan.cancelTrip",
          "staff.open",
        ].includes(key)
    )
    .map(([, text]) => text);
  for (const text of [
    ...Object.values(station.categories).map((entry) => entry.name),
    ...help,
  ]) {
    const missing = annotateZhuyin(text.replace(/\{\w+\}/g, "")).filter(
      (part) => /\p{Script=Han}/u.test(part.text) && !part.reading
    );
    assert.deepEqual(missing, [], text);
  }
});

test("tone marks are separate from the vertical symbols; neutral tone is above", () => {
  assert.deepEqual(splitZhuyin("ㄉㄧㄢˋ"), {
    symbols: ["ㄉ", "ㄧ", "ㄢ"],
    neutral: false,
    tone: "ˋ",
  });
  assert.deepEqual(splitZhuyin("˙ㄉㄜ"), {
    symbols: ["ㄉ", "ㄜ"],
    neutral: true,
    tone: "",
  });
  assert.deepEqual(splitZhuyin("ㄊㄧ"), {
    symbols: ["ㄊ", "ㄧ"],
    neutral: false,
    tone: "",
  });
});

test("navigation actions, transfers and orientation prompts have full Han coverage", () => {
  const keys = Object.keys(zhTW).filter(
    (key) =>
      key.startsWith("trip.") ||
      key.startsWith("map.face") ||
      [
        "scan.relocateHint",
        "scan.exit",
        "transfer.goTo",
        "transfer.checkFloor",
        "transfer.checkDirection",
        "transfer.confirmUp",
        "transfer.confirmDown",
        "transfer.manualFloor",
      ].includes(key)
  );
  const texts = keys.map((key) => zhTW[key].replace(/\{\w+\}/g, ""));
  // Interpolated facility/floor labels must retain annotation too.
  texts.push(
    zhTW["transfer.goTo"]
      .replace("{kind}", zhTW["type.elevator"])
      .replace("{floor}", `B2 · ${zhTW["floor.B2"]}`),
    zhTW["map.faceConnector"].replace("{name}", "板南線梯口")
  );
  for (const text of texts) {
    assert.deepEqual(
      annotateZhuyin(text).filter(
        (part) => /\p{Script=Han}/u.test(part.text) && !part.reading
      ),
      [],
      text
    );
  }
  assert.equal(
    annotateZhuyin(zhTW["trip.confirmTitle"]).at(-2).reading,
    "˙ㄇㄚ"
  );
});

test("opted-in fixed labels and meeting messages have full Han coverage", () => {
  const texts = [];
  for (const path of [
    "components/DisplayControls.vue",
    "components/StationScanPanel.vue",
    "views/StationMapView.vue",
    "views/MeetingView.vue",
  ]) {
    const source = readFileSync(
      new URL(`../src/${path}`, import.meta.url),
      "utf8"
    );
    for (const match of source.matchAll(/<ZhuyinText\s+text="([^"]+)"/g))
      texts.push(match[1]);
    // Translated labels: check the Traditional Chinese text behind the key.
    for (const match of source.matchAll(
      /<ZhuyinText\s+:text="t\(\s*'([\w.-]+)'\s*[,)]/g
    ))
      texts.push(zhTW[match[1]].replace(/\{\w+\}/g, ""));
  }
  const graph = JSON.parse(
    readFileSync(new URL("../src/navigation/demo-graph.json", import.meta.url))
  );
  for (const key of ["meeting_a", "meeting_b", "wait_a", "wait_b"])
    texts.push(graph.messages[key]);
  for (const text of texts) {
    assert.deepEqual(
      annotateZhuyin(text).filter(
        (part) => /\p{Script=Han}/u.test(part.text) && !part.reading
      ),
      [],
      text
    );
  }
});

test("the Vue component annotates child mode only and escapes unknown text", async () => {
  // Compile the actual SFC in memory using the existing build dependencies.
  const source = readFileSync(
    new URL("../src/components/ZhuyinText.vue", import.meta.url),
    "utf8"
  );
  const script = compileScript(parse(source).descriptor, {
    id: "zhuyin-test",
    inlineTemplate: true,
  }).content;
  const require = createRequire(import.meta.url);
  const { code } = transformSync(script, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  });
  const compiled = { exports: {} };
  const load = (name) =>
    name === "vue"
      ? Vue
      : name.endsWith("preferences.mjs")
      ? preferences
      : name.endsWith("i18n/index.mjs")
      ? i18n
      : zhuyin;
  new Function("require", "module", "exports", code)(
    load,
    compiled,
    compiled.exports
  );
  const settings = preferences.useDisplayPreferences();
  const original = settings.displayMode.value;
  // Newer Node versions expose navigator.languages (e.g. en-US); pin the
  // locale so the result does not depend on the machine running the tests.
  const language = i18n.useI18n();
  const originalLocale = language.locale.value;
  language.setLocale("zh-TW");
  try {
    for (const mode of ["standard", "senior", "child"]) {
      settings.setDisplayMode(mode);
      const html = await renderToString(
        Vue.createSSRApp(compiled.exports.default, { text: "電梯<script>" })
      );
      assert.equal(html.includes("<ruby"), mode === "child", mode);
      assert.equal(html.includes("<script>"), false);
      assert.equal(html.includes("&lt;script&gt;"), true);
      if (mode === "child") {
        assert.match(html, /aria-hidden="true"/);
        assert.match(html, /zhuyin-readable[^>]*>電梯&lt;script&gt;/);
      }
    }
    // Zhuyin is for Traditional Chinese readers only.
    language.setLocale("en");
    const html = await renderToString(
      Vue.createSSRApp(compiled.exports.default, { text: "電梯" })
    );
    assert.equal(html.includes("<ruby"), false);
  } finally {
    language.setLocale(originalLocale);
    settings.setDisplayMode(original);
  }
});
