import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 回归护栏：全局 `t()` 的兜底链。
 *
 * `createI18n({ fallbackLocale })` 此前只把值传给预加载，`t()` 里把 "en-US" 写死，
 * 于是该选项对解析毫无影响——传了也等于没传。
 *
 * 另一半是兜底段必须查自定义包：内置两包的 key 集合由 localeParity.test.ts 保证完全
 * 一致，缺 key 只可能出现在自定义包，只查内置包的话兜底段永远命不中。
 */
describe("locales/manager t() 兜底链", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("尊重 createI18n 传入的 fallbackLocale", async () => {
    const mgr = await import("./manager");
    mgr.createI18n({
      locale: "en-US",
      fallbackLocale: "zh-CN",
      messages: {
        "zh-CN": { onlyInZh: "中文兜底命中" } as never,
        "en-US": {} as never,
      },
    });

    expect(mgr.t("onlyInZh")).toBe("中文兜底命中");
  });

  it("fallbackLocale 缺省为 en-US", async () => {
    const mgr = await import("./manager");
    mgr.createI18n({
      locale: "zh-CN",
      messages: {
        "zh-CN": {} as never,
        "en-US": { onlyInEn: "english fallback" } as never,
      },
    });

    expect(mgr.t("onlyInEn")).toBe("english fallback");
  });

  it("当前 locale 命中时不走兜底", async () => {
    const mgr = await import("./manager");
    mgr.createI18n({
      locale: "zh-CN",
      fallbackLocale: "en-US",
      messages: {
        "zh-CN": { greet: "你好" } as never,
        "en-US": { greet: "hello" } as never,
      },
    });

    expect(mgr.t("greet")).toBe("你好");
  });

  it("两个 locale 都没有的 key 原样返回", async () => {
    const mgr = await import("./manager");
    mgr.createI18n({
      locale: "zh-CN",
      fallbackLocale: "en-US",
      messages: { "zh-CN": {} as never, "en-US": {} as never },
    });

    expect(mgr.t("nope.not.here")).toBe("nope.not.here");
  });
});
