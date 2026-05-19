import { NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";

import { isBubbleMenuBlocked } from "./useBubbleMenuGuard";

import type { Editor } from "@tiptap/core";

export interface BubbleMenuShowProps {
  editor: Editor;
  state: {
    selection: unknown;
    doc: {
      resolve: (pos: number) => {
        marks: () => Iterable<{ type?: { name: string }; attrs?: { href?: string } }>;
      };
      nodesBetween: (
        from: number,
        to: number,
        f: (
          node: {
            isText?: boolean;
            marks?: { type?: { name: string }; attrs?: { href?: string } }[];
          },
          pos: number,
        ) => boolean | void,
      ) => void;
    };
  };
  from: number;
  to: number;
}

const MEDIA_NODE_TYPES = ["image", "video"] as const;

/** 通用前置：编辑器存在且非只读/拖拽拦截 */
export function isBubbleMenuVisible(props: BubbleMenuShowProps, readonly: boolean): boolean {
  if (!props.editor) return false;
  if (isBubbleMenuBlocked(props.editor, readonly)) return false;
  return true;
}

export function hasTextSelection(props: Pick<BubbleMenuShowProps, "from" | "to">): boolean {
  return props.from !== props.to;
}

export function isEmptyTextSelection(props: Pick<BubbleMenuShowProps, "from" | "to">): boolean {
  return props.from === props.to;
}

function selectionTouchesMedia(state: BubbleMenuShowProps["state"]): boolean {
  const { selection } = state;
  if (selection instanceof NodeSelection) return true;

  const sel = selection as {
    node?: { type: { name: string } };
    $anchor: { nodeAfter?: { type: { name: string } }; nodeBefore?: { type: { name: string } } };
  };

  if (
    sel.node &&
    MEDIA_NODE_TYPES.includes(sel.node.type.name as (typeof MEDIA_NODE_TYPES)[number])
  ) {
    return true;
  }

  const { nodeAfter, nodeBefore } = sel.$anchor;
  return Boolean(
    (nodeAfter &&
      MEDIA_NODE_TYPES.includes(nodeAfter.type.name as (typeof MEDIA_NODE_TYPES)[number])) ||
    (nodeBefore &&
      MEDIA_NODE_TYPES.includes(nodeBefore.type.name as (typeof MEDIA_NODE_TYPES)[number])),
  );
}

/** 选中文本时的浮动格式化工具栏 */
export function shouldShowFloatingTextToolbar(
  props: BubbleMenuShowProps,
  readonly: boolean,
): boolean {
  if (!isBubbleMenuVisible(props, readonly)) return false;
  if (props.state.selection instanceof NodeSelection) return false;
  if (!hasTextSelection(props)) return false;

  const e = props.editor;
  if (e.isActive("codeBlock")) return false;
  if (e.isActive("table")) return false;
  if (e.isActive("image")) return false;
  if (e.isActive("video")) return false;
  if (e.isActive("link")) return false;
  if (selectionTouchesMedia(props.state)) return false;

  return true;
}

export function shouldShowImageBubbleMenu(props: BubbleMenuShowProps, readonly: boolean): boolean {
  if (!isBubbleMenuVisible(props, readonly)) return false;
  return props.editor.isActive("image");
}

export function shouldShowVideoBubbleMenu(props: BubbleMenuShowProps, readonly: boolean): boolean {
  if (!isBubbleMenuVisible(props, readonly)) return false;
  return props.editor.isActive("video");
}

export function shouldShowTableBubbleMenu(
  props: BubbleMenuShowProps,
  readonly: boolean,
  showMode: 1 | 2,
): boolean {
  if (!isBubbleMenuVisible(props, readonly)) return false;

  if (showMode === 1) {
    return props.editor.isActive("table");
  }

  return props.state.selection instanceof CellSelection;
}

/** 选中范围内是否为同一链接；无链接时返回 null */
export function findLinkHrefInSelection(
  state: BubbleMenuShowProps["state"],
  from: number,
  to: number,
): string | null {
  if (isEmptyTextSelection({ from, to })) return null;

  try {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const $from = state.doc.resolve(start);
    const $to = state.doc.resolve(end);

    const findLinkMark = (
      marks: Iterable<{ type?: { name: string }; attrs?: { href?: string } }>,
    ) => {
      for (const mark of marks) {
        if (mark.type?.name === "link" && mark.attrs?.href) return mark;
      }
      return null;
    };

    const linkMarkAtStart = findLinkMark($from.marks());
    const linkMarkAtEnd = findLinkMark($to.marks());

    if (
      linkMarkAtStart?.attrs?.href &&
      linkMarkAtEnd?.attrs?.href &&
      linkMarkAtStart.attrs.href === linkMarkAtEnd.attrs.href
    ) {
      return linkMarkAtStart.attrs.href;
    }

    let allNodesHaveLink = false;
    let linkHref = "";
    let hasNonLinkText = false;

    state.doc.nodesBetween(start, end, (node) => {
      if (!node.isText) return;

      const linkMark = node.marks?.find((mark) => mark.type?.name === "link" && mark.attrs?.href);

      if (linkMark?.attrs?.href) {
        if (!linkHref) {
          linkHref = linkMark.attrs.href;
        } else if (linkHref !== linkMark.attrs.href) {
          hasNonLinkText = true;
          return false;
        }
        allNodesHaveLink = true;
      } else {
        hasNonLinkText = true;
        return false;
      }
    });

    if (allNodesHaveLink && !hasNonLinkText && linkHref) {
      return linkHref;
    }
  } catch {
    // 忽略 resolve 边界异常
  }

  return null;
}

export function shouldShowLinkBubbleMenu(
  props: BubbleMenuShowProps,
  readonly: boolean,
  onLinkFound?: (href: string) => void,
): boolean {
  if (!isBubbleMenuVisible(props, readonly)) return false;
  if (!hasTextSelection(props)) return false;

  const href = findLinkHrefInSelection(props.state, props.from, props.to);
  if (href) {
    onLinkFound?.(href);
    return true;
  }

  return false;
}
