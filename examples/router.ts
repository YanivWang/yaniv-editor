import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("./pages/HomePage.vue"),
  },
  {
    path: "/full-editor",
    name: "full-editor",
    component: () => import("./pages/FullEditorExample.vue"),
  },
  {
    path: "/inline-plugins",
    name: "inline-plugins",
    component: () => import("./pages/InlinePluginsExample.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
