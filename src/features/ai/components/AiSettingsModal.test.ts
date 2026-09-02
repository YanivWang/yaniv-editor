// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, reactive, ref } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { AI_PROVIDERS, getProviderInfo } from "@/features/ai/config/types";
import type { AiUserConfig } from "@/features/ai/config/types";
import { useAiConfig } from "@/features/ai/config/useAiConfig";
import { installBrowserStubs, waitForLocaleMessages } from "@/testing/mountEditor";

import { AiSettingsModal } from "./index";

import type { VueWrapper } from "@vue/test-utils";

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
  while (wrappers.length) wrappers.pop()?.unmount();
  document.body.innerHTML = "";
  // `useAiConfig` 的状态是模块级的（同页多实例共享一份用户配置），用例之间必须自己清
  useAiConfig().clearConfig();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

/* ────────────────────────────────────────────────────────────────────────────
 * 表单行为（第 17 棒新增）
 *
 * 上面那组只看文案。这一组走完整表单：打开时灌什么、切 provider 换什么、
 * 什么情况下能保存、保存 / 取消 / 清除各自动了谁、连接测试的四种结果分别怎么显示。
 * 这些都与布局无关；`a-select` 的下拉与 `a-modal` 的浮层由 antd 渲染进 overlay portal，
 * jsdom 下能真实展开，所以下拉是**点选项**而不是直接改内部状态。
 *
 * ⚠️ `useAiConfig` 的状态是模块级的（库要支持同页多实例共享同一份用户配置），
 * 用例之间靠 afterEach 里的 `clearConfig()` 复位，不能依赖执行顺序。
 * ──────────────────────────────────────────────────────────────────────────── */

const wrappers: VueWrapper[] = [];

interface FormHarness {
  portal: HTMLElement;
  state: { open: boolean };
  emitted: { open: boolean[]; saved: number };
  /** 按区块标签取输入框，例如 `input("模型")` */
  input: (label: string) => HTMLInputElement;
  section: (label: string) => HTMLElement | null;
  /** antd 会给两个汉字的按钮插一个空格（「取 消」），这里按去空白后的文本精确匹配 */
  clickButton: (text: string) => Promise<void>;
  /** 展开第 index 个下拉并点走某一项 */
  pickOption: (index: number, optionText: string) => Promise<void>;
  selectedTexts: () => string[];
  saveDisabled: () => boolean;
  text: () => string;
  setOpen: (open: boolean) => Promise<void>;
}

function seedConfig(overrides: Partial<AiUserConfig> = {}): AiUserConfig {
  const config: AiUserConfig = {
    provider: "deepseek",
    apiKey: "sk-seed",
    storageMode: "local",
    endpoint: "https://seed.example.com/v1",
    model: "seed-model",
    timeout: 1234,
    enabled: false,
    updatedAt: 1,
    ...overrides,
  };
  useAiConfig().saveConfig(config);
  return config;
}

