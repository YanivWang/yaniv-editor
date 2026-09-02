// @vitest-environment jsdom

/**
 * 斜杠命令扩展的激活/关闭通知，重点锁「编辑器销毁时菜单必须收起」。
 *
 * 完整依据（源码里只留结论——ESM 产物不压缩，主 chunk 源文件的注释直接吃产物预算，
 * 见不变量 41）：
 *
 * `BlockPickerMenu` 挂在 EditorShell 的 overlay portal 上，**不随编辑器一起消失**。
 * `computeSessionKey` 变化（能力开关、locale 切换）会重建编辑器而 Shell 不卸载，
 * 此时若菜单正开着，插件的 `update` 再也不会被调用，它就永远停在旧光标位置上。
 *
 * ⚠️ 这件事**不能**写在 plugin view 的 `destroy()` 里：ProseMirror 在插件集合变化时
 * 会销毁并重建全部 plugin view（`updatePluginViews` → `destroyPluginViews`），
 * 而 `editor.registerPlugin()` 就走这条路——`@tiptap/vue-3` 挂气泡菜单时正好会调它。
 * 那样写会在每次注册插件时误发 `onDeactivate`，把 `blockMenuHost` 缓冲的 `pendingOpen`
 * 清掉，斜杠菜单**再也弹不出来**（实测打穿了 `BlockPickerMenu.test.ts`）。
 * `editor.isDestroyed` 也救不了：它在 plugin view 的 `destroy` 里三种路径下都还是 `false`。
 *
 * 扩展的 `onDestroy` 只在 `editor.destroy()` 时触发一次——实测 `registerPlugin` /
 * `unregisterPlugin` / `setEditable` / `setOptions` 都不触发，正是这里要的语义。
 */
import { Plugin, PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { SlashCommandExtension } from "./SlashCommandExtension";

beforeAll(() => {
  installBrowserStubs();
  // `view.coordsAtPos()` 在 jsdom 里会因缺 getClientRects 抛错，扩展的 update 路径要用到
  installLayoutStubs();
});

const editors: Editor[] = [];

function createEditor(options: {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onQueryChange?: (query: string) => void;
}): Editor {
  const host = document.createElement("div");
  document.body.append(host);
  const editor = new Editor({
    element: host,
    extensions: [StarterKit, SlashCommandExtension.configure(options)],
    content: "<p></p>",
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length) {
    const editor = editors.pop();
    if (editor && !editor.isDestroyed) editor.destroy();
  }
  document.body.innerHTML = "";
});

describe("SlashCommandExtension 的菜单通知", () => {
  it("编辑器销毁时通知菜单关闭", () => {
    let deactivated = 0;
    const editor = createEditor({ onDeactivate: () => (deactivated += 1) });

    // 敲 `/` 让菜单进入激活态
    editor.commands.insertContent("/");
    const before = deactivated;

    editor.destroy();

    expect(deactivated).toBeGreaterThan(before);
  });

  it("菜单未激活时销毁也会收到一次关闭通知（幂等，hide 可重复调用）", () => {
    let deactivated = 0;
    const editor = createEditor({ onDeactivate: () => (deactivated += 1) });
    const before = deactivated;

    editor.destroy();

    expect(deactivated).toBe(before + 1);
  });

  /**
   * 这条锁的是一个真踩过的坑。
   *
   * 未激活时 `update()` 每次都会调一次 `onDeactivate()`（幂等的 hide，设计如此），
   * 所以光数调用次数是数不出问题的——要在**菜单已激活**的状态下看。
   * 清理逻辑一旦写进 plugin view 的 `destroy()`，`editor.registerPlugin()`
   * （`@tiptap/vue-3` 挂气泡菜单时会调）就会让 ProseMirror 销毁重建全部 plugin view，
   * 于是在菜单正开着的时候误发一次 `onDeactivate`，把 `blockMenuHost` 缓冲的
   * `pendingOpen` 清掉——斜杠菜单再也弹不出来。
   */
  it("菜单激活期间注册插件不得误发关闭通知", () => {
    let deactivated = 0;
    let activated = 0;
    const editor = createEditor({
      onActivate: () => (activated += 1),
      onDeactivate: () => (deactivated += 1),
    });

    editor.commands.insertContent("/");
    expect(activated).toBeGreaterThan(0);
    const before = deactivated;

    editor.registerPlugin(new Plugin({ key: new PluginKey("probeLater") }));
    editor.unregisterPlugin("probeLater");

    expect(deactivated).toBe(before);
  });

  it("行首输入 / 会激活并带上查询词", () => {
    const queries: string[] = [];
    let activated = 0;
    const editor = createEditor({
      onActivate: () => (activated += 1),
      onQueryChange: (query) => queries.push(query),
    });

    editor.commands.insertContent("/h1");

    expect(activated).toBeGreaterThan(0);
    expect(queries.at(-1)).toBe("h1");
  });
});
