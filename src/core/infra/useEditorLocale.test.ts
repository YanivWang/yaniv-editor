import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, ref, type Ref } from "vue";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 回归护栏：实例级 locale 的异步加载。
 *
 * `provideEditorLocale` 在 watch 回调里 await 语言包的动态 import，两次切换的
 * chunk 可能「后发先至」。没有陈旧守卫时，先发起的那次会在后到时覆盖掉新结果——
 * `locale` 报 en-US、界面却仍是中文，且直到下一次切换都不会自愈。
 */
describe("provideEditorLocale", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/locales/zh-CN");
    vi.doUnmock("@/locales/en-US");
  });

  async function mountLocale(source: Ref<string | undefined>) {
    const { provideEditorLocale } = await import("./useEditorLocale");
    let ctx!: ReturnType<typeof provideEditorLocale>;
    const Comp = defineComponent({
      setup() {
        ctx = provideEditorLocale(source);
        return () => null;
      },
    });
    mount(Comp);
    return ctx;
  }

  it("快速切换 locale 时，慢到达的旧语言包不会覆盖新的", async () => {
    // zh-CN 慢、en-US 快，构造「后发先至」
    vi.doMock("@/locales/zh-CN", async () => {
      await delay(150);
      return { zhCN: { editor: { bold: "粗体" } } };
    });
    vi.doMock("@/locales/en-US", async () => {
      await delay(5);
      return { enUS: { editor: { bold: "Bold" } } };
    });

    const source = ref<string | undefined>("zh-CN");
    const ctx = await mountLocale(source);

    source.value = "en-US";
    await nextTick();
    await delay(300);

    expect(ctx.locale.value).toBe("en-US");
    expect(ctx.t("editor.bold")).toBe("Bold");
  });

  it("只加载当前 locale 的语言包，不预载兜底包", async () => {
    const loaded: string[] = [];
    vi.doMock("@/locales/zh-CN", () => {
      loaded.push("zh-CN");
      return { zhCN: { editor: { bold: "粗体" } } };
    });
    vi.doMock("@/locales/en-US", () => {
      loaded.push("en-US");
      return { enUS: { editor: { bold: "Bold" } } };
    });

    const ctx = await mountLocale(ref<string | undefined>("zh-CN"));
    await delay(50);

    expect(ctx.t("editor.bold")).toBe("粗体");
    // 实例 t() 未命中直接返回 key，从不查兜底包 —— 预载它纯属浪费流量
    expect(loaded).toEqual(["zh-CN"]);
  });

  it("未命中的 key 原样返回，不跨语言兜底", async () => {
    vi.doMock("@/locales/zh-CN", () => ({ zhCN: { editor: { bold: "粗体" } } }));
    const ctx = await mountLocale(ref<string | undefined>("zh-CN"));
    await delay(50);

    expect(ctx.t("editor.doesNotExist")).toBe("editor.doesNotExist");
  });
});
