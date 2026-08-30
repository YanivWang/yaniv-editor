import { describe, expect, it } from "vitest";

import * as aiEntry from "@/ai";
import * as mainEntry from "@/index";
import * as inlineEntry from "@/inline";

/**
 * 公开 API 表面锁。
 *
 * 这是一个**发布到 npm 的库**：任何导出的增删都是对下游的契约变更。
 * 快照的作用不是"不许改"，而是让改动必须显式过一次人眼——
 * 删除或重命名导出时，diff 会同时出现在这里，提醒补 CHANGELOG 的 BREAKING CHANGES。
 *
 * 新增导出：把名字加进列表即可。
 * 删除 / 重命名导出：必须同时在 CHANGELOG 登记为 breaking。
 */
function runtimeExports(mod: Record<string, unknown>): string[] {
  return Object.keys(mod)
    .filter((key) => key !== "default" || mod.default !== undefined)
    .sort();
}

describe("公开 API 表面", () => {
  it("主入口 @yanivjs/yaniv-editor", () => {
    expect(runtimeExports(mainEntry)).toMatchInlineSnapshot(`
      [
        "BUILTIN_LOCALE_CODES",
        "BYPASS_GUARD_META",
        "CAPABILITIES",
        "ContentAdapter",
        "EDITOR_APPEARANCES",
        "YanivEditor",
        "adaptJsonToSchema",
        "applyAppearanceToElement",
        "applyCustomAppearanceToElement",
        "applyGatesToToolbarConfig",
        "applyPhaseTransition",
        "buildExtensions",
        "computeSessionKey",
        "createI18n",
        "editorAppearanceInjectionKey",
        "ensureLocalesLoaded",
        "findLinkHrefInSelection",
        "getAppearanceClassName",
        "isBubbleMenuBlocked",
        "isLoadableAppearance",
        "loadAppearance",
        "loadLocale",
        "mergeFeatures",
        "normalizeLocaleCode",
        "parseContentToDoc",
        "preloadAppearances",
        "prepareEditorContent",
        "provideYanivEditor",
        "resolveChromePolicy",
        "resolveColorMode",
        "resolveEditorProfile",
        "resolveInlineGates",
        "resolveShowInlineToolbar",
        "scrollEditorSelectionIntoView",
        "shouldShowFloatingTextToolbar",
        "shouldShowImageBubbleMenu",
        "shouldShowLinkBubbleMenu",
        "shouldShowTableBubbleMenu",
        "shouldShowVideoBubbleMenu",
        "t",
        "useEditorAppearance",
        "useEditorColorState",
        "useFindReplaceHotkey",
        "useI18n",
        "useInjectEditorAppearance",
        "useOverlayBubbleMenu",
        "useOverlayFeedback",
        "useOverlayMountTarget",
        "useResolvedColorMode",
        "useRovingTabindex",
        "useYanivEditor",
        "watchSystemColorMode",
      ]
    `);
  });

  it("行内入口 @yanivjs/yaniv-editor/inline", () => {
    expect(runtimeExports(inlineEntry)).toMatchInlineSnapshot(`
      [
        "AlignDropdown",
        "CAPABILITIES",
        "ClearFormatButton",
        "CodeBlockDropdown",
        "DEFAULT_INLINE_TOOLBAR",
        "FontFamilySelect",
        "FontSizeSelect",
        "HeadingControl",
        "InlineToolbar",
        "LinkButton",
        "ListTools",
        "TextFormatButtons",
        "UndoRedoButton",
        "YanivInlineEditor",
        "buildExtensions",
        "provideYanivEditor",
        "resolveInlineGates",
        "resolveShowInlineToolbar",
        "useYanivEditor",
      ]
    `);
  });

  it("AI 入口 @yanivjs/yaniv-editor/ai", () => {
    expect(runtimeExports(aiEntry)).toMatchInlineSnapshot(`
      [
        "AI_PROVIDERS",
        "AiHighlightMark",
        "AiMenuButton",
        "AiSettingsModal",
        "AiSuggestionPopover",
        "ContinueWritingExtension",
        "CustomAiExtension",
        "CustomAiPopover",
        "DEFAULT_CONFIG",
        "PolishExtension",
        "SummarizeExtension",
        "TranslationExtension",
        "aiClient",
        "aiSuggestionManager",
        "buildDocumentContextPrompt",
        "createAiClient",
        "getAiRequestConfig",
        "getHostAiConfig",
        "getProviderInfo",
        "isHostAiManaged",
        "normalizeAiError",
        "runAiContinueWritingStream",
        "runAiSuggestionStream",
        "setHostAiConfig",
        "useAiConfig",
      ]
    `);
  });
});

describe("入口边界约定", () => {
  it("AI 符号只在 /ai 暴露，不从主入口泄漏", () => {
    const main = runtimeExports(mainEntry);
    for (const aiOnly of ["aiClient", "createAiClient", "useAiConfig", "AiSettingsModal"]) {
      expect(main, `${aiOnly} 不应出现在主入口`).not.toContain(aiOnly);
    }
  });

  it("两个组件入口各自只导出自己的组件", () => {
    expect(runtimeExports(mainEntry)).toContain("YanivEditor");
    expect(runtimeExports(inlineEntry)).toContain("YanivInlineEditor");
    expect(runtimeExports(mainEntry)).not.toContain("YanivInlineEditor");
  });

  it("能力与运行时推导函数在主入口可用（自建 shell 依赖）", () => {
    for (const symbol of [
      "resolveEditorProfile",
      "mergeFeatures",
      "resolveChromePolicy",
      "computeSessionKey",
      "resolveInlineGates",
      "buildExtensions",
      "CAPABILITIES",
      "ContentAdapter",
    ]) {
      expect(runtimeExports(mainEntry), symbol).toContain(symbol);
    }
  });
});
