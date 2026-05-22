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

const APPEARANCE_MENU_CLASSES = [
  "appearance-default",
  "appearance-word",
  "appearance-notion",
  "appearance-custom",
] as const;

function syncDragHandleMenuAppearance(menu: HTMLElement, view: EditorView): void {
  const editorRoot = view.dom.closest(".yaniv-editor");
  menu.classList.remove(...APPEARANCE_MENU_CLASSES);
  const matched = APPEARANCE_MENU_CLASSES.find((cls) => editorRoot?.classList.contains(cls));
  menu.classList.add(matched ?? "appearance-default");

  const colorMode = editorRoot?.getAttribute("data-color-mode");
  if (colorMode) {
    menu.setAttribute("data-color-mode", colorMode);
  } else {
    menu.removeAttribute("data-color-mode");
  }
}

export interface DragInsertMenuContext {
  targetPos: number;
  targetNodeSize: number;
  insertPos: number;
  anchorRect: DOMRect;
  blockRect: DOMRect;
}

export interface DragHandleOptions {
  onOpenInsertMenu?: (context: DragInsertMenuContext) => void;
  onCloseInsertMenu?: () => void;
  getMenuLabel?: (key: string) => string;
}

declare module "@tiptap/core" {
  interface Storage {
    dragHandle: {
      isDragging: boolean;
      insertMenuOpen: boolean;
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

type BlockMenuKind = "actions";

interface BlockMenuItem {
  id: string;
  label: string;
  description?: string;
  danger?: boolean;
  dividerBefore?: boolean;
  submenu?: BlockMenuItem[];
  run?: () => void;
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

const HANDLE_ZONE_SLOP = 12;

function isPointerInHandleZone(
  handle: HTMLElement,
  plusButton: HTMLElement,
  target: DragTarget,
  clientX: number,
  clientY: number,
): boolean {
  const targetRect = target.dom.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  const plusRect = plusButton.getBoundingClientRect();
  const slop = HANDLE_ZONE_SLOP;

  if (clientY < targetRect.top - slop || clientY > targetRect.bottom + slop) {
    return false;
  }

  const zoneLeft = Math.min(handleRect.left, plusRect.left) - slop;
  const zoneRight = targetRect.right + slop;

  return clientX >= zoneLeft && clientX <= zoneRight;
}

function isPointerOverHandleControls(
  handle: HTMLElement,
  plusButton: HTMLElement,
  menu: HTMLElement,
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Node)) return false;

  return handle.contains(target) || plusButton.contains(target) || menu.contains(target);
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
  plusButton.innerHTML =
    '<svg class="drag-handle-plus__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
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

function createTransformItems(
  view: EditorView,
  target: DragTarget,
  getMenuLabel: (key: string) => string,
): BlockMenuItem[] {
  const { schema } = view.state;
  const text = target.node.textContent;

  const transforms: Array<{ id: string; slashKey: string; run: () => void }> = [
    {
      id: "paragraph",
      slashKey: "paragraph",
      run: () => replaceTargetNode(view, target, createParagraph(schema, text)),
    },
    {
      id: "heading1",
      slashKey: "heading1",
      run: () => replaceTargetNode(view, target, createHeading(schema, 1, text)),
    },
    {
      id: "heading2",
      slashKey: "heading2",
      run: () => replaceTargetNode(view, target, createHeading(schema, 2, text)),
    },
    {
      id: "heading3",
      slashKey: "heading3",
      run: () => replaceTargetNode(view, target, createHeading(schema, 3, text)),
    },
    {
      id: "blockquote",
      slashKey: "blockquote",
      run: () => replaceTargetNode(view, target, createBlockquote(schema, text)),
    },
    {
      id: "bulletList",
      slashKey: "bulletList",
      run: () => replaceTargetNode(view, target, createList(schema, "bulletList", text)),
    },
    {
      id: "orderedList",
      slashKey: "orderedList",
      run: () => replaceTargetNode(view, target, createList(schema, "orderedList", text)),
    },
    {
      id: "codeBlock",
      slashKey: "codeBlock",
      run: () => replaceTargetNode(view, target, createCodeBlock(schema, text)),
    },
  ];

  return transforms.map(({ id, slashKey, run }) => ({
    id,
    label: getMenuLabel(`slashCommand.${slashKey}`),
    run,
  }));
}

function createActionItems(
  view: EditorView,
  target: DragTarget,
  getMenuLabel: (key: string) => string,
): BlockMenuItem[] {
  return [
    {
      id: "duplicate",
      label: getMenuLabel("dragMenu.duplicateBlock"),
      run: () => duplicateTargetNode(view, target),
    },
    {
      id: "delete",
      label: getMenuLabel("dragMenu.deleteBlock"),
      danger: true,
      run: () => deleteTargetNode(view, target),
    },
    {
      id: "turnInto",
      label: getMenuLabel("dragMenu.transformTo"),
      dividerBefore: true,
      submenu: createTransformItems(view, target, getMenuLabel),
    },
  ];
}

function renderBlockMenu(menu: HTMLElement, items: BlockMenuItem[], closeMenu: () => void): void {
  menu.replaceChildren();

  const createItemButton = (item: BlockMenuItem): HTMLElement => {
    const itemElement = document.createElement(item.submenu ? "div" : "button");
    itemElement.className = "drag-handle-menu__item";
    itemElement.setAttribute("role", "menuitem");
    itemElement.dataset.itemId = item.id;

    if (itemElement instanceof HTMLButtonElement) {
      itemElement.type = "button";
    }

    if (item.danger) {
      itemElement.classList.add("is-danger");
    }

    if (item.submenu) {
      itemElement.classList.add("has-submenu");
      itemElement.tabIndex = 0;
      itemElement.addEventListener("mouseenter", () => {
        itemElement.classList.add("is-submenu-open");
      });
      itemElement.addEventListener("mouseleave", () => {
        itemElement.classList.remove("is-submenu-open");
      });
    }

    const label = document.createElement("span");
    label.className = "drag-handle-menu__label";
    label.textContent = item.label;
    itemElement.appendChild(label);

    if (item.submenu) {
      const arrow = document.createElement("span");
      arrow.className = "drag-handle-menu__arrow";
      arrow.textContent = "›";
      itemElement.appendChild(arrow);

      const submenu = document.createElement("div");
      submenu.className = "drag-handle-menu__submenu";
      submenu.setAttribute("role", "menu");

      for (const submenuItem of item.submenu) {
        submenu.appendChild(createItemButton(submenuItem));
      }

      itemElement.appendChild(submenu);
    }

    if (item.description) {
      const description = document.createElement("span");
      description.className = "drag-handle-menu__description";
      description.textContent = item.description;
      itemElement.appendChild(description);
    }

    itemElement.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    itemElement.addEventListener("click", (event) => {
      event.preventDefault();

      if (item.submenu) return;

      item.run?.();
      closeMenu();
    });

    return itemElement;
  };

  for (const item of items) {
    if (item.dividerBefore) {
      const divider = document.createElement("div");
      divider.className = "drag-handle-menu__divider";
      menu.appendChild(divider);
    }

    menu.appendChild(createItemButton(item));
  }
}

function positionBlockMenu(menu: HTMLElement, target: DragTarget, anchor?: HTMLElement): void {
  const anchorRect = anchor?.getBoundingClientRect() ?? target.dom.getBoundingClientRect();
  const targetRect = target.dom.getBoundingClientRect();

  menu.style.left = `${Math.max(8, anchorRect.right + 10)}px`;
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

export const DragHandleExtension = Extension.create<DragHandleOptions>({
  name: "dragHandle",

  addOptions() {
    return {
      onOpenInsertMenu: undefined,
      onCloseInsertMenu: undefined,
      getMenuLabel: undefined,
    };
  },

  addStorage() {
    return {
      isDragging: false,
      insertMenuOpen: false,
    };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;
    const storage = this.storage;
    const getMenuLabel = extensionOptions.getMenuLabel ?? ((key: string) => key);

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

          const deactivateInteractive = () => {
            closeMenu();
            closeInsertMenu();
            if (isDragging) {
              setDraggingState(false);
              handle.classList.remove("is-dragging");
              document.querySelectorAll(".drag-handle__drag-image").forEach((element) => {
                element.remove();
              });
            }
            currentTarget = null;
            plusButton.classList.remove("is-visible");
            handle.classList.remove("is-visible");
          };

          const closeMenu = () => {
            activeMenuKind = null;
            menu.classList.remove("is-visible", "is-actions-menu");
            menu.replaceChildren();
          };

          const closeInsertMenu = () => {
            if (!storage.insertMenuOpen) return;
            storage.insertMenuOpen = false;
            extensionOptions.onCloseInsertMenu?.();
          };

          const hideHandle = () => {
            if (isDragging || activeMenuKind || storage.insertMenuOpen) return;
            currentTarget = null;
            plusButton.classList.remove("is-visible");
            handle.classList.remove("is-visible");
          };

          const updateHandlePosition = (target: DragTarget) => {
            const rootRect = handleRoot.getBoundingClientRect();
            const targetRect = target.dom.getBoundingClientRect();

            plusButton.style.left = `${targetRect.left - rootRect.left - 54}px`;
            plusButton.style.top = `${targetRect.top - rootRect.top + targetRect.height / 2}px`;
            handle.style.left = `${targetRect.left - rootRect.left - 30}px`;
            handle.style.top = `${targetRect.top - rootRect.top + targetRect.height / 2}px`;
            plusButton.classList.add("is-visible");
            handle.classList.add("is-visible");

            if (activeMenuKind === "actions") {
              positionBlockMenu(menu, target, handle);
            }
          };

          const shouldTrackPointer = (event: MouseEvent): boolean => {
            const { clientX, clientY } = event;
            const eventTarget = event.target;

            if (eventTarget instanceof Node && view.dom.contains(eventTarget)) {
              return true;
            }

            if (isPointerOverHandleControls(handle, plusButton, menu, eventTarget)) {
              return true;
            }

            if (
              currentTarget &&
              isPointerInHandleZone(handle, plusButton, currentTarget, clientX, clientY)
            ) {
              return true;
            }

            return false;
          };

          const handleMouseMove = (event: MouseEvent) => {
            if (!view.editable) {
              deactivateInteractive();
              return;
            }

            if (isDragging) return;

            if (!shouldTrackPointer(event)) {
              hideHandle();
              return;
            }

            const target =
              findTargetFromCoords(view, event) ??
              (currentTarget &&
              isPointerInHandleZone(handle, plusButton, currentTarget, event.clientX, event.clientY)
                ? currentTarget
                : null);

            if (
              (activeMenuKind || storage.insertMenuOpen) &&
              (!target ||
                !currentTarget ||
                target.pos !== currentTarget.pos ||
                target.dom !== currentTarget.dom)
            ) {
              closeMenu();
              closeInsertMenu();
            }

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
              (relatedTarget === handleRoot ||
                handleRoot.contains(relatedTarget) ||
                handle.contains(relatedTarget) ||
                plusButton.contains(relatedTarget) ||
                menu.contains(relatedTarget))
            ) {
              return;
            }

            if (
              currentTarget &&
              isPointerInHandleZone(handle, plusButton, currentTarget, event.clientX, event.clientY)
            ) {
              return;
            }

            hideHandle();
          };

          const keepHandleVisible = () => {
            if (!currentTarget) return;
            updateHandlePosition(currentTarget);
          };

          const openActionsMenu = () => {
            if (!view.editable || !currentTarget) return;

            const target = currentTarget;
            activeMenuKind = "actions";
            syncDragHandleMenuAppearance(menu, view);
            menu.classList.add("is-actions-menu");

            renderBlockMenu(menu, createActionItems(view, target, getMenuLabel), closeMenu);
            positionBlockMenu(menu, target, handle);
            menu.classList.add("is-visible");
          };

          const toggleActionsMenu = () => {
            if (activeMenuKind === "actions") {
              closeMenu();
              return;
            }

            openActionsMenu();
          };

          const openInsertMenu = () => {
            if (!view.editable || !currentTarget || !extensionOptions.onOpenInsertMenu) return;

            const target = currentTarget;
            if (storage.insertMenuOpen) {
              closeInsertMenu();
              return;
            }

            storage.insertMenuOpen = true;
            extensionOptions.onOpenInsertMenu({
              targetPos: target.pos,
              targetNodeSize: target.node.nodeSize,
              insertPos: target.pos + target.node.nodeSize,
              anchorRect: plusButton.getBoundingClientRect(),
              blockRect: target.dom.getBoundingClientRect(),
            });
          };

          plusButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
          });

          plusButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openInsertMenu();
          });

