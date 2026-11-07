<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <main
    class="navigation-lab display-page"
    :data-theme="theme"
    :class="{ 'simple-mode': simpleMode }"
    lang="zh-Hant"
  >
    <header class="lab-header">
      <router-link to="/station-map">← 回車站地圖</router-link>
      <span>導航流程測試</span>
    </header>
    <h1>確認位置，再走下一步</h1>
    <button
      type="button"
      :aria-pressed="simpleMode"
      @click="simpleMode = !simpleMode"
    >
      {{ simpleMode ? "切回標準模式" : "切換易讀模式" }}
    </button>
    <p class="synthetic-notice">
      <strong>合成測試場景</strong>
      此圖不代表台北車站，請勿在現場依此行走。目前提供繁中測試流程，七語、語音與完整離線驗收尚未完成。
    </p>
    <p v-if="view.phase === 'data_error'" role="alert">
      資料驗證失敗，已停止導航。請使用通過驗證的測試資料包。
    </p>
    <div
      v-else
      class="lab-layout"
      :class="{ 'focused-layout': simpleMode && focusedPhase }"
    >
      <section
        v-if="pendingMeeting"
        class="confirmation"
        style="grid-column: 1 / -1"
        aria-labelledby="pending-meeting-title"
      >
        <h2 id="pending-meeting-title">確認集合目的地</h2>
        <template v-if="pendingMeeting.type === 'success'">
          <p>
            {{
              graph.messages[pendingMeeting.point.name_key]
            }}；這是朋友的集合目的地，不是你的位置。
          </p>
          <button class="primary" @click="acceptMeeting">
            確認切換目的地，重新掃自己的定位碼
          </button>
        </template>
        <p v-else>集合連結或點位無法使用，原任務尚未變更。</p>
        <button @click="dismissMeeting">取消這個集合目的地</button>
      </section>
      <section
        v-if="!simpleMode || !focusedPhase"
        class="lab-controls"
        aria-labelledby="location-title"
      >
        <h2>先選目的地與通行需求</h2>
        <DestinationSearch
          id="navigation-destination-search"
          :catalog="searchCatalogEntries"
          navigation
          :disabled="scanning || continuousActive"
          :current-options="searchOptions"
          :clear-token="searchClearToken"
          @select="selectSearchDestination"
        />
        <fieldset
          :disabled="
            scanning || continuousActive || view.phase === 'data_error'
          "
        >
          <legend>目的地</legend>
          <label
            v-for="poi in graph.pois.filter((p) => p.enabled)"
            :key="poi.id"
            class="destination-option"
          >
            <input
              type="radio"
              name="destination"
              :value="poi.id"
              :checked="view.destinationId === poi.id"
              @change="act('selectDestination', poi.id)"
            />
            <span
              >{{ graph.messages[poi.name_key]
              }}<small>{{ nodeFloor(poi.node_id).toUpperCase() }}</small></span
            >
          </label>
        </fieldset>
        <label for="mobility">通行需求</label>
        <select
          id="mobility"
          :disabled="scanning || continuousActive"
          :value="view.mobilityProfile"
          @change="act('setMobility', $event.target.value)"
        >
          <option value="standard">一般路線</option>
          <option value="stepFree">無階梯路線（依測試資料）</option>
        </select>
        <p class="hint">
          無階梯模式排除樓梯、電扶梯與可及性未知路段。更改需求後，需重新確認仍在原定位點。
        </p>

        <h2 id="location-title">持續掃碼更新位置</h2>
        <p v-if="view.position" class="location-summary">
          上次確認：<strong>{{ nodeName(view.position.nodeId) }}</strong
          ><br /><small
            >{{
              new Date(view.position.confirmedAt).toLocaleTimeString()
            }}；沒有連續定位</small
          >
        </p>
        <p v-else>
          尚未定位。可使用合成測試點，或在城市通內掃描本頁的測試 QR payload。
        </p>
        <p>
          先選目的地，再開啟相機。持續模式會自動採用有效定位碼，更新位置與路線；手機朝向仍需依地標確認。
        </p>
        <button
          class="primary"
          :disabled="
            !view.destinationId ||
            scanning ||
            !continuousAvailable ||
            continuousActive
          "
          @click="startContinuous"
        >
          開始持續掃描（有效碼自動更新）
        </button>
        <p v-if="!continuousAvailable" class="hint">
          目前宿主尚未提供持續掃碼能力；請安裝最新本地 TownPass
          patch。一般瀏覽器無法使用原生相機介面。
        </p>
        <p v-if="continuousNotice" role="status">{{ continuousNotice }}</p>
        <button
          class="primary"
          :disabled="
            scanning ||
            continuousActive ||
            !bridgeAvailable ||
            !view.destinationId
          "
          @click="scan"
        >
          {{ scanning ? "等待相機回覆…" : "備援：單次掃碼" }}
        </button>
        <p v-if="!bridgeAvailable" class="hint">
          一般瀏覽器沒有 App 掃碼橋接；下方提供明確標示的測試定位。
        </p>
        <p v-if="scanMessage" role="status">{{ scanMessage }}</p>
        <label for="fixture-anchor">合成定位點</label>
        <select
          id="fixture-anchor"
          v-model="fixtureAnchor"
          :disabled="scanning || continuousActive"
        >
          <option
            v-for="anchor in graph.qr_anchors"
            :key="anchor.id"
            :value="anchor.id"
          >
            {{ anchor.signage_code }} · {{ nodeName(anchor.node_id) }}
          </option>
        </select>
        <button :disabled="scanning || continuousActive" @click="useFixture">
          使用這個測試定位點
        </button>
        <MeetingShare
          :graph="graph"
          :position="view.position"
          :can-share="
            ['located', 'ready'].includes(view.phase) &&
            !view.needsLocationConfirmation
          "
        />
        <section
          v-if="view.phase === 'confirm_location'"
          class="confirmation"
          aria-labelledby="confirm-title"
        >
          <h3 id="confirm-title">請先確認位置</h3>
          <p>
            本次定位：<strong>{{ pendingNodeName }}</strong
            >。確認後會以新位置重新計算，舊路線將失效。
          </p>
          <button
            class="primary"
            :disabled="scanning || continuousActive"
            @click="act('confirmLocation')"
          >
            確認我在這個測試點
          </button>
          <button
            :disabled="scanning || continuousActive"
            @click="act('cancelRelocation')"
          >
            取消確認
          </button>
        </section>
        <section
          v-if="view.phase === 'relocating' && !scanning"
          class="confirmation"
        >
          <p>
            導航已暫停。選擇新的測試點，或再次掃碼。若更改通行需求，仍須重新確認位置。
          </p>
          <button @click="act('cancelRelocation')">取消重新定位</button>
        </section>
      </section>
      <section class="lab-guidance" aria-labelledby="guidance-title">
        <h2 id="guidance-title" tabindex="-1">{{ phaseTitle }}</h2>
        <p v-if="view.phase === 'unlocated'">先確認出發點，再選擇目的地。</p>
        <p v-if="view.phase === 'located'">位置已確認，請選擇目的地。</p>
        <p v-if="view.phase === 'no_route'" role="alert">
          目前資料找不到符合需求的路線。請重選目的地或重新定位；系統不會放寬無階梯限制。
        </p>
        <p v-if="view.phase === 'guidance_unavailable'" role="alert">
          缺少已核對的出發或到層方向，無法開始指引。請改用其他測試點。
        </p>
        <p v-if="view.phase === 'data_error'" role="alert">
          資料驗證失敗，已停止導航。
        </p>
        <div v-if="view.plan" class="route-summary">
          <strong
            >{{
              view.mobilityProfile === "stepFree" ? "無階梯" : "一般"
            }}測試路線</strong
          >
          <span
            >{{ view.plan.route.nodeIds.length }} 個節點 ·
            {{ view.plan.route.connectorIds.length }} 個跨層設備</span
          >
          <small>距離未校準；不提供公尺、最快或步行時間估計。</small>
        </div>
        <p v-if="view.excludedEdgeTypes.length" class="hint">
          額外避開：{{
            view.excludedEdgeTypes
              .map((type) => edgeTypeNames[type])
              .join("、")
          }}。清除本次測試可重設。
        </p>
        <button
          v-if="simpleMode"
          @click="mapExpanded = !mapExpanded"
          :aria-expanded="mapExpanded"
        >
          {{ mapExpanded ? "收起路線圖" : "查看路線圖" }}
        </button>
        <nav
          v-if="!simpleMode || mapExpanded"
          class="floor-tabs"
          aria-label="測試地圖樓層"
        >
          <button
            v-for="floor in graph.floors"
            :key="floor.id"
            :aria-pressed="floorId === floor.id"
            @click="floorId = floor.id"
          >
            {{ floor.id.toUpperCase() }}
          </button>
        </nav>
        <NavigationDemoMap
          v-if="!simpleMode || mapExpanded"
          :graph="graph"
          :floor-id="floorId"
          :route="visiblePlan?.route ?? null"
          :current-edge-id="instruction?.edgeId ?? null"
          :position-node-id="view.position?.nodeId ?? null"
          :destination-node-id="destinationNodeId"
        />
        <section v-if="view.phase === 'ready'" class="instruction-panel">
          <h3>先確認出發朝向</h3>
          <p>{{ view.plan.instructions[0].text }}</p>
          <button class="primary" @click="act('start')">
            已確認朝向，開始測試導航
          </button>
        </section>
        <section
          v-if="view.phase === 'navigating' && instruction"
          class="instruction-panel"
          aria-live="polite"
          aria-atomic="true"
        >
          <p class="step-label">
            步驟 {{ view.stepIndex + 1 }} ／
            {{ view.plan.instructions.length }} ·
            {{ instruction.floorId.toUpperCase() }}
          </p>
          <h3>
            {{
              instruction.kind === "floor_change"
                ? "確認搭乘設備與目標樓層"
                : instruction.kind === "orientation"
                ? "確認地標與朝向"
                : "前往下一個點"
            }}
          </h3>
          <p class="instruction-text">{{ instruction.text }}</p>
          <button class="primary" @click="act('next')">
            {{
              instruction.kind === "floor_change"
                ? "確認已到目標樓層"
                : "已完成，下一步"
            }}
          </button>
          <button @click="act('beginRelocation')">我迷路了，重新定位</button>
        </section>
        <section
          v-if="view.phase === 'arrival_confirmation'"
          class="instruction-panel"
        >
          <h3>請確認是否已抵達</h3>
          <p>請對照目的地名稱與樓層；系統不會由步驟進度推定實際位置。</p>
          <button class="primary" @click="act('confirmArrival')">
            我已確認抵達
          </button>
          <button @click="act('beginRelocation')">尚未抵達，重新定位</button>
        </section>
        <section
          v-if="view.phase === 'arrived'"
          class="instruction-panel"
          role="status"
        >
          <h3>已由你確認抵達</h3>
          <p>測試流程完成。上次掃碼位置不會被改寫成終點。</p>
          <button class="primary" @click="act('end')">
            結束並清除本次定位
          </button>
        </section>
        <details v-if="!simpleMode" class="test-tools">
          <summary>開發測試工具與 QR 內容</summary>
          <p>
            目前測試碼：{{
              fixtureAnchor
            }}。此內容不適用真實站場；只供在另一台裝置顯示或製作測試 QR。
          </p>
          <pre>{{ fixturePayload }}</pre>
          <button
            :disabled="
              scanning || view.unavailableConnectorIds.includes('lift_1')
            "
            @click="act('markConnectorUnavailable', 'lift_1')"
          >
            模擬本次電梯不可用
          </button>
          <button :disabled="scanning || continuousActive" @click="act('end')">
            清除本次測試
          </button>
          <p>
            圖版本 {{ graph.graph_version }} · 計畫版本 {{ view.revision }} ·
            {{ view.phase }}
          </p>
        </details>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import MeetingShare from "../components/MeetingShare.vue";
