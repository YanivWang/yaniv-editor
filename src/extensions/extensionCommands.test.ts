import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { FormatPainter } from "@/extensions/formatPainter";
import { SearchReplace } from "@/extensions/search-replace";
import { ToggleBlock } from "@/extensions/toggle";
import { Video } from "@/extensions/video";

import type { Content, AnyExtension } from "@tiptap/core";

let editor: Editor | null = null;

function mount(extensions: AnyExtension[], content: Content = "<p>hello world</p>"): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({ element, extensions: [StarterKit, ...extensions], content });
  return editor;
}

/** 把光标选区设到指定绝对区间 */
function select(e: Editor, from: number, to: number): void {
  const tr = e.state.tr.setSelection(TextSelection.create(e.state.doc, from, to));
  e.view.dispatch(tr);
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("Video 节点", () => {
  it("setVideo 插入带 src 的节点", () => {
    const e = mount([Video]);
    expect(e.commands.setVideo({ src: "https://cdn.example.com/a.mp4" })).toBe(true);

    const json = JSON.stringify(e.getJSON());
    expect(json).toContain('"type":"video"');
    expect(json).toContain("a.mp4");
  });

  it("尺寸属性写入节点", () => {
    const e = mount([Video]);
    e.commands.setVideo({ src: "https://cdn.example.com/a.mp4", width: 640, height: 360 });

    const video = e.getJSON().content?.find((n) => n.type === "video");
    expect(video?.attrs?.width).toBe(640);
    expect(video?.attrs?.height).toBe(360);
  });

  it("渲染为带 controls 的 video 标签", () => {
    const e = mount([Video]);
    e.commands.setVideo({ src: "https://cdn.example.com/a.mp4" });

    const html = e.getHTML();
    expect(html).toContain("<video");
    expect(html).toContain("controls");
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x"])(
    "危险协议 %s 不会进入渲染结果（节点层白名单）",
    (src) => {
      const e = mount([Video]);
      e.commands.setVideo({ src });
      expect(e.getHTML()).not.toContain(src);
    },
  );

  it("匹配类型的 data: 与相对路径放行", () => {
    const e = mount([Video]);
    e.commands.setVideo({ src: "data:video/mp4;base64,AAA" });
    expect(e.getHTML()).toContain("data:video/mp4");
  });

  it("HTML 往返保持节点类型", () => {
    const e = mount([Video]);
    e.commands.setVideo({ src: "https://cdn.example.com/a.mp4" });
    const html = e.getHTML();

    const e2 = mount([Video], html);
    expect(JSON.stringify(e2.getJSON())).toContain('"type":"video"');
  });
});

describe("ToggleBlock 折叠块", () => {
  it("setToggleBlock 插入折叠块", () => {
    const e = mount([ToggleBlock]);
    expect(e.commands.setToggleBlock()).toBe(true);
    expect(JSON.stringify(e.getJSON())).toContain('"type":"toggleBlock"');
  });

  /** toggleToggleOpen 从光标向上找折叠块，因此必须先把光标放进去 */
  function placeCursorInsideToggle(e: Editor): void {
    let inside = -1;
    e.state.doc.descendants((node, pos) => {
      if (node.type.name === "toggleBlock" && inside < 0) inside = pos + 2;
    });
    expect(inside).toBeGreaterThan(0);
    e.commands.setTextSelection(inside);
  }

  it("默认展开，toggleToggleOpen 翻转 open 属性", () => {
    const e = mount([ToggleBlock]);
    e.commands.setToggleBlock();
    placeCursorInsideToggle(e);

    const openOf = () =>
      e.getJSON().content?.find((n) => n.type === "toggleBlock")?.attrs?.open as boolean;
    expect(openOf()).toBe(true);

    e.commands.toggleToggleOpen();
    expect(openOf()).toBe(false);

    e.commands.toggleToggleOpen();
    expect(openOf()).toBe(true);
  });

  it("折叠态写进 HTML 的 data-open", () => {
    const e = mount([ToggleBlock]);
    e.commands.setToggleBlock();
    placeCursorInsideToggle(e);
    e.commands.toggleToggleOpen();

    expect(e.getHTML()).toContain('data-open="false"');
  });

  it("光标不在折叠块内时 toggleToggleOpen 返回 false", () => {
    const e = mount([ToggleBlock], "<p>plain</p>");
    expect(e.commands.toggleToggleOpen()).toBe(false);
  });
});

describe("FormatPainter 格式刷", () => {
  const content = "<p><strong>bold text</strong> plain text</p>";

  it("空选区不能采样", () => {
    const e = mount([FormatPainter], content);
    expect(e.commands.startFormatPainting()).toBe(false);
    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isActive,
    ).toBe(false);
  });

  it("有选区时采样成功并进入激活态", () => {
    const e = mount([FormatPainter], content);
    select(e, 1, 5);

    expect(e.commands.startFormatPainting()).toBe(true);
    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isActive,
    ).toBe(true);
    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isContinuous,
    ).toBe(false);
  });

  it("mode=2 与 startContinuousFormatPainting 都进入连续模式", () => {
    const e = mount([FormatPainter], content);
    select(e, 1, 5);
    e.commands.startFormatPainting(2);
    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isContinuous,
    ).toBe(true);

    e.commands.cancelFormatPainting();
    select(e, 1, 5);
    e.commands.startContinuousFormatPainting();
    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isContinuous,
    ).toBe(true);
  });

  it("cancelFormatPainting 清空激活态", () => {
    const e = mount([FormatPainter], content);
    select(e, 1, 5);
    e.commands.startFormatPainting();
    e.commands.cancelFormatPainting();

    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isActive,
    ).toBe(false);
  });

  it("采样保存的格式包含加粗信息", () => {
    const e = mount([FormatPainter], content);
    select(e, 1, 10);
    e.commands.startFormatPainting();

    const formats = (
      e.storage as unknown as Record<
        string,
        { isActive: boolean; isContinuous: boolean; formats: unknown }
      >
    ).formatPainter.formats as { marks?: unknown[] } | null;
    expect(formats).not.toBeNull();
    expect(JSON.stringify(formats)).toContain("bold");
  });

  it("cancelFormatPainting 后再次采样可切换模式", () => {
    const e = mount([FormatPainter], content);
    select(e, 1, 10);
    e.commands.startFormatPainting(2);
    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isContinuous,
    ).toBe(true);

    e.commands.cancelFormatPainting();
    select(e, 1, 10);
    e.commands.startFormatPainting();
    expect(
      (
        e.storage as unknown as Record<
          string,
          { isActive: boolean; isContinuous: boolean; formats: unknown }
        >
      ).formatPainter.isContinuous,
    ).toBe(false);
  });
});

