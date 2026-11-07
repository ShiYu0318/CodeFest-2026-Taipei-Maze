// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileScript, parse } from "@vue/compiler-sfc";
import { transformSync } from "@babel/core";
import * as Vue from "vue";
import * as i18n from "../src/i18n/index.mjs";
import * as places from "../src/i18n/places.mjs";
import * as engine from "../src/search/search.mjs";
import * as fallback from "../src/search/fallback.mjs";
import { stationCatalog } from "../src/search/catalog.mjs";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const catalog = stationCatalog(
  JSON.parse(read("../src/views/station-points.json"))
);
const script = compileScript(
  parse(read("../src/components/DestinationSearch.vue")).descriptor,
  { id: "search-role" }
).content;
const output = transformSync(script, {
  babelrc: false,
  configFile: false,
  plugins: ["@babel/plugin-transform-modules-commonjs"],
}).code;
const modules = {
  vue: Vue,
  "../i18n/index.mjs": i18n,
  "../i18n/places.mjs": places,
  "../search/search.mjs": engine,
  "../search/fallback.mjs": fallback,
  "../search/dictionary.json": JSON.parse(
    read("../src/search/dictionary.json")
  ),
};
const compiled = { exports: {} };
new Function("require", "module", "exports", output)(
  (key) => modules[key],
  compiled,
  compiled.exports
);

test("switching endpoint roles invalidates a submitted match before the next render", async () => {
  const props = Vue.reactive({
    id: "endpoint-search",
    catalog,
    navigation: true,
    selectionRole: "start",
    disabled: false,
    clearToken: 0,
    currentOptions: {
      mobilityProfile: "standard",
      excludedEdgeTypes: [],
      unavailableConnectorIds: [],
    },
  });
  const emitted = [],
    scope = Vue.effectScope();
  const search = scope.run(() =>
    compiled.exports.default.setup(props, {
      expose() {},
      emit: (...args) => emitted.push(args),
    })
  );
  try {
    search.query.value = "廁所";
    search.submit();
    assert.equal(search.result.value.status, "matched");
    const match = search.result.value.matches[0];
    search.choose(match);
    assert.equal(emitted[0][1].role, "start");
    emitted.length = 0;
    props.selectionRole = "destination";
    search.choose(match);
    assert.deepEqual(
      emitted,
      [],
      "a start result must not set the destination"
    );
    await Vue.nextTick();
    assert.equal(search.result.value, null);
  } finally {
    scope.stop();
  }
});

test("endpoint picker rejects an old child's role before Vue patches its props", () => {
  const source = read("../src/components/StationEndpointPicker.vue");
  const script = compileScript(parse(source).descriptor, {
    id: "endpoint-role",
  }).content;
  const code = transformSync(script, {
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  }).code;
  const compiled = { exports: {} },
    emitted = [];
  const data = JSON.parse(read("../src/views/station-points.json"));
  const imports = {
    ...modules,
    vue: { ...Vue, onMounted() {} },
    "../views/station-points.json": data,
    "../search/catalog.mjs": { stationCatalog },
    "./DestinationSearch.vue": {},
  };
  new Function("require", "module", "exports", code)(
    (key) => imports[key],
    compiled,
    compiled.exports
  );
  const scope = Vue.effectScope();
  try {
    const picker = scope.run(() =>
      compiled.exports.default.setup(
        { startPoint: null, targetPoint: null },
        {
          expose() {},
          emit: (...args) => emitted.push(args),
        }
      )
    );
    picker.list.value = { scrollTop: 0 };
    picker.showRole("destination");
    picker.chooseSearch({ role: "start", poiId: "b1-wc-m5" });
    assert.deepEqual(emitted, []);
    assert.equal(picker.choices.destination, null);
    picker.chooseSearch({ role: "destination", poiId: "b1-wc-m5" });
    assert.equal(picker.choices.destination.id, "b1-wc-m5");
    assert.equal(emitted[0][4], "destination");
  } finally {
    scope.stop();
  }
});