async function settle(times = 12): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function mountForm(): Promise<FormHarness> {
  const root = document.createElement("div");
  root.className = EDITOR_ROOT_CLASS;
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  root.append(portal);
  document.body.append(root);

  const state = reactive({ open: false });
  const emitted: FormHarness["emitted"] = { open: [], saved: 0 };

  let localeCtx: { messages: { value: unknown } } | null = null;
  const Host = defineComponent({
    setup() {
      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));
      localeCtx = provideEditorLocale(ref("zh-CN"));
      return () =>
        h(AiSettingsModal, {
          open: state.open,
          "onUpdate:open": (value: boolean) => {
            emitted.open.push(value);
            state.open = value;
          },
          onSaved: () => {
            emitted.saved += 1;
          },
        });
    },
  });

  wrappers.push(mount(Host, { attachTo: root }));
  await waitForLocaleMessages(localeCtx!);

  const sections = () => [...portal.querySelectorAll<HTMLElement>(".ai-settings__section")];
  const section = (label: string) =>
    sections().find(
      (el) => el.querySelector(".ai-settings__label")?.textContent?.trim() === label,
    ) ?? null;

  return {
    portal,
    state,
    emitted,
    section,
    input(label: string) {
      const el = section(label)?.querySelector("input");
      if (!el) throw new Error(`没有「${label}」区块的输入框`);
      return el;
    },
    async clickButton(text: string) {
      const button = [...portal.querySelectorAll<HTMLElement>("button")].find(
        (el) => (el.textContent ?? "").replace(/\s+/g, "") === text,
      );
      if (!button) {
        const seen = [...portal.querySelectorAll("button")].map((el) =>
          (el.textContent ?? "").replace(/\s+/g, ""),
        );
        throw new Error(`没有「${text}」按钮，现有：${seen.join(" / ")}`);
      }
      button.click();
      await settle(4);
    },
    async pickOption(index: number, optionText: string) {
      const selector = portal.querySelectorAll<HTMLElement>(".ant-select-selector")[index];
      selector.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      selector.click();
      await settle();

      const option = [...portal.querySelectorAll<HTMLElement>(".ant-select-item-option")].find(
        (el) => el.textContent?.trim() === optionText,
      );
      if (!option) {
        const seen = [...portal.querySelectorAll(".ant-select-item-option")].map((el) =>
          el.textContent?.trim(),
        );
        throw new Error(`下拉里没有「${optionText}」，现有：${seen.join(" / ")}`);
      }
      option.click();
      await settle();
    },
    selectedTexts: () =>
      [...portal.querySelectorAll(".ant-select-selection-item")].map((el) =>
        (el.textContent ?? "").trim(),
      ),
    saveDisabled: () =>
      [...portal.querySelectorAll<HTMLButtonElement>("button")]
        .find((el) => (el.textContent ?? "").replace(/\s+/g, "") === "保存")!
        .hasAttribute("disabled"),
    text: () => portal.textContent ?? "",
    async setOpen(open: boolean) {
      state.open = open;
      await settle();
    },
  };
}

describe("AiSettingsModal 打开时的表单初始化", () => {
  it("每次打开都按已保存的配置重新灌，而不是只在挂载时灌一次", async () => {
    const form = await mountForm();
    seedConfig();

    await form.setOpen(true);
    expect(form.input("模型").value).toBe("seed-model");
    expect(form.selectedTexts()).toEqual(["DeepSeek", "本地存储（仅调试）"]);
    expect(form.input("API Key").value).toBe("sk-seed");
    expect(form.portal.querySelector(".ant-switch")?.getAttribute("aria-checked")).toBe("false");

    // 改了却没保存就关掉，再打开必须回到已保存的值
    form.input("模型").value = "临时改的";
    form.input("模型").dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await form.clickButton("取消");
    await form.setOpen(true);

    expect(form.input("模型").value).toBe("seed-model");
  });

  it("重新打开时不残留上一次的连接测试结果", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "sk-x" });
    await form.setOpen(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "上次那条错误" } }),
      }),
    );
    await form.clickButton("测试连接");
    expect(form.text()).toContain("上次那条错误");

    await form.clickButton("取消");
    await form.setOpen(true);

    expect(form.text()).not.toContain("上次那条错误");
    expect(form.text()).toContain("测试连接");
    expect(form.portal.querySelector(".ai-settings__latency")).toBeNull();
  });

  it("没有已保存配置时保持组件自己的默认值", async () => {
    const form = await mountForm();

    await form.setOpen(true);

    expect(form.selectedTexts()[0]).toBe("OpenAI");
    expect(form.input("模型").value).toBe("");
  });
});

