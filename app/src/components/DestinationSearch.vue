<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="destination-search" :aria-labelledby="id + '-title'">
    <h2 :id="id + '-title'">{{ t("search.title") }}</h2>
    <p class="search-hint">
      {{ t("search.note") }}
    </p>
    <form @submit.prevent="submit">
      <label :for="id + '-query'">{{ t("search.label") }}</label>
      <div class="search-input-row">
        <input
          :id="id + '-query'"
          v-model="query"
          :disabled="disabled"
          type="search"
          autocomplete="off"
          :spellcheck="false"
          :placeholder="t('search.placeholder')"
        />
        <button type="submit" :disabled="disabled || !query.trim()">
          {{ t("search.submit") }}
        </button>
      </div>
      <button
        v-if="query"
        type="button"
        :disabled="disabled"
        @click="query = ''"
      >
        {{ t("search.clear") }}
      </button>
    </form>
    <p v-if="!navigation" class="search-hint">
      {{ t("search.scope") }}
    </p>
    <div v-if="result" role="status" aria-live="polite">
      <p>{{ statusText }}</p>
      <p v-if="result.unparsedTerms?.length" class="search-hint">
        {{
          t("search.unknown", {
            terms: result.unparsedTerms.join(t("search.listSeparator")),
          })
        }}
      </p>
      <p v-if="selectable && restrictionText" class="search-conditions">
        {{ restrictionText }}
      </p>
      <p v-if="result.status === 'suggestionsOnly'" class="search-hint">
        {{ t("search.maybe", { term: result.matches[0]?.matchedAlias }) }}
      </p>
      <ul
        v-if="selectable && result.matches.length"
        class="search-results"
        :aria-label="t('search.results')"
      >
        <li v-for="match in result.matches" :key="match.poiId">
          <span
            ><strong>{{ matchName(match) }}</strong
            ><small
              >{{ match.floorId.toUpperCase() }} ·
              {{
                match.matchType === "fuzzy"
                  ? t("search.typo")
                  : match.matchType === "exact"
                  ? t("search.exact")
                  : t("search.dictionary")
              }}
              · {{ t("search.accessUnknown") }}</small
            ></span
          >
          <button :disabled="disabled" @click="choose(match)">
            {{ navigation ? t("search.confirm") : t("search.showOnMap") }}
          </button>
        </li>
      </ul>
    </div>
    <p v-if="selectionNotice" role="status">{{ selectionNotice }}</p>
  </section>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, ref, shallowRef, watch } from "vue";
import dictionary from "../search/dictionary.json";
import { searchCatalog } from "../search/search.mjs";
import { useI18n } from "../i18n/index.mjs";
import { placeLabel } from "../i18n/places.mjs";
const props = defineProps({
  id: { type: String, required: true },
  catalog: { type: Array, required: true },
  navigation: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  currentOptions: {
    type: Object,
    default: () => ({
      mobilityProfile: "standard",
      excludedEdgeTypes: [],
      unavailableConnectorIds: [],
    }),
  },
  clearToken: { type: Number, default: 0 },
});
const emit = defineEmits(["select"]);
const i18n = useI18n();
const { locale, t } = i18n;
const matchName = (match) => {
  const entry = props.catalog.find((item) => item.id === match.poiId);
  return entry
    ? placeLabel({ name: entry.name, type: entry.category }, i18n)
    : match.name;
};
const query = ref(""),
  result = shallowRef(null),
  selectionNotice = ref("");
let submittedQuery = null,
  submittedOptions = null,
  submittedCatalog = null;