import meetingPoints from "../meeting/meeting-points.json";
import { parseMeetingLink } from "../meeting/meeting.mjs";
import DestinationSearch from "../components/DestinationSearch.vue";
import { navigationCatalog } from "../search/catalog.mjs";
import NavigationDemoMap from "../components/NavigationDemoMap.vue";
import graph from "../navigation/demo-graph.json";
import { createSession } from "../navigation/session.mjs";
import { createContinuousScanner } from "../navigation/continuous.mjs";
import { createQrBridge } from "../navigation/bridge.mjs";
import { useDisplayPreferences } from "../display/preferences.mjs";
const { theme } = useDisplayPreferences();
const route = useRoute();
const router = useRouter();
const session = createSession(graph);
const searchCatalogEntries = navigationCatalog(graph);
const simpleMode = ref(false);
const mapExpanded = ref(false);
const searchClearToken = ref(0);
const edgeTypeNames = {
  walkway: "走道",
  stairs: "樓梯",
  elevator: "電梯",
  escalator: "電扶梯",
  gate: "閘門",
};
const view = shallowRef({ ...session.state });
const floorId = ref("b1");
const fixtureAnchor = ref("qr_a");
const scanMessage = ref("");
const scanning = ref(false);
const continuousAvailable = ref(false);
const continuousActive = ref(false);
const continuousNotice = ref("");
let bridge = createQrBridge(window.flutterObject);
const bridgeAvailable = ref(bridge.available);
let disposed = false;
let guidanceVersion = 0;
const continuous = createContinuousScanner(window.flutterObject, {
  onPayload(payload) {
    if (disposed) return;
    const result = session.applyContinuousAnchor(payload);
    continuousNotice.value =
      result.type === "success"
        ? "已更新定位與路線；相機保持開啟。"
        : "這不是可用定位碼，起點與路線未變更。";
    refresh();
    updateContinuous(result.type === "success" ? null : continuousNotice.value);
  },
  onAction({ guidanceToken }) {
    if (disposed) return;
    session.advanceFromGuidance(guidanceToken);
    refresh();
    updateContinuous();
  },
  onStatus(status) {
    if (disposed) return;
    continuousActive.value = ["starting", "started"].includes(status);
    if (["closed", "stopped", "error"].includes(status)) {
      session.cancelRelocation();
      refresh();
    }
    if (status === "error")
      continuousNotice.value = "無法啟動持續掃描，請退出原生相機後重試。";
  },
});
continuous.probe().then((result) => {
  if (!disposed) continuousAvailable.value = result.type === "success";
});
function scannerGuidance(error = null) {
  const state = session.state;
  const poi = graph.pois.find((p) => p.id === state.destinationId);
  const step = state.plan?.instructions[state.stepIndex];
  let text =
    error ?? step?.text ?? "請將相機對準自己的定位碼，掃到有效碼後會更新位置。";
  if (!error && state.phase === "no_route")
    text =
      "目前找不到符合需求的路線。請與對方另約可達集合點，或掃另一個有效定位碼；不會放寬通行限制。";
  if (!error && state.phase === "guidance_unavailable")
    text = "缺少方向指引，不能猜測左右。可繼續掃其他有效定位碼。";
  if (!error && state.phase === "arrival_confirmation")
    text = "請對照名稱與樓層，確認是否已抵達；不是由相機辨識朋友本人。";
  if (!error && state.phase === "arrived")
    text = "已由你確認抵達。可關閉相機，或繼續掃新的定位碼更新位置。";
  return {
    guidanceVersion: ++guidanceVersion,
    guidanceToken: session.guidanceToken(),
    title: poi ? graph.messages[poi.name_key] : "先選目的地",
    floor:
      step?.floorId?.toUpperCase() ??
      (state.position
        ? nodeFloor(state.position.nodeId).toUpperCase()
        : "尚未定位"),
    instruction: text,
    canAdvance:
      !error &&
      ["ready", "navigating", "arrival_confirmation"].includes(state.phase),
    nextLabel:
      state.phase === "ready"
        ? "確認朝向並開始"
        : state.phase === "arrival_confirmation"
        ? "確認抵達"
        : step?.kind === "floor_change"
        ? "確認已到目標樓層"
        : "已完成，下一步",
  };
}
function updateContinuous(error = null) {
  continuous.update(scannerGuidance(error));
}
function startContinuous() {
  if (!session.state.destinationId || !continuousAvailable.value) return;
  session.beginRelocation();
  refresh();
  const result = continuous.start(scannerGuidance());
  if (result.type !== "success") {
    session.cancelRelocation();
    refresh();
    continuousNotice.value = "持續掃描尚不可用，沒有更改目前位置。";
  }
}

