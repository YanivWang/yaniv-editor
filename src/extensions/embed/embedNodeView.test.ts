import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { Embed } from "./index";

let editor: Editor | null = null;

function mountEmbed(attrs: Record<string, unknown>): { el: HTMLElement; e: Editor } {
  const element = document.createElement("div");
  document.body.appendChild(element);

  editor = new Editor({
    element,
    extensions: [StarterKit, Embed],
    content: { type: "doc", content: [{ type: "embed", attrs }] },
  });

  return { el: element, e: editor };
}

/** 直接改写文档里第 0 号节点的属性，模拟 `updateAttributes` / 协同 / 撤销重做 */
function patchEmbedAttrs(e: Editor, patch: Record<string, unknown>): void {
  e.view.dispatch(
    e.state.tr.setNodeMarkup(0, undefined, { ...e.state.doc.child(0).attrs, ...patch }),
  );
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

/**
 * `update()` 返回 `true` 表示节点视图自行处理了更新，ProseMirror 不再重建视图。
 * 因此渲染必须读「当前」节点：若沿用创建时捕获的 node，新属性永远画不出来。
 */
describe("Embed 节点视图跟随属性更新", () => {
  it("书签卡片的 url / 标题变化后重新渲染", () => {
    const { el, e } = mountEmbed({
      url: "https://old.example.com/",
      title: "OLD",
      provider: "bookmark",
    });

    patchEmbedAttrs(e, { url: "https://new.example.com/", title: "NEW" });

    expect(el.querySelector("a")!.getAttribute("href")).toBe("https://new.example.com/");
    expect(el.querySelector(".embed-block__title")!.textContent).toBe("NEW");
  });

  it("iframe 的 url 变化后换成新的播放地址", () => {
    const { el, e } = mountEmbed({
      url: "https://www.youtube.com/watch?v=OLDVID",
      provider: "iframe",
    });

    patchEmbedAttrs(e, { url: "https://www.youtube.com/watch?v=NEWVID" });

    expect(el.querySelector("iframe")!.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/NEWVID",
    );
  });

  it("provider 从 bookmark 切到 iframe 时用新 url 解析，而不是旧 url", () => {
    const { el, e } = mountEmbed({ url: "https://plain.example.com/", provider: "bookmark" });

    patchEmbedAttrs(e, { url: "https://www.youtube.com/watch?v=SWITCHED", provider: "iframe" });

    expect(el.querySelector("iframe")!.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/SWITCHED",
    );
  });

  /** 旧实现会保留原 YouTube iframe（连同 allow-same-origin），与文档内容不符 */
  it("已渲染的 iframe 被改成不可嵌入地址后降级为不可点击的书签", () => {
    const { el, e } = mountEmbed({
      url: "https://www.youtube.com/watch?v=VID",
      provider: "iframe",
    });

    patchEmbedAttrs(e, { url: "javascript:alert(1)" });

    expect(el.querySelector("iframe")).toBeNull();
    expect(el.querySelector(".embed-block__bookmark")).not.toBeNull();
    expect(el.querySelector("a")!.hasAttribute("href")).toBe(false);
  });

  it("包裹元素上的属性镜像跟随更新，属性被清空时移除而不是残留旧值", () => {
    const { el, e } = mountEmbed({
      url: "https://a.example.com/",
      image: null,
      provider: "bookmark",
    });
    const wrapper = el.querySelector(".embed-wrapper")!;

    patchEmbedAttrs(e, { image: "https://a.example.com/pic.png" });
    expect(el.querySelector(".embed-block__image")!.getAttribute("src")).toBe(
      "https://a.example.com/pic.png",
    );
    expect(wrapper.getAttribute("image")).toBe("https://a.example.com/pic.png");

    patchEmbedAttrs(e, { image: null });
    expect(el.querySelector(".embed-block__image")).toBeNull();
    expect(wrapper.hasAttribute("image")).toBe(false);
  });
});
