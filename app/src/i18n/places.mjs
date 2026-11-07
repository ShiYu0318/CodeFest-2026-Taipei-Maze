// SPDX-License-Identifier: AGPL-3.0-or-later
// Station place names stay in Traditional Chinese (that is what the signs
// show). Other languages get a translated facility type plus the sign codes,
// and lists add the on-site Chinese name so visitors can match the signs.

const firstType = (type) => (Array.isArray(type) ? type[0] : type);

/** Identifiers printed on signs: numbers, exit codes (M4), areas (K), floors. */
export function placeCodes(name = "") {
  return [
    ...String(name).matchAll(/(?:[A-Z]\d+|\d+(?=\s*號)|[A-Z](?=\s*區))/g),
  ].map((match) => match[0]);
}

export function placeName(point, { locale, t }) {
  if (locale.value === "zh-TW") return point.name;
  const key = `type.${firstType(point.type)}`;
  const type = t(key);
  if (type === key) return point.name;
  const codes = placeCodes(point.name);
  return codes.length ? `${type} ${codes.join("/")}` : type;
}

export function placeLabel(point, i18n) {
  const name = placeName(point, i18n);
  return name === point.name ? name : `${name} (${point.name})`;
}
