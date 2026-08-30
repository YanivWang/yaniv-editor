import { afterEach, beforeAll, describe, expect, it } from "vitest";

import YanivEditor from "@/core/YanivEditor.vue";
import { installBrowserStubs, mountEditor, unmountAll } from "@/testing/mountEditor";

beforeAll(installBrowserStubs);
afterEach(unmountAll);

function toolbarControls(root: Element): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

/**
 * WAI-ARIA APG toolbar 模式：整个工具栏是单一 tab stop，内部用方向键移动。
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 */
describe("工具栏 roving tabindex", () => {
  it("工具栏整体只有一个 tab stop", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });
    const toolbar = wrapper.find('[role="toolbar"]').element;

    const tabbable = toolbar.querySelectorAll('[tabindex="0"]');
    const roving = toolbar.querySelectorAll('[tabindex="-1"]');

    expect(tabbable.length).toBe(1);
    expect(roving.length).toBeGreaterThan(5);
  });

  it("ArrowRight 把焦点移到下一个控件并转移 tab stop", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });
    const toolbar = wrapper.find('[role="toolbar"]').element as HTMLElement;
    const controls = toolbarControls(toolbar);

    controls[0].focus();
    toolbar.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );

    expect(document.activeElement).toBe(controls[1]);
    expect(controls[1].getAttribute("tabindex")).toBe("0");
    expect(controls[0].getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowLeft 在首个控件上回绕到末尾", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });
    const toolbar = wrapper.find('[role="toolbar"]').element as HTMLElement;
    const controls = toolbarControls(toolbar);

    controls[0].focus();
    toolbar.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
    );

    expect(document.activeElement).toBe(controls[controls.length - 1]);
  });

  it("Home / End 跳到首尾", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });
    const toolbar = wrapper.find('[role="toolbar"]').element as HTMLElement;
    const controls = toolbarControls(toolbar);

    controls[2].focus();
    toolbar.dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(controls[controls.length - 1]);

    toolbar.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(controls[0]);
  });

  it("输入型控件内的方向键不被劫持（否则字号/颜色输入光标无法移动）", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });
    const toolbar = wrapper.find('[role="toolbar"]').element as HTMLElement;

    const probe = document.createElement("input");
    probe.type = "text";
    toolbar.appendChild(probe);
    probe.focus();

    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    probe.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(probe);
  });

  /**
   * 门控工具按钮是 `defineAsyncComponent`，chunk 解析完成才挂进 DOM，首帧拿不到完整列表；
   * 所以 `useRovingTabindex` 用 `MutationObserver` 重扫。这条链路此前无测试覆盖：
   * 把 `observer.observe(...)` 整个短路掉，原有 6 个用例依然全绿——因为 `mountEditor`
   * 会一直等到全部异步组件就绪才返回断言，掩盖了"晚到的按钮"这个真实场景。
   *
   * 没有重扫的后果不是样式问题：晚挂载的按钮拿不到 `tabindex="-1"`，
   * 每一个都会变成独立 tab stop，单一 tab stop 直接失效。
   */
  it("挂载后新增的控件也会被纳入 roving（异步按钮晚到）", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });
    const toolbar = wrapper.find('[role="toolbar"]').element as HTMLElement;

    expect(toolbar.querySelectorAll('[tabindex="0"]').length).toBe(1);

    // 模拟异步组件在首帧之后才挂进工具栏
    const late = document.createElement("button");
    late.textContent = "晚到的按钮";
    toolbar.appendChild(late);

    // MutationObserver 回调是微任务，等一拍
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(late.getAttribute("tabindex")).toBe("-1");
    expect(toolbar.querySelectorAll('[tabindex="0"]').length).toBe(1);
  });

  it("带修饰键的方向键不拦截（留给宿主快捷键）", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });
    const toolbar = wrapper.find('[role="toolbar"]').element as HTMLElement;
    const controls = toolbarControls(toolbar);

    controls[0].focus();
    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    toolbar.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(controls[0]);
  });
});
