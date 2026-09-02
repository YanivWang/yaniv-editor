// @vitest-environment jsdom

/**
 * 翻译目标语言存的是**语言代码**，不是界面标签。
 *
 * 早先存标签会在切换编辑器语言后错乱：标签随 locale 变而代码不变，于是
 * 按钮显示成「Translate to 英语」/「翻译为 English」，菜单里的选中标记也反查不到。
 * 这份配置是持久化的，错乱会一直跟着用户走。
 *
 * 模块在**加载时**读一次持久化配置，所以每个用例都要 `resetModules()` 后重新 import，
 * 才能测到不同的初始值。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "yaniv-ai-config";

function seedConfig(translateTargetLang: string | undefined): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      provider: "openai",
      model: "gpt-4o-mini",
      enabled: true,
      updatedAt: 1,
      ...(translateTargetLang === undefined ? {} : { translateTargetLang }),
    }),
  );
}

async function loadStore() {
  vi.resetModules();
  return import("./translateStore");
}

/** 中文语言包里 `editor.lang.*` 的显示名 */
const zhLabels: Record<string, string> = {
  en: "英语",
  ja: "日语",
  "zh-TW": "繁体中文",
};

beforeEach(() => {
  localStorage.clear();
});

describe("翻译目标语言的持久化格式", () => {
  it("已经是语言代码的值直接沿用", async () => {
    seedConfig("ja");
    const { currentTranslateLang } = await loadStore();
    expect(currentTranslateLang.value).toBe("ja");
  });

  it("写入的是代码，不是界面标签", async () => {
    seedConfig(undefined);
    const { setTranslateLang } = await loadStore();

    setTranslateLang("zh-TW");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.translateTargetLang).toBe("zh-TW");
  });

  it("旧格式的界面标签在 locale 就绪后迁移成代码", async () => {
    seedConfig("英语");
    const { currentTranslateLang, migrateLegacyTranslateLang } = await loadStore();

    // 语言包按需加载，模块初始化时反查不了，所以此刻先当作「未选择」
    expect(currentTranslateLang.value).toBe("");

    migrateLegacyTranslateLang((key) => zhLabels[key] ?? `editor.lang.${key}`);

    expect(currentTranslateLang.value).toBe("en");
  });

  it("换过界面语言导致旧标签反查不到时，回到未选择而不是显示别的语言", async () => {
    seedConfig("英语");
    const { currentTranslateLang, migrateLegacyTranslateLang } = await loadStore();

    // 英文界面：语言包里没有「英语」这个显示名
    migrateLegacyTranslateLang((key) => ({ en: "English", ja: "Japanese" })[key] ?? key);

    expect(currentTranslateLang.value).toBe("");
  });

  it("迁移只做一次，之后用户的选择不会被再次覆盖", async () => {
    seedConfig("英语");
    const { currentTranslateLang, migrateLegacyTranslateLang, setTranslateLang } =
      await loadStore();

    migrateLegacyTranslateLang((key) => zhLabels[key] ?? key);
    expect(currentTranslateLang.value).toBe("en");

    setTranslateLang("ja");
    migrateLegacyTranslateLang((key) => zhLabels[key] ?? key);

    expect(currentTranslateLang.value, "第二次迁移不该把用户刚选的语言清掉").toBe("ja");
  });

  it("没有持久化值时是未选择，迁移是空操作", async () => {
    seedConfig(undefined);
    const { currentTranslateLang, migrateLegacyTranslateLang } = await loadStore();

    expect(currentTranslateLang.value).toBe("");
    migrateLegacyTranslateLang(() => "英语");
    expect(currentTranslateLang.value).toBe("");
  });

  it("clearTranslateLang 把持久化值一并清掉", async () => {
    seedConfig("ja");
    const { clearTranslateLang, currentTranslateLang } = await loadStore();

    clearTranslateLang();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(currentTranslateLang.value).toBe("");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.translateTargetLang).toBeUndefined();
  });
});
