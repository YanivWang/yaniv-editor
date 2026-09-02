import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { insertBlockMentionAt } from "@/components/tools/block-menu/blockMenuActions";
import { Mention, resolveMentionItems, type MentionItem } from "@/extensions/mention";

/**
 * 回归护栏：`getSuggestionItems` 必须真的被消费。
 *
 * 此前这个 option 叫 `suggestionItems`，声明了、给了默认值，但**没有任何读取方**——
 * 候选菜单直接调 `getMentionSuggestions(query)` 吃内置占位数据，宿主怎么配都没用。
 * 下面的用例把「宿主注入 → 菜单与块菜单都用上」这条链路钉死。
 */

let editor: Editor | null = null;

function mount(options?: Parameters<typeof Mention.configure>[0]): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, options ? Mention.configure(options) : Mention],
    content: "<p></p>",
  });
  return editor;
}

const HOST_ITEMS: MentionItem[] = [
  { id: "u-1", label: "Ada Lovelace", href: "/people/ada", type: "user" },
  { id: "p-1", label: "Release plan", href: "/pages/release", type: "page" },
];

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("resolveMentionItems", () => {
  it("未注入时回退到内置占位数据", () => {
    const items = resolveMentionItems(mount());
    expect(items.length).toBeGreaterThan(0);
    expect(items.map((item) => item.id)).toContain("page-docs");
  });

  it("宿主注入后返回宿主数据", () => {
    const items = resolveMentionItems(mount({ getSuggestionItems: () => HOST_ITEMS }));
    expect(items).toEqual(HOST_ITEMS);
  });

  it("每次调用现取 —— 宿主换数据后无需重建 session", () => {
    let current = HOST_ITEMS;
    const e = mount({ getSuggestionItems: () => current });
    expect(resolveMentionItems(e)[0].label).toBe("Ada Lovelace");

    current = [{ id: "u-2", label: "Grace Hopper", type: "user" }];
    expect(resolveMentionItems(e)[0].label).toBe("Grace Hopper");
  });

  it("返回空数组视为未注入，仍回退内置数据", () => {
    const items = resolveMentionItems(mount({ getSuggestionItems: () => [] }));
    expect(items.map((item) => item.id)).toContain("page-docs");
  });

  it("editor 为空或已销毁时不抛错", () => {
    const e = mount({ getSuggestionItems: () => HOST_ITEMS });
    e.destroy();
    expect(resolveMentionItems(e).map((item) => item.id)).toContain("page-docs");
    expect(resolveMentionItems(null).map((item) => item.id)).toContain("page-docs");
  });
});

describe("块菜单的「页面链接」", () => {
  it("默认插入宿主候选项的第一条，而不是写死的占位项", () => {
    const e = mount({ getSuggestionItems: () => HOST_ITEMS });
    insertBlockMentionAt(e, 0);

    const json = JSON.stringify(e.getJSON());
    expect(json).toContain("Ada Lovelace");
    expect(json).not.toContain("page-docs");
  });
});
