// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCALES,
  catalogs,
  createI18n,
  detectLocale,
  localeStorageKey,
} from "../src/i18n/index.mjs";

const placeholders = (text) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("ships the seven required languages with Indonesian, not Hindi", () => {
  assert.deepEqual(
    LOCALES.map((l) => l.code),
    ["zh-TW", "en", "vi", "id", "th", "ko", "ja"]
  );
  assert.equal(
    LOCALES.find((l) => l.code === "id").nativeName,
    "Bahasa Indonesia"
  );
  assert.ok(!LOCALES.some((l) => l.code === "hi"));
});

test("every catalog has exactly the reference keys and placeholders", () => {
  const reference = catalogs["zh-TW"];
  for (const { code } of LOCALES) {
    const catalog = catalogs[code];
    assert.deepEqual(
      Object.keys(catalog).sort(),
      Object.keys(reference).sort(),
      code
    );
    for (const [key, text] of Object.entries(reference)) {
      assert.equal(typeof catalog[key], "string", `${code} ${key}`);
      assert.ok(catalog[key].trim(), `${code} ${key} empty`);
      assert.deepEqual(
        placeholders(catalog[key]),
        placeholders(text),
        `${code} ${key}`
      );
    }
  }
});

test("translate interpolates, falls back to Traditional Chinese, then the key", () => {
  const i18n = createI18n({ storage: () => undefined, languages: ["en-US"] });
  assert.equal(i18n.locale.value, "en");
  assert.equal(
    i18n.t("map.pointCount", { count: 3 }),
    catalogs.en["map.pointCount"].replace("{count}", "3")
  );
  assert.equal(i18n.t("missing.key"), "missing.key");
  i18n.setLocale("zh-TW");
  assert.equal(i18n.t("map.pointCount", { count: 2 }), "2 個標點");
  assert.equal(i18n.t("map.pointCount"), "{count} 個標點");
});

test("browser languages map to supported locales; unknown ones default to zh-TW", () => {
  assert.equal(detectLocale(["vi-VN"]), "vi");
  assert.equal(detectLocale(["in-ID"]), "id");
  assert.equal(detectLocale(["th"]), "th");
  assert.equal(detectLocale(["ko-KR"]), "ko");
  assert.equal(detectLocale(["ja-JP"]), "ja");
  assert.equal(detectLocale(["zh-Hant-TW"]), "zh-TW");
  assert.equal(detectLocale(["hi-IN", "fr"]), "zh-TW");
  assert.equal(detectLocale(["fr", "en-GB"]), "en");
  assert.equal(detectLocale(undefined), "zh-TW");
});

test("a manual choice is remembered and beats the browser language", () => {
  const store = new Map();
  const storage = () => ({
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  });
  const first = createI18n({ storage, languages: ["en"] });
  first.setLocale("ja");
  first.setLocale("xx");
  assert.equal(first.locale.value, "ja");
  assert.equal(store.get(localeStorageKey), "ja");
  assert.equal(createI18n({ storage, languages: ["en"] }).locale.value, "ja");
  const broken = () => {
    throw new Error("blocked");
  };
  assert.equal(
    createI18n({ storage: broken, languages: ["ko"] }).locale.value,
    "ko"
  );
});