describe("AiSettingsModal 切换提供商与存储方式", () => {
  it("切 provider 换成该提供商的默认端点与模型", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", endpoint: "", model: "" });
    await form.setOpen(true);

    await form.pickOption(0, "Ollama（本地）");

    const ollama = getProviderInfo("ollama")!;
    expect(form.input("模型").value).toBe(ollama.defaultModel);
    // ollama 与 custom 才显示端点输入
    expect(form.input("API 端点").value).toBe(ollama.defaultEndpoint);
  });

  it("切 provider 会把上一次的连接测试结果清掉", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "sk-x" });
    await form.setOpen(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) }),
    );
    await form.clickButton("测试连接");
    expect(form.text()).toContain("连接失败");

    await form.pickOption(0, "DeepSeek");

    expect(form.text()).toContain("测试连接");
    expect(form.text()).not.toContain("连接失败");
  });

  it("proxy 存储方式下不再要 API Key：输入框收起，且缺 key 也能保存", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "", storageMode: "memory" });
    await form.setOpen(true);

    // 先站住肯定的一半：memory 模式下 API Key 区块在，且因为没填而存不了
    expect(form.section("API Key")).not.toBeNull();
    expect(form.saveDisabled()).toBe(true);

    await form.pickOption(1, "后端代理");

    expect(form.section("API Key")).toBeNull();
    expect(form.saveDisabled()).toBe(false);
  });

  it("custom 提供商必须填端点才能保存", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "sk-x" });
    await form.setOpen(true);
    expect(form.saveDisabled()).toBe(false);

    await form.pickOption(0, "自定义");
    // custom 的默认端点是空串
    expect(form.input("API 端点").value).toBe("");
    expect(form.saveDisabled()).toBe(true);

    form.input("API 端点").value = "https://my-proxy.example.com/v1";
    form.input("API 端点").dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();

    expect(form.saveDisabled()).toBe(false);
  });
});

describe("AiSettingsModal 保存 / 取消 / 清除", () => {
  it("保存把当前表单写进配置、通知宿主并关闭弹窗", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "sk-x", model: "gpt-4o-mini" });
    await form.setOpen(true);

    form.input("模型").value = "gpt-4o";
    form.input("模型").dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await form.clickButton("保存");

    expect(useAiConfig().config.value?.model).toBe("gpt-4o");
    expect(form.emitted.saved).toBe(1);
    expect(form.emitted.open.at(-1)).toBe(false);
    expect(form.state.open).toBe(false);
  });

  it("取消只关弹窗，不动已保存的配置，也不发 saved", async () => {
    const form = await mountForm();
    seedConfig({ model: "seed-model" });
    await form.setOpen(true);

    form.input("模型").value = "改了但不保存";
    form.input("模型").dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await form.clickButton("取消");

    expect(useAiConfig().config.value?.model).toBe("seed-model");
    expect(form.emitted.saved).toBe(0);
    expect(form.state.open).toBe(false);
  });

  it("清除配置把存储与表单一起打回默认值，但不关弹窗", async () => {
    const form = await mountForm();
    seedConfig();
    await form.setOpen(true);
    expect(form.input("模型").value).toBe("seed-model");

    await form.clickButton("清除配置");

    expect(useAiConfig().config.value).toBeNull();
    expect(form.input("模型").value).toBe("");
    expect(form.selectedTexts()[0]).toBe("OpenAI");
    expect(form.state.open).toBe(true);
  });
});

describe("AiSettingsModal 连接测试的四种结果", () => {
  it("成功时按钮改口并显示延迟", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "sk-x" });
    await form.setOpen(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    );
    await form.clickButton("测试连接");

    expect(form.text()).toContain("连接成功");
    expect(form.portal.querySelector(".ai-settings__latency")).not.toBeNull();
  });

  it("失败时优先显示提供商回的原始错误，而不是笼统的失败文案", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "sk-bad" });
    await form.setOpen(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Incorrect API key provided" } }),
      }),
    );
    await form.clickButton("测试连接");

    expect(form.portal.querySelector(".ai-settings__error")?.textContent).toBe(
      "Incorrect API key provided",
    );
  });

  it("provider 没给原始错误时退回语言包文案，不把 key 漏给用户", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "", storageMode: "memory" });
    await form.setOpen(true);

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await form.clickButton("测试连接");

    // 缺 API Key 时压根不发请求，错误来自本地校验
    expect(fetchSpy).not.toHaveBeenCalled();
    const error = form.portal.querySelector(".ai-settings__error")?.textContent ?? "";
    expect(error).toBe("请输入 API Key");
    expect(error).not.toContain("aiSettings.");
  });

  it("测试进行中按钮显示「测试中...」", async () => {
    const form = await mountForm();
    seedConfig({ provider: "openai", apiKey: "sk-x" });
    await form.setOpen(true);

    let release: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          release = resolve;
        }),
      ),
    );

    await form.clickButton("测试连接");
    expect(form.text()).toContain("测试中...");

    release({ ok: true, json: () => Promise.resolve({}) });
    await settle();
    expect(form.text()).toContain("连接成功");
  });
});
