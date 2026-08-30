import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import {
  findLinkHrefInSelection,
  hasTextSelection,
  isBubbleMenuVisible,
  isEmptyTextSelection,
  shouldShowFloatingTextToolbar,
  shouldShowImageBubbleMenu,
  shouldShowLinkBubbleMenu,
  shouldShowTableBubbleMenu,
  shouldShowVideoBubbleMenu,
} from "./bubbleMenuShouldShow";

import type { BubbleMenuShowProps } from "./bubbleMenuShouldShow";
import type { Editor } from "@tiptap/core";

type Mark = { type?: { name: string }; attrs?: { href?: string } };
type TextNode = { isText?: boolean; marks?: Mark[] };

const linkMark = (href: string): Mark => ({ type: { name: "link" }, attrs: { href } });

function makeEditor(active: Record<string, boolean> = {}, dragging = false): Editor {
  return {
    isActive: (name: string) => active[name] === true,
    // isBlockDragging 会同时读 storage.dragHandle 与 view.dragging
    storage: { dragHandle: { isDragging: dragging } },
    view: { dragging: null },
  } as unknown as Editor;
}

/**
 * 构造最小 state 桩：只实现 `resolve` 与 `nodesBetween` 两个被读取的能力。
 * 用真实 ProseMirror 文档会把测试重心引到 schema 上，而这些函数的职责是判定逻辑。
 */
function makeState(options: {
  selection?: unknown;
  marksAt?: Record<number, Mark[]>;
  nodes?: TextNode[];
}): BubbleMenuShowProps["state"] {
  // selectionTouchesMedia 会读 `$anchor.nodeAfter/nodeBefore`，默认给个空壳
  const { selection = { $anchor: {} }, marksAt = {}, nodes = [] } = options;
  return {
    selection,
    doc: {
      resolve: (pos: number) => ({ marks: () => marksAt[pos] ?? [] }),
      nodesBetween: (
        _from: number,
        _to: number,
        f: (n: TextNode, pos: number) => boolean | void,
      ) => {
        for (const node of nodes) {
          if (f(node, 0) === false) return;
        }
      },
    },
  };
}

function makeProps(overrides: Partial<BubbleMenuShowProps> = {}): BubbleMenuShowProps {
  return {
    editor: makeEditor(),
    state: makeState({}),
    from: 1,
    to: 5,
    ...overrides,
  };
}

describe("选区判定基元", () => {
  it("hasTextSelection / isEmptyTextSelection 互补", () => {
    expect(hasTextSelection({ from: 1, to: 5 })).toBe(true);
    expect(isEmptyTextSelection({ from: 1, to: 5 })).toBe(false);

    expect(hasTextSelection({ from: 3, to: 3 })).toBe(false);
    expect(isEmptyTextSelection({ from: 3, to: 3 })).toBe(true);
  });
});

describe("isBubbleMenuVisible 前置拦截", () => {
  it("disabled 时一律不显示", () => {
    expect(isBubbleMenuVisible(makeProps(), true)).toBe(false);
  });

  it("editor 缺失时不显示", () => {
    expect(isBubbleMenuVisible(makeProps({ editor: null as unknown as Editor }), false)).toBe(
      false,
    );
  });

  it("块拖拽进行中不显示", () => {
    expect(isBubbleMenuVisible(makeProps({ editor: makeEditor({}, true) }), false)).toBe(false);
  });

  it("正常态放行", () => {
    expect(isBubbleMenuVisible(makeProps(), false)).toBe(true);
  });
});

describe("shouldShowFloatingTextToolbar", () => {
  it("普通文本选区显示", () => {
    expect(shouldShowFloatingTextToolbar(makeProps(), false)).toBe(true);
  });

  it("空选区不显示", () => {
    expect(shouldShowFloatingTextToolbar(makeProps({ from: 2, to: 2 }), false)).toBe(false);
  });

  it("NodeSelection 不显示（交给媒体条）", () => {
    const selection = Object.assign(Object.create(NodeSelection.prototype) as NodeSelection, {
      $anchor: {},
    });
    expect(
      shouldShowFloatingTextToolbar(makeProps({ state: makeState({ selection }) }), false),
    ).toBe(false);
  });

  it.each(["codeBlock", "table", "image", "video", "link"])(
    "光标处于 %s 内时让位给专用工具条",
    (name) => {
      expect(
        shouldShowFloatingTextToolbar(makeProps({ editor: makeEditor({ [name]: true }) }), false),
      ).toBe(false);
    },
  );

  it.each(["image", "video"])("锚点紧邻 %s 节点时不显示（避免与媒体条打架）", (name) => {
    const after = makeState({ selection: { $anchor: { nodeAfter: { type: { name } } } } });
    expect(shouldShowFloatingTextToolbar(makeProps({ state: after }), false)).toBe(false);

    const before = makeState({ selection: { $anchor: { nodeBefore: { type: { name } } } } });
    expect(shouldShowFloatingTextToolbar(makeProps({ state: before }), false)).toBe(false);
  });

  it("选区自身就是媒体节点时不显示", () => {
    const state = makeState({
      selection: { node: { type: { name: "image" } }, $anchor: {} },
    });
    expect(shouldShowFloatingTextToolbar(makeProps({ state }), false)).toBe(false);
  });

  it("锚点紧邻普通段落时正常显示", () => {
    const state = makeState({
      selection: { $anchor: { nodeAfter: { type: { name: "paragraph" } } } },
    });
    expect(shouldShowFloatingTextToolbar(makeProps({ state }), false)).toBe(true);
  });
});

