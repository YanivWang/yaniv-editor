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
    path: "/inline-editor",
    name: "inline-editor",
    component: () => import("./pages/InlineEditorExample.vue"),
  },
  {
    path: "/inline-compose",
    name: "inline-compose",
    component: () => import("./pages/InlineComposeExample.vue"),
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
