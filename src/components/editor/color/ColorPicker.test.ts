// @vitest-environment jsdom

/**
 * ColorPicker：色板取值、清空默认色、预览配色、高级输入框的取值与校验。
 *
 * **为什么这些能在 jsdom 里测。** 这个组件里唯一依赖布局的是 antd Popover 的浮层定位，
 * 其余（哪套色板、几列、选中态、清空回退成什么、预览文字自动配黑还是配白、
 * 手输 hex 认不认）都是纯计算，断言的是组件自己的产出而不是桩。
 * 判据见 `vitest.config.ts`：**「这段逻辑要不要布局」，不是「这个文件属不属于交互层」**。
 *
 * ⚠️ 弹层内容由 antd 渲染进 overlay portal，**首开之后一直留在 DOM 里**，
 * 因此改 props 不必重新开面板。关闭弹层依赖 CSS 过渡结束事件（jsdom 里不会发生），
 * 所以这里不测「关掉之后」，只测开着时的行为。
 */
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, reactive, ref } from "vue";

import {
  NOTION_BACKGROUND_COLORS,
  NOTION_DEFAULT_HIGHLIGHT,
  NOTION_DEFAULT_TEXT,
  NOTION_TEXT_COLORS,
} from "@/appearance/notionColors";
import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import {
  installBrowserStubs,
  installLayoutStubs,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import { TextColorIcon } from "./ColorIcons";
import ColorPicker from "./ColorPicker.vue";

import type { VueWrapper } from "@vue/test-utils";
import type { Component } from "vue";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

interface PickerProps {
  modelValue?: string;
  type?: "text" | "background";
  palette?: "office" | "notion";
  columns?: number;
  itemSize?: number;
  title?: string;
  icon?: Component;
}

interface PickerHarness {
  wrapper: VueWrapper;
  /** 可写的 props，改完 `await nextTick()` 即生效 */
  props: PickerProps;
  /** 依次记录 update:modelValue 与 select 收到的值 */
  emitted: { model: (string | undefined)[]; select: string[] };
  panel: () => HTMLElement;
  swatches: () => HTMLElement[];
  standardSwatches: () => HTMLElement[];
  sectionTitles: () => string[];
  click: (selector: string) => Promise<void>;
  /** 打开「高级颜色选择器」子面板 */
  openAdvanced: () => Promise<void>;
  colorInput: () => HTMLInputElement;
  hexInput: () => HTMLInputElement;
  /** 悬停工具栏按钮，返回 tooltip 里的文字（没弹出来则为 null） */
  hoverTrigger: () => Promise<string | null>;
}

const wrappers: VueWrapper[] = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount();
  document.body.innerHTML = "";
});

