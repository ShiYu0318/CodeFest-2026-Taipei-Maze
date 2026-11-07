// SPDX-License-Identifier: AGPL-3.0-or-later
import { reactive, readonly, toRefs } from "vue";

export const displayStorageKey = "taipei-maze.display-preferences.v1";
const themes = ["light", "dark"];
const modes = ["standard", "child", "senior"];
const browserStorage = () =>
  typeof window === "undefined" ? undefined : window.localStorage;

/** Display preferences only: never persist a location, destination or route. */
export function createDisplayPreferences(storage = browserStorage) {
  let saved;
  try {
    saved = JSON.parse(storage()?.getItem(displayStorageKey) ?? "null");
  } catch {
    // Private browsing, denied storage and malformed saved data use defaults.
  }
  const state = reactive({
    theme: themes.includes(saved?.theme) ? saved.theme : "light",
    displayMode: modes.includes(saved?.displayMode)
      ? saved.displayMode
      : "standard",
  });
  function save() {
    try {
      storage()?.setItem(displayStorageKey, JSON.stringify(state));
    } catch {
      // Changes remain usable in memory when persistence is unavailable.
    }
  }
  return {
    ...toRefs(readonly(state)),
    toggleTheme() {
      state.theme = state.theme === "light" ? "dark" : "light";
      save();
    },
    setDisplayMode(value) {
      if (!modes.includes(value)) return;
      state.displayMode = value;
      save();
    },
  };
}

const shared = createDisplayPreferences();
export const useDisplayPreferences = () => shared;
