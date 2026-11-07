// SPDX-License-Identifier: AGPL-3.0-or-later
// "Show to staff" card: a request in Traditional Chinese that a visitor who
// cannot speak Chinese can hand to station staff or a passer-by, with the
// same words in the visitor's own language so they know what they show.
import { catalogs } from "../i18n/index.mjs";
import { placeName } from "../i18n/places.mjs";

const zh = catalogs["zh-TW"];
const fill = (text, values) =>
  text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

export function staffCard(point, { stepFree = false } = {}, i18n) {
  const { locale, t } = i18n;
  // Chinese readers (children, seniors) just say thanks; visitors also say
  // they do not speak Chinese well.
  const thanks =
    locale.value === "zh-TW" ? "staff.thanksPlain" : "staff.thanks";
  const keys = ["staff.ask", ...(stepFree ? ["staff.stepFree"] : []), thanks];
  return {
    icon: [point.type].flat()[0],
    floor: `${point.floor} ${zh[`floor.${point.floor}`] ?? ""}`.trim(),
    // Staff read the name printed on the station signs.
    chinese: keys.map((key) => fill(zh[key], { place: point.name })),
    visitor:
      locale.value === "zh-TW"
        ? []
        : keys.map((key) => t(key, { place: placeName(point, i18n) })),
    visitorLang: locale.value,
  };
}
