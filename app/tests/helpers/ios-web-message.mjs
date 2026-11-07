// SPDX-License-Identifier: AGPL-3.0-or-later
import { runInNewContext } from "node:vm";

/** Reproduce the installed iOS WebMessage.swift jsData serializer, test only. */
export function iosWebMessageData(reply) {
  const data = JSON.stringify(reply);
  const literal = "'" + data.replaceAll("'", "\\'") + "'";
  return runInNewContext(`(${literal})`, Object.create(null), { timeout: 100 });
}
