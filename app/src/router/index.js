import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import TestPage from "@/components/TestPage.vue";

const routes = [
  {
    path: "/meet",
    name: "meeting",
    meta: { title: "集合點" },
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
    meta: { title: "原始碼與授權" },
    component: () => import("../views/AboutView.vue"),
  },
  {
    path: "/station-map",
    name: "station-map",
    meta: { title: "台北車站地下導航" },
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
router.afterEach((to) => {
  document.title = to.meta?.title || "北車不迷路";
});

export default router;
