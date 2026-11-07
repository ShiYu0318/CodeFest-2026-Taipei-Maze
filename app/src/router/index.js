import { createRouter, createWebHistory } from "vue-router";
import { useI18n } from "../i18n/index.mjs";
import HomeView from "../views/HomeView.vue";
import TestPage from "@/components/TestPage.vue";

const routes = [
  {
    path: "/meet",
    name: "meeting",
    meta: { titleKey: "title.meeting" },
    component: () => import("../views/MeetingView.vue"),
  },
  {
    path: "/navigation-demo",
    redirect: "/station-map",
  },
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/test",
    name: "TestPage",
    component: TestPage,
  },
  {
    path: "/about",
    name: "about",
    meta: { titleKey: "title.about" },
    component: () => import("../views/AboutView.vue"),
  },
  {
    path: "/station-map",
    name: "station-map",
    meta: { titleKey: "title.station" },
    component: () => import("../views/StationMapView.vue"),
  },
  {
    path: "/station-orientation",
    redirect: "/station-map",
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// TownPass shows the WebView document title in its native app bar.
export function pageTitle(route) {
  return useI18n().t(route.meta?.titleKey ?? "title.default");
}
router.afterEach((to) => {
  document.title = pageTitle(to);
});

export default router;
