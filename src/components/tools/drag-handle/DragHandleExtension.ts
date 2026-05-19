/**
 * DragHandle Extension
 * @description Adds a left-side drag handle for moving editor blocks without a menu.
 */

import { Extension } from "@tiptap/core";
import { DOMSerializer, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";

import type { EditorView } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Storage {
    dragHandle: {
      isDragging: boolean;
    };
  }
}

export const dragHandleKey = new PluginKey("dragHandle");

const DRAGGABLE_NODE_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "orderedList",
  "bulletList",
  "table",
  "image",
  "video",
]);

const MEDIA_NODE_TYPES = new Set(["image", "video"]);
const LIST_NODE_TYPES = new Set(["orderedList", "bulletList"]);

interface DragTarget {
  node: ProseMirrorNode;
  pos: number;
  dom: HTMLElement;
}

function isDraggableNode(node: ProseMirrorNode): boolean {
  return DRAGGABLE_NODE_TYPES.has(node.type.name);
}

function getDomElement(view: EditorView, pos: number): HTMLElement | null {
  const dom = view.nodeDOM(pos);
  if (dom instanceof HTMLElement) return dom;
  if (dom instanceof Text) return dom.parentElement;
  return null;
}

function resolveNodeAtDom(view: EditorView, element: HTMLElement): DragTarget | null {
  try {
    const pos = view.posAtDOM(element, 0);
    const $pos = view.state.doc.resolve(pos);

    for (let depth = $pos.depth; depth >= 1; depth -= 1) {
      const node = $pos.node(depth);
      if (!isDraggableNode(node)) continue;

      const nodePos = $pos.before(depth);
      const dom = getDomElement(view, nodePos);
      if (dom && (dom === element || dom.contains(element))) {
        return { node, pos: nodePos, dom };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function findTargetFromElement(view: EditorView, element: HTMLElement): DragTarget | null {
  let current: HTMLElement | null = element;

  while (current && current !== view.dom) {
    const resolved = resolveNodeAtDom(view, current);
    if (resolved) return resolved;
    current = current.parentElement;
  }

  return null;
}

function getEditorPaddingLeft(view: EditorView): number {
  return Number.parseFloat(window.getComputedStyle(view.dom).paddingLeft) || 0;
}

function isInEditorGutter(view: EditorView, clientX: number): boolean {
  const rect = view.dom.getBoundingClientRect();
  return clientX < rect.left + getEditorPaddingLeft(view);
}

function getContentProbePoint(view: EditorView, clientY: number): { left: number; top: number } {
  const rect = view.dom.getBoundingClientRect();
  return {
    left: rect.left + getEditorPaddingLeft(view) + 8,
    top: clientY,
  };
}

function findMediaTarget(view: EditorView, event: MouseEvent): DragTarget | null {
  const target = event.target as HTMLElement | null;
  if (!target) return null;

  const mediaWrapper = target.closest<HTMLElement>(
    ".resizable-image-wrapper, .video-wrapper, img, video",
  );

  if (!mediaWrapper || !view.dom.contains(mediaWrapper)) return null;

  let current: HTMLElement | null = mediaWrapper;
  while (current && current !== view.dom) {
    const resolved = resolveNodeAtDom(view, current);
    if (resolved && MEDIA_NODE_TYPES.has(resolved.node.type.name)) {
      return resolved;
    }
    current = current.parentElement;
  }

  return null;
}

function findTargetFromCoords(view: EditorView, event: MouseEvent): DragTarget | null {
  const mediaTarget = findMediaTarget(view, event);
  if (mediaTarget) return mediaTarget;

  if (isInEditorGutter(view, event.clientX)) {
    const probePoint = getContentProbePoint(view, event.clientY);
    const element = document.elementFromPoint(probePoint.left, probePoint.top);

    if (element instanceof HTMLElement && view.dom.contains(element)) {
      const targetFromElement = findTargetFromElement(view, element);
      if (targetFromElement) return targetFromElement;
    }
  }

  const posAtCoords = view.posAtCoords(
    isInEditorGutter(view, event.clientX)
      ? getContentProbePoint(view, event.clientY)
      : { left: event.clientX, top: event.clientY },
  );

  if (!posAtCoords) return null;

  const $pos = view.state.doc.resolve(posAtCoords.pos);
  const candidates: DragTarget[] = [];

  for (let depth = 1; depth <= $pos.depth; depth += 1) {
    const node = $pos.node(depth);
    if (!isDraggableNode(node)) continue;

    const pos = $pos.before(depth);
    const dom = getDomElement(view, pos);
    if (dom) {
      candidates.push({ node, pos, dom });
    }
  }

  const table = candidates.find((candidate) => candidate.node.type.name === "table");
  if (table) return table;

  const list = [...candidates]
    .reverse()
    .find((candidate) => LIST_NODE_TYPES.has(candidate.node.type.name));
  if (list) return list;

  if (candidates.length > 0) {
    return candidates[candidates.length - 1];
  }

  const { nodeAfter, nodeBefore } = $pos;
  if (nodeAfter && isDraggableNode(nodeAfter)) {
    const dom = getDomElement(view, posAtCoords.pos);
    if (dom) return { node: nodeAfter, pos: posAtCoords.pos, dom };
  }

  if (nodeBefore && isDraggableNode(nodeBefore)) {
    const pos = posAtCoords.pos - nodeBefore.nodeSize;
    const dom = getDomElement(view, pos);
    if (dom) return { node: nodeBefore, pos, dom };
  }

  return null;
}

function createHandleElement(): HTMLElement {
  const handle = document.createElement("div");
  handle.className = "drag-handle";
  handle.contentEditable = "false";
  handle.draggable = true;
  handle.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 6; index += 1) {
    const dot = document.createElement("span");
    dot.className = "drag-handle__dot";
    handle.appendChild(dot);
  }

  return handle;
}

function serializeDragData(view: EditorView, selection: NodeSelection): string {
  const serializer = DOMSerializer.fromSchema(view.state.schema);
  const container = document.createElement("div");
  container.appendChild(serializer.serializeFragment(selection.content().content));
  return container.innerHTML;
}

export const DragHandleExtension = Extension.create({
  name: "dragHandle",

  addStorage() {
    return {
      isDragging: false,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: dragHandleKey,

        view(view) {
          const handle = createHandleElement();
          const handleRoot = view.dom.parentElement ?? view.dom;
          let currentTarget: DragTarget | null = null;
          let isDragging = false;

          const setDraggingState = (dragging: boolean) => {
            isDragging = dragging;
            extension.storage.isDragging = dragging;
          };

          const hideHandle = () => {
            if (isDragging) return;
            currentTarget = null;
            handle.classList.remove("is-visible");
          };

          const updateHandlePosition = (target: DragTarget) => {
            const rootRect = handleRoot.getBoundingClientRect();
            const targetRect = target.dom.getBoundingClientRect();

            handle.style.left = `${targetRect.left - rootRect.left - 38}px`;
            handle.style.top = `${targetRect.top - rootRect.top + targetRect.height / 2}px`;
            handle.classList.add("is-visible");
          };

          const handleMouseMove = (event: MouseEvent) => {
            if (isDragging) return;

            const target = findTargetFromCoords(view, event);
            if (!target) {
              hideHandle();
              return;
            }

            currentTarget = target;
            updateHandlePosition(target);
          };

          const handleMouseLeave = (event: MouseEvent) => {
            const relatedTarget = event.relatedTarget;
            if (
              relatedTarget instanceof Node &&
              (view.dom.contains(relatedTarget) || handle.contains(relatedTarget))
            ) {
              return;
            }
            hideHandle();
          };

          handle.addEventListener("mousedown", (event) => {
            event.stopPropagation();
          });

          handle.addEventListener("dragstart", (event: DragEvent) => {
            if (!currentTarget || !event.dataTransfer) {
              event.preventDefault();
              return;
            }

            const selection = NodeSelection.create(view.state.doc, currentTarget.pos);

            setDraggingState(true);
            view.dragging = {
              slice: selection.content(),
              move: true,
            };
            handle.classList.add("is-dragging");

            view.dispatch(view.state.tr.setSelection(selection));

            event.dataTransfer.clearData();
            event.dataTransfer.setData("text/html", serializeDragData(view, selection));
            event.dataTransfer.setData("text/plain", currentTarget.node.textContent);
            event.dataTransfer.effectAllowed = "move";

            const targetRect = currentTarget.dom.getBoundingClientRect();
            event.dataTransfer.setDragImage(
              currentTarget.dom,
              Math.min(24, targetRect.width / 2),
              Math.min(24, targetRect.height / 2),
            );
          });

          handle.addEventListener("dragend", () => {
            setDraggingState(false);
            handle.classList.remove("is-dragging");
            hideHandle();
          });

          handleRoot.appendChild(handle);
          view.dom.addEventListener("mousemove", handleMouseMove);
          view.dom.addEventListener("mouseleave", handleMouseLeave);

          return {
            update(updatedView) {
              if (!currentTarget) return;

              const node = updatedView.state.doc.nodeAt(currentTarget.pos);
              const dom = getDomElement(updatedView, currentTarget.pos);
              if (!node || !dom || node.type.name !== currentTarget.node.type.name) {
                hideHandle();
                return;
              }

              currentTarget = { node, pos: currentTarget.pos, dom };
              updateHandlePosition(currentTarget);
            },

            destroy() {
              view.dom.removeEventListener("mousemove", handleMouseMove);
              view.dom.removeEventListener("mouseleave", handleMouseLeave);
              handle.remove();
            },
          };
        },
      }),
    ];
  },
});
