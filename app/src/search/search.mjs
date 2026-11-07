// SPDX-License-Identifier: AGPL-3.0-or-later
const edgeTypes = ["walkway", "stairs", "elevator", "escalator", "gate"];
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export function normalizeQuery(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLowerCase().replace(/\s+/gu, " ")
    : null;
}

/** Optimal String Alignment over Unicode code points. null means the shared work budget ran out. */
export function osaDistance(left, right, budget = { remaining: Infinity }) {
  const a = [...left],
    b = [...right];
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i),
    older = null;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      if (--budget.remaining < 0) return null;
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        row[j] = Math.min(row[j], older[j - 2] + 1);
    }
    older = previous;
    previous = row;
  }
  return previous[b.length];
}
function validDictionary(d) {
  if (
    !record(d) ||
    typeof d.dictionary_version !== "string" ||
    typeof d.intent_rules_version !== "string" ||
    !Array.isArray(d.concepts) ||
    !Array.isArray(d.aliases) ||
    !Array.isArray(d.intent_aliases) ||
    !Array.isArray(d.fillers) ||
    !Array.isArray(d.sources)
  )
    return false;
  const concepts = new Set();
  for (const c of d.concepts) {
    if (
      !record(c) ||
      typeof c.id !== "string" ||
      concepts.has(c.id) ||
      !Array.isArray(c.categories) ||
      !c.categories.length ||
      c.categories.some((x) => typeof x !== "string")
    )
      return false;
    concepts.add(c.id);
  }
  const sources = new Set(d.sources.filter(record).map((s) => s.id));
  const validToken = (t) =>
    record(t) &&
    typeof t.text === "string" &&
    !!normalizeQuery(t.text) &&
    [...normalizeQuery(t.text)].length <= 80 &&
    typeof t.locale === "string" &&
    ["draft", "approved", "rejected"].includes(t.review_status) &&
    Array.isArray(t.source_ids) &&
    t.source_ids.length > 0 &&
    t.source_ids.every((id) => typeof id === "string" && sources.has(id));
  return (
    d.aliases.length <= 5000 &&
    d.intent_aliases.length <= 1000 &&
    d.fillers.length <= 1000 &&
    d.aliases.every((t) => validToken(t) && concepts.has(t.concept_id)) &&
    d.intent_aliases.every(
      (t) =>
        validToken(t) &&
        ["accessible", "avoid_stairs", "nearest"].includes(t.intent_id)
    ) &&
    d.fillers.every(validToken)
  );
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function consume(text, token) {
  const phrase = normalizeQuery(token.text);
  // Spaces are not required in these scripts; remaining text is still checked, never silently ignored.
  const pattern = ["zh-TW", "ja", "th"].includes(token.locale)
    ? escape(phrase)
    : `(^|[^\\p{L}\\p{N}])${escape(phrase)}(?=$|[^\\p{L}\\p{N}])`;
  const regex = new RegExp(pattern, "gu");
  let found = false;
  const rest = text.replace(regex, (...args) => {
    found = true;
    return args.length > 3 && typeof args[1] === "string" ? args[1] + " " : " ";
  });
  return { found, rest };
}
const clean = (s) =>
  s
    .replace(/[?!。，、！？；;:]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
const codeLike = (s) =>
  /^(?:[a-z]{1,4}\d+[a-z]?|[a-z][a-z0-9]*[_-][a-z0-9_-]+)$/i.test(s);
const tokenOrder = (locale) => (a, b) =>
  [...normalizeQuery(b.text)].length - [...normalizeQuery(a.text)].length ||
  (a.locale === locale ? -1 : b.locale === locale ? 1 : 0) ||
  (a.text < b.text ? -1 : a.text > b.text ? 1 : 0);

/** Search only supplied POIs. Prototype mode admits visibly labeled draft seed words; release excludes them. */
export function searchCatalog(rawQuery, catalog, dictionary, options = {}) {
  const base = {
    status: "invalidInput",
    normalizedQuery: null,
    matches: [],
    recognizedIntents: [],
    unparsedTerms: [],
    requiresConfirmation: true,
    proposedOptions: null,
    dictionaryVersion: dictionary?.dictionary_version ?? null,
    intentRulesVersion: dictionary?.intent_rules_version ?? null,
  };
  const normalized = normalizeQuery(rawQuery);
  if (
    normalized === null ||
    !normalized ||
    [...rawQuery].length > 80 ||
    [...normalized].length > 80
  )
    return base;
  base.normalizedQuery = normalized;
  const current = options.currentOptions ?? {};
  if (
    !record(current) ||
    !["standard", "stepFree"].includes(current.mobilityProfile ?? "standard") ||
    !Array.isArray(current.excludedEdgeTypes ?? []) ||
    (current.excludedEdgeTypes ?? []).some((t) => !edgeTypes.includes(t)) ||
    !Array.isArray(current.unavailableConnectorIds ?? []) ||
    (current.unavailableConnectorIds ?? []).some((id) => typeof id !== "string")
  )
    return base;
  base.proposedOptions = {
    mobilityProfile: current.mobilityProfile ?? "standard",
    excludedEdgeTypes: [...new Set(current.excludedEdgeTypes ?? [])],
    unavailableConnectorIds: [
      ...new Set(current.unavailableConnectorIds ?? []),
    ],
  };
  if (!validDictionary(dictionary))
    return { ...base, status: "invalidDictionary" };
  if (
    !Array.isArray(catalog) ||
    catalog.some(
      (p) =>
        !record(p) ||
        typeof p.id !== "string" ||
        typeof p.name !== "string" ||
        typeof p.category !== "string" ||
        typeof p.floorId !== "string" ||
        typeof p.enabled !== "boolean" ||
        ![true, false, null, undefined].includes(p.accessibleFacility)
    ) ||
    new Set(catalog.map((p) => p.id)).size !== catalog.length
  )
    return { ...base, status: "invalidCatalog" };
  const enabled = catalog.filter((p) => p.enabled);
  const use = (t) =>
    t.review_status === "approved" ||
    (options.prototype === true && t.review_status === "draft");
  const aliases = dictionary.aliases
    .filter(use)
    .sort(tokenOrder(options.uiLocale ?? "zh-TW"));
  const intents = dictionary.intent_aliases
    .filter(use)
    .sort(tokenOrder(options.uiLocale ?? "zh-TW"));
  let remaining = clean(normalized);
  const recognized = new Set();
  for (const token of intents) {
    const match = consume(remaining, token);
    if (match.found) {
      recognized.add(token.intent_id);
      remaining = match.rest;
    }
  }
  base.recognizedIntents = [...recognized];
  if (recognized.has("accessible"))
    base.proposedOptions.mobilityProfile = "stepFree";
  if (recognized.has("avoid_stairs"))
    base.proposedOptions.excludedEdgeTypes = [
      ...new Set([...base.proposedOptions.excludedEdgeTypes, "stairs"]),
    ];
  const concepts = new Map();
  for (const alias of aliases) {
    const match = consume(remaining, alias);
    if (match.found) {
      if (!concepts.has(alias.concept_id))
        concepts.set(alias.concept_id, {
          alias,
          matchType:
            normalizeQuery(alias.text) === normalized ? "alias" : "phrase",
          editDistance: 0,
        });
      remaining = match.rest;
    }
  }
  for (const token of dictionary.fillers
    .filter(use)
    .sort(tokenOrder(options.uiLocale ?? "zh-TW")))
    remaining = consume(remaining, token).rest;
  remaining = clean(remaining);
  if (recognized.has("nearest"))
    return {
      ...base,
      status: "needsClarification",
      reason: "nearestUnavailable",
      unparsedTerms: remaining ? [remaining] : [],
    };
  const exact = enabled.filter((p) => normalizeQuery(p.name) === normalized);
  if (!concepts.size && !exact.length && remaining && !codeLike(remaining)) {
    const budget = { remaining: options.workBudget ?? 100_000 };
    let best = Infinity,
      candidates = [];
    for (const alias of aliases) {
      const word = normalizeQuery(alias.text),
        len = [...word].length,
        qLen = [...remaining].length,
        max = len < 4 ? 0 : len < 8 ? 1 : 2;
      if (!max || codeLike(word) || Math.abs(len - qLen) > max) continue;
      const distance = osaDistance(remaining, word, budget);
      if (distance === null)
        return { ...base, status: "incomplete", reason: "workBudgetExceeded" };
      if (distance > max || distance / Math.max(len, qLen) > 0.3) continue;
      if (distance < best) {
        best = distance;
        candidates = [];
      }
      if (distance === best) candidates.push(alias);
    }
    for (const alias of candidates)
      if (!concepts.has(alias.concept_id))
        concepts.set(alias.concept_id, {
          alias,
          matchType: "fuzzy",
          editDistance: best,
        });
    if (concepts.size) remaining = "";
  }
  if (concepts.size > 1 && !exact.length)
    return {
      ...base,
      status: "needsClarification",
      reason: "multipleDestinations",
    };
  if (concepts.size && remaining && !exact.length)
    return {
      ...base,
      status: "needsClarification",
      reason: "unparsedTerms",
      unparsedTerms: [remaining],
    };
  if (!concepts.size && !exact.length)
    return {
      ...base,
      status: recognized.size ? "needsClarification" : "noMatch",
      reason: recognized.size ? "missingDestination" : "noKnownDestination",
      unparsedTerms: remaining ? [remaining] : [],
    };
  const [conceptId, evidence] = concepts.entries().next().value ?? [null, null];
  const concept = dictionary.concepts.find((c) => c.id === conceptId);
  let matches = exact.length
    ? exact
    : enabled.filter((p) => concept.categories.includes(p.category));
  if (recognized.has("accessible"))
    matches = matches.filter((p) => p.accessibleFacility === true);
  matches = matches
    .map((p) => ({
      poiId: p.id,
      name: p.name,
      floorId: p.floorId,
      category: p.category,
      conceptId,
      matchedAlias: evidence?.alias.text ?? p.name,
      aliasLocale: evidence?.alias.locale ?? null,
      matchType: exact.length ? "exact" : evidence.matchType,
      editDistance: evidence?.editDistance ?? 0,
      reachability: "unknown",
      graphCost: null,
    }))
    .sort((a, b) => (a.poiId < b.poiId ? -1 : a.poiId > b.poiId ? 1 : 0));
  return {
    ...base,
    status: matches.length
      ? evidence?.matchType === "fuzzy"
        ? "suggestionsOnly"
        : "matched"
      : "noMatch",
    reason: matches.length ? null : "noEligibleFacility",
    matches,
  };
}
