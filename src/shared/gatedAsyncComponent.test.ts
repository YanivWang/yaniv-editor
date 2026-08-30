import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { defineGatedAsyncComponent } from "./gatedAsyncComponent";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

function host(inner: ReturnType<typeof defineGatedAsyncComponent>) {
  return defineComponent({ setup: () => () => h("div", [h(inner)]) });
}

describe("defineGatedAsyncComponent", () => {
  it("加载成功时正常渲染", async () => {
    const Ok = defineGatedAsyncComponent("Ok", async () =>
      defineComponent({ setup: () => () => h("span", "loaded") }),
    );

    const wrapper = mount(host(Ok));
    await flushPromises();

    expect(wrapper.text()).toContain("loaded");
  });

  /**
   * chunk 加载失败是代码分割引入的新失败模式（部署更新后旧页面请求已被替换的 hash 文件）。
   * Vue 默认只渲染空，生产构建里没有任何提示，接入方看到的就是"按钮莫名不见了"。
   * 这里断言诊断确实被打出来，且带上了组件名与可操作的建议。
   */
  it("chunk 加载失败时打出可排障的诊断，且不把整棵树炸掉", async () => {
    const error = new Error("Failed to fetch dynamically imported module");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const Broken = defineGatedAsyncComponent("TableButton", async () => {
      throw error;
    });

    const wrapper = mount(host(Broken));
    await flushPromises();

    expect(spy).toHaveBeenCalled();
    const [message, cause] = spy.mock.calls[0] as [string, unknown];
    expect(message).toContain("TableButton");
    expect(message).toContain("刷新页面");
    expect(cause).toBe(error);

    // 宿主其余部分仍然存活
    expect(wrapper.find("div").exists()).toBe(true);
  });
});
