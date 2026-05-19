/**
 * DragHandle Extension
 * @description Adds Notion-like left-side block controls for inserting, moving and transforming blocks.
 */

import { Extension } from "@tiptap/core";
import {
  DOMSerializer,
  Fragment,
  type Node as ProseMirrorNode,
  type Schema,
} from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

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
const TEXT_BLOCK_TYPES = new Set(["paragraph", "heading", "codeBlock"]);

function isTextBlockEmpty(node: ProseMirrorNode): boolean {
  let hasContent = false;

  node.descendants((child) => {
    if (child.isText && (child.text?.trim().length ?? 0) > 0) {
      hasContent = true;
      return false;
    }
    if (child.isAtom && child.type.name !== "hardBreak") {
      hasContent = true;
      return false;
    }
  });

  return !hasContent;
}

function hasBlockContent(node: ProseMirrorNode): boolean {
  const type = node.type.name;

  if (MEDIA_NODE_TYPES.has(type) || type === "table") {
    return true;
  }

  if (TEXT_BLOCK_TYPES.has(type)) {
    return !isTextBlockEmpty(node);
  }

  if (type === "blockquote" || LIST_NODE_TYPES.has(type)) {
    let hasContent = false;

    node.descendants((child) => {
      if (TEXT_BLOCK_TYPES.has(child.type.name) && !isTextBlockEmpty(child)) {
        hasContent = true;
        return false;
      }
      if (MEDIA_NODE_TYPES.has(child.type.name)) {
        hasContent = true;
        return false;
      }
    });

    return hasContent;
  }

  return node.textContent.trim().length > 0;
}

interface DragTarget {
  node: ProseMirrorNode;
  pos: number;
  dom: HTMLElement;
}

type BlockMenuKind = "insert" | "actions";

interface BlockMenuItem {
  id: string;
  label: string;
  description?: string;
  danger?: boolean;
  dividerBefore?: boolean;
  run: () => void;
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

function createPlusButtonElement(): HTMLButtonElement {
  const plusButton = document.createElement("button");
  plusButton.type = "button";
  plusButton.className = "drag-handle-plus";
  plusButton.contentEditable = "false";
  plusButton.setAttribute("aria-label", "添加块");
  plusButton.textContent = "+";
  return plusButton;
}

function createHandleElement(): HTMLElement {
  const handle = document.createElement("div");
  handle.className = "drag-handle";
  handle.contentEditable = "false";
  handle.draggable = true;
  handle.setAttribute("aria-label", "打开块菜单或拖拽排序");
  handle.setAttribute("role", "button");
  handle.setAttribute("tabindex", "0");

  for (let index = 0; index < 6; index += 1) {
    const dot = document.createElement("span");
    dot.className = "drag-handle__dot";
    handle.appendChild(dot);
  }

  return handle;
}

function createBlockMenuElement(): HTMLElement {
  const menu = document.createElement("div");
  menu.className = "drag-handle-menu";
  menu.contentEditable = "false";
  menu.setAttribute("role", "menu");
  return menu;
}

function serializeDragData(view: EditorView, selection: NodeSelection): string {
  const serializer = DOMSerializer.fromSchema(view.state.schema);
  const container = document.createElement("div");
  container.appendChild(serializer.serializeFragment(selection.content().content));
  return container.innerHTML;
}

const DRAG_IMAGE_STYLE_PROPS = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "color",
  "text-align",
  "text-decoration",
  "text-transform",
  "padding",
  "border",
  "border-radius",
  "background",
  "background-color",
  "list-style-type",
  "list-style-position",
  "white-space",
  "width",
  "height",
  "max-width",
  "max-height",
  "object-fit",
] as const;

