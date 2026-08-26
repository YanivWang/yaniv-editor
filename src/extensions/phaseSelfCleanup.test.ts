import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, test } from "vitest";
import { ref } from "vue";

import { withTransactionGuard } from "@/capabilities/transactionGuard";
import { FormatPainter } from "@/extensions/formatPainter";
import { SearchReplace } from "@/extensions/search-replace";

interface SearchStorage {
  searchTerm: string;
  replaceTerm: string;
  results: Array<{ from: number; to: number }>;
}

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** 与 buildExtensions 一致：interaction tier 会被包上事务守卫 */
function createEditor(isEditable = ref(true)) {
  return new Editor({
    extensions: [StarterKit, SearchReplace, withTransactionGuard(FormatPainter, isEditable)],
    content: "<p>alpha beta alpha</p><p>alpha</p>",
  });
}

function searchStorage(e: Editor): SearchStorage {
  return (e.storage as unknown as { searchReplace: SearchStorage }).searchReplace;
}

function painterStorage(e: Editor): { isActive: boolean; isContinuous: boolean } {
  return (e.storage as unknown as { formatPainter: { isActive: boolean; isContinuous: boolean } })
    .formatPainter;
}

/**
 * 状态归谁所有，清理就归谁：SearchReplace / FormatPainter 在自己的 plugin
 * `view.update` 里检测 `view.editable` 翻转后自清，不依赖 Shell 订阅 phase 事件
 * 或工具栏按钮的卸载路径。
 */
describe("扩展在退出编辑态时自清状态", () => {
  test("SearchReplace：切到只读后搜索词与命中高亮都被清空", () => {
    editor = createEditor();
    editor.commands.setSearchReplaceTerm("alpha");
    expect(searchStorage(editor).results.length).toBeGreaterThan(0);

    editor.setEditable(false);

    expect(searchStorage(editor).searchTerm).toBe("");
    expect(searchStorage(editor).results).toEqual([]);
  });

  test("FormatPainter：切到只读后激活态被复位", () => {
    editor = createEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.startFormatPainting();
    expect(painterStorage(editor).isActive).toBe(true);

    editor.setEditable(false);

    expect(painterStorage(editor).isActive).toBe(false);
  });

  /**
   * 锁住"清理只产生一次 dispatch"这一行为。
   *
   * 清理动作本身要 dispatch 才能重算装饰。实测 ProseMirror 不会因此同步重入本回调
   * （深度恒为 1），所以两层守卫（editable 翻转判定 + storage 空值判定）都是防御性的，
   * 而非阻止递归的必需品。这里断言深度，是为了让"清理变成多次 dispatch"这类回归
   * 立刻暴露出来。
   */
  test("清理只产生一次 dispatch（深度上限 1）", () => {
    editor = createEditor();
    editor.commands.setSearchReplaceTerm("alpha");

    let depth = 0;
    let maxDepth = 0;
    const original = editor.view.dispatch.bind(editor.view);
    (editor.view as unknown as { dispatch: typeof original }).dispatch = (tr) => {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
      try {
        return original(tr);
      } finally {
        depth -= 1;
      }
    };

    editor.setEditable(false);

    expect(maxDepth).toBe(1);
    expect(searchStorage(editor).searchTerm).toBe("");
  });

  test("反复来回切换 edit/preview 保持稳定", () => {
    editor = createEditor();

    for (let i = 0; i < 30; i += 1) {
      editor.commands.setSearchReplaceTerm("alpha");
      editor.setEditable(false);
      expect(searchStorage(editor).searchTerm).toBe("");
      editor.setEditable(true);
    }

    expect(searchStorage(editor).searchTerm).toBe("");
  });

  test("回到编辑态不会误触发清理（只在 true → false 时清）", () => {
    editor = createEditor();
    editor.setEditable(false);

    editor.setEditable(true);
    editor.commands.setSearchReplaceTerm("alpha");

    // 再次进入编辑态本身不应清掉刚设置的搜索词
    editor.setEditable(true);
    expect(searchStorage(editor).searchTerm).toBe("alpha");
  });

  test("preview 下格式刷残留状态无法改文档（事务守卫兜底）", () => {
    const isEditable = ref(true);
    editor = createEditor(isEditable);
    const before = editor.getHTML();

    isEditable.value = false;
    editor.setEditable(false);

    // 即便有代码路径绕过自清，interaction tier 的 filterTransaction 仍会拦掉写操作
    editor.commands.setContent("<p>hacked</p>");
    expect(editor.getHTML()).toBe(before);
  });
});
