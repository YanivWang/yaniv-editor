import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { Mention } from "@/extensions/mention";

let editor: Editor | null = null;

function mount(content: unknown): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, Mention],
    content: content as string,
  });
  return editor;
}

function mentionNode(attrs: Record<string, unknown>) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "mention", attrs }] }],
  };
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

/**
 * 提及的内容属性必须以 `data-*` 输出。
 *
 * 用默认的属性渲染会把 `id` 写成 HTML **全局属性** `id="..."`：同一页面被提及两次
 * 就产生重复 DOM id，且提及 id 来自宿主数据，撞上宿主页面已有的 id 会劫持
 * `getElementById` / `:target`；`label` 也不是 `span` 的合法属性。
 */
describe("Mention 序列化", () => {
  it("不把 id / label 写成裸 HTML 属性", () => {
    mount(mentionNode({ id: "page-home", label: "首页", mentionType: "page" }));
    const span = document.querySelector('[data-type="mention"]')!;

    expect(span.hasAttribute("id")).toBe(false);
    expect(span.hasAttribute("label")).toBe(false);
    expect(span.getAttribute("data-id")).toBe("page-home");
    expect(span.getAttribute("data-label")).toBe("首页");
  });

  it("同一页面被提及两次不产生重复 DOM id", () => {
    const e = mount({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { id: "app", label: "首页", mentionType: "page" } },
            { type: "text", text: " / " },
            { type: "mention", attrs: { id: "app", label: "首页", mentionType: "page" } },
          ],
        },
      ],
    });

    expect(document.querySelectorAll('[data-type="mention"]')).toHaveLength(2);
    // 不得劫持宿主页面的 getElementById("app")
    expect(document.getElementById("app")).toBeNull();
    // 只允许 data-id，不允许裸的全局 id 属性
    expect(e.getHTML()).not.toMatch(/\sid="/);
  });

  it("JSON 属性完整往返", () => {
    const attrs = { id: "page-docs", label: "文档", href: "#docs", mentionType: "user" };
    const e = mount(mentionNode(attrs));

    const html = e.getHTML();
    e.commands.setContent(html);

    expect(e.getJSON().content?.[0]?.content?.[0]).toEqual({ type: "mention", attrs });
  });

  /** 历史内容同时带裸 id/label 与 data-*，换成只读 data-* 后仍须解析出同样的属性 */
  it("读得回旧版本写出的 HTML", () => {
    const legacy =
      '<p><span id="page-home" label="首页" href="#home" data-mention-type="page" ' +
      'data-type="mention" class="mention-pill" data-id="page-home" data-label="首页">@首页</span></p>';
    const e = mount(legacy);

    expect(e.getJSON().content?.[0]?.content?.[0]).toEqual({
      type: "mention",
      attrs: { id: "page-home", label: "首页", href: "#home", mentionType: "page" },
    });
  });
});
