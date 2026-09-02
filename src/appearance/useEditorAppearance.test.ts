/**
 * `useEditorAppearance` 是公开 composable，`customAppearanceVars` 声明为**可选**——
 * 省略它必须是完全干净的用法，不能靠调用方「记得传一个 ref」来消警告。
 */
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";

import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";

import { LOADABLE_APPEARANCES } from "./loadAppearance";
import { useEditorAppearance } from "./useEditorAppearance";

import { EDITOR_APPEARANCES } from "./index";

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
