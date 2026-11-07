// SPDX-License-Identifier: AGPL-3.0-or-later
// Usage: npm run validate:assets — exits non-zero if shipped data is unsafe.
import { readFileSync } from "node:fs";
import { validateStationData } from "../src/station/validate.mjs";
import { LOCALES, catalogs } from "../src/i18n/index.mjs";

const read = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const issues = validateStationData(
  read("../src/views/station-points.json"),
  read("../src/views/station-connections.json")
);

const reference = Object.keys(catalogs["zh-TW"]).sort().join("\n");
for (const { code } of LOCALES)
  if (Object.keys(catalogs[code]).sort().join("\n") !== reference)
    issues.push(`i18n: ${code} keys differ from zh-TW`);

if (issues.length) {
  console.error(`✖ ${issues.length} asset issue(s):\n- ${issues.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `✔ station data and ${LOCALES.length} UI catalogs passed validation`
);
