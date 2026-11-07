<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <section class="navigation-rescan-bar" :aria-label="t('scan.rescan')">
    <StationTransferStep v-if="!compact" :location="location" />
    <p v-if="!compact" class="navigation-rescan-hint">
      <ZhuyinText :text="t('scan.relocateHint')" />
    </p>
    <p v-if="!compact && !view.available">{{ t("scan.needApp") }}</p>
    <p v-if="!compact && view.noticeKey" role="status">
      <ZhuyinText :text="t(view.noticeKey)" />
    </p>
    <button
      type="button"
      data-tour-target="scan"
      :disabled="!view.available || view.active"
      :aria-busy="view.active"
      @click="rescanOpen = true"
    >
      <StationMapIcon name="qrcode" />
      <ZhuyinText :text="view.active ? t('scan.waiting') : t('scan.rescan')" />
    </button>
    <StationRescanDialog
      v-if="rescanOpen"
      :location="location"
      @close="rescanOpen = false"
      @scanned="emit('scanned', $event)"
    />
  </section>
</template>
<script setup>
/* global defineProps, defineEmits */
import { computed, ref } from "vue";
import StationRescanDialog from "./StationRescanDialog.vue";
import StationMapIcon from "./StationMapIcon.vue";
import StationTransferStep from "./StationTransferStep.vue";
import ZhuyinText from "./ZhuyinText.vue";
import { useI18n } from "../i18n/index.mjs";
const props = defineProps({
  location: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});
const emit = defineEmits(["scanned"]);
const { t } = useI18n();
const view = computed(() => props.location.view.value);
const rescanOpen = ref(false);
</script>
<style scoped>
.navigation-rescan-bar {
  display: flex;
  flex-direction: column;
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--tp-radius-card, 12px);
  background: var(--surface);
  color: var(--ink);
  font: var(--display-main-size, 15px) / 1.5 var(--tp-font);
}
.navigation-rescan-bar p {
  font-size: var(--display-secondary-size, 13px);
  line-height: 1.5;
}
.navigation-rescan-bar button {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: var(--display-control-height, 44px);
  margin: 8px 0 0;
  padding: 10px 14px;
  border: 0;
  border-radius: var(--tp-radius-button, 10px);
  background: var(--tp-primary-600);
  color: #fff;
  font: inherit;
  font-weight: 700;
}
.navigation-rescan-bar button:disabled {
  opacity: 0.6;
  cursor: default;
}
.navigation-rescan-bar button:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.navigation-rescan-bar svg {
  width: 24px;
  height: 24px;
  flex: none;
}
.navigation-rescan-bar p[role="status"] {
  margin-top: 8px;
}
</style>
