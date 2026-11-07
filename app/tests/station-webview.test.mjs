// SPDX-License-Identifier: AGPL-3.0-or-later
/* global globalThis */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRenderer, h, nextTick } from "vue";
import { createRouter, createMemoryHistory, RouterView } from "vue-router";
import { useStationLocation } from "../src/station/useStationLocation.js";
import { stationQrPayload } from "../src/station/scan.mjs";
import { iosWebMessageData } from "./helpers/ios-web-message.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);

for (const { readyEvent, query = {} } of [
  { readyEvent: "flutterInAppWebViewPlatformReady" },
  { readyEvent: "pageshow" },
  {
    readyEvent: "pageshow",
    query: { start: "b1-e7", destination: "m-e4", lang: "vi" },
  },
]) {
  test(`${readyEvent} ${
    query.destination ? "existing trip" : "browsing"
  }: web scan calls TownPass and locates on the map`, async () => {
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
          data: iosWebMessageData({ name: "qr_code_scan", data: payload }),
        });
    };
    try {
      await router.push({ path: "/station-map", query });
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
      if (query.destination) {
        location.choose(query.destination);
        location.setStepFree(true);
      }
      const pending = button.onClick();
      await nextTick();
      assert.equal(button.disabled, true);
      assert.deepEqual(messages, [{ name: "qr_code_scan", data: null }]);
      reply(stationQrPayload("b1-e4", data));
      assert.equal((await pending).type, "success");
      await nextTick();
      assert.deepEqual(router.currentRoute.value.query, {
        ...query,
        ...(query.start ? { start: "b1-e4" } : {}),
        point: "b1-e4",
        v: "1",
      });
      assert.equal(location.view.value.position.source, "qr");
      assert.equal(location.view.value.position.floor, "B1");
      assert.ok(location.view.value.position.confirmedAt);
      assert.equal(button.disabled, false);
      if (query.destination) {
        const qrPosition = location.view.value.position;
        const originalQuery = { ...router.currentRoute.value.query };
        const transferToken = location.view.value.transfer.token;
        assert.equal(location.confirmTransfer(transferToken).type, "success");
        await nextTick();
        assert.equal(location.view.value.navigationPosition.floor, "B2");
        assert.equal(
          location.view.value.manualPosition.source,
          "manual_transfer"
        );
        assert.deepEqual(location.view.value.position, qrPosition);
        assert.deepEqual(router.currentRoute.value.query, originalQuery);
        assert.equal(location.confirmTransfer(transferToken), false);
        const before = { ...router.currentRoute.value.query };
        for (const payload of [null, "wrong QR"]) {
          const rescan = button.onClick();
          reply(payload);
          assert.notEqual((await rescan).type, "success");
          assert.deepEqual(router.currentRoute.value.query, before);
          assert.equal(location.view.value.destinationId, query.destination);
          assert.equal(location.view.value.stepFree, true);
        }
        const rescan = button.onClick();
        reply(stationQrPayload("b2-qr-01", data));
        assert.equal((await rescan).type, "success");
        assert.equal(router.currentRoute.value.query.start, "b2-qr-01");
        assert.equal(router.currentRoute.value.query.point, "b2-qr-01");
        assert.equal(
          router.currentRoute.value.query.destination,
          query.destination
        );
        assert.equal(location.view.value.destinationId, query.destination);
        assert.equal(location.view.value.stepFree, true);
        assert.equal(location.view.value.manualPosition, null);
      }
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