function refresh() {
  view.value = { ...session.state };
}
function act(method, value) {
  if (method === "end") searchClearToken.value++;
  session[method](value);
  refresh();
}
const focusedPhase = computed(() =>
  ["navigating", "arrival_confirmation", "arrived"].includes(view.value.phase)
);
const pendingMeeting = computed(() =>
  typeof route.query.meeting === "string"
    ? parseMeetingLink(route.query.meeting, graph, meetingPoints)
    : null
);
function dismissMeeting() {
  const query = { ...route.query };
  delete query.meeting;
  router.replace({ path: route.path, query });
}
function acceptMeeting() {
  if (pendingMeeting.value?.type !== "success") return;
  act("prepareMeetingDestination", pendingMeeting.value.poi.id);
  dismissMeeting();
}
onBeforeRouteLeave(() => {
  if (view.value.destinationId && view.value.phase !== "arrived")
    return window.confirm("離開會結束本次導航。確定離開？");
  return true;
});
const searchOptions = computed(() => ({
  mobilityProfile: view.value.mobilityProfile,
  excludedEdgeTypes: view.value.excludedEdgeTypes,
  unavailableConnectorIds: view.value.unavailableConnectorIds,
}));
function selectSearchDestination(selection) {
  act("applySearchSelection", selection);
}
const fixturePayload = computed(() =>
  JSON.stringify({
    type: "taipei_maze_anchor",
    v: 1,
    site_id: graph.site_id,
    graph_major: 1,
    anchor_id: fixtureAnchor.value,
  })
);
function useFixture() {
  const result = session.acceptQr(fixturePayload.value);
  scanMessage.value =
    result.type === "success"
      ? "已讀取合成定位點；請確認後再繼續。"
      : "測試定位點無法使用。";
  refresh();
}
const nodeName = (id) =>
  graph.messages[graph.nodes.find((n) => n.id === id)?.label_key] ?? "未知位置";
