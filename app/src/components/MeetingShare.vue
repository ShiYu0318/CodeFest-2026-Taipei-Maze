<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section
    v-if="point"
    class="meeting-share"
    aria-labelledby="meeting-share-title"
  >
    <h3 id="meeting-share-title">在這裡等朋友（合成測試）</h3>
    <p>{{ graph.messages[point.name_key] }} · {{ floor.toUpperCase() }}</p>
    <p>{{ graph.messages[point.waiting_guidance_key] }}</p>
    <p>
      最後定位確認：{{
        position.confirmedAt
      }}。連結只代表固定集合點，不能證明你現在仍在場。
    </p>
    <label
      ><input
        v-model="acknowledged"
        type="checkbox"
        :disabled="!canShare"
      />我仍在此點，並會在此等候；這不是即時位置分享。</label
    >
    <button :disabled="!canShare || !acknowledged" @click="generate">
      產生集合連結
    </button>
    <div v-if="link">
      <label for="meeting-share-link">集合連結（可手動選取複製）</label>
      <input
        id="meeting-share-link"
        :value="link"
        readonly
        @focus="$event.target.select()"
      />
      <button @click="copy">複製連結</button
      ><button v-if="canNativeShare" @click="share">開啟系統分享選單</button>
      <router-link :to="localView">在這台裝置查看集合卡</router-link>
    </div>
    <p v-if="notice" role="status">{{ notice }}</p>
  </section>
</template>
<script setup>
/* global defineProps */
import { computed, ref, watch } from "vue";
import points from "../meeting/meeting-points.json";
import { createMeetingLink } from "../meeting/meeting.mjs";
const props = defineProps({
  graph: { type: Object, required: true },
  position: { type: Object, default: null },
  canShare: { type: Boolean, default: false },
});
const acknowledged = ref(false),
  link = ref(""),
  notice = ref("");
const point = computed(() =>
  points.find(
    (p) => p.anchor_id === props.position?.anchorId && p.enabled && p.shareable
  )
);
const floor = computed(
  () =>
    props.graph.nodes.find((n) => n.id === props.position?.nodeId)?.floor_id ??
    ""
);
const canNativeShare =
  typeof navigator.share === "function" && window.isSecureContext;
const localView = computed(() =>
  link.value ? "/meet" + new URL(link.value).search : "/meet"
);
watch(
  () => [props.position?.confirmedAt, props.canShare],
  () => {
    acknowledged.value = false;
    link.value = "";
    notice.value = "";
  }
);
function generate() {
  const r = createMeetingLink(props.graph, points, {
    pointId: point.value?.id,
    position: props.position,
    confirmedStillHere: acknowledged.value && props.canShare,
  });
  if (r.type === "success") {
    link.value = r.url;
    notice.value = "連結已產生，尚未傳送給任何人。定位確認時間沒有改寫。";
  } else notice.value = "此位置目前不能分享，請重新掃碼並確認。";
}
async function copy() {
  try {
    if (!navigator.clipboard?.writeText) throw new Error();
    await navigator.clipboard.writeText(link.value);
    notice.value = "已複製；請自行選擇對象傳送。";
  } catch {
    notice.value = "此環境無法自動複製，請選取上方完整連結手動複製。";
  }
}
async function share() {
  try {
    await navigator.share({ title: "Taipei Maze 合成集合點", url: link.value });
    notice.value = "系統分享流程已結束；無法確認對方是否收到或仍在場。";
  } catch {
    notice.value = "分享未完成或已取消，集合卡仍保留，可手動複製連結。";
  }
}
</script>
<style scoped>
.meeting-share {
  background: var(--demo-wash, #f1f8f5);
  border-left: 4px solid var(--demo-destination, #39725b);
  padding: 16px;
  margin-top: 20px;
  line-height: 1.65;
}
h3 {
  margin: 0 0 10px;
}
label {
  display: block;
}
input[readonly] {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 10px;
  color: var(--demo-ink, #213b43);
}
button {
  min-height: 44px;
  font: inherit;
  margin: 8px 8px 8px 0;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--demo-surface, white);
  border: 1px solid var(--demo-destination, #39725b);
  border-radius: 6px;
  color: var(--demo-ink, #213b43);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
a {
  display: block;
  color: var(--demo-accent, #326875);
}
</style>
