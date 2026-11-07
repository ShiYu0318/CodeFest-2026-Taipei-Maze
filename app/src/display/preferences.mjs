// SPDX-License-Identifier: AGPL-3.0-or-later
import { reactive, readonly, toRefs } from "vue";

const modes = ["standard", "child", "senior"];

/** Fresh document loads always start light/standard; SPA pages share memory only. */
export function createDisplayPreferences() {
  const state = reactive({
    theme: "light",
    displayMode: "standard",
  });
  return {
    ...toRefs(readonly(state)),
    toggleTheme() {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    setDisplayMode(value) {
      if (!modes.includes(value)) return;
      state.displayMode = value;
    },
  };
}

const shared = createDisplayPreferences();
export const useDisplayPreferences = () => shared;
