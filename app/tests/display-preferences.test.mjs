// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  createDisplayPreferences,
  displayStorageKey,
} from "../src/display/preferences.mjs";

test("display settings survive a new page instance without persisting task data", () => {
  const entries = new Map();
  const storage = () => ({
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  });
  const first = createDisplayPreferences(storage);
  first.toggleTheme();
  first.setDisplayMode("senior");
  const next = createDisplayPreferences(storage);
  assert.equal(next.theme.value, "dark");
  assert.equal(next.displayMode.value, "senior");
  next.setDisplayMode("child");
  assert.equal(next.theme.value, "dark");
  assert.deepEqual(JSON.parse(entries.get(displayStorageKey)), {
    theme: "dark",
    displayMode: "child",
  });
});

test("blocked localStorage retains settings in memory", () => {
  const prefs = createDisplayPreferences(() => {
    throw new Error("Storage denied");
  });
  assert.equal(prefs.theme.value, "light");
  assert.equal(prefs.displayMode.value, "standard");
  prefs.toggleTheme();
  prefs.setDisplayMode("senior");
  assert.equal(prefs.theme.value, "dark");
  assert.equal(prefs.displayMode.value, "senior");
});

test("write failures do not undo display changes", () => {
  const prefs = createDisplayPreferences(() => ({
    getItem: () => '{"theme":"dark","displayMode":"child"}',
    setItem: () => {
      throw new Error("Quota exceeded");
    },
  }));
  prefs.toggleTheme();
  prefs.setDisplayMode("senior");
  assert.equal(prefs.theme.value, "light");
  assert.equal(prefs.displayMode.value, "senior");
});

test("malformed or unsupported stored settings fall back independently", () => {
  for (const value of ["broken JSON", "null", "[]"]) {
    const prefs = createDisplayPreferences(() => ({ getItem: () => value }));
    assert.equal(prefs.theme.value, "light");
    assert.equal(prefs.displayMode.value, "standard");
  }
  const prefs = createDisplayPreferences(() => ({
    getItem: () => '{"theme":"dark","displayMode":"unknown"}',
  }));
  assert.equal(prefs.theme.value, "dark");
  assert.equal(prefs.displayMode.value, "standard");
  prefs.setDisplayMode("invalid");
  assert.equal(prefs.displayMode.value, "standard");
});
