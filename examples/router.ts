import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: { name: "full-editor" },
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
    redirect: { name: "full-editor" },
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
