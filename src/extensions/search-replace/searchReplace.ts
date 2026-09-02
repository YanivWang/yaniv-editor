/**
 * Find / Replace — 简化自 Umo search-replace 思路（ProseMirror 装饰高亮）
 */
import { Extension, type Editor } from "@tiptap/core";
import { EditorState, Plugin, PluginKey, TextSelection, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const searchReplacePluginKey = new PluginKey("yanivSearchReplace");

const META_FORCE = "yanivSearchReplaceForce";

type SearchReplaceStorage = {
  searchTerm: string;
  replaceTerm: string;
  results: Array<{ from: number; to: number }>;
  lastSearchTerm: string;
  caseSensitive: boolean;
  lastCaseSensitive: boolean;
  resultIndex: number;
  lastResultIndex: number;
};

/**
 * 编译搜索词；**模式非法时返回 `null` 而不是抛错**。
 *
 * `disableRegex: false`（宿主开启正则搜索）时，搜索词直接来自输入框，用户敲出
 * `(foo)` 的过程中必然经过 `(` 这样的半截模式。此前这里让 `RegExp()` 直接抛
 * `SyntaxError`：它是在插件的 `apply` 里被调用的，于是**整条 transaction 都失败**；
 * 更糟的是坏搜索词已经存进 storage，此后**每一次**事务（包括正文里正常打字）
 * 都会重新走到这里再抛一次——编辑器被卡死到搜索词碰巧重新合法为止。
 *
 * 非法模式按「无命中」处理，与主流编辑器的正则搜索行为一致。
 */
function getRegex(s: string, disableRegex: boolean, caseSensitive: boolean): RegExp | null {
  try {
    return RegExp(
      disableRegex ? s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : s,
      caseSensitive ? "gu" : "gui",
    );
  } catch {
    return null;
  }
}

function processSearches(
  doc: EditorState["doc"],
  pattern: RegExp,
  searchResultClass: string,
  resultIndex: number,
): { decorationsToReturn: DecorationSet; results: Array<{ from: number; to: number }> } {
  const decorations: Decoration[] = [];
  const results: Array<{ from: number; to: number }> = [];

  const textNodesWithPosition: { text: string; pos: number }[] = [];
  let index = 0;

  doc.descendants((node, pos) => {
    if (node.isText) {
      const last = textNodesWithPosition[index];
      if (last) last.text += node.text ?? "";
      else textNodesWithPosition[index] = { text: node.text ?? "", pos };
    } else {
      index += 1;
    }
  });

  for (const element of textNodesWithPosition) {
    if (!element) continue;
    const { text, pos } = element;
    const matches = Array.from(text.matchAll(pattern)).filter(([matchText]) => matchText.trim());

    for (const m of matches) {
      if (m[0] === "") break;
      const startIdx = m.index;
      if (startIdx !== undefined) {
        results.push({ from: pos + startIdx, to: pos + startIdx + m[0].length });
      }
    }
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const className =
      i === resultIndex ? `${searchResultClass} ${searchResultClass}-current` : searchResultClass;
    decorations.push(Decoration.inline(r.from, r.to, { class: className }));
  }

  return { decorationsToReturn: DecorationSet.create(doc, decorations), results };
}

function bumpTransaction(state: EditorState): Transaction {
  return state.tr.setMeta(searchReplacePluginKey, { [META_FORCE]: Date.now() });
}

/** 命令回调拿到的那部分 props（只用得到这三个） */
interface SearchCommandProps {
  editor: Editor;
  tr: Transaction;
  dispatch?: (tr: Transaction) => void;
}

/**
 * 把选区落到命中上，并把焦点还给正文。
 *
 * ⚠️ **必须写在命令自己的 `tr` 上，不能在命令内部调 `editor.commands.*`。**
 * `editor.commands.X()` 会从当前 state 现造一个 transaction 并**无条件派发**
 * （见 tiptap `CommandManager` 的 `commands` getter），而外层命令的 tr 是在回调
 * 开始之前就造好的、回调返回后才派发——它带着**回调开始那一刻的选区**，
 * 会把内层刚设好的选区原样盖回去（doc 没变，所以也不会报 mismatched transaction）。
 *
 * 真实浏览器实证（Playwright / Chromium）：修复前点「下一处」「上一处」「替换」，
 * `storage.resultIndex` 与高亮都换到了下一处，选区却纹丝不动
 * ——命中在 263–268，光标始终停在 1。
 */
function focusSearchHit(
  { editor, tr, dispatch }: SearchCommandProps,
  hit: { from: number; to: number },
  scroll: boolean,
): boolean {
  // can() 探测模式：tr 是共享的，写进去会污染真正执行的那条命令
  if (!dispatch) return true;
  if (hit.to > tr.doc.content.size) return false;

  tr.setSelection(TextSelection.create(tr.doc, hit.from, hit.to));
  if (scroll) tr.scrollIntoView();

  /**
   * DOM 焦点不属于事务：本 tr 要等命令回调返回后才由运行器派发，此刻抢焦点
   * 只会把**旧**选区写进 DOM。放到下一帧，等 tr 落地之后再要回来。
   * （tiptap 自己的 `focus()` 命令同样走 rAF，理由一样。）
   */
  requestAnimationFrame(() => {
    if (editor.isDestroyed || !editor.view.dom.isConnected) return;
    editor.view.focus();
  });
  return true;
}

export interface SearchReplaceOptions {
  disableRegex: boolean;
  searchResultClass: string;
  /**
   * 查找上一处/下一处、选中当前命中后是否滚入视口；默认 true。
   * 若由宿主接管滚动可设 false。
   */
  scrollIntoViewOnNavigate: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    setSearchReplaceTerm: {
      setSearchReplaceTerm: (term: string) => ReturnType;
    };
    setSearchReplaceReplaceTerm: {
      setSearchReplaceReplaceTerm: (replace: string) => ReturnType;
    };
    setSearchReplaceCaseSensitive: {
      setSearchReplaceCaseSensitive: (v: boolean) => ReturnType;
    };
    resetSearchReplaceIndex: {
      resetSearchReplaceIndex: () => ReturnType;
    };
    searchReplaceFindNext: {
      searchReplaceFindNext: () => ReturnType;
    };
    searchReplaceFindPrevious: {
      searchReplaceFindPrevious: () => ReturnType;
    };
    searchReplaceReplaceCurrent: {
      searchReplaceReplaceCurrent: () => ReturnType;
    };
    searchReplaceReplaceAll: {
      searchReplaceReplaceAll: () => ReturnType;
    };
    searchReplaceSelectCurrent: {
      searchReplaceSelectCurrent: () => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create<SearchReplaceOptions>({
  name: "searchReplace",

  addOptions() {
    return {
      searchResultClass: "search-result",
      disableRegex: true,
      scrollIntoViewOnNavigate: true,
    };
  },

  addStorage(): SearchReplaceStorage {
    return {
      searchTerm: "",
      replaceTerm: "",
      results: [],
      lastSearchTerm: "",
      caseSensitive: false,
      lastCaseSensitive: false,
      resultIndex: 0,
      lastResultIndex: 0,
    };
  },

  addCommands() {
    const opts = this.options;
    const shouldScroll = () => opts.scrollIntoViewOnNavigate !== false;
    const storageOf = (editor: Editor) =>
      (editor.storage as unknown as { searchReplace: SearchReplaceStorage }).searchReplace;

    /**
     * 所有命令都只往**运行器自己的那条 `tr`** 上写，不再另派发一条。
     *
     * 原来的写法是 `dispatch?.(state.tr.setMeta(...))`：那是第二条事务，而运行器
     * 随后还会派发它自己那条（`CommandManager` 无条件派发，不看 tr 有没有内容）。
     * 一条命令派发两次事务本身已是浪费，真正致命的是**后派发的那条带着旧选区**
     * ——见 {@link focusSearchHit} 的说明。
     */
    const bump = (tr: Transaction) =>
      tr.setMeta(searchReplacePluginKey, { [META_FORCE]: Date.now() });

    return {
      setSearchReplaceTerm:
        (searchTerm: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;
          storageOf(editor).searchTerm = searchTerm;
          bump(tr);
          return true;
        },
      setSearchReplaceReplaceTerm:
        (replaceTerm: string) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;
          storageOf(editor).replaceTerm = replaceTerm;
          bump(tr);
          return true;
        },
      setSearchReplaceCaseSensitive:
        (caseSensitive: boolean) =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;
          storageOf(editor).caseSensitive = caseSensitive;
          bump(tr);
          return true;
        },
      resetSearchReplaceIndex:
        () =>
        ({ editor, tr, dispatch }) => {
          if (!dispatch) return true;
          storageOf(editor).resultIndex = 0;
          bump(tr);
          return true;
        },
      searchReplaceFindNext: () => (props) => {
        const { editor, tr, dispatch } = props;
        if (!dispatch) return true;
        const s = storageOf(editor);
        const nextIdx = s.resultIndex + 1;
        s.resultIndex = s.results[nextIdx] ? nextIdx : 0;
        bump(tr);
        const hit = s.results[s.resultIndex];
        if (!hit) return true;
        return focusSearchHit(props, hit, shouldScroll());
      },
      searchReplaceFindPrevious: () => (props) => {
        const { editor, tr, dispatch } = props;
        if (!dispatch) return true;
        const s = storageOf(editor);
        const prevIdx = s.resultIndex - 1;
        s.resultIndex =
          prevIdx >= 0 && s.results[prevIdx] ? prevIdx : Math.max(s.results.length - 1, 0);
        bump(tr);
        const hit = s.results[s.resultIndex];
        if (!hit) return true;
        return focusSearchHit(props, hit, shouldScroll());
      },
      searchReplaceReplaceCurrent:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = storageOf(editor);
          const hit = s.results[s.resultIndex];
          if (!hit) return false;
          if (!dispatch) return true;
          bump(tr.insertText(s.replaceTerm, hit.from, hit.to));
          return true;
        },
      searchReplaceReplaceAll:
        () =>
        ({ editor, tr, dispatch }) => {
          const s = storageOf(editor);
          if (!s.results.length) return false;
          if (!dispatch) return true;
          // 从后往前替换：先改后面的，前面命中的位置才不会被前一次替换顶偏
          const sorted = [...s.results].sort((a, b) => b.from - a.from);
          for (const r of sorted) {
            tr.insertText(s.replaceTerm, r.from, r.to);
          }
          bump(tr);
          return true;
        },
      searchReplaceSelectCurrent: () => (props) => {
        const s = storageOf(props.editor);
        const hit = s.results[s.resultIndex];
        if (!hit) return false;
        return focusSearchHit(props, hit, shouldScroll());
      },
    };
  },

  addProseMirrorPlugins() {
    const { editor } = this;
    const { searchResultClass, disableRegex } = this.options;

    return [
      new Plugin({
        key: searchReplacePluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr: Transaction, _oldDeco: DecorationSet) {
            const storage = (editor.storage as unknown as { searchReplace: SearchReplaceStorage })
              .searchReplace;

            const metaBump = !!(
              tr.getMeta(searchReplacePluginKey) as Record<string, unknown> | undefined
            )?.[META_FORCE];
            const forced = tr.docChanged || metaBump;

            const {
              searchTerm,
              lastSearchTerm,
              caseSensitive,
              lastCaseSensitive,
              resultIndex,
              lastResultIndex,
            } = storage;

            const termTrimmed = searchTerm.trim();

            if (
              !forced &&
              lastSearchTerm === searchTerm &&
              lastCaseSensitive === caseSensitive &&
              lastResultIndex === resultIndex &&
              !!termTrimmed
            ) {
              return _oldDeco;
            }

            storage.lastSearchTerm = searchTerm;
            storage.lastCaseSensitive = caseSensitive;
            storage.lastResultIndex = resultIndex;

            if (!termTrimmed) {
              storage.results = [];
              return DecorationSet.empty;
            }

            const regex = getRegex(searchTerm, disableRegex, caseSensitive);
            if (!regex) {
              // 正则模式下的半截模式：当作无命中，等用户把它敲完整
              storage.results = [];
              return DecorationSet.empty;
            }

            const { decorationsToReturn, results } = processSearches(
              tr.doc,
              regex,
              searchResultClass,
              resultIndex,
            );

            storage.results = results;

            return decorationsToReturn;
          },
        },
        props: {
          decorations(state: EditorState): DecorationSet {
            return searchReplacePluginKey.getState(state) ?? DecorationSet.empty;
          },
        },
        /**
         * 退出编辑态时自清搜索状态。
         *
         * 搜索词、命中集合与高亮装饰都归本扩展所有，因此复位责任也在这里，
         * 不依赖外部（Shell / 工具栏按钮）代为清理：查找面板挂在 `EditorEditChrome` 上，
         * 切到 preview 时整块编辑期 chrome 被 `v-if` 卸载，卸载路径不会触发面板的
         * onClose，残留的搜索词会让命中高亮一直显示到 preview 里。
         */
        view() {
          let wasEditable: boolean | null = null;

          return {
            update(view) {
              const isEditable = view.editable;
              if (wasEditable === isEditable) return;

              // 只在 true → false 这一次翻转时清理；wasEditable 先更新，避免同一状态重复处理
              const leftEditMode = wasEditable === true && !isEditable;
              wasEditable = isEditable;
              if (!leftEditMode) return;

              // destroy 之后访问 `editor.view` 会抛错（Tiptap 会报 "editor view is not available"）。
              // 正常 update 路径下 view 必然存在，这里把该前提显式化，防止将来调用路径变化。
              if (editor.isDestroyed) return;

              const storage = (editor.storage as unknown as { searchReplace: SearchReplaceStorage })
                .searchReplace;
              if (!storage.searchTerm && !storage.replaceTerm) return;

              storage.searchTerm = "";
              storage.replaceTerm = "";
              storage.resultIndex = 0;
              // 触发一次 apply 重算，清掉已渲染的高亮装饰
              editor.view.dispatch(bumpTransaction(editor.state));
            },
          };
        },
      }),
    ];
  },
});
