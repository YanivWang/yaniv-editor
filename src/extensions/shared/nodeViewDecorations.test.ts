import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { Callout } from "@/extensions/callout/CalloutExtension";
import { ToggleBlock } from "@/extensions/toggle/ToggleExtension";
import { YanivPlaceholder } from "@/extensions/yanivPlaceholder";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

function mount(nodeType: "toggleBlock" | "callout", text: string | null) {
  const element = document.createElement("div");
  document.body.appendChild(element);

  editor = new Editor({
    element,
    extensions: [
      StarterKit,
      ToggleBlock,
      Callout,
      YanivPlaceholder.configure({ includeChildren: true, placeholder: "PH" }),
    ],
    content: {
      type: "doc",
      content: [
        {
          type: nodeType,
          content: [
            text === null
              ? { type: "paragraph" }
              : { type: "paragraph", content: [{ type: "text", text }] },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "after" }] },
      ],
    },
  });

  const selector = nodeType === "toggleBlock" ? ".toggle-block" : ".callout-block";
  return { dom: element.querySelector(selector) as HTMLElement, e: editor };
}

const CONTAINERS = [
  ["toggleBlock", "toggle-block"],
  ["callout", "callout-block"],
] as const;

/**
 * 空态 placeholder 只有一个来源：`YanivPlaceholder` 下发的节点装饰。
 * toggle 曾经额外自己算一遍（扫 `extensionManager` 找 placeholder 扩展、硬传
 * `hasAnchor: true`），与 callout 的做法不一致；收敛到装饰后由这组用例锁住行为不变。
 */
describe("容器空态 placeholder 由节点装饰驱动", () => {
  it.each(CONTAINERS)("%s 空块带 is-empty + data-placeholder", (nodeType, baseClass) => {
    const { dom } = mount(nodeType, null);

    expect(dom.classList.contains(baseClass)).toBe(true);
    expect(dom.classList.contains("is-empty")).toBe(true);
    expect(dom.getAttribute("data-placeholder")).toBe("PH");
  });

  it.each(CONTAINERS)("%s 填入内容后撤掉 is-empty + data-placeholder", (nodeType, baseClass) => {
    const { dom, e } = mount(nodeType, null);
    e.commands.insertContentAt(2, "x");

    expect(dom.classList.contains(baseClass)).toBe(true);
    expect(dom.classList.contains("is-empty")).toBe(false);
    expect(dom.getAttribute("data-placeholder")).toBeNull();
  });

  it.each(CONTAINERS)("%s 非空块自始至终没有 placeholder", (nodeType, baseClass) => {
    const { dom } = mount(nodeType, "hi");

    expect(dom.classList.contains(baseClass)).toBe(true);
    expect(dom.classList.contains("is-empty")).toBe(false);
    expect(dom.getAttribute("data-placeholder")).toBeNull();
  });

  it("装饰同步不会抹掉 dom 上别人加的类", () => {
    const { dom, e } = mount("toggleBlock", null);
    dom.classList.add("host-owned");

    e.commands.insertContentAt(2, "x");

    expect(dom.classList.contains("host-owned")).toBe(true);
    expect(dom.classList.contains("is-empty")).toBe(false);
  });
});