async function mountPicker(
  initial: PickerProps = {},
  options: { openPanel?: boolean } = {},
): Promise<PickerHarness> {
  const root = document.createElement("div");
  root.className = EDITOR_ROOT_CLASS;
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  root.append(portal);
  document.body.append(root);

  const props = reactive<PickerProps>({ ...initial });
  const emitted: PickerHarness["emitted"] = { model: [], select: [] };

  let localeCtx: { messages: { value: unknown } } | null = null;
  const Host = defineComponent({
    setup() {
      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));
      localeCtx = provideEditorLocale(ref("zh-CN"));
      return () =>
        h(ColorPicker, {
          ...props,
          "onUpdate:modelValue": (value: string | undefined) => emitted.model.push(value),
          onSelect: (value: string) => emitted.select.push(value),
        });
    },
  });

  const wrapper = mount(Host, { attachTo: root });
  wrappers.push(wrapper);
  await waitForLocaleMessages(localeCtx!);

  // 打开弹层：面板内容此后一直留在 portal 里
  if (options.openPanel !== false) {
    root.querySelector<HTMLElement>(".ye-color-current-btn")!.click();
    for (let i = 0; i < 10 && !portal.querySelector(".ye-color-picker-content"); i += 1) {
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  const panel = () => {
    const el = portal.querySelector<HTMLElement>(".ye-color-picker-content");
    if (!el) throw new Error("颜色面板没有打开");
    return el;
  };
  const grids = () => [...panel().querySelectorAll<HTMLElement>(".ye-color-picker-grid")];
  const query = (selector: string) => {
    const el = panel().querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`面板里没有 ${selector}`);
    return el;
  };

  return {
    wrapper,
    props,
    emitted,
    panel,
    swatches: () => [...grids()[0].querySelectorAll<HTMLElement>(".ye-color-picker__item")],
    standardSwatches: () =>
      grids()[1] ? [...grids()[1].querySelectorAll<HTMLElement>(".ye-color-picker__item")] : [],
    sectionTitles: () =>
      [...panel().querySelectorAll(".ye-color-picker-section-title")].map((el) =>
        (el.textContent ?? "").trim(),
      ),
    async click(selector: string) {
      query(selector).click();
      await nextTick();
    },
    async openAdvanced() {
      query(".ye-color-picker-preview-btn").click();
      await nextTick();
    },
    colorInput: () => query(".ye-color-picker-color-input") as HTMLInputElement,
    hexInput: () => query(".ye-color-picker-color-text") as HTMLInputElement,
    async hoverTrigger() {
      root
        .querySelector<HTMLElement>(".ye-color-current-btn")!
        .dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      // antd 的 mouseEnterDelay 默认 0.1s，按时间预算轮询到浮层落地
      for (let i = 0; i < 40 && !portal.querySelector(".ant-tooltip-inner"); i += 1) {
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return portal.querySelector(".ant-tooltip-inner")?.textContent ?? null;
    },
  };
}

/** 触发一次真实的输入事件（v-model 与 @input/@change 都要收到） */
async function typeInto(input: HTMLInputElement, value: string, event: "input" | "change") {
  input.value = value;
  input.dispatchEvent(new Event(event, { bubbles: true }));
  await nextTick();
}

describe("ColorPicker 色板与网格", () => {
  it("office 色板给出 50 个默认色 + 10 个标准色", async () => {
    const picker = await mountPicker();

    expect(picker.swatches()).toHaveLength(50);
    expect(picker.standardSwatches()).toHaveLength(10);
    expect(picker.sectionTitles()).toEqual(["默认颜色", "标准色"]);
  });

  it("列数与色块尺寸按 props 生成网格；标准色行固定 10 列", async () => {
    const picker = await mountPicker({ columns: 5, itemSize: 24 });

    const grids = [...picker.panel().querySelectorAll<HTMLElement>(".ye-color-picker-grid")];
    expect(grids[0].style.gridTemplateColumns).toBe("repeat(5, 24px)");
    expect(grids[1].style.gridTemplateColumns).toBe("repeat(10, 24px)");
    expect(picker.swatches()[0].style.width).toBe("24px");
    expect(picker.swatches()[0].style.height).toBe("24px");
  });

  it("notion 色板换成 10 色文字板，去掉标准色区并锁死 10 列", async () => {
    const picker = await mountPicker({ palette: "notion", type: "text", columns: 5 });

    expect(picker.swatches()).toHaveLength(NOTION_TEXT_COLORS.length);
    expect(picker.swatches().map((el) => el.getAttribute("title"))).toEqual([
      ...NOTION_TEXT_COLORS,
    ]);
    // 先站住肯定的一半：office 是有标准色区的（见上一条），notion 才是没有
    expect(picker.sectionTitles()).toEqual(["默认颜色"]);
    expect(picker.standardSwatches()).toHaveLength(0);

    const grid = picker.panel().querySelector<HTMLElement>(".ye-color-picker-grid")!;
    expect(grid.style.gridTemplateColumns).toBe("repeat(10, 20px)");
  });

  it("notion 背景模式换成背景色板", async () => {
    const picker = await mountPicker({ palette: "notion", type: "background" });

    expect(picker.swatches().map((el) => el.getAttribute("title"))).toEqual([
      ...NOTION_BACKGROUND_COLORS,
    ]);
  });

  it("透明色块用白底渲染，避免看不见", async () => {
    const picker = await mountPicker({ palette: "notion", type: "background" });

    const transparent = picker.swatches()[0];
    expect(transparent.getAttribute("title")).toBe("transparent");
    expect(transparent.style.backgroundColor).toBe("rgb(255, 255, 255)");
  });
});

describe("ColorPicker 选色与清空", () => {
  it("点色块同时发 update:modelValue 与 select，且值已规范化", async () => {
    const picker = await mountPicker();

    picker.swatches()[3].click();
    await nextTick();

    const color = picker.swatches()[3].getAttribute("title")!;
    expect(picker.emitted.model).toEqual([color.toLowerCase()]);
    expect(picker.emitted.select).toEqual([color.toLowerCase()]);
  });

  it("当前值大小写不同也算选中，且只标一个", async () => {
    const picker = await mountPicker({ modelValue: "#FFCCCC" });

    const selected = picker.panel().querySelectorAll(".ye-color-picker__item.is-selected");
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute("title")).toBe("#ffcccc");
  });

  it("清空按钮按 type × palette 取各自的默认色", async () => {
    const cases: { props: PickerProps; expected: string }[] = [
      { props: { type: "text" }, expected: "#000000" },
      { props: { type: "background" }, expected: "transparent" },
      { props: { type: "text", palette: "notion" }, expected: NOTION_DEFAULT_TEXT },
      { props: { type: "background", palette: "notion" }, expected: NOTION_DEFAULT_HIGHLIGHT },
    ];

    for (const { props, expected } of cases) {
      const picker = await mountPicker(props);
      await picker.click(".ye-color-clear-btn");
      expect(picker.emitted.select, JSON.stringify(props)).toEqual([expected]);
    }
  });
});

