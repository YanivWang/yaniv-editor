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
