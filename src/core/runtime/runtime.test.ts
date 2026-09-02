import { Extension } from "@tiptap/core";
import { describe, expect, test } from "vitest";
import { createApp, ref } from "vue";

import { applyGatesToToolbarConfig } from "@/capabilities/applyGatesToToolbarConfig";
import { buildExtensions } from "@/capabilities/buildExtensions";
import { CAPABILITIES } from "@/capabilities/registry";
import { resolveShowInlineToolbar } from "@/capabilities/resolveShowInlineToolbar";
import {
  COMPACT_TOOLBAR_CONFIG,
  FULL_TOOLBAR_CONFIG,
  type ToolbarToolsConfig,
} from "@/components/tools/header-nav/toolbarConfig";
import { computeSessionKey } from "@/core/runtime/computeSessionKey";
import { mergeFeatures } from "@/core/runtime/mergeFeatures";
import { resolveChromePolicy } from "@/core/runtime/resolveChromePolicy";
import { resolveEditorProfile, PRESET_DEFAULT_FEATURES } from "@/core/runtime/resolveEditorProfile";
import { resolveInlineGates } from "@/core/runtime/resolveInlineGates";
import { useEditorRuntime } from "@/core/runtime/useEditorRuntime";
import { zhCN } from "@/locales/zh-CN";

const fullLayout = {
  header: true,
  footer: true,
  floatingMenu: true,
  linkBubble: true,
  tableTools: true,
  shortcutHints: true,
  outlineAnchor: "top-right" as const,
  zoomPlacement: "bottom" as const,
  tableToolsShowMode: 2 as const,
};

describe("resolveEditorProfile", () => {
  test("basic preset 默认关闭 table", () => {
    expect(resolveEditorProfile({ preset: "basic" }).gates.table).toBe(false);
  });

  test("features.table=true 覆盖 basic preset 默认值", () => {
    expect(resolveEditorProfile({ preset: "basic", features: { table: true } }).gates.table).toBe(
      true,
    );
  });

  test("features.table=undefined 不覆盖 full preset 默认值", () => {
    expect(
      resolveEditorProfile({ preset: "full", features: { table: undefined } }).gates.table,
    ).toBe(true);
  });

  test("full preset 默认关闭 notion 块编辑能力", () => {
    const gates = resolveEditorProfile({ preset: "full" }).gates;
    expect(gates.slashCommand).toBe(false);
    expect(gates.dragHandle).toBe(false);
  });

  test("notion preset 默认开启块编辑与文档能力（formatPainter 除外）", () => {
    const gates = resolveEditorProfile({ preset: "notion" }).gates;
    expect(gates.slashCommand).toBe(true);
    expect(gates.dragHandle).toBe(true);
    expect(gates.video).toBe(true);
    expect(gates.math).toBe(true);
    expect(gates.outline).toBe(true);
    expect(gates.searchReplace).toBe(true);
    expect(gates.officePaste).toBe(true);
    expect(gates.ai).toBe(true);
    expect(gates.formatPainter).toBe(false);
  });
});

describe("mergeFeatures", () => {
  test("features[key]=undefined 不覆盖 preset 默认值", () => {
    expect(mergeFeatures(PRESET_DEFAULT_FEATURES.full, { table: undefined }).table).toBe(true);
  });

  test("features[key]=false 覆盖 preset 默认值", () => {
    expect(mergeFeatures(PRESET_DEFAULT_FEATURES.full, { table: false }).table).toBe(false);
  });
});

