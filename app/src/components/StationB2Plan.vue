<template>
  <g aria-hidden="true">
    <!-- Solid B2 perimeter from the Taipei Metro plan. Reference outlines are omitted. -->
    <path
      class="floor"
      d="M34 495H634L708 61l91 17 4-17 100 45-1-12 88 15-68 386h427v57l18 1-34 77h16v59H34v-62H18l34-79H34Z"
    />
    <g v-if="!outlineOnly">
      <path
        class="walkable"
        d="M49 648h43V500h544l12-78 31 4 41-220 34 7 16-99 73 16-18 113 15 3 21-115 37 7-19 114 83 14-41 229h423v38h-98v67h32v17h-51v66h-170l-46-62-44 12h-75v-18h-70l-28 12h-89v-12h-91l-29 18h-78l-35-18H306l50 70H49Z"
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
        <text x="616" y="-18">市民大道方向</text>
        <text x="118" y="727">← M5</text>
        <text x="340" y="727">M4・M6 ↗</text>
        <text x="1006" y="727">↖ M3・M8</text>
        <text x="1269" y="558">M7 ↗</text>
      </g>
      <g class="map-label line-label">
        <rect
          x="397"
          y="508"
          width="40"
          height="35"
          rx="6"
          fill="var(--tp-primary-700)"
        />
        <text class="line-code" x="417" y="533">BL</text>
        <text x="448" y="535">板南線大廳</text>
        <rect
          x="785"
          y="381"
          width="35"
          height="35"
          rx="6"
          fill="var(--tp-secondary-800)"
        />
        <text class="line-code" x="802.5" y="406">R</text>
        <text x="778" y="446">往淡水信義線</text>
      </g>
    </g>
  </g>
</template>

<script>
export default { props: { outlineOnly: Boolean } };
</script>

<style scoped>
.floor {
  fill: var(--tp-surface);
  stroke: var(--tp-primary-700);
  stroke-width: 6;
  stroke-linejoin: round;
}
.walkable {
  fill: var(--tp-primary-100);
}
.red-branch {
  fill: var(--tp-secondary-200);
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
  fill: var(--tp-surface);
  text-anchor: middle;
  font-size: 24px;
}
</style>
