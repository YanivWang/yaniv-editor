/**
 * Find / Replace — 简化自 Umo search-replace 思路（ProseMirror 装饰高亮）
 */
import { Extension, type Editor } from "@tiptap/core";
import { EditorState, Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const searchReplacePluginKey = new PluginKey("tpSearchReplace");

const META_FORCE = "tpSearchReplaceForce";

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

function getRegex(s: string, disableRegex: boolean, caseSensitive: boolean): RegExp {
  return RegExp(
    disableRegex ? s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : s,
    caseSensitive ? "gu" : "gui",
  );
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

function focusSearchHit(
  editor: Editor,
  hit: { from: number; to: number },
  scroll: boolean,
): boolean {
  editor.commands.focus();
  const ok = editor.commands.setTextSelection({ from: hit.from, to: hit.to });
  if (!ok) return false;
  if (scroll) editor.commands.scrollIntoView();
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
      searchResultClass: "tp-search-result",
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
    const metaTr = (state: EditorState) => bumpTransaction(state);
    const shouldScroll = () => opts.scrollIntoViewOnNavigate !== false;

    return {
      setSearchReplaceTerm:
        (searchTerm: string) =>
        ({ editor, state, dispatch }) => {
          (
            editor.storage as unknown as { searchReplace: SearchReplaceStorage }
          ).searchReplace.searchTerm = searchTerm;
          dispatch?.(metaTr(state));
          return true;
        },
      setSearchReplaceReplaceTerm:
        (replaceTerm: string) =>
        ({ editor, state, dispatch }) => {
          (
            editor.storage as unknown as { searchReplace: SearchReplaceStorage }
          ).searchReplace.replaceTerm = replaceTerm;
          dispatch?.(metaTr(state));
          return true;
        },
      setSearchReplaceCaseSensitive:
        (caseSensitive: boolean) =>
        ({ editor, state, dispatch }) => {
          (
            editor.storage as unknown as { searchReplace: SearchReplaceStorage }
          ).searchReplace.caseSensitive = caseSensitive;
          dispatch?.(metaTr(state));
          return true;
        },
      resetSearchReplaceIndex:
        () =>
        ({ editor, state, dispatch }) => {
          (
            editor.storage as unknown as { searchReplace: SearchReplaceStorage }
          ).searchReplace.resultIndex = 0;
          dispatch?.(metaTr(state));
          return true;
        },
      searchReplaceFindNext:
        () =>
        ({ editor, state, dispatch }) => {
          const s = (editor.storage as unknown as { searchReplace: SearchReplaceStorage })
            .searchReplace;
          const nextIdx = s.resultIndex + 1;
          s.resultIndex = s.results[nextIdx] ? nextIdx : 0;
          dispatch?.(metaTr(state));
          const hit = s.results[s.resultIndex];
          if (!hit) return true;
          return focusSearchHit(editor, hit, shouldScroll());
        },
      searchReplaceFindPrevious:
        () =>
        ({ editor, state, dispatch }) => {
          const s = (editor.storage as unknown as { searchReplace: SearchReplaceStorage })
            .searchReplace;
          const prevIdx = s.resultIndex - 1;
          s.resultIndex =
            prevIdx >= 0 && s.results[prevIdx] ? prevIdx : Math.max(s.results.length - 1, 0);
          dispatch?.(metaTr(state));
          const hit = s.results[s.resultIndex];
          if (!hit) return true;
          return focusSearchHit(editor, hit, shouldScroll());
        },
      searchReplaceReplaceCurrent:
        () =>
        ({ editor, state, dispatch }) => {
          const s = (editor.storage as unknown as { searchReplace: SearchReplaceStorage })
            .searchReplace;
          const hit = s.results[s.resultIndex];
          if (!hit) return false;
          dispatch?.(
            state.tr.insertText(s.replaceTerm, hit.from, hit.to).setMeta(searchReplacePluginKey, {
              [META_FORCE]: Date.now(),
            }),
          );
          return true;
        },
      searchReplaceReplaceAll:
        () =>
        ({ editor, state, dispatch }) => {
          const s = (editor.storage as unknown as { searchReplace: SearchReplaceStorage })
            .searchReplace;
          if (!s.results.length) return false;
          const sorted = [...s.results].sort((a, b) => b.from - a.from);
          let tr = state.tr;
          for (const r of sorted) {
            tr = tr.insertText(s.replaceTerm, r.from, r.to);
          }
          dispatch?.(tr.setMeta(searchReplacePluginKey, { [META_FORCE]: Date.now() }));
          return true;
        },
      searchReplaceSelectCurrent:
        () =>
        ({ editor }) => {
          const s = (editor.storage as unknown as { searchReplace: SearchReplaceStorage })
            .searchReplace;
          const hit = s.results[s.resultIndex];
          if (!hit) return false;
          return focusSearchHit(editor, hit, shouldScroll());
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
      }),
    ];
  },
});
