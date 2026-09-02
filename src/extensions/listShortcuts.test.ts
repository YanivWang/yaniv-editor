// @vitest-environment jsdom

/**
 * `ListShortcuts` 的完整判定依据（源码里只留结论，长论证放这里——ESM 产物不压缩，
 * 主 chunk 源文件里的每行注释都直接吃 46000B 预算，见不变量 41）。
 *
 * **22 个场景的带 / 不带对照**（真实 `view.dom.dispatchEvent(keydown)` 派发）：
 * 三层嵌套无序 / 有序列表、嵌套任务项、列表项文本中间、空列表项、引用块、
 * 引用块内的列表、表格单元格、表格单元格内的列表、标题、普通段落，
 * 每个都跑 Enter 与 Shift-Enter。结果：
 *
 * - **20 个场景完全一致**——`Enter` 那条与 tiptap `ListItem` / `TaskItem` 内置的
 *   `splitListItem` 同义，只是抢先执行了一遍相同逻辑。
 * - **2 个场景有实质差异，都在代码块内的 Shift-Enter**：带本扩展时 `newlineInCode`
 *   成功、代码块内正确插入换行；摘掉后代码块内容**原封不动**，反而在文档末尾
 *   凭空多出一个空段落。
 *
 * 曾两次差点把这个扩展当冗余删掉：
 * 第一次是「带不带行为完全相同」——上 spy 才发现 handler 确实在执行
 * （「行为相同」≠「没有执行」）；
 * 第二次是手工模拟 keymap 调用链（自己遍历各扩展的 `addKeyboardShortcuts`）做对照，
 * 把上面那 2 个差异也漏掉了。结论只有走真实 DOM 派发才站得住。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { codeBlockLowlightExtension } from "@/extensions/codeBlockLowlight";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { ListShortcuts } from "./listShortcuts";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

const editors: Editor[] = [];

function makeEditor(content: string, withShortcuts = true): Editor {
  const el = document.createElement("div");
  document.body.append(el);
  const base = [StarterKit.configure({ codeBlock: false }), codeBlockLowlightExtension];
  const editor = new Editor({
    element: el,
    extensions: withShortcuts ? [...base, ListShortcuts] : base,
    content,
  });
  editors.push(editor);
  return editor;
}

/** 真实 DOM 派发——手工遍历各扩展的 addKeyboardShortcuts 得不到正确结果 */
function pressEnter(editor: Editor, shift: boolean): void {
  editor.view.dom.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      shiftKey: shift,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function selectAfter(editor: Editor, needle: string): void {
  let pos = -1;
  editor.state.doc.descendants((node, at) => {
    if (node.isText && node.text?.includes(needle)) {
      pos = at + node.text.indexOf(needle) + needle.length;
    }
  });
  expect(pos, `找不到文本 ${needle}`).toBeGreaterThan(0);
  editor.commands.setTextSelection(pos);
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

/** jsdom 里事件处理器抛出的异常不会冒泡到 dispatchEvent 的调用点，只会变成 window error */
function pressCapturingErrors(editor: Editor, shift: boolean): string[] {
  const errors: string[] = [];
  const onError = (event: ErrorEvent) => {
    errors.push(event.message || String(event.error));
    event.preventDefault();
  };
  window.addEventListener("error", onError);
  try {
    pressEnter(editor, shift);
  } catch (error) {
    errors.push((error as Error).message);
  } finally {
    window.removeEventListener("error", onError);
  }
  return errors;
}

/**
 * `first` 的候选项必须用回调注入的 `commands`。写成 `editor.commands.x()` 时它们会各自
 * 立即 dispatch，而外层 `first` 还持有一个基于旧 state 的 tr，收尾 dispatch 就抛
 * `RangeError: Applying a mismatched transaction`——换行本身是成功的，
 * 异常也不冒泡到按键处理器，所以文档看不出问题，只有控制台被刷屏。
 */
describe("Shift-Enter 不得抛未捕获异常", () => {
  it("代码块内按 Shift-Enter 不产生任何未捕获错误", () => {
    const editor = makeEditor("<pre><code>const a = 1;</code></pre>");
    selectAfter(editor, "const a = 1;");

    expect(pressCapturingErrors(editor, true)).toEqual([]);
  });

  it("普通段落里按 Shift-Enter 也不产生未捕获错误，且照常插入 hardBreak", () => {
    const editor = makeEditor("<p>段落</p>");
    selectAfter(editor, "段落");

    expect(pressCapturingErrors(editor, true)).toEqual([]);
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"hardBreak"');
  });
});

describe("代码块内的 Shift-Enter", () => {
  it("在代码块内插入换行，而不是跳出代码块", () => {
    const editor = makeEditor("<pre><code>const a = 1;</code></pre>");
    selectAfter(editor, "const a = 1;");

    pressEnter(editor, true);

    const json = editor.getJSON() as {
      content: { type: string; content?: { text?: string }[] }[];
    };
    const codeBlock = json.content.find((node) => node.type === "codeBlock");
    expect(codeBlock?.content?.[0]?.text).toBe("const a = 1;\n");
  });

  it("多行代码块里继续换行", () => {
    const editor = makeEditor("<pre><code>line1\nline2</code></pre>");
    selectAfter(editor, "line2");

    pressEnter(editor, true);

    const json = editor.getJSON() as {
      content: { type: string; content?: { text?: string }[] }[];
    };
    const codeBlock = json.content.find((node) => node.type === "codeBlock");
    expect(codeBlock?.content?.[0]?.text).toBe("line1\nline2\n");
  });

  it("摘掉本扩展后代码块换不了行，反而多出一个空段落（这就是它存在的理由）", () => {
    const editor = makeEditor("<pre><code>const a = 1;</code></pre>", false);
    selectAfter(editor, "const a = 1;");

    pressEnter(editor, true);

    const json = editor.getJSON() as {
      content: { type: string; content?: { text?: string }[] }[];
    };
    const codeBlock = json.content.find((node) => node.type === "codeBlock");
    // 代码块内容原封不动
    expect(codeBlock?.content?.[0]?.text).toBe("const a = 1;");
    // 文档尾部凭空多出来的段落
    expect(json.content.filter((node) => node.type === "paragraph")).toHaveLength(2);
  });
});

describe("列表内的 Enter", () => {
  it("嵌套列表二级项回车拆出同级新项", () => {
    const editor = makeEditor("<ul><li><p>一级</p><ul><li><p>二级</p></li></ul></li></ul>");
    selectAfter(editor, "二级");

    pressEnter(editor, false);

    // 内层 ul 现在有两个 li
    const html = editor.getHTML();
    expect(html.match(/<li>/g)?.length).toBe(3);
  });

  it("普通段落回车不受影响", () => {
    const editor = makeEditor("<p>段落</p>");
    selectAfter(editor, "段落");

    pressEnter(editor, false);

    const json = editor.getJSON() as { content: { type: string }[] };
    expect(json.content.filter((node) => node.type === "paragraph").length).toBeGreaterThan(1);
  });
});