const nodeFloor = (id) => graph.nodes.find((n) => n.id === id)?.floor_id ?? "";
const pendingNodeName = computed(() =>
  nodeName(
    graph.qr_anchors.find((a) => a.id === view.value.pendingAnchorId)?.node_id
  )
);
const destinationNodeId = computed(
  () =>
    graph.pois.find((p) => p.id === view.value.destinationId)?.node_id ?? null
);
const visiblePlan = computed(() =>
  ["ready", "navigating", "arrival_confirmation", "arrived"].includes(
    view.value.phase
  )
    ? view.value.plan
    : null
);
const instruction = computed(() =>
  view.value.phase === "navigating"
    ? view.value.plan?.instructions[view.value.stepIndex]
    : null
);
const titles = {
  unlocated: "先確認出發點",
  located: "選擇目的地",
  confirm_location: "等待你確認位置",
  ready: "路線已準備好",
  navigating: "一次走好下一步",
  relocating: "暫停並重新定位",
  no_route: "找不到符合需求的路線",
  guidance_unavailable: "方向指引尚不可用",
  data_error: "資料無法使用",
  arrival_confirmation: "確認目的地",
  arrived: "測試導航完成",
};
const phaseTitle = computed(() => titles[view.value.phase]);
watch(
  () => [view.value.phase, view.value.stepIndex, view.value.revision],
  () => {
    if (instruction.value) floorId.value = instruction.value.floorId;
    else if (
      ["arrival_confirmation", "arrived"].includes(view.value.phase) &&
      destinationNodeId.value
    )
      floorId.value = nodeFloor(destinationNodeId.value);
    else if (view.value.position && view.value.phase !== "relocating")
      floorId.value = nodeFloor(view.value.position.nodeId);
  }
);
async function scan() {
  if (scanning.value) return;
  session.beginRelocation();
  refresh();
  scanning.value = true;
  scanMessage.value = "等待城市通掃碼回覆…";
  const result = await bridge.scan();
  if (disposed) return;
  scanning.value = false;
  if (result.type === "success") {
    const parsed = session.acceptQr(result.payload);
    scanMessage.value =
      parsed.type === "success"
        ? "已收到有效測試碼，請確認位置。"
        : "這不是此合成場景支援的定位碼，原路線未變更。";
    if (parsed.type !== "success") session.cancelRelocation();
  } else {
    session.cancelRelocation();
    scanMessage.value =
      {
        Cancelled: "掃碼已取消，未變更定位。",
        Timeout:
          "掃碼逾時，原路線保留。請先退出原生掃碼；遲到回覆清空前不會再送出請求。",
        WaitingForDrain:
          "仍在等待上次掃碼結束。請先退出掃碼畫面，再重新開啟服務。",
        InvalidReply: "App 回覆格式不符，未變更定位。",
        SendFailed: "橋接傳送失敗。請退出原生功能後重新開啟服務。",
        Unavailable: "此環境沒有可用的城市通橋接。",
      }[result.type] ?? "目前無法掃碼，未變更定位。";
  }
  refresh();
}
function pagehide() {
  continuous.stop();
  bridge.dispose();
  scanning.value = false;
  session.cancelRelocation();
  refresh();
}
function pageshow(event) {
  if (event.persisted) window.location.reload();
}
window.addEventListener("pagehide", pagehide);
window.addEventListener("pageshow", pageshow);
onBeforeUnmount(() => {
  disposed = true;
  continuous.dispose();
  bridge.dispose();
  session.end();
  window.removeEventListener("pagehide", pagehide);
  window.removeEventListener("pageshow", pageshow);
});
</script>

