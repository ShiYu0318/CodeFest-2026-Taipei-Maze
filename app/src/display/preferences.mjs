// SPDX-License-Identifier: AGPL-3.0-or-later
import { reactive, readonly, toRefs } from "vue";

const modes = ["standard", "child", "senior"];
export const themeStorageKey = "taipei-maze.theme.v1";
const browserStorage = () =>
  typeof window === "undefined" ? undefined : window.localStorage;

/** Remember only a manually chosen theme; age presets still start standard. */
export function createDisplayPreferences(storage = browserStorage) {
  let savedTheme;
  try {
    savedTheme = storage()?.getItem(themeStorageKey);
  } catch {
    /* Storage is optional. */
  }
  const state = reactive({
    theme: savedTheme === "dark" ? "dark" : "light",
    displayMode: "standard",
  });
  return {
    ...toRefs(readonly(state)),
    toggleTheme() {
      state.theme = state.theme === "light" ? "dark" : "light";
      try {
        storage()?.setItem(themeStorageKey, state.theme);
      } catch {
        /* Keep in-memory choice. */
      }
    },
    setDisplayMode(value) {
      if (!modes.includes(value)) return;
      state.displayMode = value;
    },
  };
}

const shared = createDisplayPreferences();
export const useDisplayPreferences = () => shared;
