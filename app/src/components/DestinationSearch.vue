<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="destination-search" :aria-labelledby="id + '-title'">
    <h2 :id="id + '-title'">用名稱找設施</h2>
    <p class="search-hint">
      七語詞典原型，詞彙尚待校對。只搜尋本頁已載入的設施，不使用遠端 AI。
    </p>
    <form @submit.prevent="submit">
      <label :for="id + '-query'">設施名稱或簡單需求（最多 80 字）</label>
      <div class="search-input-row">
        <input
          :id="id + '-query'"
          v-model="query"
          :disabled="disabled"
          type="search"
          autocomplete="off"
          :spellcheck="false"
          placeholder="廁所、restrom、nhà vệ sinh…"
        />
        <button type="submit" :disabled="disabled || !query.trim()">
          搜尋
        </button>
      </div>
      <button
        v-if="query"
        type="button"
        :disabled="disabled"
        @click="query = ''"
      >
        清除查詢
      </button>
    </form>
    <p v-if="!navigation" class="search-hint">
      本頁只查設施位置，不會規劃避樓梯或無障礙路線，也不判斷最近。
    </p>
    <div v-if="result" role="status" aria-live="polite">
      <p>{{ statusText }}</p>
      <p v-if="result.unparsedTerms?.length" class="search-hint">
        尚未理解：{{
          result.unparsedTerms.join("、")
        }}。請改用設施名稱或已支援的條件。
      </p>
      <p v-if="selectable && restrictionText" class="search-conditions">
        {{ restrictionText }}
      </p>
      <p v-if="result.status === 'suggestionsOnly'" class="search-hint">
        可能是「{{
          result.matches[0]?.matchedAlias
        }}」；請確認下方實際設施，不會自動導航。
      </p>
      <ul
        v-if="selectable && result.matches.length"
        class="search-results"
        aria-label="搜尋到的設施"
      >
        <li v-for="match in result.matches" :key="match.poiId">
          <span
            ><strong>{{ match.name }}</strong
            ><small
              >{{ match.floorId.toUpperCase() }} ·
              {{
                match.matchType === "fuzzy"
                  ? "錯字建議"
                  : match.matchType === "exact"
                  ? "名稱相符"
                  : "詞典對應"
              }}
              · 可達性尚待確認</small
            ></span
          >
          <button :disabled="disabled" @click="choose(match)">
            {{ navigation ? "確認設施與條件" : "在地圖上查看" }}
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
const query = ref(""),
  result = shallowRef(null),
  selectionNotice = ref("");
let submittedQuery = null,
  submittedOptions = null,
  submittedCatalog = null;
const selectable = computed(() =>
  ["matched", "suggestionsOnly"].includes(result.value?.status)
);
const statusText = computed(() => {
  if (result.value?.reason === "nearestUnavailable")
    return "最近排序尚未啟用，需新確認的起點與可用走道路網。請先改查設施名稱。";
  return (
    {
      matched: `找到 ${result.value?.matches.length} 個設施，請自行確認選擇。`,
      suggestionsOnly: "這是錯字建議，請確認你要找的設施。",
      noMatch: "目前資料沒有符合條件的設施；不代表全站都沒有。",
      needsClarification: "這段需求還不夠明確，請分開查詢一個目的地。",
      invalidInput: "請輸入 1–80 字；全形字正規化後也不能超過 80 字。",
      invalidDictionary: "詞典資料無法使用，請改用原有設施清單。",
      invalidCatalog: "設施資料無法使用，請改用原有清單。",
      incomplete: "查詢未完成，不能據此判定設施不存在。請改用較短名稱。",
    }[result.value?.status] ?? ""
  );
});
const restrictionText = computed(() => {
  const options = result.value?.proposedOptions;
  if (!options) return "";
  const labels = [];
  if (options.mobilityProfile === "stepFree")
    labels.push("保留／使用無階梯限制");
  if (options.excludedEdgeTypes.includes("stairs")) labels.push("避開樓梯");
  if (options.excludedEdgeTypes.includes("elevator")) labels.push("避開電梯");
  if (options.unavailableConnectorIds.length) labels.push("保留本次不可用設備");
  return labels.length
    ? `${
        props.navigation ? "選擇後套用：" : "解析到的條件（本頁不規劃路線）："
      }${labels.join("、")}`
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
    uiLocale: "zh-TW",
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
    selectionNotice.value = "條件已變更，請重新搜尋。";
    return;
  }
  emit("select", {
    poiId: match.poiId,
    proposedOptions: result.value.proposedOptions,
  });
  selectionNotice.value = props.navigation
    ? "已選擇目的地；請依導航區提示確認位置與朝向。"
    : "已切換至設施所在樓層並選取標點。";
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
