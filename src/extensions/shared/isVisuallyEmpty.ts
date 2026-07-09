import { isNodeEmpty } from "@tiptap/core";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/** placeholder / empty 态装饰打在容器自身的节点类型 */
export const CONTAINER_PLACEHOLDER_TYPES = new Set(["toggleBlock", "callout", "columnLayout"]);

/**
 * 判断节点在视觉上是否为空。
 * - 普通节点：委托 `isNodeEmpty`
 * - 容器节点（toggle/callout/columnLayout）：递归检查子 textblock / 嵌套容器
 */
export function isVisuallyEmpty(
  node: ProseMirrorNode,
  containerTypes: ReadonlySet<string> = CONTAINER_PLACEHOLDER_TYPES,
): boolean {
  if (node.isLeaf) return false;
  if (isNodeEmpty(node)) return true;
  if (!containerTypes.has(node.type.name)) return false;

  let empty = true;
  node.forEach((child) => {
    if (child.isTextblock) {
      if (child.content.size > 0) empty = false;
      return;
    }
    if (!isVisuallyEmpty(child, containerTypes)) empty = false;
  });
  return empty;
}
