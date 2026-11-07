// SPDX-License-Identifier: AGPL-3.0-or-later
import { readonly, shallowRef } from "vue";
import { COMPASS_MESSAGE, decodeCompassHeading } from "./orientation.mjs";

const sample = shallowRef(null);
export const stationHeading = readonly(sample);
let subscription = null;
let sequence = 0;
let expiryTimer;

function receiveCompassMessage(event) {
  if (!subscription) return;
  const heading = decodeCompassHeading(event.data, subscription.id);
  if (heading === undefined) return;
  clearTimeout(expiryTimer);
  sample.value = heading;
  if (heading) {
    expiryTimer = setTimeout(() => {
      sample.value = null;
    }, 5000);
  }
}

function postCompassAction({ bridge, id }, action) {
  bridge.postMessage(
    JSON.stringify({
      name: COMPASS_MESSAGE,
      data: { action, subscriptionId: id },
    })
  );
}

export function startStationCompass(bridge) {
  if (subscription?.bridge === bridge) return;
  stopStationCompass();
  if (
    !bridge ||
    !["postMessage", "addEventListener", "removeEventListener"].every(
      (method) => typeof bridge[method] === "function"
    )
  )
    return;

  subscription = { bridge, id: ++sequence };
  bridge.addEventListener("message", receiveCompassMessage);
  try {
    postCompassAction(subscription, "start");
  } catch {
    stopStationCompass();
  }
}

export function stopStationCompass() {
  clearTimeout(expiryTimer);
  sample.value = null;
  if (!subscription) return;
  const current = subscription;
  subscription = null;
  current.bridge.removeEventListener("message", receiveCompassMessage);
  try {
    postCompassAction(current, "stop");
  } catch {
    // The native channel can already be gone when its WebView closes.
  }
}