describe("SearchReplace 查找替换", () => {
  const content = "<p>alpha beta alpha gamma alpha</p>";

  function storage(e: Editor) {
    return (e.storage as unknown as Record<string, unknown>).searchReplace as {
      results: unknown[];
      resultIndex: number;
      searchTerm: string;
    };
  }

  it("设置搜索词后命中全部结果", () => {
    const e = mount([SearchReplace], content);
    e.commands.setSearchReplaceTerm("alpha");

    expect(storage(e).results).toHaveLength(3);
  });

  it("空搜索词清空结果", () => {
    const e = mount([SearchReplace], content);
    e.commands.setSearchReplaceTerm("alpha");
    e.commands.setSearchReplaceTerm("");

    expect(storage(e).results).toHaveLength(0);
  });

  it("findNext / findPrevious 在结果间循环", () => {
    const e = mount([SearchReplace], content);
    e.commands.setSearchReplaceTerm("alpha");

    const start = storage(e).resultIndex;
    e.commands.searchReplaceFindNext();
    expect(storage(e).resultIndex).not.toBe(start);

    e.commands.searchReplaceFindPrevious();
    expect(storage(e).resultIndex).toBe(start);
  });

  it("大小写敏感开关改变命中数", () => {
    const e = mount([SearchReplace], "<p>Alpha alpha ALPHA</p>");

    e.commands.setSearchReplaceTerm("alpha");
    const insensitive = storage(e).results.length;

    e.commands.setSearchReplaceCaseSensitive(true);
    expect(storage(e).results.length).toBeLessThan(insensitive);
  });

  it("replaceCurrent 只替换一处", () => {
    const e = mount([SearchReplace], content);
    e.commands.setSearchReplaceTerm("alpha");
    e.commands.setSearchReplaceReplaceTerm("ALPHA");
    e.commands.searchReplaceReplaceCurrent();

    const text = e.getText();
    expect(text).toContain("ALPHA");
    expect(text.match(/alpha/g)?.length).toBe(2);
  });

  it("replaceAll 替换全部", () => {
    const e = mount([SearchReplace], content);
    e.commands.setSearchReplaceTerm("alpha");
    e.commands.setSearchReplaceReplaceTerm("X");
    e.commands.searchReplaceReplaceAll();

    expect(e.getText()).not.toContain("alpha");
  });

  it("无命中时替换是安全的空操作", () => {
    const e = mount([SearchReplace], content);
    e.commands.setSearchReplaceTerm("nomatch");
    e.commands.setSearchReplaceReplaceTerm("X");

    expect(() => e.commands.searchReplaceReplaceAll()).not.toThrow();
    expect(e.getText()).toContain("alpha");
  });

  it("resetSearchReplaceIndex 把游标归零", () => {
    const e = mount([SearchReplace], content);
    e.commands.setSearchReplaceTerm("alpha");
    e.commands.searchReplaceFindNext();
    e.commands.resetSearchReplaceIndex();

    expect(storage(e).resultIndex).toBe(0);
  });
});
