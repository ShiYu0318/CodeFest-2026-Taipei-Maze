// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStationLocation } from "../src/station/location.mjs";
import { stationQrPayload } from "../src/station/scan.mjs";
const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);
function native() {
  const listeners = new Set(),
    messages = [];
  return {
    messages,
    postMessage: (text) => messages.push(JSON.parse(text)),
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
    reply(data) {
      for (const listener of listeners)
        listener({ data: JSON.stringify({ name: "qr_code_scan", data }) });
    },
    get listeners() {
      return listeners.size;
    },
  };
}
function setup(options = {}) {
  const n = native(),
    located = [];
  const location = createStationLocation({
    data,
    connections,
    native: n,
    onLocated: (point) => located.push(point?.id ?? null),
    ...options,
  });
  return { n, location, located };
}
async function scan(n, location, id) {
  const pending = location.scan();
  n.reply(stationQrPayload(id, data));
  return pending;
}

test("native JSON QR returns a point before destination selection and synchronizes the navigation entry", async () => {
  const { n, location, located } = setup();
  assert.equal(location.snapshot().mode, "browsing");
  assert.equal((await scan(n, location, "b1-e4")).type, "success");
  assert.deepEqual(n.messages, [{ name: "qr_code_scan", data: null }]);
  assert.deepEqual(located, ["b1-e4"]);
  const state = location.snapshot();
  assert.equal(state.mode, "navigation");
  assert.equal(state.destinationId, null);
  assert.equal(state.position.source, "qr");
  assert.equal(location.applyQuery({ point: "b1-e4", v: "1" }).type, "success");
  assert.deepEqual(location.snapshot().position, state.position);
  location.dispose();
  assert.equal(n.listeners, 0);
});

test("URL entries carry no invented scan timestamp and invalid/removed parameters return to browsing", () => {
  const { location } = setup();
  location.applyQuery({ point: "b1-e4", v: "1" });
  assert.equal(location.snapshot().position.source, "url");
  assert.equal(location.snapshot().position.confirmedAt, null);
  location.choose("m-e4");
  location.setStepFree(true);
  location.applyQuery({ point: "m-e4" });
  assert.equal(location.snapshot().position.floor, "B2");
  assert.equal(location.snapshot().stepFree, true);
  assert.equal(location.snapshot().arrived, false);
  location.applyQuery({ point: "missing" });
  assert.equal(location.snapshot().mode, "browsing");
  assert.equal(location.snapshot().position, null);
  assert.match(location.snapshot().notice, /無效/);
  assert.equal(location.snapshot().noticeKey, "notice.linkInvalid");
  location.applyQuery({});
  assert.equal(location.snapshot().notice, "");
  assert.equal(location.snapshot().noticeKey, "");
  location.dispose();
});

test("clearing the destination keeps the last confirmed QR position", async () => {
  const { n, location } = setup();
  await scan(n, location, "b1-e4");
  location.choose("m-e4");
  const position = location.snapshot().position;
  assert.equal(location.choose(null), true);
  assert.equal(location.snapshot().destinationId, null);
  assert.deepEqual(location.snapshot().position, position);
  assert.equal(location.snapshot().relation.status, "waiting");
  location.dispose();
});

test("cancel, malformed/foreign QR and duplicate clicks preserve position, target and restrictions", async () => {
  const { n, location, located } = setup();
  await scan(n, location, "b1-e4");
  location.choose("m-e4");
  location.setStepFree(true);
  const before = location.snapshot();
  for (const payload of [
    null,
    123,
    "http://example.com/?point=m-e4",
    "{}",
    JSON.stringify({
      ...JSON.parse(stationQrPayload("m-e4", data)),
      site_id: "foreign",
    }),
  ]) {
    const pending = location.scan();
    const count = n.messages.length;
    assert.equal((await location.scan()).type, "Busy");
    assert.equal(n.messages.length, count);
    n.reply(payload);
    assert.notEqual((await pending).type, "success");
    const after = location.snapshot();
    assert.deepEqual(after.position, before.position);
    assert.equal(after.destinationId, before.destinationId);
    assert.equal(after.stepFree, true);
  }
  assert.deepEqual(located, ["b1-e4"]);
  await scan(n, location, "b1-e7");
  assert.equal(location.snapshot().destinationId, "m-e4");
  assert.equal(location.snapshot().position.pointId, "b1-e7");
  location.dispose();
});

test("timeout drains late replies before retry and never applies their location", async () => {
  const { n, location, located } = setup({ timeoutMs: 5 });
  assert.equal((await location.scan()).type, "Timeout");
  assert.equal((await location.scan()).type, "WaitingForDrain");
  assert.equal(n.messages.length, 1);
  n.reply(stationQrPayload("b1-e4", data));
  assert.equal(location.snapshot().position, null);
  assert.deepEqual(located, []);
  await scan(n, location, "m-e4");
  assert.deepEqual(located, ["m-e4"]);
  location.dispose();
});

test("route changes, suspension and unmount invalidate pending scans and release listeners", async () => {
  for (const action of ["query", "suspend", "dispose"]) {
    const { n, location, located } = setup();
    const pending = location.scan();
    if (action === "query") location.applyQuery({ point: "m-e4" });
    else location[action]();
    assert.equal((await pending).type, "Stale");
    n.reply(stationQrPayload("b1-e4", data));
    assert.equal(
      location.snapshot().position?.pointId ?? null,
      action === "query" ? "m-e4" : null
    );
    assert.deepEqual(located, []);
    location.dispose();
    assert.equal(n.listeners, 0);
  }
});

test("exit clears point and destination while a browser without bridge never pretends to scan", async () => {
  const { location, located } = setup({ native: null });
  location.applyQuery({ point: "b1-e4" });
  assert.equal((await location.scan()).type, "Unavailable");
  assert.equal(location.snapshot().position.source, "url");
  await location.reset();
  assert.equal(location.snapshot().mode, "browsing");
  assert.equal(location.snapshot().destinationId, null);
  assert.deepEqual(located, [null]);
  location.dispose();
});

test("scan remains serialized while its URL update is settling", async () => {
  let finishNavigation, markSyncing;
  const syncing = new Promise((resolve) => {
    markSyncing = resolve;
  });
  const { n, location } = setup({
    onLocated: () =>
      new Promise((resolve) => {
        finishNavigation = resolve;
        markSyncing();
      }),
  });
  const pending = location.scan();
  n.reply(stationQrPayload("b1-e4", data));
  await syncing;
  assert.equal(location.snapshot().active, true);
  assert.equal((await location.scan()).type, "Busy");
  assert.equal(n.messages.length, 1);
  finishNavigation();
  assert.equal((await pending).type, "success");
  assert.equal(location.snapshot().active, false);
  location.dispose();
});
