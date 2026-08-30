import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { buildExtensions } from "@/capabilities/buildExtensions";
import type { BuildExtensionsCtx } from "@/capabilities/types";
import { resolveEditorProfile } from "@/core/runtime/resolveEditorProfile";
import type { ExtensionGates } from "@/core/runtime/types";
import { zhCN } from "@/locales/zh-CN";

function makeCtx(gates: ExtensionGates): BuildExtensionsCtx {
  return {
    locale: zhCN,
    gates,
    isEditable: ref(true),
    blockMenuHost: {
      activate: () => {},
      openInsert: () => {},
      hide: () => {},
      updateQuery: () => {},
    } as unknown as BuildExtensionsCtx["blockMenuHost"],
    upload: { image: () => undefined, video: () => undefined },
    galleryImages: () => [],
    officePaste: { onPasteFromOfficeWithImages: () => undefined },
    outline: { scrollParent: () => null, bindScrollParent: () => {} },
    aiConfig: () => undefined,
  };
}

async function extensionNamesFor(preset: "basic" | "full" | "notion"): Promise<string[]> {
  const { gates } = resolveEditorProfile({ preset });
  const extensions = await buildExtensions("full", makeCtx(gates));
  return extensions.map((e) => e.name);
}

/**
 * gate 必须同时决定「运行时是否注册」与「是否进入 bundle」。
 *
 * registry 中默认关闭的能力全部走 `await import()`；这里断言的是前半段——
 * 关掉的 gate 不注册扩展。后半段（不进主 chunk）由 CI 的产物断言守着。
 */
describe("buildExtensions 的 gate 过滤", () => {
  it("basic preset 不注册 table / video / math / 大纲 / 查找替换 / 格式刷", async () => {
    const names = await extensionNamesFor("basic");

    for (const absent of [
      "table",
      "video",
      "math",
      "tableOfContents",
      "searchReplace",
      "formatPainter",
      "officePaste",
      "dragHandle",
      "slashCommand",
    ]) {
      expect(names, `basic 不应包含 ${absent}`).not.toContain(absent);
    }
  });

  it("basic preset 仍保留核心编辑与图片能力", async () => {
    const names = await extensionNamesFor("basic");

    expect(names).toContain("image");
    expect(names).toContain("link");
    expect(names).toContain("underline");
    expect(names).toContain("taskList");
  });

  it("full preset 注册表格 / 视频 / 大纲 / 查找替换 / 格式刷", async () => {
    const names = await extensionNamesFor("full");

    for (const present of [
      "table",
      "video",
      "tableOfContents",
      "searchReplace",
      "formatPainter",
      "officePaste",
    ]) {
      expect(names, `full 应包含 ${present}`).toContain(present);
    }
  });

  it("notion preset 注册块编辑能力", async () => {
    const names = await extensionNamesFor("notion");

    for (const present of ["dragHandle", "slashCommand", "toggleBlock", "callout", "mention"]) {
      expect(names, `notion 应包含 ${present}`).toContain(present);
    }
  });

  it("features 覆盖可强制关闭 preset 默认开启的能力", async () => {
    const { gates } = resolveEditorProfile({ preset: "full", features: { table: false } });
    const names = (await buildExtensions("full", makeCtx(gates))).map((e) => e.name);

    expect(names).not.toContain("table");
    expect(names).toContain("video");
  });

  it("inline host 只注册工具栏开启的分组", async () => {
    const gates = {
      undoRedo: true,
      textFormat: true,
      link: true,
      heading: false,
      list: false,
      align: false,
      font: false,
      codeBlock: false,
    } as unknown as ExtensionGates;

    const names = (await buildExtensions("inline", makeCtx(gates))).map((e) => e.name);

    expect(names).toContain("link");
    expect(names).toContain("underline");
    expect(names).not.toContain("taskList");
    expect(names).not.toContain("textAlign");
  });
});