const selectable = computed(() =>
  ["matched", "suggestionsOnly"].includes(result.value?.status)
);
const statuses = new Set([
  "matched",
  "suggestionsOnly",
  "noMatch",
  "needsClarification",
  "invalidInput",
  "invalidDictionary",
  "invalidCatalog",
  "incomplete",
]);
const statusText = computed(() => {
  if (result.value?.reason === "nearestUnavailable")
    return t("search.nearestUnavailable");
  const status = result.value?.status;
  return statuses.has(status)
    ? t(`search.status.${status}`, { count: result.value.matches.length })
    : "";
});
const restrictionText = computed(() => {
  const options = result.value?.proposedOptions;
  if (!options) return "";
  const labels = [];
  if (options.mobilityProfile === "stepFree")
    labels.push(t("search.cond.stepFree"));
  if (options.excludedEdgeTypes.includes("stairs"))
    labels.push(t("search.cond.avoidStairs"));
  if (options.excludedEdgeTypes.includes("elevator"))
    labels.push(t("search.cond.avoidElevator"));
  if (options.unavailableConnectorIds.length)
    labels.push(t("search.cond.keepUnavailable"));
  return labels.length
    ? t(props.navigation ? "search.cond.apply" : "search.cond.parsed", {
        list: labels.join(t("search.listSeparator")),
      })
    : "";
});
watch(
  [query, () => props.catalog, () => JSON.stringify(props.currentOptions)],
  () => {
    result.value = null;
    selectionNotice.value = "";
  }
);
watch(
  () => props.clearToken,
  () => {
    query.value = "";
    result.value = null;
    selectionNotice.value = "";
  }
);
function submit() {
  result.value = searchCatalog(query.value, props.catalog, dictionary, {
    prototype: true,
    uiLocale: locale.value,
    currentOptions: props.currentOptions,
  });
  submittedQuery = query.value;
  submittedOptions = JSON.stringify(props.currentOptions);
  submittedCatalog = props.catalog;
  selectionNotice.value = "";
}
function choose(match) {
  if (props.disabled || !selectable.value) return;
  if (
    query.value !== submittedQuery ||
    JSON.stringify(props.currentOptions) !== submittedOptions ||
    props.catalog !== submittedCatalog
  ) {
    result.value = null;
    selectionNotice.value = t("search.changed");
    return;
  }
  emit("select", {
    poiId: match.poiId,
    proposedOptions: result.value.proposedOptions,
  });
  selectionNotice.value = props.navigation
    ? t("search.selectedNav")
    : t("search.selectedMap");
}
</script>

<style scoped>
.destination-search {
  margin: 20px 0;
  padding: 18px;
  border: 1px solid var(--demo-border, #b8cdd3);
  border-radius: 10px;
  text-align: left;
  color: var(--demo-ink, #213b43);
  background: var(--demo-wash, #f4fafb);
  font: inherit;
}
h2 {
  margin: 0 0 8px;
  font-size: 1.15rem;
}
p {
  line-height: 1.6;
}
.search-hint,
small {
  display: block;
  font-size: 0.85rem;
  color: var(--demo-muted, #465b62);
}
label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}
.search-input-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
input,
button {
  font: inherit;
  min-height: 44px;
  border-radius: 6px;
  border: 1px solid var(--demo-border, #70949e);
  padding: 9px 12px;
}
input {
  min-width: 0;
  width: 100%;
  flex: 1 1 180px;
  background: var(--demo-surface, white);
  color: var(--demo-ink, #213b43);
}
button {
  background: var(--demo-surface, white);
  color: var(--demo-accent, #284f5b);
  cursor: pointer;
  margin-top: 4px;
}
button[type="submit"] {
  background: var(--demo-accent, #326875);
  color: var(--demo-on-accent, white);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
:where(input, button):focus-visible {
  outline: 3px solid var(--demo-current, #8a501b);
  outline-offset: 3px;
}
.search-results {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  max-height: 360px;
  overflow-y: auto;
}
.search-results li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--demo-border, #cbdadd);
}
.search-results li > span {
  flex: 1 1 160px;
  overflow-wrap: anywhere;
}
.search-conditions {
  border-left: 3px solid var(--demo-accent, #326875);
  padding-left: 10px;
}
</style>