          handle.addEventListener("mousedown", (event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
          });

          handle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleActionsMenu();
          });

          handle.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openActionsMenu();
          });

          handle.addEventListener("dragstart", (event: DragEvent) => {
            if (!view.editable || !currentTarget || !event.dataTransfer) {
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
            if (target instanceof Node) {
              if (menu.contains(target) || handle.contains(target) || plusButton.contains(target)) {
                return;
              }

              if (
                target instanceof Element &&
                target.closest(".block-picker-menu, .block-picker-backdrop")
              ) {
                return;
              }
            }

            closeMenu();
            closeInsertMenu();
            hideHandle();
          };

          const handleDocumentKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
              closeMenu();
              closeInsertMenu();
              hideHandle();
            }
          };

          handleRoot.appendChild(plusButton);
          handleRoot.appendChild(handle);
          document.body.appendChild(menu);
          handle.addEventListener("mouseenter", keepHandleVisible);
          plusButton.addEventListener("mouseenter", keepHandleVisible);
          handleRoot.addEventListener("mousemove", handleMouseMove);
          handleRoot.addEventListener("mouseleave", handleMouseLeave);
          document.addEventListener("mousemove", handleMouseMove);
          document.addEventListener("mousedown", handleDocumentPointerDown);
          document.addEventListener("keydown", handleDocumentKeyDown);

          return {
            update(updatedView) {
              if (!updatedView.editable) {
                deactivateInteractive();
                return;
              }

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
              handle.removeEventListener("mouseenter", keepHandleVisible);
              plusButton.removeEventListener("mouseenter", keepHandleVisible);
              handleRoot.removeEventListener("mousemove", handleMouseMove);
              handleRoot.removeEventListener("mouseleave", handleMouseLeave);
              document.removeEventListener("mousemove", handleMouseMove);
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
