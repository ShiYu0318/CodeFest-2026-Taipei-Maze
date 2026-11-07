// SPDX-License-Identifier: AGPL-3.0-or-later
/* global globalThis */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Vue from "vue";
import * as VueRouter from "vue-router";
import { renderToString } from "@vue/server-renderer";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { transformSync } from "@babel/core";
import * as i18n from "../src/i18n/index.mjs";
import * as places from "../src/i18n/places.mjs";
import * as preferences from "../src/display/preferences.mjs";
import * as zhuyin from "../src/display/zhuyin.mjs";
import * as floorPlans from "../src/views/station-floor-plans.mjs";
import * as navigation from "../src/station/navigation-view.mjs";
import * as scan from "../src/station/scan.mjs";
import * as mapFocus from "../src/station/map-focus.mjs";
import * as mapTour from "../src/station/map-tour.mjs";
import * as about from "../src/about/about.mjs";
import * as searchCatalog from "../src/search/catalog.mjs";
import * as searchEngine from "../src/search/search.mjs";
import * as searchFallback from "../src/search/fallback.mjs";
const dictionary = JSON.parse(
  readFileSync(new URL("../src/search/dictionary.json", import.meta.url))
);
import * as boundary from "../src/station/boundary.mjs";
import * as locationHook from "../src/station/useStationLocation.js";
import { createStationLocation } from "../src/station/location.mjs";
import { iosWebMessageData } from "./helpers/ios-web-message.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);
const components = new Map();
const realComponents = new Set([
  "StationMapView",
  "StationFloorPlan",
  "StationB2Plan",
  "StationMapIcon",
  "StationNavigationRescan",
  "StationTransferStep",
  "DestinationSearch",
  "StationScanPanel",
  "DisplayControls",
  "StationTripDialog",
  "ZhuyinText",
  "ZhuyinSvgText",
]);
function component(name) {
  if (components.has(name)) return components.get(name);
  const directory = name.endsWith("View") ? "views" : "components";
  const source = readFileSync(
    new URL(`../src/${directory}/${name}.vue`, import.meta.url),
    "utf8"
  );
  const descriptor = parse(source).descriptor;
  let script;
  if (descriptor.scriptSetup) {
    script = compileScript(descriptor, {
      id: name,
      inlineTemplate: true,
    }).content;
  } else {
    const template = compileTemplate({
      source: descriptor.template.content,
      filename: name,
      id: name,
    });
    assert.deepEqual(template.errors, []);
    script =
      descriptor.script.content.replace("export default", "const component =") +
      "\n" +
      template.code.replace("export function render", "function render") +
      "\ncomponent.render = render; export default component;";
  }
  const output = transformSync(script, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  }).code;
  const modules = {
    vue: Vue,
    "vue-router": VueRouter,
    "station-floor-plans.mjs": floorPlans,
    "station-points.json": data,
    "station-connections.json": connections,
    "index.mjs": i18n,
    "places.mjs": places,
    "preferences.mjs": preferences,
    "zhuyin.mjs": zhuyin,
    "navigation-view.mjs": navigation,
    "scan.mjs": scan,
    "map-focus.mjs": mapFocus,
    "map-tour.mjs": mapTour,
    "about.mjs": about,
    "catalog.mjs": searchCatalog,
    "search.mjs": searchEngine,
    "fallback.mjs": searchFallback,
    "dictionary.json": dictionary,
    "boundary.mjs": boundary,
    useStationLocation: locationHook,
    "station-routing": {
      zones: connections.zones,
      transfersFromPoint: () => [],
    },
  };
  const load = (path) => {
    const file = path.split("/").at(-1);
    if (file.endsWith(".css")) return {};
    if (file.endsWith(".vue")) {
      const child = file.slice(0, -4);
      if (realComponents.has(child)) return component(child);
      // Map marker rendering and the scan section remain real; unrelated panels
      // are stubbed so this test does not depend on chat, search or dialogs.
      return {
        props: ["text", "persistentScan"],
        render() {
          return Vue.h(
            "span",
            { "data-persistent-scan": this.persistentScan },
            this.text
          );
        },
      };
    }
    assert.ok(Object.hasOwn(modules, file), path);
    return modules[file];
  };
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    load,
    compiled,
    compiled.exports
  );
  components.set(name, compiled.exports.default);
  return compiled.exports.default;
}