function copyComputedStyles(source: Element, clone: Element): void {
  if (!(source instanceof HTMLElement) || !(clone instanceof HTMLElement)) {
    return;
  }

  const computed = window.getComputedStyle(source);
  for (const prop of DRAG_IMAGE_STYLE_PROPS) {
    clone.style.setProperty(prop, computed.getPropertyValue(prop));
  }

  clone.style.margin = "0";
  clone.style.boxShadow = "none";

  const sourceChildren = source.children;
  const cloneChildren = clone.children;
  for (let index = 0; index < sourceChildren.length; index += 1) {
    copyComputedStyles(sourceChildren[index], cloneChildren[index]);
  }
}

function createTransparentDragImage(source: HTMLElement): HTMLElement {
  const rect = source.getBoundingClientRect();
  const dragImage = source.cloneNode(true) as HTMLElement;

  copyComputedStyles(source, dragImage);

  dragImage.classList.add("drag-handle__drag-image");
  dragImage.style.width = `${rect.width}px`;
  dragImage.style.background = "transparent";
  dragImage.style.backgroundColor = "transparent";
  dragImage.style.boxShadow = "none";

  document.body.appendChild(dragImage);
  return dragImage;
}

function createInlineContent(schema: Schema, text: string): Fragment | null {
  return text.trim().length > 0 ? Fragment.from(schema.text(text)) : null;
}

function createParagraph(schema: Schema, text = ""): ProseMirrorNode {
  return schema.nodes.paragraph.create(null, createInlineContent(schema, text));
}

function createHeading(schema: Schema, level: 1 | 2 | 3, text = ""): ProseMirrorNode {
  return schema.nodes.heading.create({ level }, createInlineContent(schema, text));
}

function createCodeBlock(schema: Schema, text = ""): ProseMirrorNode {
  return schema.nodes.codeBlock.create(null, createInlineContent(schema, text));
}

function createBlockquote(schema: Schema, text = ""): ProseMirrorNode {
  return schema.nodes.blockquote.create(null, createParagraph(schema, text));
}

function createList(schema: Schema, type: "bulletList" | "orderedList" | "taskList", text = "") {
  const listType = schema.nodes[type];
  const itemType = type === "taskList" ? schema.nodes.taskItem : schema.nodes.listItem;
  const attrs = type === "taskList" ? { checked: false } : null;

  return listType.create(null, itemType.create(attrs, createParagraph(schema, text)));
}

function insertNodeAfter(view: EditorView, target: DragTarget, node: ProseMirrorNode): void {
  const insertPos = target.pos + target.node.nodeSize;
  const tr = view.state.tr.insert(insertPos, node);
  const selectionPos = Math.min(insertPos + 1, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

function replaceTargetNode(view: EditorView, target: DragTarget, node: ProseMirrorNode): void {
  const tr = view.state.tr.replaceWith(target.pos, target.pos + target.node.nodeSize, node);
  const selectionPos = Math.min(target.pos + 1, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

function deleteTargetNode(view: EditorView, target: DragTarget): void {
  const tr = view.state.tr.delete(target.pos, target.pos + target.node.nodeSize);
  const selectionPos = Math.min(target.pos, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), -1));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

function duplicateTargetNode(view: EditorView, target: DragTarget): void {
  insertNodeAfter(view, target, target.node.copy(target.node.content));
}

function setCursorAfterTarget(view: EditorView, target: DragTarget): void {
  const pos = target.pos + target.node.nodeSize;
  const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos), 1));
  view.dispatch(tr);
  view.focus();
}

