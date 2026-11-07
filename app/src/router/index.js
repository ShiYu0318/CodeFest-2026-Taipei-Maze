import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import TestPage from "@/components/TestPage.vue";

const routes = [
  {
    path: "/meet",
    name: "meeting",
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
    path: "/station-map",
    name: "station-map",
    component: () => import("../views/StationMapView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
