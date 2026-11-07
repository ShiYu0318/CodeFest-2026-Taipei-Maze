// SPDX-License-Identifier: AGPL-3.0-or-later
// Bundled, offline UI catalogs. Translations are team drafts written at
// development time (no runtime translation service) and still need review.
import { readonly, ref } from "vue";
import zhTW from "./messages/zh-TW.mjs";
import en from "./messages/en.mjs";
import vi from "./messages/vi.mjs";
import id from "./messages/id.mjs";
import th from "./messages/th.mjs";
import ko from "./messages/ko.mjs";
import ja from "./messages/ja.mjs";

export const LOCALES = [
  { code: "zh-TW", nativeName: "繁體中文", htmlLang: "zh-Hant-TW" },
  { code: "en", nativeName: "English", htmlLang: "en" },
  { code: "vi", nativeName: "Tiếng Việt", htmlLang: "vi" },
  { code: "id", nativeName: "Bahasa Indonesia", htmlLang: "id" },
  { code: "th", nativeName: "ไทย", htmlLang: "th" },
  { code: "ko", nativeName: "한국어", htmlLang: "ko" },
  { code: "ja", nativeName: "日本語", htmlLang: "ja" },
];
export const catalogs = { "zh-TW": zhTW, en, vi, id, th, ko, ja };
export const localeStorageKey = "taipei-maze.locale.v1";
const supported = new Set(LOCALES.map((l) => l.code));

/** Map browser language tags to a supported locale ("in" is legacy Indonesian). */
export function detectLocale(languages) {
  for (const tag of Array.isArray(languages) ? languages : []) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (base === "zh") return "zh-TW";
    if (base === "in") return "id";
    if (supported.has(base)) return base;
  }
  return "zh-TW";
}

const browserStorage = () =>
  typeof window === "undefined" ? undefined : window.localStorage;
const browserLanguages = () =>
  typeof navigator === "undefined" ? [] : navigator.languages;

export function createI18n({
  storage = browserStorage,
  languages = browserLanguages(),
} = {}) {
  let saved;
  try {
    saved = storage()?.getItem(localeStorageKey);
  } catch {
    /* Storage is optional. */
  }
  const locale = ref(supported.has(saved) ? saved : detectLocale(languages));
  function t(key, params = {}) {
    const text = catalogs[locale.value]?.[key] ?? zhTW[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      name in params ? String(params[name]) : match
    );
  }
  return {
    locale: readonly(locale),
    t,
    setLocale(code) {
      if (!supported.has(code)) return;
      locale.value = code;
      try {
        storage()?.setItem(localeStorageKey, code);
      } catch {
        /* Keep in-memory choice. */
      }
    },
  };
}

let shared;
export const useI18n = () => (shared ??= createI18n());
export const htmlLang = (code) =>
  LOCALES.find((l) => l.code === code)?.htmlLang ?? "zh-Hant-TW";
