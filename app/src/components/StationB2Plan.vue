<template>
  <g aria-hidden="true">
    <!-- Solid B2 perimeter from the Taipei Metro plan. Reference outlines are omitted. -->
    <path class="floor" :d="b2Outline" />
    <path
      v-for="platform in railPlatforms"
      :key="platform.id"
      class="floor rail-outline"
      :d="`M${platform.x} ${platform.y}l1900-140v100L${platform.x} ${
        platform.y + 100
      }Z`"
    />
    <g v-if="!outlineOnly">
      <!-- Context only, not new walkable areas. North is at the top. -->
      <g class="rail-platforms">
        <text class="rail-caption" x="-755" y="-795"
          >B2・台鐵／高鐵月台示意</text
        >
        <g
          v-for="platform in railPlatforms"
          :key="platform.id"
          :transform="`translate(${platform.x} ${platform.y})`"
          :class="['rail-platform', 'rail-' + platform.operator]"
        >
          <path class="rail-track" d="M0-14l1900-140M0 174l1900-140" />
          <path class="rail-sleepers" d="M0-14l1900-140M0 174l1900-140" />
          <path class="rail-deck" d="M0 0l1900-140v160L0 160Z" />
          <text x="950" y="30" transform="rotate(-4.21 950 30)">{{
            platform.label
          }}</text>
        </g>
      </g>
      <path
        class="walkable"
        d="M49 648h43V500h544l12-78 31 4 41-220 34 7 16-99 73 16-18 113 15 3 21-115 37 7-19 114 83 14-41 229h423v38h-98v67h32v17h-51v66h-170l-46-62-44 12h-75v-18h-70l-28 12h-89v-12h-91l-29 18h-78l-35-18H306l50 70H49Z M636 495l12-73 31 4 41-220 34 7 16-99 73 16-18 113 15 3 21-115 37 7-19 114 83 14-41 229Z"
        fill-rule="evenodd"
      />
      <path
        class="red-branch"
        d="M636 495l12-73 31 4 41-220 34 7 16-99 73 16-18 113 15 3 21-115 37 7-19 114 83 14-41 229Z"
      />
      <path
        class="gates"
        d="M191 498v31m10-31v31m10-31v31m899 17 38-43m-29 48 38-43m-29 48 38-43M704 461l-3 22m80-22-3 22m79-22-3 22"
      />
      <g class="map-label exit-label">
        <text x="700" y="-940">↑ 市民大道方向（北）</text>
        <text x="118" y="727">← M5</text>
        <text x="340" y="727">M4・M6 ↗</text>
        <text x="1006" y="727">↖ M3・M8</text>
        <text x="1269" y="558">M7 ↗</text>
      </g>
      <g class="map-label line-label">
        <rect x="397" y="508" width="40" height="35" rx="6" fill="#0072c6" />
        <text class="line-code" x="417" y="533">BL</text>
        <text x="448" y="535">板南線大廳</text>
        <rect x="785" y="381" width="35" height="35" rx="6" fill="#d12d33" />
        <text class="line-code" x="802.5" y="406">R</text>
        <text x="778" y="446">往淡水信義線</text>
      </g>
    </g>
  </g>
</template>

<script>
import { b2Outline, b2RailPlatforms } from "../views/station-floor-plans.mjs";
export default {
  props: { outlineOnly: Boolean },
  setup: () => ({
    b2Outline,
    railPlatforms: b2RailPlatforms,
  }),
};
</script>

<style scoped>
.floor {
  fill: none;
  stroke: var(--tp-gray-500);
  stroke-width: 6;
  stroke-linejoin: round;
}
.walkable {
  fill: #0072c6;
  fill-opacity: 0.16;
  stroke: #0072c6;
  stroke-width: 3;
}
.red-branch {
  fill: #d12d33;
  fill-opacity: 0.22;
  stroke: #d12d33;
  stroke-width: 3;
}
.gates {
  fill: none;
  stroke: var(--tp-gray-500);
  stroke-width: 5;
  stroke-linecap: round;
}
.map-label {
  fill: var(--tp-primary-900);
  font-weight: 750;
}
.exit-label {
  font-size: 28px;
}
.line-label {
  font-size: 32px;
}
.line-code {
  fill: #fff;
  text-anchor: middle;
  font-size: 24px;
}
.rail-caption {
  fill: var(--tp-primary-900);
  font-size: 34px;
  font-weight: 750;
}
.rail-track {
  fill: none;
  stroke: var(--tp-gray-600);
  stroke-width: 5;
}
.rail-sleepers {
  fill: none;
  stroke: var(--tp-gray-600);
  stroke-width: 12;
  stroke-dasharray: 3 15;
}
.rail-platform .rail-deck {
  stroke-width: 4;
}
.rail-tra .rail-deck {
  fill: #dceaf7;
  stroke: #527da5;
}
.rail-hsr .rail-deck {
  fill: #fff0c2;
  stroke: #a96a12;
}
.rail-platform text {
  fill: #182930;
  font-size: 52px;
  font-weight: 750;
  text-anchor: middle;
}
</style>
