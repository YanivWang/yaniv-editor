import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { SearchReplace } from "./searchReplace";

import type { SearchReplaceOptions } from "./searchReplace";

type Storage = {
  searchTerm: string;
  replaceTerm: string;
  results: Array<{ from: number; to: number }>;
  resultIndex: number;
};

let editor: Editor | null = null;

function mount(content: string, options: Partial<SearchReplaceOptions> = {}): Editor {
  editor = new Editor({
    extensions: [StarterKit, SearchReplace.configure(options)],
    content,
  });
  return editor;
}

function storageOf(ed: Editor): Storage {
  return (ed.storage as unknown as { searchReplace: Storage }).searchReplace;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("SearchReplace —— 默认字面量模式", () => {
  it("正则元字符按字面量匹配", () => {
    const ed = mount("<p>hello (world) hello</p>");
    ed.commands.setSearchReplaceTerm("(world)");
    expect(storageOf(ed).results).toHaveLength(1);
  });

  it("匹配可以跨越 mark 边界", () => {
    const ed = mount("<p>foo<strong>bar</strong></p>");
    ed.commands.setSearchReplaceTerm("ooba");

    const [hit] = storageOf(ed).results;
    expect(hit).toBeDefined();
    // 位置必须落在真实文档坐标上，而不是拼接字符串的下标
    expect(ed.state.doc.textBetween(hit.from, hit.to)).toBe("ooba");
  });

  it("匹配不跨越块边界", () => {
    const ed = mount("<p>foo</p><p>bar</p>");
    ed.commands.setSearchReplaceTerm("foobar");
    expect(storageOf(ed).results).toHaveLength(0);
  });

  it("大小写敏感开关生效", () => {
    const ed = mount("<p>Hello hello</p>");
    ed.commands.setSearchReplaceTerm("hello");
    expect(storageOf(ed).results).toHaveLength(2);

    ed.commands.setSearchReplaceCaseSensitive(true);
    expect(storageOf(ed).results).toHaveLength(1);
  });
});

describe("SearchReplace —— 正则模式（disableRegex: false）", () => {
  it("合法正则按正则匹配", () => {
    const ed = mount("<p>hello hello</p>", { disableRegex: false });
    ed.commands.setSearchReplaceTerm("h(e)llo");
    expect(storageOf(ed).results).toHaveLength(2);
  });

  it("半截正则不抛错，按无命中处理", () => {
    const ed = mount("<p>hello</p>", { disableRegex: false });

    // 回归：此前 RegExp() 的 SyntaxError 会从插件 apply 里抛出来打断整条 transaction
    expect(() => ed.commands.setSearchReplaceTerm("(")).not.toThrow();
    expect(storageOf(ed).results).toHaveLength(0);
  });

  it("坏搜索词不会卡死后续的正常编辑", () => {
    const ed = mount("<p>hello</p>", { disableRegex: false });
    ed.commands.setSearchReplaceTerm("(");

    // 回归：坏词已存进 storage，此后**每一次**事务都会重新编译它再抛一次，
    // 于是正文里打字也一起失败，编辑器被卡死。
    expect(() => ed.commands.insertContentAt(1, "X")).not.toThrow();
    expect(ed.getText()).toBe("Xhello");

    // 敲完整之后应恢复正常匹配
    ed.commands.setSearchReplaceTerm("(h)");
    expect(storageOf(ed).results).toHaveLength(1);
  });
});

describe("SearchReplace —— 替换", () => {
  it("replaceAll 从后往前替换，位置不串位", () => {
    const ed = mount("<p>a foo b foo c</p>");
    ed.commands.setSearchReplaceTerm("foo");
    ed.commands.setSearchReplaceReplaceTerm("longer-replacement");
    ed.commands.searchReplaceReplaceAll();

    expect(ed.getText()).toBe("a longer-replacement b longer-replacement c");
  });

  it("replaceCurrent 只替换当前命中", () => {
    const ed = mount("<p>foo foo</p>");
    ed.commands.setSearchReplaceTerm("foo");
    ed.commands.setSearchReplaceReplaceTerm("bar");
    ed.commands.searchReplaceReplaceCurrent();

    expect(ed.getText()).toBe("bar foo");
  });

  it("无命中时 replaceAll / replaceCurrent 返回 false", () => {
    const ed = mount("<p>hello</p>");
    ed.commands.setSearchReplaceTerm("nope");
    expect(ed.commands.searchReplaceReplaceAll()).toBe(false);
    expect(ed.commands.searchReplaceReplaceCurrent()).toBe(false);
  });
});

describe("SearchReplace —— 命中导航", () => {
  it("findNext 走到末尾后回到第一个", () => {
    const ed = mount("<p>x x x</p>");
    ed.commands.setSearchReplaceTerm("x");
    expect(storageOf(ed).results).toHaveLength(3);

    ed.commands.searchReplaceFindNext();
    expect(storageOf(ed).resultIndex).toBe(1);
    ed.commands.searchReplaceFindNext();
    expect(storageOf(ed).resultIndex).toBe(2);
    ed.commands.searchReplaceFindNext();
    expect(storageOf(ed).resultIndex).toBe(0);
  });

  it("findPrevious 从第一个回卷到最后一个", () => {
    const ed = mount("<p>x x x</p>");
    ed.commands.setSearchReplaceTerm("x");
    ed.commands.searchReplaceFindPrevious();
    expect(storageOf(ed).resultIndex).toBe(2);
  });
});

describe("SearchReplace —— 退出编辑态自清理", () => {
  it("editable 由 true 变 false 时清空搜索状态", () => {
    const ed = mount("<p>hello</p>");
    ed.commands.setSearchReplaceTerm("hello");
    ed.commands.setSearchReplaceReplaceTerm("bye");
    expect(storageOf(ed).results).toHaveLength(1);

    ed.setEditable(false);

    expect(storageOf(ed).searchTerm).toBe("");
    expect(storageOf(ed).replaceTerm).toBe("");
    expect(storageOf(ed).results).toHaveLength(0);
  });
});
