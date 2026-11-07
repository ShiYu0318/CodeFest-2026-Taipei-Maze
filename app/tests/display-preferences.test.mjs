// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  createDisplayPreferences,
  useDisplayPreferences,
} from "../src/display/preferences.mjs";

test("fresh document state always starts light/standard after any prior mode", () => {
  for (const mode of ["standard", "child", "senior"]) {
    const previous = createDisplayPreferences();
    previous.toggleTheme();
    previous.setDisplayMode(mode);
    const next = createDisplayPreferences();
    assert.equal(next.theme.value, "light");
    assert.equal(next.displayMode.value, "standard");
    assert.equal(previous.theme.value, "dark");
    assert.equal(previous.displayMode.value, mode);
  }
});

test("components on the same document share manual choices across SPA pages", () => {
  const map = useDisplayPreferences();
  const meeting = useDisplayPreferences();
  try {
    map.toggleTheme();
    map.setDisplayMode("child");
    assert.equal(meeting.theme.value, "dark");
    assert.equal(meeting.displayMode.value, "child");
    meeting.setDisplayMode("senior");
    assert.equal(map.displayMode.value, "senior");
    assert.equal(map.theme.value, "dark");
  } finally {
    map.toggleTheme();
    map.setDisplayMode("standard");
  }
});

test("invalid modes are ignored and mode changes do not change theme", () => {
  const prefs = createDisplayPreferences();
  prefs.setDisplayMode("child");
  prefs.setDisplayMode("invalid");
  assert.equal(prefs.displayMode.value, "child");
  assert.equal(prefs.theme.value, "light");
  prefs.toggleTheme();
  assert.equal(prefs.displayMode.value, "child");
});