describe("媒体与表格工具条", () => {
  it("image 激活时显示图片条", () => {
    expect(
      shouldShowImageBubbleMenu(makeProps({ editor: makeEditor({ image: true }) }), false),
    ).toBe(true);
    expect(shouldShowImageBubbleMenu(makeProps(), false)).toBe(false);
  });

  it("video 激活时显示视频条", () => {
    expect(
      shouldShowVideoBubbleMenu(makeProps({ editor: makeEditor({ video: true }) }), false),
    ).toBe(true);
    expect(shouldShowVideoBubbleMenu(makeProps(), false)).toBe(false);
  });

  it("showMode=1 只看是否在表格内", () => {
    expect(
      shouldShowTableBubbleMenu(makeProps({ editor: makeEditor({ table: true }) }), false, 1),
    ).toBe(true);
    expect(shouldShowTableBubbleMenu(makeProps(), false, 1)).toBe(false);
  });

  it("showMode=2 要求 CellSelection —— 光标在表格内但非单元格选区时不显示", () => {
    expect(
      shouldShowTableBubbleMenu(makeProps({ editor: makeEditor({ table: true }) }), false, 2),
    ).toBe(false);
  });

  it("disabled 时全部不显示", () => {
    const active = makeProps({ editor: makeEditor({ image: true, video: true, table: true }) });
    expect(shouldShowImageBubbleMenu(active, true)).toBe(false);
    expect(shouldShowVideoBubbleMenu(active, true)).toBe(false);
    expect(shouldShowTableBubbleMenu(active, true, 1)).toBe(false);
  });
});

describe("findLinkHrefInSelection", () => {
  const HREF = "https://example.com/";

  it("空选区返回 null", () => {
    expect(findLinkHrefInSelection(makeState({}), 3, 3)).toBeNull();
  });

  it("首尾同一链接时直接命中", () => {
    const state = makeState({ marksAt: { 1: [linkMark(HREF)], 5: [linkMark(HREF)] } });
    expect(findLinkHrefInSelection(state, 1, 5)).toBe(HREF);
  });

  it("首尾链接不同则回落到逐节点判定", () => {
    const state = makeState({
      marksAt: { 1: [linkMark(HREF)], 5: [linkMark("https://other.com/")] },
      nodes: [
        { isText: true, marks: [linkMark(HREF)] },
        { isText: true, marks: [linkMark("https://other.com/")] },
      ],
    });
    expect(findLinkHrefInSelection(state, 1, 5)).toBeNull();
  });

  it("选区全部落在同一链接内时命中", () => {
    const state = makeState({
      nodes: [
        { isText: true, marks: [linkMark(HREF)] },
        { isText: true, marks: [linkMark(HREF)] },
      ],
    });
    expect(findLinkHrefInSelection(state, 1, 5)).toBe(HREF);
  });

  it("混入无链接文本时不命中", () => {
    const state = makeState({
      nodes: [
        { isText: true, marks: [linkMark(HREF)] },
        { isText: true, marks: [] },
      ],
    });
    expect(findLinkHrefInSelection(state, 1, 5)).toBeNull();
  });

  it("参数顺序颠倒也能正确解析", () => {
    const state = makeState({ marksAt: { 1: [linkMark(HREF)], 5: [linkMark(HREF)] } });
    expect(findLinkHrefInSelection(state, 5, 1)).toBe(HREF);
  });

  it("resolve 抛出时吞掉异常返回 null", () => {
    const state = {
      selection: {},
      doc: {
        resolve: () => {
          throw new Error("position out of range");
        },
        nodesBetween: () => {},
      },
    } as unknown as BubbleMenuShowProps["state"];

    expect(findLinkHrefInSelection(state, 1, 5)).toBeNull();
  });
});

describe("shouldShowLinkBubbleMenu", () => {
  const HREF = "https://example.com/";

  it("命中链接时回调收到 href", () => {
    const state = makeState({ marksAt: { 1: [linkMark(HREF)], 5: [linkMark(HREF)] } });
    const seen: string[] = [];

    expect(shouldShowLinkBubbleMenu(makeProps({ state }), false, (h) => seen.push(h))).toBe(true);
    expect(seen).toEqual([HREF]);
  });

  it("无链接时不显示且不回调", () => {
    const seen: string[] = [];
    expect(shouldShowLinkBubbleMenu(makeProps(), false, (h) => seen.push(h))).toBe(false);
    expect(seen).toEqual([]);
  });

  it("空选区不显示", () => {
    expect(shouldShowLinkBubbleMenu(makeProps({ from: 2, to: 2 }), false)).toBe(false);
  });
});

describe("TextSelection 场景不误判", () => {
  it("普通 TextSelection 不被当作 NodeSelection", () => {
    const selection = Object.assign(Object.create(TextSelection.prototype) as TextSelection, {
      $anchor: {},
    });
    expect(
      shouldShowFloatingTextToolbar(makeProps({ state: makeState({ selection }) }), false),
    ).toBe(true);
  });
});
