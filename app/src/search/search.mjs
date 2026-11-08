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
function unambiguous(tokens, target) {
  const seen = new Map();
  for (const token of tokens) {
    const text = normalizeQuery(token.text);
    if (seen.has(text) && seen.get(text) !== token[target]) return false;
    seen.set(text, token[target]);
  }
  return true;
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
    d.fillers.every(validToken) &&
    unambiguous(d.aliases, "concept_id") &&
    unambiguous(d.intent_aliases, "intent_id")
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
  /[0-9_]/u.test(s) ||
  /^[a-z][a-z0-9]*-[a-z0-9_-]+$/i.test(s) ||
  /^(?:toilet|restroom|elevator|lift|exit|gate)[a-z0-9]+$/i.test(s);
const tokenOrder = (locale) => (a, b) =>
  [...normalizeQuery(b.text)].length - [...normalizeQuery(a.text)].length ||
  Number(b.locale === locale) - Number(a.locale === locale) ||
  (a.text < b.text ? -1 : a.text > b.text ? 1 : 0);

/** Search only supplied POIs. Prototype mode admits visibly labeled draft seed words; release excludes them. */
const facilityText = (value) =>
  normalizeQuery(value)
    .replace(/臺/gu, "台")
    .replace(/[\s\p{P}]/gu, "");
function floorQuery(query) {
  const floors = new Set();
  let text = query.replace(
    /(^|[^a-z0-9])(1f|b[1-4])(?=$|[^a-z0-9])/gu,
    (_, prefix, floor) => {
      floors.add(floor);
      return prefix + " ";
    }
  );
  const numbers = { 一: 1, 二: 2, 三: 3, 四: 4 };
  text = text.replace(/地下([一二三四1-4])(?:樓|層)/gu, (_, n) => {
    floors.add("b" + (numbers[n] ?? n));
    return " ";
  });
  text = text.replace(/(^|\s)(?:一|1)(?:樓|層)/gu, (_, prefix) => {
    floors.add("1f");
    return prefix + " ";
  });
  return { text: text.trim(), floors: [...floors] };
}
function codeMatches(name, query) {
  const codes = query.match(/[a-z]+\d+/gu) ?? [];
  return codes.every((code) =>
    new RegExp("(^|[^a-z0-9])" + code + "(?=$|[^a-z0-9])", "u").test(
      normalizeQuery(name)
    )
  );
}

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
  if (
    !record(options) ||
    (options.workBudget !== undefined &&
      (!Number.isInteger(options.workBudget) || options.workBudget < 0))
  )
    return base;
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
  const parsedFloor = floorQuery(normalized);
  if (parsedFloor.floors.length > 1)
    return { ...base, status: "needsClarification", reason: "multipleFloors" };
  const requestedFloor = parsedFloor.floors[0];
  if (requestedFloor) base.requestedFloor = requestedFloor;
  const searchText = parsedFloor.text;
  const enabled = catalog.filter(
    (p) =>
      p.enabled &&
      (!requestedFloor || p.floorId.toLowerCase() === requestedFloor)
  );
  const use = (t) =>
    t.review_status === "approved" ||
    (options.prototype === true && t.review_status === "draft");
  const aliases = dictionary.aliases
    .filter(use)
    .sort(tokenOrder(options.uiLocale ?? "zh-TW"));
  const intents = dictionary.intent_aliases
    .filter(use)
    .sort(tokenOrder(options.uiLocale ?? "zh-TW"));
  let remaining = clean(searchText);
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
  let nameSearchText = remaining;
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
    .sort(tokenOrder(options.uiLocale ?? "zh-TW"))) {
    remaining = consume(remaining, token).rest;
    nameSearchText = consume(nameSearchText, token).rest;
  }
  remaining = clean(remaining);
  if (recognized.has("nearest"))
    return {
      ...base,
      status: "needsClarification",
      reason: "nearestUnavailable",
      unparsedTerms: remaining ? [remaining] : [],
    };
  // Typography adds spaces between Chinese and numbers ("北 1 門"); visitors
  // may type "北1門" and leave off the exit code, so compare without spaces.
  const compact = searchText.replace(/\s+/gu, "");
  const exact = enabled.filter((p) => {
    const name = normalizeQuery(p.name);
    return (
      name === searchText ||
      (compact.length >= 2 &&
        [name, name.replace(/\s+[a-z]+\d+$/u, "")].some(
          (candidate) => candidate.replace(/\s+/gu, "") === compact
        ))
    );
  });
  const rawName = facilityText(nameSearchText),
    restName = facilityText(remaining);
  const selectedConcept = dictionary.concepts.find(
    (c) => c.id === concepts.keys().next().value
  );
  const numberQuery = /^(?:第)?(\d+)(?:號)?$/u.exec(restName);
  const categoryHasEntries = enabled.some((entry) =>
    selectedConcept?.categories.includes(entry.category)
  );
  const numberedFacility = (name, category) => {
    const nouns = {
      elevator: "(?:無障礙)?電梯|升降機",
      restroom: "廁所|洗手間",
      stairs: "樓梯|階梯|梯口",
      escalator: "電扶梯",
      exit: "出口|門",
    }[category];
    if (!nouns || !numberQuery) return false;
    const number = numberQuery[1];
    return (
      new RegExp("(^|[^0-9])" + number + "號(?:" + nouns + ")", "u").test(
        name
      ) ||
      new RegExp(
        "(?:" + nouns + ")(?:第)?" + number + "(?:號)?(?=$|[^0-9車])",
        "u"
      ).test(name)
    );
  };
  const partial = enabled.filter((p) => {
    const name = facilityText(p.name);
    if (!searchText && requestedFloor) return true;
    if (numberQuery && concepts.size === 1)
      return (
        selectedConcept?.categories.includes(p.category) &&
        numberedFacility(name, p.category)
      );
    if (
      (!concepts.size || remaining || !categoryHasEntries) &&
      rawName.length >= 2 &&
      name.includes(rawName) &&
      codeMatches(p.name, nameSearchText)
    )
      return true;
    if (
      concepts.size !== 1 ||
      !restName ||
      ["no", "not", "without", "不要", "不"].includes(restName) ||
      !selectedConcept?.categories.includes(p.category)
    )
      return false;
    return (
      restName.length >= 2 &&
      name.includes(restName) &&
      codeMatches(p.name, remaining)
    );
  });
  const nameMatches = exact.length ? exact : partial;
  if (
    !concepts.size &&
    !nameMatches.length &&
    remaining &&
    !codeLike(remaining)
  ) {
    if (
      aliases.some(
        (alias) =>
          alias.locale === "en" &&
          ["no", "not", "without"].some(
            (prefix) => remaining === prefix + normalizeQuery(alias.text)
          )
      )
    )
      return {
        ...base,
        status: "needsClarification",
        reason: "unparsedTerms",
        unparsedTerms: [remaining],
      };
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
  if (concepts.size > 1 && !nameMatches.length)
    return {
      ...base,
      status: "needsClarification",
      reason: "multipleDestinations",
    };
  if (concepts.size && remaining && !nameMatches.length)
    return {
      ...base,
      status: "needsClarification",
      reason: "unparsedTerms",
      unparsedTerms: [remaining],
    };
  if (!concepts.size && !nameMatches.length)
    return {
      ...base,
      status: recognized.size ? "needsClarification" : "noMatch",
      reason: recognized.size ? "missingDestination" : "noKnownDestination",
      unparsedTerms: remaining ? [remaining] : [],
    };
  const [conceptId, evidence] = concepts.entries().next().value ?? [null, null];
  const concept = dictionary.concepts.find((c) => c.id === conceptId);
  let matches = nameMatches.length
    ? nameMatches
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
      matchType: exact.length
        ? "exact"
        : nameMatches.length
        ? "name"
        : evidence.matchType,
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
