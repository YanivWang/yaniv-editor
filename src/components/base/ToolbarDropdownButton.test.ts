// @vitest-environment jsdom

/**
 * 工具栏下拉按钮：普通菜单项、分裂菜单项（split-hover）与子菜单的开合。
 *
 * 分裂项是全仓最绕的一处交互：**同一行有两个可点区域**——主区域和箭头。
 * 主区域的行为还随「有没有选中过子项」而变：
 * - 没选过：点主区域只把子菜单展开，主菜单**不关**（用户还没决定选哪个）；
 * - 选过：点主区域直接执行上次的选择，主菜单关掉。
 *
 * antd 的 dropdown 在 jsdom 里能正常展开（overlay 挂进 overlay portal），
 * 所以这里驱动的是真实组件而不是桩。
 */
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { ToolbarDropdownButton } from "@/components/base";
import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import type { VueWrapper } from "@vue/test-utils";
import type { MenuInfo } from "ant-design-vue/es/menu/src/interface";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

let wrapper: VueWrapper | null = null;
let events: string[] = [];

async function mountButton(items: MenuItemConfig[]): Promise<void> {
  events = [];
  const Host = defineComponent({
    setup() {
      const root = document.createElement("div");
      root.className = EDITOR_ROOT_CLASS;
      const portal = document.createElement("div");
      portal.className = OVERLAY_PORTAL_CLASS;
      root.append(portal);
      document.body.append(root);
      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));

      return () =>
        h(ToolbarDropdownButton, {
          title: "菜单",
          items,
          splitHoverArrowTitle: "选择语言",
          onSelect: (key: string) => events.push(`select:${key}`),
          onSplitPrimary: (key: string) => events.push(`primary:${key}`),
          onOpenChange: (open: boolean) => events.push(`open:${open}`),
        });
    },
  });
  wrapper = mount(Host, { attachTo: document.body });
  await flushPromises();
}

interface SplitSlotProps {
  item: MenuItemConfig;
  onPrimaryClick: () => void;
  onChildSelect: (info: MenuInfo) => void;
}

let slotProps: SplitSlotProps | null = null;

/** 用 `split-item` 插槽挂载：插槽 props 是组件对宿主的公开契约 */
async function mountSplitWithSlot(items: MenuItemConfig[]): Promise<void> {
  events = [];
  slotProps = null;
  const Host = defineComponent({
    setup() {
      const root = document.createElement("div");
      root.className = EDITOR_ROOT_CLASS;
      const portal = document.createElement("div");
      portal.className = OVERLAY_PORTAL_CLASS;
      root.append(portal);
      document.body.append(root);
      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));

      return () =>
        h(
          ToolbarDropdownButton,
          {
            title: "菜单",
            items,
            onSelect: (key: string) => events.push(`select:${key}`),
            onSplitPrimary: (key: string) => events.push(`primary:${key}`),
            onOpenChange: (open: boolean) => events.push(`open:${open}`),
          },
          {
            "split-item": (scope: SplitSlotProps) => {
              slotProps = scope;
              return h("div", { class: "custom-split" }, scope.item.label);
            },
          },
        );
    },
  });
  wrapper = mount(Host, { attachTo: document.body });
  await flushPromises();
}

async function settle(): Promise<void> {
  await flushPromises();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 30));
  await flushPromises();
  await nextTick();
}

async function openMenu(): Promise<void> {
  await wrapper!.find("button").trigger("click");
  await settle();
}

function trigger(): Element {
  return wrapper!.find("button").element;
}

function splitRow(): HTMLElement {
  const row = document.querySelector<HTMLElement>(".ye-dropdown-split");
  if (!row) throw new Error("分裂项没有渲染");
  return row;
}

function splitOverlayOpen(): boolean {
  const arrow = document.querySelector(".ye-dropdown-split__arrow");
  return arrow?.getAttribute("aria-expanded") === "true";
}

const plainItems: MenuItemConfig[] = [
  { key: "a", label: "甲" },
  { key: "b", label: "乙", disabled: true },
];

