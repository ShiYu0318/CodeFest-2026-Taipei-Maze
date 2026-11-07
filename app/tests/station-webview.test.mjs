// SPDX-License-Identifier: AGPL-3.0-or-later
/* global globalThis */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRenderer, h, nextTick } from "vue";
import { createRouter, createMemoryHistory, RouterView } from "vue-router";
import { useStationLocation } from "../src/station/useStationLocation.js";
import { stationQrPayload } from "../src/station/scan.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);

for (const readyEvent of ["flutterInAppWebViewPlatformReady", "pageshow"]) {
  test(`${readyEvent}: web scan calls the unchanged TownPass protocol and locates on the map`, async () => {
    const previousWindow = globalThis.window;
    const events = new Map(),
      replies = new Set(),
      messages = [];
    const host = {
      postMessage: (text) => messages.push(JSON.parse(text)),
      addEventListener: (_, listener) => replies.add(listener),
      removeEventListener: (_, listener) => replies.delete(listener),
    };
    globalThis.window = {
      addEventListener(name, listener) {
        if (!events.has(name)) events.set(name, new Set());
        events.get(name).add(listener);
      },
      removeEventListener(name, listener) {
        events.get(name)?.delete(listener);
      },
    };
    let location, button, app;
    const page = {
      setup() {
        location = useStationLocation(data, connections);
        return () =>
          h(
            "button",
            {
              disabled:
                !location.view.value.available || location.view.value.active,
              onClick: () => location.scan(),
            },
            "Scan location"
          );
      },
    };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/station-map", component: page },
        { path: "/other", component: { render: () => h("p", "Other") } },
      ],
    });
    const renderer = createRenderer({
      createElement(tag) {
        const node = { children: [] };
        if (tag === "button") button = node;
        return node;
      },
      createText: (text) => ({ text }),
      createComment: (text) => ({ text }),
      insert(node, parent) {
        parent.children.push(node);
        node.parent = parent;
      },
      remove() {},
      setText(node, text) {
        node.text = text;
      },
      setElementText(node, text) {
        node.text = text;
      },
      parentNode: (node) => node.parent,
      nextSibling: () => null,
      patchProp(node, key, _, value) {
        node[key] = value;
      },
    });
    const reply = (payload) => {
      for (const listener of replies)
        listener({
          data: JSON.stringify({ name: "qr_code_scan", data: payload }),
        });
    };
    try {
      await router.push("/station-map");
      await router.isReady();
      app = renderer.createApp({ render: () => h(RouterView) });
      app.use(router);
      app.mount({ children: [] });
      await nextTick();
      assert.equal(button.disabled, true);
      window.flutterObject = host;
      for (const listener of events.get(readyEvent)) listener();
      await nextTick();
      assert.equal(button.disabled, false);
      assert.deepEqual(messages, []); // Readiness never starts a camera by itself.
      const pending = button.onClick();
      await nextTick();
      assert.equal(button.disabled, true);
      assert.deepEqual(messages, [{ name: "qr_code_scan", data: null }]);
      reply(stationQrPayload("b1-e4", data));
      assert.equal((await pending).type, "success");
      await nextTick();
      assert.deepEqual(router.currentRoute.value.query, {
        point: "b1-e4",
        v: "1",
      });
      assert.equal(location.view.value.position.source, "qr");
      assert.equal(location.view.value.position.floor, "B1");
      assert.ok(location.view.value.position.confirmedAt);
      assert.equal(button.disabled, false);
      const stale = button.onClick();
      await router.push("/other");
      await nextTick();
      assert.equal((await stale).type, "Stale");
      reply(stationQrPayload("m-e4", data));
      assert.equal(replies.size, 0);
      assert.ok(
        [...events.values()].every((listeners) => listeners.size === 0)
      );
    } finally {
      app?.unmount();
      globalThis.window = previousWindow;
    }
  });
}