describe("resolveChromePolicy", () => {
  test("preview 模式 showOutlineRail=false", () => {
    const profile = resolveEditorProfile({ preset: "full", mode: "preview" });
    const policy = resolveChromePolicy({
      profile,
      layout: fullLayout,
      gates: profile.gates,
      uiFlags: {
        linkBubble: true,
        tableTools: true,
        image: true,
        video: true,
        floatingMenu: true,
      },
      host: "full",
    });
    expect(policy.host === "full" && policy.showOutlineRail).toBe(false);
  });

  test("edit 模式 + outline gate 开 → showOutlineRail=true", () => {
    const profile = resolveEditorProfile({ preset: "full", mode: "edit" });
    const policy = resolveChromePolicy({
      profile,
      layout: fullLayout,
      gates: profile.gates,
      uiFlags: {
        linkBubble: true,
        tableTools: true,
        image: true,
        video: true,
        floatingMenu: true,
      },
      host: "full",
    });
    expect(policy.host === "full" && policy.showOutlineRail).toBe(true);
  });

  test("inline preview 模式 showInlineToolbar=false", () => {
    const gates = resolveInlineGates({ link: true, textFormat: true }, CAPABILITIES);
    const profile = {
      mode: "preview" as const,
      preset: "basic" as const,
      features: {} as never,
      gates,
    };
    const policy = resolveChromePolicy({
      profile,
      layout: {
        header: false,
        footer: false,
        floatingMenu: false,
        linkBubble: false,
        tableTools: false,
        shortcutHints: false,
        outlineAnchor: "top-right" as const,
        zoomPlacement: "bottom" as const,
        tableToolsShowMode: 2 as const,
      },
      gates,
      uiFlags: {
        linkBubble: true,
        tableTools: false,
        image: false,
        video: false,
        floatingMenu: false,
      },
      host: "inline",
      showInlineToolbar: true,
    });
    expect(policy.host === "inline" && policy.showInlineToolbar).toBe(false);
  });

  test("chromePolicy 不含 outlinePanelExpanded", () => {
    const profile = resolveEditorProfile({ preset: "full", mode: "edit" });
    const policy = resolveChromePolicy({
      profile,
      layout: fullLayout,
      gates: profile.gates,
      uiFlags: {
        linkBubble: true,
        tableTools: true,
        image: true,
        video: true,
        floatingMenu: true,
      },
      host: "full",
    });
    expect("outlinePanelExpanded" in policy).toBe(false);
  });
});

describe("computeSessionKey", () => {
  const profile = resolveEditorProfile({ preset: "full" });

  test("相同输入 sessionKey 幂等", () => {
    expect(computeSessionKey(profile, "full", "zh-CN", CAPABILITIES)).toBe(
      computeSessionKey(profile, "full", "zh-CN", CAPABILITIES),
    );
  });

  test("不同 locale 产生不同 sessionKey", () => {
    expect(computeSessionKey(profile, "full", "zh-CN", CAPABILITIES)).not.toBe(
      computeSessionKey(profile, "full", "en-US", CAPABILITIES),
    );
  });

  test("inline toolbar gates 变化会产生不同 sessionKey", () => {
    const textFormatProfile = {
      mode: "edit" as const,
      preset: "basic" as const,
      features: {} as never,
      gates: resolveInlineGates({ textFormat: true }, CAPABILITIES),
    };
    const linkProfile = {
      ...textFormatProfile,
      gates: resolveInlineGates({ link: true }, CAPABILITIES),
    };

    expect(computeSessionKey(textFormatProfile, "inline", "zh-CN", CAPABILITIES)).not.toBe(
      computeSessionKey(linkProfile, "inline", "zh-CN", CAPABILITIES),
    );
  });

  test("inline placeholder 和 extraExtensions 变化会产生不同 sessionKey", () => {
    const placeholder = ref<string | undefined>(undefined);
    const extraExtensions = ref([Extension.create({ name: "runtimeExtensionA" })]);
    let runtime!: ReturnType<typeof useEditorRuntime>;
    const app = createApp({
      setup() {
        runtime = useEditorRuntime({
          host: "inline",
          mode: ref("edit"),
          toolbar: ref({ textFormat: true }),
          locale: ref("zh-CN"),
          inlinePlaceholder: placeholder,
          extraExtensions,
        });
        return () => null;
      },
    });

    app.mount(document.createElement("div"));
    try {
      const initialKey = runtime.sessionKey.value;

      placeholder.value = "Type here";
      expect(runtime.sessionKey.value).not.toBe(initialKey);

      const withPlaceholderKey = runtime.sessionKey.value;
      extraExtensions.value = [Extension.create({ name: "runtimeExtensionB" })];
      expect(runtime.sessionKey.value).not.toBe(withPlaceholderKey);
    } finally {
      app.unmount();
    }
  });
});

describe("resolveInlineGates", () => {
  test("Inline toolbar.link=true → gates.link=true", () => {
    expect(resolveInlineGates({ link: true }, CAPABILITIES).link).toBe(true);
  });

  test("Inline toolbar.link 未传 → gates.link=false（opt-in）", () => {
    expect(resolveInlineGates({}, CAPABILITIES).link).toBe(false);
  });

  test("Inline toolbar.heading=true → gates.heading=true", () => {
    expect(resolveInlineGates({ heading: true }, CAPABILITIES).heading).toBe(true);
  });
});