test("navigation prompts annotate only Traditional Chinese child mode", async () => {
  const settings = preferences.useDisplayPreferences();
  const language = i18n.useI18n();
  const originalMode = settings.displayMode.value;
  const originalLocale = language.locale.value;
  const view = Vue.shallowRef(null);
  const controller = createStationLocation({
    data,
    connections,
    onChange: (state) => {
      view.value = state;
    },
  });
  controller.applyQuery({ point: "b1-e4" });
  controller.choose("b4-e1");
  const location = { view, scan() {} };
  try {
    for (const { code: locale } of i18n.LOCALES) {
      language.setLocale(locale);
      for (const mode of ["standard", "senior", "child"]) {
        settings.setDisplayMode(mode);
        for (const [name, props] of [
          ["StationNavigationRescan", { location }],
          ["StationTripDialog", { direction: language.t("map.faceChoose") }],
          ["StationTripDialog", { direction: "", cancelOnly: true }],
        ]) {
          const html = await renderToString(
            Vue.createSSRApp(component(name), props)
          );
          assert.equal(
            html.includes("<ruby"),
            mode === "child" && locale === "zh-TW",
            `${name}: ${locale}/${mode}/${!!props.cancelOnly}`
          );
        }
      }
    }
  } finally {
    controller.dispose();
    language.setLocale(originalLocale);
    settings.setDisplayMode(originalMode);
  }
});

