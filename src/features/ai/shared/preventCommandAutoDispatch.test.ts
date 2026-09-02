// @vitest-environment jsdom

/**
 * AI 命令自己走 `view.dispatch` 提交事务，必须拦住 tiptap 的 CommandManager
 * 在命令返回后再提交一次命令初始的那个 `tr`——否则抛
 * `RangeError: Applying a mismatched transaction`（不变量 39）。
 *
 * ⚠️ 那个异常**不冒泡**到按键处理器，控制台之外看不出来，功能表面上还正常。
 * 所以这里既验 meta 名对不对，也走真实命令链验一次「不再抛」。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { preventCommandAutoDispatch } from "./preventCommandAutoDispatch";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

let editor: Editor | null = null;

function createEditor(): Editor {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({ element: el, extensions: [StarterKit], content: "<p>甲乙丙</p>" });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("preventCommandAutoDispatch", () => {
  it("设的是 tiptap 认得的那个 meta 名", () => {
    const target = createEditor();
    const tr = target.state.tr;

    preventCommandAutoDispatch(tr);

    // 名字拼错不会报错，只会让守卫失效——所以必须把它钉住
    expect(tr.getMeta("preventDispatch")).toBe(true);
  });

  it("命令里自行 dispatch 之后加这个 meta，CommandManager 不再二次提交", () => {
    const target = createEditor();
    const before = target.state.doc.textContent;

    const applied = target.commands.command(({ tr, state, view }) => {
      // 模拟 AI 命令：自己派发一个事务，再把命令初始的 tr 标记成不要提交
      view.dispatch(state.tr.insertText("X", 1));
      preventCommandAutoDispatch(tr);
      return true;
    });

    expect(applied).toBe(true);
    expect(target.state.doc.textContent).toBe(`X${before}`);
  });

  it("不加这个 meta 时，tiptap 会再提交一次过期的 tr 并抛 mismatched transaction", () => {
    const target = createEditor();

    /**
     * 这条是守卫存在的**理由**，不是重复断言：把它写下来，将来 tiptap 若不再抛，
     * 这条会红，那时才好判断守卫是否还必要——而不是让守卫变成没人敢动的遗留代码。
     *
     * 这里 `toThrow` 抓得到，是因为走的是直接调用而不是事件处理器
     * （jsdom 里事件处理器抛的错不冒泡到 dispatch 的调用点，那种场景 `toThrow` 恒真）。
     */
    expect(() => {
      target.commands.command(({ state, view }) => {
        view.dispatch(state.tr.insertText("X", 1));
        return true;
      });
    }).toThrow(/mismatched transaction/);
  });
});
