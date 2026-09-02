// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { AI_PROVIDERS } from "@/features/ai/config/types";
import { installBrowserStubs } from "@/testing/mountEditor";

import { AiSettingsModal } from "./index";

/**
 * 回归护栏：AI 设置弹窗的文案必须来自语言包。
 *
 * 提供商展示名与说明此前写死在 `AI_PROVIDERS` 常量里（「阿里云通义千问」等），
 * 存储方式区块的标签与下拉项也是硬编码中文——en-US 界面下照样出中文。
 */
beforeAll(installBrowserStubs);

function mountModal(locale: string) {
  const root = document.createElement("div");
  root.className = EDITOR_ROOT_CLASS;
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  root.append(portal);
  document.body.append(root);

  const Host = defineComponent({
    setup() {
      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));
      provideEditorLocale(ref(locale));
      return () => h(AiSettingsModal, { open: true });
    },
  });

  return mount(Host, { attachTo: root });
}

/** locale 包是异步加载的，等到文案不再是原始 key 为止 */
async function waitForLocale(): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (!document.body.textContent?.includes("aiSettings.")) return;
  }
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AiSettingsModal 文案本地化", () => {
  it("en-US 下全为英文，且不出现原始 key", async () => {
    mountModal("en-US");
    await waitForLocale();

    const text = document.body.textContent ?? "";
    // 存储方式区块：标签 / 选中项 / 提示语此前都写死中文
    expect(text).toContain("API Key storage");
    expect(text).toContain("This session only");
    expect(text).toContain("backend proxy");
    // provider 说明此前来自 AI_PROVIDERS.description（写死中文）
    expect(text).toContain("GPT-4o, GPT-4o-mini and similar models");

    expect(text).not.toContain("API Key 存储方式");
    expect(text).not.toContain("仅本次会话");
    expect(text).not.toContain("等模型");
    expect(text).not.toContain("aiSettings.");
  });

  it("zh-CN 下同一批文案是中文", async () => {
    mountModal("zh-CN");
    await waitForLocale();

    const text = document.body.textContent ?? "";
    expect(text).toContain("API Key 存储方式");
    expect(text).toContain("仅本次会话");
    expect(text).toContain("生产环境推荐使用后端代理");
    expect(text).toContain("GPT-4o、GPT-4o-mini 等模型");
    expect(text).not.toContain("aiSettings.");
  });

  it("provider 展示名不再来自常量 —— AI_PROVIDERS 已无 name 字段", () => {
    for (const provider of AI_PROVIDERS) {
      expect(provider).not.toHaveProperty("name");
      expect(provider).not.toHaveProperty("description");
    }
  });
});