function moveTarget(view: EditorView, target: DragTarget, direction: "up" | "down"): boolean {
  const $pos = view.state.doc.resolve(target.pos);
  const index = $pos.index();
  const parent = $pos.parent;
  const nodeToMove = target.node.copy(target.node.content);

  if (direction === "up") {
    if (index <= 0) return false;

    const previousNode = parent.child(index - 1);
    const previousPos = target.pos - previousNode.nodeSize;
    const tr = view.state.tr
      .delete(target.pos, target.pos + target.node.nodeSize)
      .insert(previousPos, nodeToMove);
    tr.setSelection(NodeSelection.create(tr.doc, previousPos));
    view.dispatch(tr.scrollIntoView());
    view.focus();
    return true;
  }

  if (index >= parent.childCount - 1) return false;

  const nextNode = parent.child(index + 1);
  const tr = view.state.tr
    .delete(target.pos, target.pos + target.node.nodeSize)
    .insert(target.pos + nextNode.nodeSize, nodeToMove);
  tr.setSelection(NodeSelection.create(tr.doc, target.pos + nextNode.nodeSize));
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

function createInsertItems(
  view: EditorView,
  target: DragTarget,
  insertTable: () => void,
): BlockMenuItem[] {
  const { schema } = view.state;

  return [
    {
      id: "paragraph",
      label: "正文",
      description: "插入普通文本块",
      run: () => insertNodeAfter(view, target, createParagraph(schema)),
    },
    {
      id: "heading1",
      label: "标题 1",
      description: "插入大标题",
      run: () => insertNodeAfter(view, target, createHeading(schema, 1)),
    },
    {
      id: "heading2",
      label: "标题 2",
      description: "插入中标题",
      run: () => insertNodeAfter(view, target, createHeading(schema, 2)),
    },
    {
      id: "bulletList",
      label: "无序列表",
      description: "插入列表块",
      run: () => insertNodeAfter(view, target, createList(schema, "bulletList")),
    },
    {
      id: "taskList",
      label: "任务列表",
      description: "插入待办块",
      run: () => insertNodeAfter(view, target, createList(schema, "taskList")),
    },
    {
      id: "blockquote",
      label: "引用",
      description: "插入引用块",
      run: () => insertNodeAfter(view, target, createBlockquote(schema)),
    },
    {
      id: "codeBlock",
      label: "代码块",
      description: "插入代码块",
      run: () => insertNodeAfter(view, target, createCodeBlock(schema)),
    },
    {
      id: "table",
      label: "表格",
      description: "插入 3x3 表格",
      dividerBefore: true,
      run: insertTable,
    },
  ];
}

function createActionItems(view: EditorView, target: DragTarget): BlockMenuItem[] {
  const { schema } = view.state;
  const text = target.node.textContent;

  return [
    {
      id: "duplicate",
      label: "复制块",
      description: "在下方复制当前块",
      run: () => duplicateTargetNode(view, target),
    },
    {
      id: "delete",
      label: "删除块",
      description: "删除当前块",
      danger: true,
      run: () => deleteTargetNode(view, target),
    },
    {
      id: "moveUp",
      label: "上移",
      description: "与上一个块交换位置",
      dividerBefore: true,
      run: () => moveTarget(view, target, "up"),
    },
    {
      id: "moveDown",
      label: "下移",
      description: "与下一个块交换位置",
      run: () => moveTarget(view, target, "down"),
    },
    {
      id: "paragraph",
      label: "转成正文",
      description: "转换为普通段落",
      dividerBefore: true,
      run: () => replaceTargetNode(view, target, createParagraph(schema, text)),
    },
    {
      id: "heading1",
      label: "转成标题 1",
      description: "转换为大标题",
      run: () => replaceTargetNode(view, target, createHeading(schema, 1, text)),
    },
    {
      id: "heading2",
      label: "转成标题 2",
      description: "转换为中标题",
      run: () => replaceTargetNode(view, target, createHeading(schema, 2, text)),
    },
    {
      id: "heading3",
      label: "转成标题 3",
      description: "转换为小标题",
      run: () => replaceTargetNode(view, target, createHeading(schema, 3, text)),
    },
    {
      id: "blockquote",
      label: "转成引用",
      description: "转换为引用块",
      run: () => replaceTargetNode(view, target, createBlockquote(schema, text)),
    },
    {
      id: "bulletList",
      label: "转成无序列表",
      description: "转换为列表块",
      run: () => replaceTargetNode(view, target, createList(schema, "bulletList", text)),
    },
    {
      id: "orderedList",
      label: "转成有序列表",
      description: "转换为编号列表",
      run: () => replaceTargetNode(view, target, createList(schema, "orderedList", text)),
    },
    {
      id: "codeBlock",
      label: "转成代码块",
      description: "转换为代码块",
      run: () => replaceTargetNode(view, target, createCodeBlock(schema, text)),
    },
  ];
}

function renderBlockMenu(menu: HTMLElement, items: BlockMenuItem[], closeMenu: () => void): void {
  menu.replaceChildren();

  for (const item of items) {
    if (item.dividerBefore) {
      const divider = document.createElement("div");
      divider.className = "drag-handle-menu__divider";
      menu.appendChild(divider);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "drag-handle-menu__item";
    button.setAttribute("role", "menuitem");
    button.dataset.itemId = item.id;
    if (item.danger) {
      button.classList.add("is-danger");
    }

    const label = document.createElement("span");
    label.className = "drag-handle-menu__label";
    label.textContent = item.label;
    button.appendChild(label);

    if (item.description) {
      const description = document.createElement("span");
      description.className = "drag-handle-menu__description";
      description.textContent = item.description;
      button.appendChild(description);
    }

    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      item.run();
      closeMenu();
    });

    menu.appendChild(button);
  }
}