test("the map renders only needed icons during a trip, keeps QR markers and inline scanning, then restores browsing", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  const language = i18n.useI18n();
  const previousLocale = language.locale.value;
  language.setLocale("zh-TW");
  async function render(query) {
    const router = VueRouter.createRouter({
      history: VueRouter.createMemoryHistory(),
      routes: [
        { path: "/station-map", component: component("StationMapView") },
        { path: "/about", component: { render: () => Vue.h("p", "About") } },
      ],
    });
    await router.push({ path: "/station-map", query });
    await router.isReady();
    const app = Vue.createSSRApp({ render: () => Vue.h(VueRouter.RouterView) });
    app.use(router);
    return renderToString(app);
  }
  try {
    const browsing = await render({});
    assert.equal(
      (browsing.match(/class="map-pin\b/g) ?? []).length,
      data.points.B2.length
    );
    assert.ok(browsing.includes('class="theme-group'));
    assert.equal(browsing.includes('class="navigation-rescan-bar"'), false);
    const trip = await render({ start: "b1-e4", destination: "m-e4" });
    assert.equal((trip.match(/class="map-pin\b/g) ?? []).length, 9);
    assert.ok(trip.includes('class="navigation-rescan-bar"'));
    assert.equal(trip.includes('class="theme-group'), false);
    assert.equal(trip.includes('class="plan-stairs"'), false);
    assert.ok(trip.includes('class="station-scan-panel"'));
    assert.ok(trip.includes("重新掃描定位"));
    const restored = await render({});
    assert.equal(
      (restored.match(/class="map-pin\b/g) ?? []).length,
      data.points.B2.length
    );
  } finally {
    language.setLocale(previousLocale);
    globalThis.window = previousWindow;
  }
});

test("the real inline scan button calls TownPass once, handles cancel and can relocate without changing the target", async () => {
  const replies = new Set(),
    messages = [];
  const native = {
    postMessage: (text) => messages.push(JSON.parse(text)),
    addEventListener: (_, fn) => replies.add(fn),
    removeEventListener: (_, fn) => replies.delete(fn),
  };
  const view = Vue.shallowRef(null);
  const controller = createStationLocation({
    data,
    connections,
    native,
    onChange: (state) => {
      view.value = state;
    },
  });
  controller.applyQuery({ point: "b1-e4" });
  controller.choose("m-e4");
  controller.setStepFree(true);
  view.value = controller.snapshot();
  const location = { view, scan: () => controller.scan() };
  let button,
    scanned = 0;
  const renderer = Vue.createRenderer({
    createElement(tag) {
      const node = { children: [] };
      node.tag = tag;
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
      if (key === "data-tour-target" && value === "scan") button = node;
    },
  });
  const reply = (payload) => {
    for (const receiver of replies)
      receiver({
        data: iosWebMessageData({ name: "qr_code_scan", data: payload }),
      });
  };
  const app = renderer.createApp(component("StationNavigationRescan"), {
    location,
    onScanned: () => {
      scanned++;
    },
  });
  try {
    app.mount({ children: [] });
    assert.equal(button.disabled, false);
    const cancelled = button.onClick();
    await Vue.nextTick();
    assert.equal(button.disabled, true);
    assert.deepEqual(messages, [{ name: "qr_code_scan", data: null }]);
    assert.equal((await controller.scan()).type, "Busy");
    reply(null);
    await cancelled;
    await Vue.nextTick();
    assert.equal(button.disabled, false);
    assert.equal(scanned, 0);
    const pending = button.onClick();
    reply(scan.stationQrPayload("b2-qr-01", data));
    await pending;
    await Vue.nextTick();
    assert.equal(scanned, 1);
    assert.equal(button.disabled, false);
    assert.equal(view.value.position.pointId, "b2-qr-01");
    assert.equal(view.value.destinationId, "m-e4");
    assert.equal(view.value.stepFree, true);
  } finally {
    app.unmount();
    controller.dispose();
  }
});

test("the rendered floor action names its target, rejects a repeated old click and keeps native rescanning available", async () => {
  const language = i18n.useI18n(),
    previousLocale = language.locale.value;
  language.setLocale("zh-TW");
  const receivers = new Set(),
    nodes = [];
  const native = {
    postMessage() {},
    addEventListener: (_, fn) => receivers.add(fn),
    removeEventListener: (_, fn) => receivers.delete(fn),
  };
  const view = Vue.shallowRef(null);
  const controller = createStationLocation({
    data,
    connections,
    native,
    onChange: (state) => {
      view.value = state;
    },
  });
  controller.applyQuery({ point: "b1-e4" });
  controller.choose("b4-e1");
  const location = {
    view,
    scan: () => controller.scan(),
    confirmTransfer: (token) => controller.confirmTransfer(token),
  };
  const renderer = Vue.createRenderer({
    createElement(tag) {
      const node = { tag, children: [] };
      nodes.push(node);
      return node;
    },
    createText: (text) => ({ text }),
    createComment: (text) => ({ text }),
    insert(node, parent) {
      parent.children.push(node);
      node.parent = parent;
    },
    remove(node) {
      node.removed = true;
    },
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
  const action = () =>
    nodes.findLast((node) => node.class === "confirm-floor-transfer");
  const textContent = (node) =>
    (node.text || "") + (node.children || []).map(textContent).join("");
  const heading = () =>
    textContent(nodes.findLast((node) => node.tag === "h3"));
  const reply = (payload) => {
    for (const receiver of receivers)
      receiver({
        data: iosWebMessageData({ name: "qr_code_scan", data: payload }),
      });
  };
  const app = renderer.createApp(component("StationNavigationRescan"), {
    location,
  });
  try {
    app.mount({ children: [] });
    const qr = nodes.find((node) => node["data-tour-target"] === "scan");
    assert.match(heading(), /電梯.*B2/);
    assert.equal(textContent(action()), "我已下樓");
    const firstClick = action().onClick;
    firstClick();
    firstClick(); // Same rendered handler, before Vue updates its DOM.
    assert.equal(view.value.navigationPosition.floor, "B2");
    await Vue.nextTick();
    assert.match(heading(), /B4/);
    firstClick(); // Removed button cannot advance the new step either.
    assert.equal(view.value.navigationPosition.floor, "B2");
    assert.equal(qr.disabled, false);
    const pending = qr.onClick();
    await Vue.nextTick();
    assert.equal(action().disabled, true);
    assert.equal(qr.disabled, true);
    reply(scan.stationQrPayload("b4-e1", data));
    await pending;
    controller.choose("b1-e4");
    await Vue.nextTick();
    assert.equal(view.value.manualPosition, null);
    assert.match(heading(), /B2/);
    assert.equal(textContent(action()), "我已上樓");
    action().onClick();
    await Vue.nextTick();
    assert.equal(view.value.navigationPosition.floor, "B2");
    assert.match(heading(), /B1/);
    assert.equal(qr.disabled, false);
  } finally {
    app.unmount();
    controller.dispose();
    language.setLocale(previousLocale);
  }
});

test("navigation exposes destination search before the secondary destination list", async () => {
  const location = createStationLocation({ data, connections, native: null });
  try {
    location.applyQuery({ point: "b1-e4", v: "1" });
    const html = await renderToString(
      Vue.createSSRApp(component("StationScanPanel"), {
        location: { view: Vue.ref(location.snapshot()) },
      })
    );
    const search = html.indexOf('type="search"');
    const list = html.indexOf("<details");
    assert.ok(search >= 0, "a search input is visible in navigation");
    assert.ok(
      list > search,
      "search is outside and before the secondary collapsed list"
    );
    assert.ok(html.indexOf('id="station-destination"') > list);
  } finally {
    location.dispose();
  }
});

test("endpoint picker exposes search with the active start or destination role", async () => {
  const language = i18n.useI18n(),
    previous = language.locale.value;
  language.setLocale("zh-TW");
  try {
    for (const [startPoint, role, title, action] of [
      [null, "start", "搜尋起點", "設為起點"],
      [
        { ...data.points.B1[0], floor: "B1" },
        "destination",
        "搜尋終點",
        "設為終點",
      ],
    ]) {
      const html = await renderToString(
        Vue.createSSRApp(component("StationEndpointPicker"), { startPoint })
      );
      assert.ok(html.includes('id="endpoint-' + role + '-search-query"'));
      assert.ok(html.includes(title));
      const form = html.indexOf('type="search"');
      const list = html.indexOf('class="endpoint-list"');
      assert.ok(form >= 0 && list > form, action);
    }
  } finally {
    language.setLocale(previous);
  }
});

test("map sources stay behind an information entry rather than consuming map footer space", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  const router = VueRouter.createRouter({
    history: VueRouter.createMemoryHistory(),
    routes: [{ path: "/station-map", component: component("StationMapView") }],
  });
  try {
    await router.push("/station-map");
    await router.isReady();
    const app = Vue.createSSRApp({ render: () => Vue.h(VueRouter.RouterView) });
    app.use(router);
    const html = await renderToString(app);
    assert.equal(html.includes('class="station-footer"'), false);
    assert.equal(
      html.includes("https://web.metro.taipei/img/ALL/INFOPDF/051.pdf"),
      false
    );
    assert.ok(html.includes('aria-haspopup="dialog"'));
    const info = html.indexOf("map-information-button");
    assert.ok(info >= 0 && info < html.indexOf('class="map-stage"'));
    const ordered = ["language", "mode", "theme", "contrast", "reopen"].map(
      (target) => html.indexOf('data-tour-target="' + target + '"')
    );
    assert.ok(ordered.every((index) => index >= 0));
    assert.deepEqual(
      [...ordered].sort((a, b) => a - b),
      ordered
    );
    assert.ok(ordered.at(-1) < info);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("information page retains the floor reference, map notes, source links and licensing", async () => {
  const language = i18n.useI18n(),
    previous = language.locale.value;
  language.setLocale("zh-TW");
  try {
    const app = Vue.createSSRApp(component("AboutView"), {
      embedded: true,
      floor: "B3",
    });
    app.use(
      VueRouter.createRouter({
        history: VueRouter.createMemoryHistory(),
        routes: [],
      })
    );
    const html = await renderToString(app);
    assert.ok(html.includes("051.pdf#page=3"));
    assert.ok(html.includes("WebStation/051/1"));
    assert.ok(html.includes("WebStation/051/4"));
    assert.ok(html.includes(language.t("map.footerNote")));
    assert.ok(html.includes("AGPL-3.0-or-later"));
    assert.ok(html.includes("about-version"));
  } finally {
    language.setLocale(previous);
  }
});

test("first-floor information uses its own source note rather than a metro basement page", async () => {
  const language = i18n.useI18n(),
    previous = language.locale.value;
  language.setLocale("zh-TW");
  try {
    const app = Vue.createSSRApp(component("AboutView"), {
      embedded: true,
      floor: "1F",
    });
    app.use(
      VueRouter.createRouter({
        history: VueRouter.createMemoryHistory(),
        routes: [],
      })
    );
    const html = await renderToString(app);
    assert.ok(html.includes(language.t("map.firstFloorNote")));
    assert.equal(html.includes("051.pdf#page="), false);
  } finally {
    language.setLocale(previous);
  }
});

test("navigation actions keep one scan control followed by staff help and trip cancellation", async () => {
  for (const persistentScan of [false, true]) {
    const location = createStationLocation({ data, connections, native: null });
    try {
      location.applyQuery({ point: "b1-e4", v: "1" });
      location.choose("m-e4");
      const html = await renderToString(
        Vue.createSSRApp(component("StationScanPanel"), {
          location: { view: Vue.ref(location.snapshot()) },
          persistentScan,
        })
      );
      const actions = html.indexOf('class="scan-actions"');
      const scan = html.indexOf('data-tour-target="scan"');
      const staff = html.indexOf('class="scan-staff"');
      const cancel = html.indexOf('class="scan-cancel"');
      assert.ok(
        actions >= 0 && scan > actions && staff > scan && cancel > staff
      );
      assert.equal((html.match(/data-tour-target="scan"/g) ?? []).length, 1);
    } finally {
      location.dispose();
    }
  }
});
