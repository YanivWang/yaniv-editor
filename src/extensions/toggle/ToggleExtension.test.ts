import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { ToggleBlock } from "./ToggleExtension";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

function mountToggle(getLocaleText?: (key: string) => string) {
  const element = document.createElement("div");
  document.body.appendChild(element);

  editor = new Editor({
    element,
    extensions: [StarterKit, ToggleBlock.configure({ getLocaleText })],
    content: {
      type: "doc",
      content: [
        {
          type: "toggleBlock",
          content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
        },
      ],
    },
  });

  return { chevron: element.querySelector(".toggle-block__chevron") as HTMLElement, e: editor };
}

/**
 * 折叠块的箭头是 disclosure 控件。它曾经硬编码 `aria-label="Toggle"`——
 * 全仓唯一一个没走 locale 的 aria-label——且没有 `aria-expanded`，
 * 读屏用户既听不到本地化名称，也听不出当前是展开还是收起。
 */
describe("折叠块箭头的无障碍属性", () => {
  it("aria-label 取实例 locale", () => {
    const { chevron } = mountToggle((key) =>
      key === "slashCommand.toggleBlock" ? "折叠列表" : key,
    );

    expect(chevron.getAttribute("aria-label")).toBe("折叠列表");
  });

  it("未注入 locale 时退回 key，不写死英文", () => {
    const { chevron } = mountToggle();

    expect(chevron.getAttribute("aria-label")).toBe("slashCommand.toggleBlock");
  });

  it("aria-expanded 跟随展开态", () => {
    const { chevron, e } = mountToggle();
    expect(chevron.getAttribute("aria-expanded")).toBe("true");

    e.view.dispatch(e.state.tr.setNodeMarkup(0, undefined, { open: false }));

    expect(chevron.getAttribute("aria-expanded")).toBe("false");
  });
});