function positionBlockMenu(menu: HTMLElement, target: DragTarget, kind: BlockMenuKind): void {
  const targetRect = target.dom.getBoundingClientRect();
  const xOffset = kind === "insert" ? 28 : 4;

  menu.style.left = `${Math.max(8, targetRect.left - 240 + xOffset)}px`;
  menu.style.top = `${Math.max(8, targetRect.top)}px`;

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const margin = 8;
    let left = rect.left;
    let top = rect.top;

    if (rect.right + margin > window.innerWidth) {
      left = window.innerWidth - rect.width - margin;
    }

    if (rect.bottom + margin > window.innerHeight) {
      top = window.innerHeight - rect.height - margin;
    }

    menu.style.left = `${Math.max(margin, left)}px`;
    menu.style.top = `${Math.max(margin, top)}px`;
  });
}

export const DragHandleExtension = Extension.create({
  name: "dragHandle",

  addStorage() {
    return {
      isDragging: false,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const storage = this.storage;

    return [
      new Plugin({
        key: dragHandleKey,

        view(view) {
          const plusButton = createPlusButtonElement();
          const handle = createHandleElement();
          const menu = createBlockMenuElement();
          const handleRoot = view.dom.parentElement ?? view.dom;
          let currentTarget: DragTarget | null = null;
          let isDragging = false;
          let activeMenuKind: BlockMenuKind | null = null;

          const setDraggingState = (dragging: boolean) => {
            isDragging = dragging;
            storage.isDragging = dragging;
          };

          const closeMenu = () => {
            activeMenuKind = null;
            menu.classList.remove("is-visible", "is-insert-menu", "is-actions-menu");
            menu.replaceChildren();
          };

          const hideHandle = () => {
            if (isDragging || activeMenuKind) return;
            currentTarget = null;
            plusButton.classList.remove("is-visible");
            handle.classList.remove("is-visible");
          };

          const updateHandlePosition = (target: DragTarget) => {
            const rootRect = handleRoot.getBoundingClientRect();
            const targetRect = target.dom.getBoundingClientRect();

            plusButton.style.left = `${targetRect.left - rootRect.left - 68}px`;
            plusButton.style.top = `${targetRect.top - rootRect.top + targetRect.height / 2}px`;
            handle.style.left = `${targetRect.left - rootRect.left - 38}px`;
            handle.style.top = `${targetRect.top - rootRect.top + targetRect.height / 2}px`;
            plusButton.classList.add("is-visible");
            handle.classList.add("is-visible");

            if (activeMenuKind) {
              positionBlockMenu(menu, target, activeMenuKind);
            }
          };

          const handleMouseMove = (event: MouseEvent) => {
            if (isDragging) return;

            const target = findTargetFromCoords(view, event);
            if (!target || !hasBlockContent(target.node)) {
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
              (view.dom.contains(relatedTarget) ||
                handle.contains(relatedTarget) ||
                plusButton.contains(relatedTarget) ||
                menu.contains(relatedTarget))
            ) {
              return;
            }
            hideHandle();
          };

          const openMenu = (kind: BlockMenuKind) => {
            if (!currentTarget) return;

            const target = currentTarget;
            activeMenuKind = kind;
            menu.classList.toggle("theme-notion-menu", Boolean(view.dom.closest(".theme-notion")));
            menu.classList.toggle(
              "is-dark",
              Boolean(view.dom.closest('[data-theme="dark"], .dark')),
            );
            menu.classList.toggle("is-insert-menu", kind === "insert");
            menu.classList.toggle("is-actions-menu", kind === "actions");

            const insertTable = () => {
              setCursorAfterTarget(view, target);
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            };

            renderBlockMenu(
              menu,
              kind === "insert"
                ? createInsertItems(view, target, insertTable)
                : createActionItems(view, target),
              closeMenu,
            );
            positionBlockMenu(menu, target, kind);
            menu.classList.add("is-visible");
          };

          const toggleMenu = (kind: BlockMenuKind) => {
            if (activeMenuKind === kind) {
              closeMenu();
              return;
            }

            openMenu(kind);
          };

          plusButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });

          plusButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleMenu("insert");
          });

          handle.addEventListener("mousedown", (event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
          });

          handle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleMenu("actions");
          });

          handle.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openMenu("actions");
          });

          handle.addEventListener("dragstart", (event: DragEvent) => {
            if (!currentTarget || !event.dataTransfer) {
              event.preventDefault();
              return;
            }

            const selection = NodeSelection.create(view.state.doc, currentTarget.pos);
            const targetRect = currentTarget.dom.getBoundingClientRect();
            const dragImage = createTransparentDragImage(currentTarget.dom);

            setDraggingState(true);
            closeMenu();
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
            event.dataTransfer.setDragImage(
              dragImage,
              Math.min(24, targetRect.width / 2),
              Math.min(24, targetRect.height / 2),
            );
          });

          handle.addEventListener("dragend", () => {
            setDraggingState(false);
            handle.classList.remove("is-dragging");
            document.querySelectorAll(".drag-handle__drag-image").forEach((element) => {
              element.remove();
            });
            hideHandle();
          });

          const handleDocumentPointerDown = (event: MouseEvent) => {
            const target = event.target;
            if (
              target instanceof Node &&
              (menu.contains(target) || handle.contains(target) || plusButton.contains(target))
            ) {
              return;
            }
            closeMenu();
            hideHandle();
          };

          const handleDocumentKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
              closeMenu();
              hideHandle();
            }
          };

          handleRoot.appendChild(plusButton);
          handleRoot.appendChild(handle);
          document.body.appendChild(menu);
          view.dom.addEventListener("mousemove", handleMouseMove);
          view.dom.addEventListener("mouseleave", handleMouseLeave);
          document.addEventListener("mousedown", handleDocumentPointerDown);
          document.addEventListener("keydown", handleDocumentKeyDown);

          return {
            update(updatedView) {
              if (!currentTarget) return;

              const node = updatedView.state.doc.nodeAt(currentTarget.pos);
              const dom = getDomElement(updatedView, currentTarget.pos);
              if (
                !node ||
                !dom ||
                node.type.name !== currentTarget.node.type.name ||
                !hasBlockContent(node)
              ) {
                hideHandle();
                return;
              }

              currentTarget = { node, pos: currentTarget.pos, dom };
              updateHandlePosition(currentTarget);
            },

            destroy() {
              view.dom.removeEventListener("mousemove", handleMouseMove);
              view.dom.removeEventListener("mouseleave", handleMouseLeave);
              document.removeEventListener("mousedown", handleDocumentPointerDown);
              document.removeEventListener("keydown", handleDocumentKeyDown);
              plusButton.remove();
              handle.remove();
              menu.remove();
            },
          };
        },
      }),
    ];
  },
});