describe("ColorPicker 预览与指示条配色", () => {
  it("文字模式预览染文字色，背景模式预览染背景色", async () => {
    const picker = await mountPicker({ modelValue: "#ff0000" });
    const preview = () =>
      picker.panel().querySelector<HTMLElement>(".ye-color-picker-preview-text")!;

    expect(preview().style.color).toBe("rgb(255, 0, 0)");
    expect(preview().style.backgroundColor).toBe("");

    picker.props.type = "background";
    await nextTick();

    expect(preview().style.backgroundColor).toBe("rgb(255, 0, 0)");
  });

  it("背景模式按亮度自动挑黑字或白字", async () => {
    const picker = await mountPicker({ type: "background", modelValue: "#ffffff" });
    const preview = () =>
      picker.panel().querySelector<HTMLElement>(".ye-color-picker-preview-text")!;

    expect(preview().style.color).toBe("rgb(0, 0, 0)");

    picker.props.modelValue = "#000080";
    await nextTick();
    expect(preview().style.color).toBe("rgb(255, 255, 255)");

    // 3 位十六进制要先补成 6 位再算亮度
    picker.props.modelValue = "#000";
    await nextTick();
    expect(preview().style.color).toBe("rgb(255, 255, 255)");

    picker.props.modelValue = "#fff";
    await nextTick();
    expect(preview().style.color).toBe("rgb(0, 0, 0)");
  });

  /**
   * ⚠️ 这两个取值走的是**不同分支但结果相同**：`transparent` 命中函数开头的早退，
   * `#12345` 命中「长度既不是 3 也不是 6」的回退。把早退那段删掉，
   * `"transparent"` 会掉进长度校验拿到同一个 `#000`——所以这条用例锁的是结果，
   * 不是某一行。留着那段早退是因为它写明了意图，而不是靠「transparent 恰好 11 个字符」。
   */
  it("透明与非法色值一律回退成黑字，不去算亮度", async () => {
    const picker = await mountPicker({ type: "background", modelValue: "transparent" });
    const preview = () =>
      picker.panel().querySelector<HTMLElement>(".ye-color-picker-preview-text")!;

    expect(preview().style.color).toBe("rgb(0, 0, 0)");

    picker.props.modelValue = "#12345"; // 既不是 3 位也不是 6 位
    await nextTick();
    expect(preview().style.color).toBe("rgb(0, 0, 0)");
  });

  it("传了图标时在图标下方画一条当前色的色条", async () => {
    const picker = await mountPicker({ modelValue: "#0066ff", icon: TextColorIcon });
    const bar = () => picker.wrapper.element.querySelector(".ye-color-indicator") as HTMLElement;

    expect(picker.wrapper.element.querySelector(".ye-color-icon-wrap")).not.toBeNull();
    expect(bar().style.backgroundColor).toBe("rgb(0, 102, 255)");

    picker.props.modelValue = "transparent";
    await nextTick();
    expect(bar().style.backgroundColor).toBe("transparent");
  });

  it("没传图标时画的是纯色预览方块，没有色条", async () => {
    const picker = await mountPicker({ modelValue: "#0066ff" });

    // 先站住肯定的一半：上一条证明有 icon 时色条是存在的
    expect(picker.wrapper.element.querySelector(".ye-color-current-preview")).not.toBeNull();
    expect(picker.wrapper.element.querySelector(".ye-color-indicator")).toBeNull();
  });

  it("头部的当前色方块跟随取值，透明时不涂色", async () => {
    const picker = await mountPicker({ type: "background", modelValue: "#0066ff" });
    const swatch = () =>
      picker.panel().querySelector<HTMLElement>(".ye-color-picker-preview-color")!;

    expect(swatch().style.backgroundColor).toBe("rgb(0, 102, 255)");

    picker.props.modelValue = "transparent";
    await nextTick();
    expect(swatch().style.backgroundColor).toBe("transparent");
  });
});

