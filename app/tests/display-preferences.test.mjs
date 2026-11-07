// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  createDisplayPreferences,
  useDisplayPreferences,
  themeStorageKey,
  contrastStorageKey,
} from "../src/display/preferences.mjs";

test("fresh document state always starts light/standard after any prior mode", () => {
  for (const mode of ["standard", "child", "senior"]) {
    const previous = createDisplayPreferences();
    previous.setDisplayMode(mode);
    previous.toggleTheme();
    const next = createDisplayPreferences();
    assert.equal(next.theme.value, "light");
    assert.equal(next.contrast.value, "standard");
    assert.equal(next.displayMode.value, "standard");
    assert.equal(previous.theme.value, "dark");
    assert.equal(previous.displayMode.value, mode);
  }
});

test("components on the same document share manual choices across SPA pages", () => {
  const map = useDisplayPreferences();
  const meeting = useDisplayPreferences();
  try {
    map.setDisplayMode("child");
    map.toggleTheme();
    assert.equal(meeting.theme.value, "dark");
    assert.equal(meeting.displayMode.value, "child");
    meeting.setDisplayMode("senior");
    assert.equal(map.displayMode.value, "senior");
    assert.equal(map.theme.value, "light");
    assert.equal(map.contrast.value, "high");
  } finally {
    map.setDisplayMode("standard");
  }
});

test("invalid modes leave the current mode and appearance alone", () => {
  const prefs = createDisplayPreferences();
  prefs.setDisplayMode("child");
  prefs.toggleTheme();
  prefs.toggleContrast();
  prefs.setDisplayMode("invalid");
  assert.equal(prefs.displayMode.value, "child");
  assert.equal(prefs.theme.value, "dark");
  assert.equal(prefs.contrast.value, "high");
});

test("switching from senior to standard or child applies light and regular contrast", () => {
  const prefs = createDisplayPreferences();
  for (const mode of ["standard", "child"]) {
    prefs.setDisplayMode("senior");
    prefs.toggleTheme();
    prefs.setDisplayMode(mode);
    assert.equal(prefs.displayMode.value, mode);
    assert.equal(prefs.theme.value, "light");
    assert.equal(prefs.contrast.value, "standard");
  }
});

test("the senior preset applies light and high contrast without changing saved preferences", () => {
  const values = new Map();
  const storage = () => ({
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  });
  const first = createDisplayPreferences(storage);
  assert.equal(first.theme.value, "light");
  assert.equal(values.size, 0);
  first.toggleTheme();
  first.setDisplayMode("senior");
  assert.equal(first.theme.value, "light");
  assert.equal(first.contrast.value, "high");
  const next = createDisplayPreferences(storage);
  assert.equal(next.theme.value, "dark");
  assert.equal(next.contrast.value, "standard");
  assert.equal(next.displayMode.value, "standard");
  next.toggleTheme();
  assert.equal(createDisplayPreferences(storage).theme.value, "light");
  assert.deepEqual([...values], [[themeStorageKey, "light"]]);
});

test("denied or malformed storage never prevents manual theme changes", () => {
  const blocked = createDisplayPreferences(() => {
    throw new Error("Denied");
  });
  blocked.toggleTheme();
  assert.equal(blocked.theme.value, "dark");
  const invalid = createDisplayPreferences(() => ({
    getItem: () => "unexpected",
    setItem: () => {
      throw new Error("Quota");
    },
  }));
  assert.equal(invalid.theme.value, "light");
  invalid.toggleTheme();
  assert.equal(invalid.theme.value, "dark");
});

test("manual contrast changes work in senior mode and are remembered", () => {
  const values = new Map();
  const storage = () => ({
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  });
  const first = createDisplayPreferences(storage);
  assert.equal(first.contrast.value, "standard");
  first.setDisplayMode("senior");
  first.toggleContrast();
  assert.equal(first.contrast.value, "standard");
  first.toggleContrast();
  first.toggleTheme();
  assert.equal(first.contrast.value, "high");
  assert.equal(values.get(contrastStorageKey), "high");
  const next = createDisplayPreferences(storage);
  assert.equal(next.contrast.value, "high");
  assert.equal(next.displayMode.value, "standard");
  next.toggleContrast();
  assert.equal(createDisplayPreferences(storage).contrast.value, "standard");
  const blocked = () => {
    throw new Error("blocked");
  };
  const offline = createDisplayPreferences(blocked);
  offline.toggleContrast();
  assert.equal(offline.contrast.value, "high");
});