function splitItems(selectedChildKey = ""): MenuItemConfig[] {
  return [
    { key: "a", label: "甲" },
    {
      key: "translate",
      label: "翻译",
      submenuMode: "split-hover",
      selectedChildKey,
      children: [
        { key: "t-en", label: "英语" },
        { key: "t-ja", label: "日语" },
      ],
    },
  ];
}

afterEach(() => {
  vi.useRealTimers();
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("下拉开合", () => {
  it("点按钮展开并通知宿主，aria-expanded 跟着变", async () => {
    await mountButton(plainItems);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    await openMenu();

    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(events).toContain("open:true");
  });

  it("按钮带 aria-haspopup 与可访问名", async () => {
    await mountButton(plainItems);
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-label")).toBe("菜单");
  });
});

describe("普通菜单项", () => {
  it("点一项：执行 action、交出 key、收起菜单", async () => {
    const action = vi.fn();
    await mountButton([
      { key: "a", label: "甲", action },
      { key: "b", label: "乙" },
    ]);
    await openMenu();

    const item = document.querySelectorAll<HTMLElement>(".ant-dropdown-menu-item")[0];
    item.click();
    await settle();

    expect(action).toHaveBeenCalledTimes(1);
    expect(events).toContain("select:a");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("没有 action 的项也照常交出 key", async () => {
    await mountButton(plainItems);
    await openMenu();

    document.querySelectorAll<HTMLElement>(".ant-dropdown-menu-item")[0].click();
    await settle();

    expect(events).toContain("select:a");
  });
});

describe("分裂菜单项（split-hover）", () => {
  it("还没选过子项时，点主区域只展开子菜单，主菜单不关", async () => {
    await mountButton(splitItems());
    await openMenu();

    splitRow().querySelector<HTMLElement>(".ye-dropdown-split__main")!.click();
    await settle();

    expect(events).toContain("primary:translate");
    expect(splitOverlayOpen(), "子菜单应展开，等用户选一个").toBe(true);
    expect(trigger().getAttribute("aria-expanded"), "主菜单不该关").toBe("true");
  });

  it("已经选过子项时，点主区域直接执行并收起整棵菜单", async () => {
    const action = vi.fn();
    const items = splitItems("t-en");
    items[1].action = action;
    await mountButton(items);
    await openMenu();

    splitRow().querySelector<HTMLElement>(".ye-dropdown-split__main")!.click();
    await settle();

    expect(action).toHaveBeenCalledTimes(1);
    expect(events).toContain("primary:translate");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  /**
   * 子菜单的嵌套 dropdown 在 jsdom 里停在测量阶段（没有真实布局，overlay 内容不渲染），
   * 所以这里从组件的 `split-item` 插槽拿 `onChildSelect` 直接驱动——那是公开的
   * 插槽契约，宿主自定义分裂项时用的就是它，顺带把插槽这条路径也走一遍。
   * 子菜单点击落在真实浏览器里的表现由 e2e 覆盖。
   */
  it("子项被选中时交出的是子项的 key，并收起整棵菜单", async () => {
    await mountSplitWithSlot(splitItems());
    await openMenu();

    expect(slotProps, "插槽应拿到分裂项与两个回调").not.toBeNull();
    expect(slotProps!.item.key).toBe("translate");

    slotProps!.onChildSelect({ key: "t-ja" } as MenuInfo);
    await settle();

    expect(events).toContain("select:t-ja");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("插槽里的主区域回调与默认渲染同义", async () => {
    await mountSplitWithSlot(splitItems());
    await openMenu();

    slotProps!.onPrimaryClick();
    await settle();

    expect(events).toContain("primary:translate");
  });

  it("子项 key 不存在时什么也不做，不抛错", async () => {
    await mountSplitWithSlot(splitItems());
    await openMenu();

    expect(() => slotProps!.onChildSelect({ key: "不存在" } as MenuInfo)).not.toThrow();
    await settle();

    expect(events.filter((e) => e.startsWith("select:"))).toEqual([]);
    expect(trigger().getAttribute("aria-expanded"), "找不到就不该顺手关掉菜单").toBe("true");
  });

  /**
   * ⚠️ 这条锁的是**行为**（点分裂行不触发 select），不是某一处实现。
   * 源码里的 `key.endsWith(":split-hover")` 早退实际上**不可达**：即使去掉它，
   * `findMenuItemByKey` 也找不到带后缀的 key，同样不会 emit——变异验证不转红，
   * 确认是防御性双保险而非可达逻辑，如实记在这里而不是硬凑一条测试。
   */
  it("分裂项所在的那一行本身不算选中", async () => {
    await mountButton(splitItems());
    await openMenu();

    const row = [...document.querySelectorAll<HTMLElement>(".ant-dropdown-menu-item")].find((el) =>
      el.textContent?.includes("翻译"),
    )!;
    row.click();
    await settle();

    expect(events.filter((e) => e.startsWith("select:"))).toEqual([]);
  });

  it("箭头按钮有可访问名与展开状态", async () => {
    await mountButton(splitItems());
    await openMenu();

    const arrow = document.querySelector(".ye-dropdown-split__arrow")!;
    expect(arrow.getAttribute("aria-label")).toBe("选择语言");
    expect(arrow.getAttribute("aria-haspopup")).toBe("menu");
    expect(arrow.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("子菜单的悬停开合", () => {
  it("移入展开，移出等一小会儿才收起", async () => {
    await mountButton(splitItems());
    await openMenu();

    splitRow().dispatchEvent(new MouseEvent("mouseenter"));
    await settle();
    expect(splitOverlayOpen()).toBe(true);

    splitRow().dispatchEvent(new MouseEvent("mouseleave"));
    await nextTick();
    expect(splitOverlayOpen(), "延时期间还应开着，方便鼠标斜着移进子菜单").toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 200));
    await settle();
    expect(splitOverlayOpen()).toBe(false);
  });

  it("延时期间又移回来就不收起", async () => {
    await mountButton(splitItems());
    await openMenu();

    splitRow().dispatchEvent(new MouseEvent("mouseenter"));
    await settle();
    splitRow().dispatchEvent(new MouseEvent("mouseleave"));
    splitRow().dispatchEvent(new MouseEvent("mouseenter"));

    await new Promise((resolve) => setTimeout(resolve, 200));
    await settle();

    expect(splitOverlayOpen()).toBe(true);
  });

  it("键盘焦点进出等同于鼠标进出", async () => {
    await mountButton(splitItems());
    await openMenu();

    splitRow().dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await settle();

    expect(splitOverlayOpen()).toBe(true);
  });

  it("组件卸载时清掉待定的收起定时器", async () => {
    /**
     * 判据不能用 `vi.getTimerCount()` 的**总数**下降——卸载时 antd 与 Vue 自己也会清
     * 一批定时器，总数无论如何都会掉，那样的断言在「没写卸载清理」时照样绿。
     * 这里盯的是**组件排的那一个**（唯一的 150ms 延时），看它的 id 有没有被 clear 掉。
     */
    const scheduled: number[] = [];
    const cleared: number[] = [];
    const originalSetTimeout = window.setTimeout.bind(window);
    const originalClearTimeout = window.clearTimeout.bind(window);

    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...rest: unknown[]) => {
      const id = originalSetTimeout(handler, timeout, ...(rest as []));
      if (timeout === 150) scheduled.push(id);
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id?: number) => {
      if (id !== undefined) cleared.push(id);
      return originalClearTimeout(id);
    }) as typeof window.clearTimeout;

    try {
      await mountButton(splitItems());
      await openMenu();

      splitRow().dispatchEvent(new MouseEvent("mouseenter"));
      await nextTick();
      splitRow().dispatchEvent(new MouseEvent("mouseleave"));
      await nextTick();

      expect(scheduled, "移出后应排着一个收起定时器").toHaveLength(1);
      expect(cleared).not.toContain(scheduled[0]);

      wrapper!.unmount();
      wrapper = null;

      expect(cleared, "卸载时必须把它清掉").toContain(scheduled[0]);
    } finally {
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
    }
  });
});
