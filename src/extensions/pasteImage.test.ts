// @vitest-environment jsdom

/**
 * 粘贴图片：什么时候接管、什么时候让路。
 *
 * 这个插件的 `handlePaste` 返回 `true` 就等于宣布「这次粘贴我处理了」，
 * ProseMirror 与其它插件都不会再看它。所以**让路的判断必须在同步阶段做完**，
 * 一旦返回 `true` 却什么也没插入，用户的内容就凭空消失了。
 */
import ImageExtension from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { PasteImage } from "./pasteImage";

import type { Plugin } from "@tiptap/pm/state";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

let editor: Editor | null = null;

function createEditor(): Editor {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({
    element: el,
    extensions: [StarterKit, ImageExtension.configure({ allowBase64: true }), PasteImage],
    content: "<p>原有内容</p>",
  });
  return editor;
}

/** 插件的 PluginKey 没导出，按 key 前缀从 state 里认出它 */
function pastePlugin(target: Editor): Plugin {
  const found = target.state.plugins.find((plugin) =>
    String((plugin as unknown as { key: string }).key).startsWith("pasteImage"),
  );
  if (!found) throw new Error("没有找到 pasteImage 插件");
  return found;
}

function handlePaste(target: Editor, event: ClipboardEvent): boolean {
  const handler = pastePlugin(target).props.handlePaste;
  return Boolean(handler?.call(pastePlugin(target), target.view, event, undefined as never));
}

interface FakeItem {
  type: string;
  file: File | null;
}

/** jsdom 没有 DataTransfer，用最小替身；`items` 与 `getData` 是被测代码只用到的两处 */
function pasteEvent(options: {
  items?: FakeItem[];
  html?: string;
  skipInlineImage?: boolean;
  noClipboardData?: boolean;
}): ClipboardEvent {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
  const clipboardData = options.noClipboardData
    ? null
    : {
        getData: (format: string) => (format === "text/html" ? (options.html ?? "") : ""),
        items: (options.items ?? []).map((item) => ({
          type: item.type,
          getAsFile: () => item.file,
        })),
      };

  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  if (options.skipInlineImage) {
    (
      event as ClipboardEvent & { skipInlineImagePasteFromOffice?: boolean }
    ).skipInlineImagePasteFromOffice = true;
  }
  return event;
}

function pngFile(): File {
  return new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
}

/** FileReader 是异步的，插入发生在下一拍 */
async function settle(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (editor?.getHTML().includes("<img")) return;
  }
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("什么时候让路", () => {
  it("没有 clipboardData 就不接管", () => {
    const target = createEditor();
    expect(handlePaste(target, pasteEvent({ noClipboardData: true }))).toBe(false);
  });

  it("剪贴板里没有图片就不接管", () => {
    const target = createEditor();
    const handled = handlePaste(
      target,
      pasteEvent({ items: [{ type: "text/plain", file: null }] }),
    );
    expect(handled).toBe(false);
  });

  it("item 声称是图片却拿不到文件时不接管（返回 true 会把内容吞掉）", () => {
    const target = createEditor();
    const handled = handlePaste(target, pasteEvent({ items: [{ type: "image/png", file: null }] }));
    expect(handled).toBe(false);
  });

  it("Office 结构化 HTML 让给 OfficePaste 流水线", () => {
    const target = createEditor();
    const handled = handlePaste(
      target,
      pasteEvent({
        items: [{ type: "image/png", file: pngFile() }],
        html: '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><p class="MsoNormal">x</p></body></html>',
      }),
    );
    expect(handled).toBe(false);
  });

  it("上游打了 skipInlineImagePasteFromOffice 标记时让路", () => {
    const target = createEditor();
    const handled = handlePaste(
      target,
      pasteEvent({ items: [{ type: "image/png", file: pngFile() }], skipInlineImage: true }),
    );
    expect(handled).toBe(false);
  });

  it("普通网页 HTML 不算 Office，图片照常接管", () => {
    const target = createEditor();
    const handled = handlePaste(
      target,
      pasteEvent({
        items: [{ type: "image/png", file: pngFile() }],
        html: "<p>来自网页的一段话</p>",
      }),
    );
    expect(handled).toBe(true);
  });
});

describe("接管之后", () => {
  it("把图片读成 data URL 插进文档", async () => {
    const target = createEditor();

    expect(
      handlePaste(target, pasteEvent({ items: [{ type: "image/png", file: pngFile() }] })),
    ).toBe(true);
    await settle();

    const html = target.getHTML();
    expect(html).toContain("<img");
    expect(html).toContain("data:image/png;base64,");
    expect(html, "原有内容不该被顶掉").toContain("原有内容");
  });

  it("图片替换掉当前选中的文字（走 replaceSelection）", async () => {
    const target = createEditor();
    target.commands.setTextSelection({ from: 1, to: 5 });

    handlePaste(target, pasteEvent({ items: [{ type: "image/png", file: pngFile() }] }));
    await settle();

    expect(target.getHTML()).toContain("<img");
    expect(target.state.doc.textContent).not.toContain("原有内");
  });

  it("多个 item 时取第一张图片", async () => {
    const target = createEditor();

    handlePaste(
      target,
      pasteEvent({
        items: [
          { type: "text/plain", file: null },
          { type: "image/png", file: pngFile() },
        ],
      }),
    );
    await settle();

    expect(target.getHTML()).toContain("<img");
  });
});