describe("ColorPicker 高级颜色输入", () => {
  it("打开高级面板时把当前颜色同步进两个输入框", async () => {
    const picker = await mountPicker({ modelValue: "#ABCDEF" });

    expect(picker.panel().querySelector(".ye-color-picker-advanced")).toBeNull();
    await picker.openAdvanced();

    expect(picker.panel().querySelector(".ye-color-picker-advanced")).not.toBeNull();
    expect(picker.hexInput().value).toBe("#abcdef");
    expect(picker.colorInput().value).toBe("#abcdef");
  });

  it("取色器改值直接发出规范化后的颜色", async () => {
    const picker = await mountPicker();
    await picker.openAdvanced();

    await typeInto(picker.colorInput(), "#11AA33", "change");

    expect(picker.emitted.select).toEqual(["#11aa33"]);
    expect(picker.hexInput().value).toBe("#11aa33");
  });

  it("手输 hex：合法就发出，缺少 # 自动补，3 位写法也认", async () => {
    const picker = await mountPicker();
    await picker.openAdvanced();

    await typeInto(picker.hexInput(), "336699", "input");
    expect(picker.emitted.select).toEqual(["#336699"]);

    await typeInto(picker.hexInput(), "#ABC", "input");
    expect(picker.emitted.select).toEqual(["#336699", "#abc"]);
  });

  it("手输不合法时不发事件，也不写坏已有的值", async () => {
    const picker = await mountPicker({ modelValue: "#123456" });
    await picker.openAdvanced();

    await typeInto(picker.hexInput(), "#12", "input");
    await typeInto(picker.hexInput(), "#zzzzzz", "input");
    await typeInto(picker.hexInput(), "", "input");

    expect(picker.emitted.select).toEqual([]);
    expect(picker.emitted.model).toEqual([]);
  });

  it("高级面板开着时外部改色会同步进输入框", async () => {
    const picker = await mountPicker({ modelValue: "#111111" });
    await picker.openAdvanced();
    expect(picker.hexInput().value).toBe("#111111");

    picker.props.modelValue = "#222222";
    await nextTick();

    expect(picker.hexInput().value).toBe("#222222");
  });

  it("关掉高级面板后外部改色不再写输入框，下次打开才重新同步", async () => {
    const picker = await mountPicker({ modelValue: "#111111" });
    await picker.openAdvanced();
    await picker.click(".ye-color-picker-advanced-close");
    expect(picker.panel().querySelector(".ye-color-picker-advanced")).toBeNull();

    picker.props.modelValue = "#333333";
    await nextTick();
    await picker.openAdvanced();

    expect(picker.hexInput().value).toBe("#333333");
  });
});

describe("ColorPicker 按钮标题", () => {
  it("未传 title 时按 type 取语言包文案", async () => {
    const picker = await mountPicker({ type: "text" }, { openPanel: false });

    expect(await picker.hoverTrigger()).toBe("文字颜色");
  });

  it("背景模式换成另一条文案", async () => {
    const picker = await mountPicker({ type: "background" }, { openPanel: false });

    expect(await picker.hoverTrigger()).toBe("背景颜色");
  });

  it("传了 title 就用宿主给的那份", async () => {
    const picker = await mountPicker({ type: "text", title: "自定义标题" }, { openPanel: false });

    expect(await picker.hoverTrigger()).toBe("自定义标题");
  });

  it("色板已经打开时不再弹 tooltip，避免两层浮层叠在一起", async () => {
    const picker = await mountPicker({ type: "text" });

    expect(picker.panel()).not.toBeNull();
    expect(await picker.hoverTrigger()).toBeNull();
  });
});
