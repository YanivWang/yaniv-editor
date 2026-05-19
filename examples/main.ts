import Antd from "ant-design-vue";
import { createApp } from "vue";

import "ant-design-vue/dist/reset.css";

import App from "./App.vue";
import { initDemoI18n } from "./locales";
import { router } from "./router";

initDemoI18n("zh-CN");

const app = createApp(App);

app.use(Antd);
app.use(router);
app.mount("#app");
