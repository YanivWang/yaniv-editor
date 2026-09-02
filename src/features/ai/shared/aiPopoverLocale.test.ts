// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { installBrowserStubs } from "@/testing/mountEditor";

import AiSuggestionPopover from "./AiSuggestionPopover.vue";
import CustomAiPopover from "./CustomAiPopover.vue";

/**
 * 回归护栏：弹层的文案来源有两条合法路径，且**不依赖伪造的注入上下文**。
 *
 * `aiSuggestionManager` 用独立 `createApp` 挂载弹层，继承不到 EditorShell 的 provide。
 * 早先的做法是自铺一份 `editorLocaleKey`，其中 `locale` / `messages` 只能填假值
 * （写死 "zh-CN" 与 null）——任何读它们的组件都会拿到与实例不符的语言。
 * 现在改为显式传 `t` prop：独立挂载走 prop，组件树内挂载仍走 inject。
 */
beforeAll(installBrowserStubs);

function makePortal(): HTMLElement {
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  document.body.append(portal);
  return portal;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AI 弹层的文案来源", () => {
  const components = [
    ["AiSuggestionPopover", AiSuggestionPopover],
    ["CustomAiPopover", CustomAiPopover],
  ] as const;

  for (const [name, component] of components) {
    it(`${name} 在没有任何 provide 的独立挂载点下靠 t prop 工作`, async () => {
      const portal = makePortal();

      // 关键：不包任何 provide —— 独立 createApp 的真实处境
      const wrapper = mount(component, {
        attachTo: portal,
        props: {
          visible: true,
          originalText: "原文",
          suggestedText: "建议",
          getPopupContainer: () => portal,
          t: (key: string) => `T:${key}`,
        },
      });
      await nextTick();

      expect(document.body.textContent).toContain("T:editor.");
      wrapper.unmount();
    });

    it(`${name} 未传 t 时仍回退到组件树里的实例 locale`, async () => {
      const portal = makePortal();

      const Host = defineComponent({
        setup() {
          provideEditorLocale(ref("en-US"));
          return () =>
            h(component, {
              visible: true,
              originalText: "原文",
              suggestedText: "建议",
              getPopupContainer: () => portal,
            });
        },
      });

      const wrapper = mount(Host, { attachTo: portal });
      await nextTick();

      // 未传 t 时不应抛「must be used within EditorShell」，也不该出现 prop 的标记
      expect(document.body.textContent).not.toContain("T:editor.");
      wrapper.unmount();
    });
  }
});
