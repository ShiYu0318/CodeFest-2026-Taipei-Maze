// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  outlineRings,
  boundarySegments,
  scatterBoundary,
} from "../src/station/boundary.mjs";
import { plans, floors, b2Outline } from "../src/views/station-floor-plans.mjs";
import {
  stationPoints,
  stationQrPayload,
  createStationScanSession,
} from "../src/station/scan.mjs";
import { validateStationData } from "../src/station/validate.mjs";

const data = JSON.parse(
  readFileSync(new URL("../src/views/station-points.json", import.meta.url))
);
const connections = JSON.parse(
  readFileSync(
    new URL("../src/views/station-connections.json", import.meta.url)
  )
);
const isQrPoint = (point) => [point.type].flat().includes("qrcode");
const qrPoints = stationPoints(data).filter(isQrPoint);

test("linear SVG outlines preserve relative moves and separate holes from the perimeter", () => {
  const path = "M10 20h100v50H10z M30 30h20v10H30Z";
  assert.deepEqual(outlineRings(path), [
    [
      [10, 20],
      [110, 20],
      [110, 70],
      [10, 70],
    ],
    [
      [30, 30],
      [50, 30],
      [50, 40],
      [30, 40],
    ],
  ]);
  const edges = boundarySegments({
    outlines: [path],
    scale: 0.5,
    offset: [5, 7],
  });
  assert.equal(edges.length, 4);
  assert.deepEqual(edges[0].from, [10, 17]);
  assert.deepEqual(edges[0].to, [60, 17]);
  assert.throws(() => outlineRings("M0 0C1 1 2 2 3 3Z"), /linear/);
  assert.throws(() => outlineRings("M0 0L10 10"), /Unclosed/);
});

test("each floor has eight fixed QR points on its actual transformed outer boundary", () => {
  assert.equal(qrPoints.length, 32);
  assert.equal(new Set(qrPoints.map((point) => point.id)).size, 32);
  for (const floor of Object.keys(floors)) {
    const points = qrPoints.filter((point) => point.floor === floor);
    const obstacles = data.points[floor].filter((point) => !isQrPoint(point));
    assert.equal(points.length, 8);
    const generated = scatterBoundary(plans[floor], {
      seed: 20261108 + Number(floor.slice(1)),
      obstacles,
    });
    const edges = boundarySegments(plans[floor]);
    for (const [index, point] of points.entries()) {
      assert.equal(point.x, generated[index].x);
      assert.equal(point.y, generated[index].y);
      const edge = edges.find(
        (item) =>
          item.outline === point.boundary.outline &&
          item.edge === point.boundary.edge
      );
      const expected = edge.from.map(
        (value, axis) =>
          value + point.boundary.fraction * (edge.to[axis] - value)
      );
      assert.ok(
        Math.hypot(point.x - expected[0], point.y - expected[1]) < 0.01
      );
      for (const other of [
        ...obstacles,
        ...points.filter((item) => item.id !== point.id),
      ])
        assert.ok(Math.hypot(point.x - other.x, point.y - other.y) >= 36);
      const [x, y, width, height] = floors[floor].bounds;
      assert.ok(
        point.x >= x &&
          point.x <= x + width &&
          point.y >= y &&
          point.y <= y + height
      );
    }
  }
});

test("the platform filter tags only the QR points on the B3 and B4 platforms", () => {
  const platformPoints = stationPoints(data).filter((point) =>
    [point.type].flat().includes("platform")
  );
  assert.deepEqual(
    platformPoints.map((point) => point.id),
    [
      "b3-qr-05",
      "b3-qr-06",
      "b3-qr-07",
      "b3-qr-08",
      ...qrPoints
        .filter((point) => point.floor === "B4")
        .map((point) => point.id),
    ]
  );
  assert.ok(platformPoints.every((point) => point.type[0] === "qrcode"));
});

test("QR navigation points scan normally without inventing a surveyed walking route", () => {
  const session = createStationScanSession(data, connections);
  session.setDestination("m-e4");
  for (const point of qrPoints) {
    assert.equal(
      session.scan(stationQrPayload(point.id, data)).type,
      "success"
    );
    const state = session.snapshot();
    assert.equal(state.position.pointId, point.id);
    assert.equal(state.position.source, "qr");
    assert.equal(state.relation.status, "unavailable");
    assert.equal(point.zone, null);
  }
  session.setDestination(qrPoints[0].id);
  session.scan(stationQrPayload(qrPoints[0].id, data));
  assert.equal(session.snapshot().relation.status, "at_destination");
  assert.deepEqual(validateStationData(data, connections), []);
  const bad = JSON.parse(JSON.stringify(data));
  const point = bad.points.B1.find(isQrPoint);
  point.zone = "b1-passage";
  assert.ok(
    validateStationData(bad, connections).some((issue) =>
      issue.includes("invalid demo QR")
    )
  );
});

test("the actual QR icon and every floor component render with the shared outline data", async () => {
  const Vue = await import("vue");
  const { renderToString } = await import("@vue/server-renderer");
  const { parse, compileTemplate } = await import("@vue/compiler-sfc");
  const { transformSync } = await import("@babel/core");
  const components = new Map();
  function component(name) {
    if (components.has(name)) return components.get(name);
    const source = readFileSync(
      new URL(`../src/components/${name}.vue`, import.meta.url),
      "utf8"
    );
    const descriptor = parse(source).descriptor;
    const template = compileTemplate({
      source: descriptor.template.content,
      filename: name,
      id: name,
    });
    assert.deepEqual(template.errors, []);
    const code =
      descriptor.script.content.replace("export default", "const component =") +
      "\n" +
      template.code.replace("export function render", "function render") +
      "\ncomponent.render = render; export default component;";
    const output = transformSync(code, {
      babelrc: false,
      configFile: false,
      plugins: ["@babel/plugin-transform-modules-commonjs"],
    }).code;
    const compiled = { exports: {} };
    const load = (path) => {
      if (path === "vue") return Vue;
      if (path.endsWith("station-floor-plans.mjs")) return { plans, b2Outline };
      if (path.endsWith("station-points.json")) return data;
      if (path.endsWith("StationB2Plan.vue")) return component("StationB2Plan");
      throw new Error(`Unexpected component dependency ${path}`);
    };
    new Function("require", "module", "exports", output)(
      load,
      compiled,
      compiled.exports
    );
    components.set(name, compiled.exports.default);
    return compiled.exports.default;
  }
  const icon = await renderToString(
    Vue.createSSRApp(component("StationMapIcon"), { name: "qrcode" })
  );
  assert.match(icon, /<path d="M3 3h6v6H3z/);
  for (const floor of Object.keys(floors)) {
    const html = await renderToString(
      Vue.createSSRApp(component("StationFloorPlan"), { floor })
    );
    assert.match(html, /<path/);
    assert.equal(html.includes("undefined"), false);
    if (floor === "B2") {
      assert.ok(html.includes("translate(512.5 960) scale(0.5)"));
      assert.ok(html.includes(b2Outline));
    }
  }
});
