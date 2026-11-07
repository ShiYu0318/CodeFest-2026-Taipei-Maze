// SPDX-License-Identifier: AGPL-3.0-or-later
// The reviewed search dictionary covers Chinese and English only. When it
// knows nothing about the query, fall back to the seven-language facility
// names the station helper uses, so Vietnamese, Thai, Korean, Japanese and
// Indonesian visitors also find places. Dictionary results are untouched.
import { detectType } from "../chat/answers.mjs";

export function withLocalizedFallback(result, query, catalog) {
  if (result?.status !== "noMatch" || result.reason !== "noKnownDestination")
    return result;
  const type = detectType(query);
  if (!type) return result;
  const matches = catalog
    .filter((entry) => entry.category === type && entry.enabled !== false)
    .map((entry) => ({
      poiId: entry.id,
      name: entry.name,
      floorId: entry.floorId,
      category: entry.category,
      conceptId: null,
      matchedAlias: String(query).trim(),
      aliasLocale: null,
      matchType: "dictionary",
      editDistance: 0,
      reachability: "unknown",
      graphCost: null,
    }))
    .sort((a, b) => (a.poiId < b.poiId ? -1 : a.poiId > b.poiId ? 1 : 0));
  if (!matches.length) return result;
  return {
    ...result,
    status: "matched",
    reason: null,
    unparsedTerms: [],
    matches,
  };
}