describe("applyGatesToToolbarConfig", () => {
  test("table gate 关闭时隐藏 table 按钮", () => {
    const gates = resolveEditorProfile({ preset: "basic" }).gates;
    const toolbar = applyGatesToToolbarConfig({ ...FULL_TOOLBAR_CONFIG, table: true }, gates);
    expect(toolbar.table).toBe(false);
  });

  test("table gate 开启时保留 table 按钮", () => {
    const gates = resolveEditorProfile({ preset: "full" }).gates;
    const toolbar = applyGatesToToolbarConfig({ ...FULL_TOOLBAR_CONFIG, table: true }, gates);
    expect(toolbar.table).toBe(true);
  });
});

describe("resolveShowInlineToolbar", () => {
  test("toolbar 全 false → 不展示", () => {
    expect(
      resolveShowInlineToolbar(
        {
          undoRedo: false,
          heading: false,
          textFormat: false,
          list: false,
          align: false,
          link: false,
          clearFormat: false,
          font: false,
          codeBlock: false,
        },
        CAPABILITIES,
      ),
    ).toBe(false);
  });

  test("任一 registry slug 为 true → 展示", () => {
    expect(resolveShowInlineToolbar({ link: true }, CAPABILITIES)).toBe(true);
  });
});

describe("buildExtensions", () => {
  test("inline extraExtensions 会追加到扩展列表", async () => {
    const customExtension = Extension.create({ name: "customInlineExtension" });
    const extensions = await buildExtensions("inline", {
      locale: zhCN,
      gates: resolveInlineGates({}, CAPABILITIES),
      isEditable: ref(true),
      blockMenuHost: {
        registerInstance: () => {},
        activate: () => {},
        openInsert: () => {},
        hide: () => {},
        updateQuery: () => {},
      },
      upload: {
        image: () => undefined,
        video: () => undefined,
      },
      galleryImages: () => [],
      mentionItems: () => undefined,
      officePaste: {
        onPasteFromOfficeWithImages: () => undefined,
      },
      outline: {
        scrollParent: () => null,
        bindScrollParent: () => {},
      },
      aiConfig: () => undefined,
      extraExtensions: [customExtension],
    });

    expect(extensions.some((extension) => extension.name === "customInlineExtension")).toBe(true);
  });
});

describe("ToolbarNav 移动端掩码", () => {
  /**
   * 回归护栏：移动端的 COMPACT 合并必须是「取交集」而非「覆盖」。
   * 直接 spread COMPACT 会让其中硬编码为 true 的 image / ai 绕过 gate 过滤，
   * 渲染出没有扩展支撑的按钮。
   */
  function applyMobileMask(base: ToolbarToolsConfig): ToolbarToolsConfig {
    const masked: ToolbarToolsConfig = {};
    for (const key of Object.keys(base) as Array<keyof ToolbarToolsConfig>) {
      masked[key] = base[key] === true && COMPACT_TOOLBAR_CONFIG[key] === true;
    }
    return masked;
  }

  test("gate 关闭的 ai 不会被 COMPACT 重新打开", () => {
    const profile = resolveEditorProfile({ preset: "basic" });
    const gated = applyGatesToToolbarConfig(
      { ...FULL_TOOLBAR_CONFIG, ...COMPACT_TOOLBAR_CONFIG },
      profile.gates,
    );
    expect(gated.ai).toBe(false);
    expect(applyMobileMask(gated).ai).toBe(false);
  });

  test("gate 关闭的 image 不会被 COMPACT 重新打开", () => {
    const profile = resolveEditorProfile({ preset: "basic", features: { image: false } });
    const gated = applyGatesToToolbarConfig({ ...FULL_TOOLBAR_CONFIG }, profile.gates);
    expect(gated.image).toBe(false);
    expect(applyMobileMask(gated).image).toBe(false);
  });

  test("掩码只收窄：COMPACT 未包含的 word 在移动端关闭", () => {
    const profile = resolveEditorProfile({ preset: "full" });
    const gated = applyGatesToToolbarConfig({ ...FULL_TOOLBAR_CONFIG }, profile.gates);
    expect(gated.word).toBe(true);
    expect(applyMobileMask(gated).word).toBe(false);
  });
});
