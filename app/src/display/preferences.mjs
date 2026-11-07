// SPDX-License-Identifier: AGPL-3.0-or-later
import { reactive, readonly, toRefs } from "vue";

const modes = ["standard", "child", "senior"];
export const themeStorageKey = "taipei-maze.theme.v1";
export const contrastStorageKey = "taipei-maze.contrast.v1";
const browserStorage = () =>
  typeof window === "undefined" ? undefined : window.localStorage;

/** Persist manual appearance choices. Display modes always start at standard. */
export function createDisplayPreferences(storage = browserStorage) {
  let savedTheme, savedContrast;
  try {
    savedTheme = storage()?.getItem(themeStorageKey);
    savedContrast = storage()?.getItem(contrastStorageKey);
  } catch {
    /* Storage is optional. */
  }
  const state = reactive({
    theme: savedTheme === "dark" ? "dark" : "light",
    displayMode: "standard",
    contrast: savedContrast === "high" ? "high" : "standard",
  });
  function remember(key, value) {
    try {
      storage()?.setItem(key, value);
    } catch {
      /* Keep in-memory choice. */
    }
  }
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
    toggleContrast() {
      state.contrast = state.contrast === "high" ? "standard" : "high";
      remember(contrastStorageKey, state.contrast);
    },
    setDisplayMode(value) {
      if (!modes.includes(value)) return;
      state.displayMode = value;
      if (value === "senior") {
        state.theme = "light";
        state.contrast = "high";
      }
    },
  };
}

const shared = createDisplayPreferences();
export const useDisplayPreferences = () => shared;
