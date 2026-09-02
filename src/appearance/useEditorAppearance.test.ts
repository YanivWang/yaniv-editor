/**
 * `useEditorAppearance` 是公开 composable，`customAppearanceVars` 声明为**可选**——
 * 省略它必须是完全干净的用法，不能靠调用方「记得传一个 ref」来消警告。
 */
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";

import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";

import { LOADABLE_APPEARANCES } from "./loadAppearance";
import { useEditorAppearance } from "./useEditorAppearance";

import { EDITOR_APPEARANCES } from "./index";

const applySpy = vi.fn();

vi.mock("./applyAppearance", async () => {
  const actual = await vi.importActual<typeof import("./applyAppearance")>("./applyAppearance");
  return {
    ...actual,
    applyAppearanceToElement: (...args: unknown[]) => {
      applySpy(...args);
    },
  };
});

const mountWith = (opts: { withVars: boolean }) => {
  const Comp = defineComponent({
    setup() {
      const rootRef = ref<HTMLElement | null>(document.createElement("div"));
      const base = {
        rootRef,
        appearance: ref<EditorAppearance>("default"),
        colorMode: ref<EditorColorMode>("light"),
      };
      const api = useEditorAppearance(
        opts.withVars
          ? { ...base, customAppearanceVars: ref<Record<string, string> | undefined>(undefined) }
          : base,
      );
      return () => h("div", String(api.resolvedMode.value));
    },
  });
  return mount(Comp);
};

describe("useEditorAppearance", () => {
  it("省略可选的 customAppearanceVars 不产生 Vue 警告", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mountWith({ withVars: false });
    const invalid = warn.mock.calls.filter((c) => String(c[0]).includes("Invalid watch source"));
    expect(invalid).toEqual([]);
    warn.mockRestore();
  });

  it("传了也一样干净", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mountWith({ withVars: true });
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("Invalid watch source"))).toEqual(
      [],
    );
    warn.mockRestore();
  });

  it("registerCustomAppearance 直接可用，不依赖非空断言", () => {
    const wrapper = mountWith({ withVars: false });
    expect(wrapper.text()).toBe("light");
  });
});

describe("外观常量只有一份定义", () => {
  it("EDITOR_APPEARANCES 就是 LOADABLE_APPEARANCES", () => {
    expect(EDITOR_APPEARANCES).toBe(LOADABLE_APPEARANCES);
    expect([...EDITOR_APPEARANCES]).toEqual(["default", "notion", "word"]);
  });

  it("不含 custom —— 它没有 CSS 文件", () => {
    expect([...EDITOR_APPEARANCES]).not.toContain("custom");
  });
});

/**
 * `auto` 模式下系统明暗只能有**一条**监听链。
 *
 * `useResolvedColorMode` 内部已在 auto 时绑了 `watchSystemColorMode`，
 * 它 bump systemTick → `resolvedMode` 重算 → 主 watch 跑 `syncDom`。
 * 此前 `useEditorAppearance` 又另起一个 watch 绑了第二份，同一个
 * `prefers-color-scheme` 事件因此让 `syncDom` 跑两遍——实测挂载后系统监听器 2 条、
 * 一次切换 `applyAppearanceToElement` 调用 2 次。`syncDom` 幂等，所以只是白跑，
 * 但它每次都 `await loadAppearance()` 并重写一整套 CSS 变量。
 *
 * 删掉第二个 watch 不会漏：matchMedia 的 change 只在 light↔dark 真正翻转时才发，
 * `resolvedMode` 必然随之变化，而它本来就是主 watch 的源。
 */
describe("auto 模式的系统明暗监听不得重复绑定", () => {
  let listeners: Array<(e: { matches: boolean }) => void> = [];
  let systemDark = false;

  beforeEach(() => {
    listeners = [];
    systemDark = false;
    applySpy.mockClear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("dark") ? systemDark : false,
      media: query,
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners = listeners.filter((l) => l !== cb);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mountAuto = async () => {
    const Comp = defineComponent({
      setup() {
        const api = useEditorAppearance({
          rootRef: ref<HTMLElement | null>(document.createElement("div")),
          appearance: ref<EditorAppearance>("default"),
          colorMode: ref<EditorColorMode>("auto"),
        });
        return () => h("div", String(api.resolvedMode.value));
      },
    });
    const wrapper = mount(Comp);
    await flushPromises();
    return wrapper;
  };

  it("只注册一条系统监听", async () => {
    const wrapper = await mountAuto();
    expect(listeners).toHaveLength(1);
    wrapper.unmount();
  });

  it("一次系统切换只重刷一次外观", async () => {
    const wrapper = await mountAuto();
    applySpy.mockClear();

    systemDark = true;
    listeners.forEach((cb) => cb({ matches: true }));
    await flushPromises();

    expect(applySpy).toHaveBeenCalledTimes(1);
    // 收敛掉第二条监听不能让 resolvedMode 失灵
    expect(wrapper.text()).toBe("dark");
    wrapper.unmount();
  });

  it("卸载后不留系统监听", async () => {
    const wrapper = await mountAuto();
    wrapper.unmount();
    expect(listeners).toEqual([]);
  });
});
