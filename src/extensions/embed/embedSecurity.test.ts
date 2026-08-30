import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { Embed } from "./index";

let editor: Editor | null = null;

function mountEditorWithEmbed(attrs: Record<string, unknown>): HTMLElement {
  const element = document.createElement("div");
  document.body.appendChild(element);

  editor = new Editor({
    element,
    extensions: [StarterKit, Embed],
    content: { type: "doc", content: [{ type: "embed", attrs }] },
  });

  return element;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

/**
 * `provider` 是节点属性，可由粘贴的 JSON 或 `setEmbed({ provider: "iframe" })` 直接指定，
 * 因此域名判断不是安全边界 —— 真正的边界是 `normalizeSafeFrameUrl`。
 */
describe("Embed 节点的 iframe 安全性", () => {
  it("合法 https 源渲染 iframe，并带 sandbox 与收窄的 allow", () => {
    const el = mountEditorWithEmbed({
      url: "https://www.youtube.com/watch?v=abc123",
      provider: "iframe",
    });

    const iframe = el.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute("src")).toBe("https://www.youtube.com/embed/abc123");

    const sandbox = iframe!.getAttribute("sandbox");
    expect(sandbox).toBeTruthy();
    expect(sandbox).not.toContain("allow-top-navigation");
    expect(sandbox).not.toContain("allow-forms");
    expect(sandbox).not.toContain("allow-modals");

    const allow = iframe!.getAttribute("allow") ?? "";
    for (const removed of ["accelerometer", "gyroscope", "clipboard-write"]) {
      expect(allow).not.toContain(removed);
    }
    expect(iframe!.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
  });

  it("provider 被强指为 iframe 但 URL 是 javascript: 时降级为书签卡片", () => {
    const el = mountEditorWithEmbed({
      url: "javascript:alert(1)",
      provider: "iframe",
      title: "evil",
    });

    expect(el.querySelector("iframe")).toBeNull();
    expect(el.querySelector(".embed-block__bookmark")).not.toBeNull();
  });

  it("data: URL 同样不能进入 iframe", () => {
    const el = mountEditorWithEmbed({
      url: "data:text/html,<script>alert(1)</script>",
      provider: "iframe",
    });
    expect(el.querySelector("iframe")).toBeNull();
  });

  it("书签卡片对危险 href 不设置链接（不可点击）", () => {
    const el = mountEditorWithEmbed({ url: "javascript:alert(1)", provider: "bookmark" });

    const card = el.querySelector<HTMLAnchorElement>(".embed-block__bookmark");
    expect(card).not.toBeNull();
    expect(card!.hasAttribute("href")).toBe(false);
  });

  it("书签卡片的合法链接带 noopener noreferrer", () => {
    const el = mountEditorWithEmbed({ url: "https://example.com", provider: "bookmark" });

    const card = el.querySelector<HTMLAnchorElement>(".embed-block__bookmark");
    expect(card!.getAttribute("href")).toBe("https://example.com/");
    expect(card!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("书签卡片过滤危险的图片地址", () => {
    const el = mountEditorWithEmbed({
      url: "https://example.com",
      image: "javascript:alert(1)",
      provider: "bookmark",
    });
    expect(el.querySelector(".embed-block__image")).toBeNull();
  });
});
