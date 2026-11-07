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
    native: window.flutterObject,
    onChange: (state) => {
      view.value = state;
    },
    onLocated: (point) =>
      router.replace({
        path: route.path,
        query: stationLocationQuery(point?.id ?? null, data, route.query),
        hash: route.hash,
      }),
  });
  view.value = controller.snapshot();
  watch(
    [() => route.query.point, () => route.query.v],
    () => controller.applyQuery(route.query),
    { flush: "post" }
  );
  const suspend = () => controller.suspend();
  onMounted(() => {
    controller.applyQuery(route.query);
    window.addEventListener("pagehide", suspend);
  });
  onBeforeRouteLeave(suspend);
  onBeforeUnmount(() => {
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
