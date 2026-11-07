// SPDX-License-Identifier: AGPL-3.0-or-later
// Lets components outside the map (e.g. the floating chat) ask the station
// map to show a point. The map consumes and clears the request.
import { ref } from "vue";

const request = ref(null);
let serial = 0;

export function useMapFocus() {
  return {
    request,
    focus(pointId) {
      request.value = { pointId, serial: ++serial };
    },
    clear() {
      request.value = null;
    },
  };
}