<style scoped>
.navigation-lab {
  background: var(--demo-surface, transparent);
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px max(16px, env(safe-area-inset-left)) 48px;
  text-align: left;
  color: var(--demo-ink, #213b43);
  font-family: system-ui, "PingFang TC", sans-serif;
  line-height: 1.6;
}
.lab-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--demo-border, #cbdadd);
  padding-bottom: 16px;
}
.navigation-lab a {
  color: var(--demo-accent, #326875);
}
h1 {
  font-size: clamp(1.65rem, 4vw, 2.3rem);
  line-height: 1.3;
  margin: 28px 0 16px;
}
h2 {
  font-size: 1.2rem;
  margin: 0 0 12px;
}
h3 {
  margin: 0 0 10px;
  font-size: 1.15rem;
}
.synthetic-notice {
  border-left: 5px solid var(--demo-current, #91601e);
  padding: 12px 16px;
  background: var(--demo-warning, #fff6df);
  color: var(--demo-warning-ink, #5b3c13);
}
.lab-layout {
  display: grid;
  grid-template-columns: minmax(250px, 320px) minmax(0, 1fr);
  gap: 36px;
  margin-top: 28px;
}
.lab-controls {
  border-right: 1px solid var(--demo-border, #d7e3e6);
  padding-right: 28px;
}
button,
select {
  font: inherit;
  min-height: 46px;
  border-radius: 6px;
  padding: 9px 12px;
  border: 1px solid var(--demo-border, #70949e);
  background: var(--demo-surface, white);
  color: var(--demo-ink, #213b43);
  max-width: 100%;
}
button {
  cursor: pointer;
  margin: 4px 8px 4px 0;
}
button.primary {
  background: var(--demo-accent, #326875);
  border-color: var(--demo-accent, #326875);
  color: var(--demo-on-accent, white);
  font-weight: 700;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:focus-visible,
select:focus-visible,
a:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--demo-current, #8a501b);
  outline-offset: 3px;
}
.lab-controls > label {
  display: block;
  font-weight: 700;
  margin-top: 20px;
}
.lab-controls > select {
  width: 100%;
}
.hint,
small {
  font-size: 0.85rem;
  color: var(--demo-muted, #465b62);
}
.location-summary {
  background: var(--demo-wash, #eff7f9);
  padding: 12px;
}
.confirmation {
  background: var(--demo-wash, #eff7f9);
  padding: 16px;
  margin: 16px 0;
  border-left: 4px solid var(--demo-accent, #326875);
}
fieldset {
  border: 0;
  padding: 0;
  margin: 24px 0;
  min-width: 0;
}
legend {
  font-weight: 700;
  margin-bottom: 8px;
}
.destination-option {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--demo-border, #d7e3e6);
  padding: 12px 0;
  cursor: pointer;
}
.destination-option input {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  accent-color: var(--demo-accent, #326875);
}
.destination-option small {
  display: block;
}
.route-summary {
  display: grid;
  gap: 2px;
  margin: 12px 0;
}
.floor-tabs {
  display: flex;
  margin: 18px 0 10px;
}
.floor-tabs [aria-pressed="true"] {
  background: var(--demo-accent, #326875);
  color: var(--demo-on-accent, white);
}
.instruction-panel {
  border-top: 3px solid var(--demo-accent, #326875);
  background: var(--demo-wash, #f0f8fa);
  padding: 20px;
  margin-top: 24px;
}
.instruction-text {
  font-size: 1.35rem;
  line-height: 1.7;
}
.step-label {
  font-weight: 700;
  color: var(--demo-accent, #326875);
}
.test-tools {
  margin-top: 28px;
  border-top: 1px solid var(--demo-border, #d7e3e6);
  padding-top: 16px;
}
summary {
  cursor: pointer;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.8rem;
  background: var(--demo-wash, #f3f6f7);
  padding: 12px;
}
@media (max-width: 720px) {
  .lab-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .lab-controls {
    border-right: 0;
    border-bottom: 1px solid var(--demo-border, #d7e3e6);
    padding: 0 0 24px;
  }
}

.focused-layout {
  grid-template-columns: minmax(0, 1fr);
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}
.simple-mode .instruction-text {
  font-size: 1.65rem;
  line-height: 1.8;
}
.simple-mode .instruction-panel button {
  min-height: 52px;
  font-size: 1.1rem;
}
.simple-mode .route-summary > span,
.simple-mode .route-summary > small {
  display: none;
}
</style>
