// SPDX-License-Identifier: AGPL-3.0-or-later
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { createStationLocation } from "./location.mjs";
import { stationLocationQuery } from "./location-link.mjs";

/** One page owns the location; panels and map markers only consume its state. */
export function useStationLocation(data, connections) {
  const route = useRoute(),
    router = useRouter(),
    view = shallowRef(null);
  const controller = createStationLocation({
    data,
    connections,
    native: () => window.flutterObject,
    onChange: (state) => {
      view.value = state;
    },
    onLocated: (point) => {
      const query = stationLocationQuery(point?.id ?? null, data, route.query);
      // Once a trip has a map-selected start, a fresh QR replaces that start.
      // Keep the destination and other settings while synchronizing both views.
      if (point && Object.hasOwn(route.query, "start")) query.start = point.id;
      return router.replace({
        path: route.path,
        query,
        hash: route.hash,
      });
    },
  });
  view.value = controller.snapshot();
  watch(
    [() => route.query.point, () => route.query.v],
    () => controller.applyQuery(route.query),
    { flush: "post" }
  );
  const suspend = () => controller.suspend();
  const refreshNative = () => controller.refreshNative();
  onMounted(() => {
    controller.applyQuery(route.query);
    refreshNative();
    window.addEventListener("flutterInAppWebViewPlatformReady", refreshNative);
    window.addEventListener("pageshow", refreshNative);
    window.addEventListener("pagehide", suspend);
  });
  onBeforeRouteLeave(suspend);
  onBeforeUnmount(() => {
    window.removeEventListener(
      "flutterInAppWebViewPlatformReady",
      refreshNative
    );
    window.removeEventListener("pageshow", refreshNative);
    window.removeEventListener("pagehide", suspend);
    controller.dispose();
  });
  return {
    view,
    scan: () => controller.scan(),
    choose: (id) => controller.choose(id),
    searchSelect: (selection) => controller.searchSelect(selection),
    setStepFree: (value) => controller.setStepFree(value),
    markUnavailable: (id) => controller.markUnavailable(id),
    confirmArrival: (token) => controller.confirmArrival(token),
    reset: () => controller.reset(),
  };
}
