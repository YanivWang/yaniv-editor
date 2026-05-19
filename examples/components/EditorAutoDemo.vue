<template>
  <div v-if="visible" class="auto-demo">
    <!-- 控制按钮 -->
    <div class="auto-demo__controls">
      <button
        v-if="!isRunning && !isFinished"
        class="auto-demo__btn auto-demo__btn--play"
        @click="startDemo"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M8 5v14l11-7z" />
        </svg>
        <span>{{ playLabel }}</span>
      </button>
      <button v-if="isRunning" class="auto-demo__btn auto-demo__btn--stop" @click="stopDemo">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <rect fill="currentColor" x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        <span>{{ stopLabel }}</span>
      </button>
      <button v-if="isFinished" class="auto-demo__btn auto-demo__btn--replay" @click="replayDemo">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
          />
        </svg>
        <span>{{ replayLabel }}</span>
      </button>
    </div>

    <!-- 动画光标 (page-agent 风格: 平滑移动 + 点击涟漪) -->
    <Teleport to="body">
      <div v-show="cursorVisible" class="demo-cursor" :style="cursorStyle">
        <svg class="demo-cursor__arrow" width="16" height="22" viewBox="0 0 16 22" fill="none">
          <path
            d="M0.5 0.5L0.5 18L5 13L8.5 20.5L11 19.5L7.5 12L13 12L0.5 0.5Z"
            fill="black"
            stroke="white"
            stroke-width="1"
            stroke-linejoin="round"
          />
        </svg>
        <div
          :key="rippleKey"
          class="demo-cursor__ripple"
          :class="{ 'is-active': rippleActive }"
        ></div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * EditorAutoDemo - 增强版编辑器自动化演示
 * @description 结合 page-agent 的动画光标 + Maestro 的声明式动作，
 *              模拟真实用户操作编辑器，展示特色功能（P0/P1/P2：排版、媒体、AI、查找、格式刷、大纲、斜杠、浮动菜单、拖拽、缩放等）
 */
import { ref, computed, nextTick, onBeforeUnmount } from "vue";

import {
  builtinTemplates,
  normalizeTemplateHtml,
} from "../../src/components/editor/template/templates";
import { exportToWord } from "../../src/components/editor/word/wordExport";

import type { Editor as TiptapEditor } from "@tiptap/core";

/**
 * 演示脚本用的编辑器类型。
 * YanivEditor 在运行时注册了 StarterKit / 扩展命令，但 @tiptap/core 默认的 SingleCommands 未包含它们。
 */
type DemoEditor = Omit<TiptapEditor, "commands"> & {
  commands: Record<string, (...args: unknown[]) => boolean>;
};

interface Props {
  getEditor: () => DemoEditor | null;
  visible?: boolean;
  typingSpeed?: number;
  playLabel?: string;
  stopLabel?: string;
  replayLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  typingSpeed: 40,
  playLabel: "Watch Demo",
  stopLabel: "Stop",
  replayLabel: "Replay",
});

const emit = defineEmits<{
  start: [];
  stop: [];
  finish: [];
}>();

const isRunning = ref(false);
const isFinished = ref(false);
let abortController: AbortController | null = null;

// ===== 光标状态 =====

const cursorVisible = ref(false);
const cursorX = ref(0);
const cursorY = ref(0);
const rippleActive = ref(false);
const rippleKey = ref(0);

const cursorStyle = computed(() => ({
  transform: `translate(${cursorX.value}px, ${cursorY.value}px)`,
}));

// ===== 基础工具 =====

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function pause(ms: number, signal: AbortSignal) {
  await delay(ms, signal);
}

/** 安全执行编辑器命令，避免单次失败中断整段演示 */
function safeEditorRun(fn: () => unknown): boolean {
  try {
    fn();
    return true;
  } catch (error) {
    console.warn("[EditorAutoDemo] Editor command skipped:", error);
    return false;
  }
}

/** 基于当前文档状态创建 chain，避免 stale transaction */
function runEditorChain(
  editor: DemoEditor,
  build: (chain: ReturnType<DemoEditor["chain"]>) => ReturnType<DemoEditor["chain"]>,
) {
  return safeEditorRun(() => {
    build(editor.chain().focus()).run();
  });
}

/** 等待 ProseMirror / 格式刷等插件处理完异步选区变更 */
async function settleEditor(signal: AbortSignal) {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await pause(50, signal);
}

/** 分节执行：单节失败不阻断后续图片、AI 等演示 */
async function runDemoSection(label: string, signal: AbortSignal, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    console.warn(`[EditorAutoDemo] Section "${label}" skipped:`, error);
  }
}

// ===== 光标动画引擎 =====

function moveCursorTo(x: number, y: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const startX = cursorX.value;
    const startY = cursorY.value;
    const dist = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
    const duration = Math.min(Math.max(dist * 1.5, 200), 800);
    const startTime = performance.now();

    let rafId: number;
    const onAbort = () => {
      cancelAnimationFrame(rafId);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    function ease(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const e = ease(progress);

      cursorX.value = startX + (x - startX) * e;
      cursorY.value = startY + (y - startY) * e;

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }
    }

    rafId = requestAnimationFrame(animate);
  });
}

async function triggerRipple(signal: AbortSignal) {
  rippleActive.value = false;
  rippleKey.value++;
  await nextTick();
  rippleActive.value = true;
  await delay(350, signal);
  rippleActive.value = false;
}

// ===== DOM 查询 =====

/** 图标名 → anticon class */
const ICON_MAP: Record<string, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  strike: "strikethrough",
  orderedList: "ordered-list",
  bulletList: "unordered-list",
  taskList: "check-square",
  code: "code",
  undo: "undo",
  redo: "redo",
  link: "link",
  picture: "picture",
  textColor: "font-colors",
  highlight: "highlight",
  table: "table",
  superscript: "sort-descending",
  subscript: "sort-ascending",
  heading: "font-size",
  findReplace: "search",
  formatPainter: "format-painter",
  outline: "apartment",
  math: "function",
  word: "file-word",
  template: "snippets",
  gallery: "appstore",
  video: "video-camera",
};

const SLASH_COMMAND_LABELS: Record<string, string[]> = {
  codeBlock: ["Code Block", "代码块"],
  table: ["Table", "表格"],
  blockquote: ["Blockquote", "引用"],
};

const ALIGN_MENU_LABELS: Record<string, string[]> = {
  right: ["Align Right", "右对齐"],
  justify: ["Justify", "两端对齐", "两端"],
};

const CODE_DROPDOWN_LABELS: Record<string, string[]> = {
  inlineCode: ["Inline Code", "行内代码"],
};

const DEMO_LINK_URL = "https://github.com/YanivWang/yaniv-editor";
const DEMO_IMAGE_URL = "https://picsum.photos/seed/yaniv-editor-demo/520/180";
const DEMO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const DEMO_WORD_IMPORT_HTML =
  "<h3>Imported from Word</h3><p>Sample content converted from <strong>.docx</strong> (mammoth).</p>";

const WORD_MENU_LABELS: Record<string, string[]> = {
  import: ["Import Word", "导入 Word", "导入"],
  export: ["Export Word", "导出 Word", "导出"],
};

const MATH_MENU_LABELS: Record<string, string[]> = {
  inline: ["Inline Formula", "行内公式", "Inline"],
  block: ["Block Formula", "块级公式", "Block"],
};

const AI_MENU_LABELS: Record<string, string[]> = {
  polish: ["Polish", "润色"],
  summarize: ["Summarize", "摘要"],
  translate: ["Translate", "翻译"],
  continueWriting: ["Continue Writing", "续写"],
};

interface TapOptions {
  /** 触发原生 click（用于打开下拉、Popover 等） */
  click?: boolean;
}

/**
 * 查找工具栏按钮 (支持直接按钮 + 下拉按钮 + AI 按钮)
 */
function findToolbarButton(id: string): HTMLElement | null {
  // AI 按钮（兼容 AiMenuButton 与 AiToolbarMenu）
  if (id === "ai") {
    return (
      document.querySelector(".ai-menu-button") || document.querySelector(".ai-toolbar-trigger")
    );
  }

  // Heading 按钮: 按 data-level 或文本内容
  if (/^h[1-6]$/.test(id)) {
    const level = id.slice(1);
    const byData =
      document.querySelector(`[data-level="${level}"] .tt-toolbar-button`) ||
      document.querySelector(`.tt-toolbar-button[data-level="${level}"]`);
    if (byData) return byData as HTMLElement;
    const buttons = document.querySelectorAll(".tt-toolbar-button");
    for (const btn of buttons) {
      if (btn.textContent?.trim() === `H${level}`) return btn as HTMLElement;
    }
    return null;
  }

  // Align 下拉按钮 (图标随状态变化)
  if (id === "align") {
    for (const cls of ["align-left", "align-center", "align-right", "menu"]) {
      const icon = document.querySelector(`.anticon-${cls}`);
      const btn = icon?.closest(".tt-dropdown-btn") as HTMLElement;
      if (btn) return btn;
    }
    return null;
  }

  // 图标按钮 (同时搜索直接按钮和下拉按钮)
  if (ICON_MAP[id]) {
    const icon = document.querySelector(`.anticon-${ICON_MAP[id]}`);
    if (icon) {
      return icon.closest(".tt-toolbar-button") || icon.closest(".tt-dropdown-btn");
    }
    return null;
  }

  return document.querySelector(id);
}

function findToolbarControl(id: string): HTMLElement | null {
  if (id === "fontFamily") {
    return document.querySelector(".font-family-select .ant-select-selector");
  }
  if (id === "fontSize") {
    return document.querySelector(".font-size-select .ant-select-selector");
  }
  return findToolbarButton(id);
}

function findSlashCommandItem(itemId: string): HTMLElement | null {
  const labels = SLASH_COMMAND_LABELS[itemId] ?? [];
  for (const btn of document.querySelectorAll(".slash-command-item")) {
    const title = btn.querySelector(".slash-command-item-title")?.textContent?.trim() ?? "";
    if (labels.some((label) => title.includes(label))) {
      return btn as HTMLElement;
    }
  }
  return null;
}

function findTableBubbleButton(toolName: "addRowAfter" | "mergeCells"): HTMLElement | null {
  const menu = document.querySelector(".table-bubble-menu");
  if (!menu) return null;
  const buttons = menu.querySelectorAll(".table-menu-btn");
  const indexMap: Record<typeof toolName, number> = {
    addRowAfter: 1,
    mergeCells: 6,
  };
  return (buttons[indexMap[toolName]] as HTMLElement) ?? null;
}

function getCenter(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// ===== 文本位置查找 (ProseMirror) =====

/**
 * 在文档中查找文本的最后一次出现位置
 */
function findLastTextPos(
  editor: DemoEditor,
  searchText: string,
): { from: number; to: number } | null {
  let lastMatch: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      let idx = -1;
      let start = 0;
      while ((idx = node.text.indexOf(searchText, start)) !== -1) {
        lastMatch = { from: pos + idx, to: pos + idx + searchText.length };
        start = idx + 1;
      }
    }
  });
  return lastMatch;
}

function findSubtextPos(
  editor: DemoEditor,
  context: string,
  target: string,
): { from: number; to: number } | null {
  let result: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const ctxIdx = node.text.lastIndexOf(context);
      if (ctxIdx !== -1) {
        const tgtIdx = context.indexOf(target);
        if (tgtIdx !== -1) {
          const from = pos + ctxIdx + tgtIdx;
          result = { from, to: from + target.length };
        }
      }
    }
  });
  return result;
}

// ===== 声明式动作 (Maestro 风格) =====

function isElementVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

async function tapElement(
  el: Element | null | undefined,
  signal: AbortSignal,
  options?: TapOptions,
) {
  signal.throwIfAborted();
  if (!(el instanceof HTMLElement)) {
    await pause(100, signal);
    return;
  }

  const { x, y } = getCenter(el);
  await moveCursorTo(x, y, signal);

  el.style.setProperty("background", "var(--menu-btn-hover-bg, #f5f5f5)");
  await pause(120, signal);

  el.style.setProperty("background", "#ddd");
  await triggerRipple(signal);
  el.style.removeProperty("background");

  if (options?.click) {
    el.click();
  }

  await pause(100, signal);
}

async function tapOn(
  buttonId: string,
  signal: AbortSignal,
  action?: () => void,
  options?: TapOptions,
) {
  signal.throwIfAborted();
  const el = findToolbarButton(buttonId);
  await tapElement(el, signal, options);
  if (action) safeEditorRun(action);
  await pause(100, signal);
}

async function tapControl(
  controlId: string,
  signal: AbortSignal,
  action?: () => void,
  options?: TapOptions,
) {
  signal.throwIfAborted();
  const el = findToolbarControl(controlId);
  await tapElement(el, signal, options);
  action?.();
  await pause(100, signal);
}

async function selectSlashCommand(editor: DemoEditor, itemId: string, signal: AbortSignal) {
  await pause(350, signal);
  const el = findSlashCommandItem(itemId);
  if (el) {
    await tapElement(el, signal, { click: true });
  } else if (itemId === "codeBlock") {
    safeEditorRun(() => editor.commands.setCodeBlock({ language: "typescript" }));
  } else if (itemId === "table") {
    runEditorChain(editor, (chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }));
  } else if (itemId === "blockquote") {
    safeEditorRun(() => editor.commands.setBlockquote());
  }
  await pause(150, signal);
  await dismissAllPopups(editor, signal);
}

function findDropdownMenuItem(labels: string[]): HTMLElement | null {
  for (const item of document.querySelectorAll(".ant-dropdown-menu-item")) {
    if (!isElementVisible(item)) continue;
    const text = item.textContent?.trim() ?? "";
    if (labels.some((label) => text.includes(label))) {
      return item as HTMLElement;
    }
  }
  return null;
}

async function tapAlignOption(
  editor: DemoEditor,
  align: "right" | "justify",
  signal: AbortSignal,
  action: () => void,
) {
  await tapOn("align", signal, undefined, { click: true });
  await pause(250, signal);
  const item = findDropdownMenuItem(ALIGN_MENU_LABELS[align] ?? []);
  if (item) {
    await tapElement(item, signal, { click: true });
  }
  action();
  await pause(150, signal);
  await dismissAllPopups(editor, signal);
}

async function tapCodeDropdownItem(
  editor: DemoEditor,
  itemKey: keyof typeof CODE_DROPDOWN_LABELS,
  signal: AbortSignal,
) {
  await tapOn("code", signal, undefined, { click: true });
  await pause(250, signal);
  const item = findDropdownMenuItem(CODE_DROPDOWN_LABELS[itemKey] ?? []);
  if (item) {
    await tapElement(item, signal, { click: true });
  } else {
    safeEditorRun(() => editor.commands.toggleCode());
  }
  await pause(150, signal);
  await dismissAllPopups(editor, signal);
}

async function demoFloatingMenu(
  editor: DemoEditor,
  searchText: string,
  signal: AbortSignal,
  applyBold = true,
) {
  await selectText(editor, searchText, signal);
  await pause(450, signal);

  const menu = document.querySelector(".bubble-menu.floating-menu");
  const boldIcon = menu?.querySelector(".anticon-bold");
  const boldBtn = boldIcon?.closest(".tt-toolbar-button") as HTMLElement | null;

  if (boldBtn && applyBold) {
    await tapElement(boldBtn, signal, { click: true });
    editor.commands.toggleBold();
  } else if (applyBold) {
    editor.commands.toggleBold();
  }

  await pause(300, signal);
}

async function demoLinkBubbleMenu(editor: DemoEditor, searchText: string, signal: AbortSignal) {
  const match = findLastTextPos(editor, searchText);
  if (!match) return;

  safeEditorRun(() => editor.commands.setTextSelection(match));
  await settleEditor(signal);
  if (!editor.isActive("link")) return;

  await pause(450, signal);

  const bubble = document.querySelector(".link-bubble-menu-content");
  const editBtn = bubble?.querySelector(".link-action-btn") as HTMLElement | null;
  if (editBtn) {
    await tapElement(editBtn, signal, { click: true });
    await pause(250, signal);
    await dismissAllPopups(editor, signal);
  }
}

async function showDragHandleAtText(editor: DemoEditor, searchText: string, signal: AbortSignal) {
  const match = findLastTextPos(editor, searchText);
  if (!match) return;

  editor.commands.setTextSelection(match.from);
  await pause(150, signal);

  try {
    const coords = editor.view.coordsAtPos(match.from);
    const editorDom = editor.view.dom;
    const rect = editorDom.getBoundingClientRect();
    const paddingLeft = Number.parseFloat(window.getComputedStyle(editorDom).paddingLeft) || 0;
    const clientX = rect.left + Math.max(paddingLeft * 0.35, 12);
    const clientY = coords.top + 12;

    editorDom.dispatchEvent(
      new MouseEvent("mousemove", { clientX, clientY, bubbles: true, cancelable: true }),
    );
    await pause(300, signal);

    const handle = document.querySelector(".drag-handle.is-visible");
    if (handle) {
      await tapElement(handle, signal);
      handle.classList.add("is-dragging");
      await pause(350, signal);
      handle.classList.remove("is-dragging");
    }
  } catch {
    /* ignore */
  }
}

function queryVisible(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector)).filter(isElementVisible) as HTMLElement[];
}

async function closeTopModal(signal: AbortSignal) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await pause(200, signal);
}

async function dismissMathEditor(signal: AbortSignal) {
  const acceptBtn = Array.from(document.querySelectorAll("button")).find((btn) => {
    const label = btn.textContent?.trim() ?? "";
    return label === "接受" || label === "Accept";
  });
  if (acceptBtn) {
    await tapElement(acceptBtn, signal, { click: true });
    await pause(150, signal);
  }
}

async function clickAllModalCloses(signal: AbortSignal) {
  for (const btn of queryVisible(".ant-modal-close")) {
    await tapElement(btn, signal, { click: true });
    await pause(120, signal);
  }
}

/** 再次点击已展开的工具栏下拉，使其收起 */
async function dismissOpenDropdownTriggers(signal: AbortSignal) {
  const selectors = [
    ".ant-dropdown-open",
    '.tt-dropdown-btn[aria-expanded="true"]',
    ".ant-dropdown-trigger.ant-dropdown-open",
  ];
  for (const selector of selectors) {
    for (const el of queryVisible(selector)) {
      await tapElement(el, signal, { click: true });
      await pause(100, signal);
    }
  }
}

async function dismissFindReplaceModal(signal: AbortSignal) {
  const panel = document.querySelector(".tp-find-replace");
  if (!panel || !isElementVisible(panel)) return;

  const closeBtn = panel
    .closest(".ant-modal")
    ?.querySelector(".ant-modal-close") as HTMLElement | null;
  if (closeBtn) {
    await tapElement(closeBtn, signal, { click: true });
  } else {
    await closeTopModal(signal);
  }
  await pause(200, signal);
}

/** 点击编辑区，收起工具栏 Dropdown / 子菜单 */
async function dismissToolbarDropdowns(editor: DemoEditor, signal: AbortSignal) {
  await moveToEditor(editor, signal);
  safeEditorRun(() => editor.commands.focus());

  const dom = editor.view.dom;
  const rect = dom.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + Math.min(rect.height / 2, 80);

  for (const type of ["mousedown", "mouseup", "click"] as const) {
    dom.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        view: window,
      }),
    );
  }
  await pause(180, signal);
}

/**
 * 关闭演示过程中打开的所有浮层：Modal、查找替换、代码语言菜单、公式编辑器等
 */
async function dismissAllPopups(editor: DemoEditor, signal: AbortSignal) {
  await dismissMathEditor(signal);
  await dismissFindReplaceModal(signal);
  await clickAllModalCloses(signal);

  // 点击页面空白处，收起挂到 body 的 Dropdown / Popover
  for (const type of ["mousedown", "mouseup", "click"] as const) {
    document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
  }
  await pause(100, signal);

  await dismissOpenDropdownTriggers(signal);
  await dismissToolbarDropdowns(editor, signal);

  for (let i = 0; i < 2; i++) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await pause(100, signal);
  }
}

/** 演示结束或关键节点：多次清理，避免浮层叠在一起 */
async function closeAllOverlays(editor: DemoEditor, signal: AbortSignal) {
  for (let i = 0; i < 3; i++) {
    await dismissAllPopups(editor, signal);
  }
}

async function tapWordMenuItem(editor: DemoEditor, item: "import" | "export", signal: AbortSignal) {
  await tapOn("word", signal, undefined, { click: true });
  await pause(250, signal);
  const itemEl = findDropdownMenuItem(WORD_MENU_LABELS[item] ?? []);
  if (itemEl) {
    await tapElement(itemEl, signal, { click: true });
  }
  await pause(200, signal);
  await dismissAllPopups(editor, signal);
}

async function demoMathInsert(
  editor: DemoEditor,
  type: "inline" | "block",
  latex: string,
  signal: AbortSignal,
) {
  let insertedViaMenu = false;
  const mathBtn = findToolbarButton("math");

  if (mathBtn) {
    await tapOn("math", signal, undefined, { click: true });
    await pause(250, signal);
    const menuItem = findDropdownMenuItem(MATH_MENU_LABELS[type] ?? []);
    if (menuItem) {
      await tapElement(menuItem, signal, { click: true });
      insertedViaMenu = true;
      await pause(200, signal);
    }
  }

  await moveToEditor(editor, signal);
  if (insertedViaMenu && editor.isActive("math")) {
    safeEditorRun(() => editor.commands.updateMath(latex));
    await pause(200, signal);
    await dismissMathEditor(signal);
  } else {
    safeEditorRun(() => {
      const chain = editor.chain().focus() as any;
      if (type === "inline") {
        chain.insertInlineMath(latex).run();
      } else {
        chain.insertBlockMath(latex).run();
      }
    });
  }
  await pause(300, signal);
  await dismissAllPopups(editor, signal);
}

async function demoTemplateInsert(editor: DemoEditor, signal: AbortSignal) {
  await tapOn("template", signal, undefined, { click: true });
  await pause(350, signal);

  const card = document.querySelector(".template-card");
  if (card) {
    await tapElement(card, signal, { click: true });
  } else {
    const tpl = builtinTemplates[0];
    if (tpl) {
      editor.chain().focus().insertContent(normalizeTemplateHtml(tpl.content)).run();
    }
  }
  await dismissAllPopups(editor, signal);
}

async function demoGalleryInsert(editor: DemoEditor, signal: AbortSignal) {
  await tapOn("gallery", signal, undefined, { click: true });
  await pause(400, signal);

  const firstItem = document.querySelector(".gallery-item");
  if (firstItem) {
    await tapElement(firstItem, signal, { click: true });
    await pause(200, signal);
    const insertBtn = document.querySelector(".gallery-footer .ant-btn-primary");
    if (insertBtn) {
      await tapElement(insertBtn, signal, { click: true });
    }
  } else {
    editor.chain().focus().setImage({ src: DEMO_IMAGE_URL, alt: "Gallery demo" }).run();
  }

  await dismissAllPopups(editor, signal);
}

async function demoVideoInsert(editor: DemoEditor, signal: AbortSignal) {
  await tapOn("video", signal, undefined, { click: true });
  await pause(300, signal);
  editor
    .chain()
    .focus()
    .insertContent({ type: "video", attrs: { src: DEMO_VIDEO_URL } })
    .run();
  await dismissAllPopups(editor, signal);
}

async function demoZoomFooter(signal: AbortSignal) {
  const footer = document.querySelector(".footer-nav-container");
  if (!footer) return;

  const buttons = footer.querySelectorAll(".ant-btn");
  const zoomOut = buttons[0] as HTMLElement | undefined;
  const resetBtn = buttons[2] as HTMLElement | undefined;

  if (zoomOut) {
    await tapElement(zoomOut, signal, { click: true });
    await pause(150, signal);
    await tapElement(zoomOut, signal, { click: true });
    await pause(300, signal);
  }

  if (resetBtn) {
    await tapElement(resetBtn, signal, { click: true });
    await pause(250, signal);
  }
}

async function prepareFindReplace(editor: DemoEditor, signal: AbortSignal) {
  editor.commands.setSearchReplaceTerm("draft");
  editor.commands.setSearchReplaceReplaceTerm("final");
  editor.commands.resetSearchReplaceIndex();
  await pause(200, signal);
}

async function tapFindReplaceModalAction(action: "findNext" | "replace", signal: AbortSignal) {
  const buttons = document.querySelectorAll(".tp-find-replace-actions .ant-btn");
  const index = action === "replace" ? 2 : 1;
  await tapElement(buttons[index] ?? null, signal, { click: true });
}

function findAiMenuItem(menuKey: string): HTMLElement | null {
  for (const selector of [
    `.ant-dropdown-menu-item[data-menu-id="${menuKey}"]`,
    `.ant-dropdown-menu-item[data-menu-id$="/${menuKey}"]`,
  ]) {
    const el = document.querySelector(selector);
    if (el && isElementVisible(el)) return el as HTMLElement;
  }

  const labels = AI_MENU_LABELS[menuKey] ?? [];
  for (const item of document.querySelectorAll(".ant-dropdown-menu-item")) {
    if (!isElementVisible(item)) continue;
    const text = item.textContent?.trim() ?? "";
    if (labels.some((label) => text.includes(label))) {
      return item as HTMLElement;
    }
  }

  return null;
}

async function hoverAiMenuItem(menuKey: string, signal: AbortSignal) {
  const el = findAiMenuItem(menuKey);
  if (!el) return;

  const { x, y } = getCenter(el);
  await moveCursorTo(x, y, signal);
  el.style.setProperty("background", "var(--menu-btn-hover-bg, #f5f5f5)");
  await pause(400, signal);
  el.style.removeProperty("background");
}

async function openAiMenu(signal: AbortSignal) {
  await tapOn("ai", signal, undefined, { click: true });
  await pause(350, signal);
}

async function closeAiMenu(editor: DemoEditor, signal: AbortSignal) {
  await dismissAllPopups(editor, signal);
}

async function moveToEditor(editor: DemoEditor, signal: AbortSignal) {
  try {
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    await moveCursorTo(coords.left + 4, coords.top - 4, signal);
  } catch {
    const editorEl = editor.view.dom;
    const { x, y } = getCenter(editorEl);
    await moveCursorTo(x, y, signal);
  }
}

async function typeText(editor: DemoEditor, text: string, speed: number, signal: AbortSignal) {
  for (let i = 0; i < text.length; i++) {
    signal.throwIfAborted();
    if (!safeEditorRun(() => editor.commands.insertContent(text[i]))) return;

    if (i % 8 === 0) {
      try {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        cursorX.value += (coords.left + 4 - cursorX.value) * 0.25;
        cursorY.value += (coords.top - 4 - cursorY.value) * 0.25;
      } catch {
        /* ignore */
      }
    }

    await delay(speed, signal);
  }
}

/**
 * 模拟 AI 流式输出 (变速打字 + 句尾停顿)
 */
async function simulateAiStream(editor: DemoEditor, text: string, signal: AbortSignal) {
  for (let i = 0; i < text.length; i++) {
    signal.throwIfAborted();
    if (!safeEditorRun(() => editor.commands.insertContent(text[i]))) return;

    const char = text[i];
    let charDelay = 10 + Math.random() * 15;
    if (char === "." || char === "!" || char === "?") charDelay = 50;
    else if (char === ",") charDelay = 25;
    else if (char === " ") charDelay = 5;

    // 偶尔突发 (无延迟)
    if (Math.random() < 0.3) charDelay = 0;

    if (i % 12 === 0) {
      try {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        cursorX.value += (coords.left + 4 - cursorX.value) * 0.25;
        cursorY.value += (coords.top - 4 - cursorY.value) * 0.25;
      } catch {
        /* ignore */
      }
    }

    if (charDelay > 0) await delay(charDelay, signal);
  }
}

/**
 * 选择文本 (基于 ProseMirror 节点精准查找)
 */
async function selectText(editor: DemoEditor, searchText: string, signal: AbortSignal) {
  const match = findLastTextPos(editor, searchText);
  if (!match) return;

  try {
    const coords = editor.view.coordsAtPos(match.from);
    await moveCursorTo(coords.left, coords.top, signal);
    await pause(150, signal);
  } catch {
    /* ignore */
  }

  safeEditorRun(() => editor.commands.setTextSelection(match));
  await settleEditor(signal);
}

/**
 * 在上下文中选择子文本 (例如: 在 "mc2" 中选中 "2")
 */
async function selectSubtext(
  editor: DemoEditor,
  context: string,
  target: string,
  signal: AbortSignal,
) {
  const match = findSubtextPos(editor, context, target);
  if (!match) return;

  try {
    const coords = editor.view.coordsAtPos(match.from);
    await moveCursorTo(coords.left, coords.top, signal);
    await pause(150, signal);
  } catch {
    /* ignore */
  }

  safeEditorRun(() => editor.commands.setTextSelection(match));
  await settleEditor(signal);
}

function newLine(editor: DemoEditor) {
  safeEditorRun(() => editor.commands.enter());
  safeEditorRun(() => editor.commands.setParagraph());
}

function exitBlock(editor: DemoEditor) {
  safeEditorRun(() => editor.commands.enter());
  safeEditorRun(() => editor.commands.enter());
}

function moveCursorToEnd(editor: DemoEditor) {
  safeEditorRun(() => {
    const end = editor.state.doc.content.size;
    editor.commands.setTextSelection(Math.max(1, end - 1));
  });
}

function resetFormatPainter(editor: DemoEditor) {
  safeEditorRun(() => editor.commands.cancelFormatPainting());
}

// ===== 演示脚本: 全功能展示 (含 AI) =====

async function runDemoScript(editor: DemoEditor, signal: AbortSignal) {
  const speed = props.typingSpeed;
  const fast = Math.max(Math.floor(speed / 2), 15);

  safeEditorRun(() => editor.commands.clearContent());
  resetFormatPainter(editor);
  await closeAllOverlays(editor, signal);
  cursorX.value = window.innerWidth / 2;
  cursorY.value = window.innerHeight / 2;
  cursorVisible.value = true;
  await pause(400, signal);

  await runDemoSection("intro-align", signal, async () => {
    // ===== 1. 标题 + 居中对齐 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 1 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Yaniv Editor - Feature Showcase", speed, signal);
    await pause(300, signal);

    await tapOn("align", signal, () => editor.commands.setTextAlign("center"));
    await pause(400, signal);

    editor.commands.enter();
    editor.commands.setParagraph();
    editor.commands.setTextAlign("left");
    await pause(200, signal);

    // H3 + 右对齐 / 两端对齐
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 3 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "H3 subsection — alignment options below.", speed, signal);
    await pause(250, signal);

    await tapAlignOption(editor, "right", signal, () => editor.commands.setTextAlign("right"));
    await moveToEditor(editor, signal);
    await typeText(editor, "Right-aligned paragraph for layout demos.", speed, signal);
    await pause(250, signal);
    newLine(editor);

    await tapAlignOption(editor, "justify", signal, () => editor.commands.setTextAlign("justify"));
    await moveToEditor(editor, signal);
    await typeText(
      editor,
      "Justified text fills the line width evenly across the full editor page.",
      speed,
      signal,
    );
    await pause(300, signal);
    editor.commands.setParagraph();
    editor.commands.setTextAlign("left");
    exitBlock(editor);

    // ===== 2. 文本格式 (先输入，再选中格式化) =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Rich Text Formatting", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await moveToEditor(editor, signal);
    await typeText(
      editor,
      "This editor supports bold, italic, underline and strikethrough styles.",
      speed,
      signal,
    );
    await pause(400, signal);

    // 选中每个关键词并格式化
    await selectText(editor, "bold", signal);
    await tapOn("bold", signal, () => editor.commands.toggleBold());

    await selectText(editor, "italic", signal);
    await tapOn("italic", signal, () => editor.commands.toggleItalic());

    await selectText(editor, "underline", signal);
    await tapOn("underline", signal, () => {
      (editor.chain().focus() as any).toggleUnderline().run();
    });

    await selectText(editor, "strikethrough", signal);
    await tapOn("strike", signal, () => editor.commands.toggleStrike());

    // 行内代码
    await selectText(editor, "styles", signal);
    await tapCodeDropdownItem(editor, "inlineCode", signal);

    await pause(300, signal);
    newLine(editor);

    // 浮动菜单（选中文本时出现）
    await demoFloatingMenu(editor, "supports", signal);

    // 颜色 + 撤销重做
    await moveToEditor(editor, signal);
    await typeText(editor, "Highlight important ideas in your document.", speed, signal);
    await pause(300, signal);

    await selectText(editor, "important", signal);
    await tapOn("textColor", signal, () => {
      editor.chain().focus().setColor("#e74c3c").run();
    });

    await selectText(editor, "important", signal);
    await tapOn("highlight", signal, () => {
      editor.chain().focus().setHighlight({ color: "#fff3cd" }).run();
    });

    // 单行插入，避免与上文逐字输入共享撤销栈导致文档错乱
    await moveToEditor(editor, signal);
    safeEditorRun(() => editor.commands.insertContent(" Try undo and redo on this word."));
    await pause(200, signal);
    await selectText(editor, "undo", signal);
    await tapOn("bold", signal, () => editor.commands.toggleBold());
    await pause(200, signal);
    await tapOn("undo", signal, () => editor.commands.undo());
    await pause(200, signal);
    await tapOn("redo", signal, () => editor.commands.redo());

    await pause(300, signal);
    newLine(editor);

    // 字体与字号
    await moveToEditor(editor, signal);
    await typeText(editor, "Typography controls for font family and size.", speed, signal);
    await pause(200, signal);

    await selectText(editor, "Typography", signal);
    await tapControl("fontFamily", signal, () => {
      editor.chain().focus().setFontFamily("Arial").run();
    });

    await selectText(editor, "size", signal);
    await tapControl("fontSize", signal, () => {
      editor.chain().focus().setFontSize("20px").run();
    });

    await pause(300, signal);
    newLine(editor);

    // 格式刷
    await moveToEditor(editor, signal);
    await typeText(editor, "Source style sample.", speed, signal);
    safeEditorRun(() => editor.commands.enter());
    await typeText(editor, "Plain target line.", speed, signal);
    await pause(200, signal);

    resetFormatPainter(editor);
    await selectText(editor, "Source style", signal);
    safeEditorRun(() => editor.commands.toggleBold());
    runEditorChain(editor, (chain) => chain.setColor("#2563eb"));
    await tapOn("formatPainter", signal, () => editor.commands.startFormatPainting(1));
    await settleEditor(signal);

    await selectText(editor, "Plain target", signal);
    await settleEditor(signal);
    safeEditorRun(() => editor.commands.applyFormat());
    resetFormatPainter(editor);
    await settleEditor(signal);

    await pause(400, signal);
    moveCursorToEnd(editor);
    exitBlock(editor);
  });

  await runDemoSection("lists", signal, async () => {
    // ===== 3. 有序列表 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Feature Highlights", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await tapOn("orderedList", signal, () => editor.commands.toggleOrderedList());
    await moveToEditor(editor, signal);
    await typeText(editor, "20+ pluggable toolbar features", speed, signal);
    safeEditorRun(() => editor.commands.enter());
    await typeText(editor, "5 theme presets: Word, Notion, GitHub, Typora, Default", speed, signal);
    safeEditorRun(() => editor.commands.enter());
    await typeText(editor, "AI-powered writing with streaming support", speed, signal);
    await pause(300, signal);

    // 选中 "AI-powered" 并加粗
    await selectText(editor, "AI-powered", signal);
    await tapOn("bold", signal, () => editor.commands.toggleBold());
    await pause(200, signal);
    moveCursorToEnd(editor);
    exitBlock(editor);

    // ===== 3b. 任务列表 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Task List", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await tapOn("taskList", signal, () => {
      (editor.chain().focus() as any).toggleTaskList?.().run();
    });
    await moveToEditor(editor, signal);
    await typeText(editor, "Review toolbar features", speed, signal);
    safeEditorRun(() => editor.commands.enter());
    await typeText(editor, "Try AI writing assistant", speed, signal);
    safeEditorRun(() => editor.commands.enter());
    await typeText(editor, "Ship the next release", speed, signal);
    await pause(300, signal);
    moveCursorToEnd(editor);
    exitBlock(editor);
  });

  await runDemoSection("links-media", signal, async () => {
    // ===== 3c. 链接与图片 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Links & Media", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await moveToEditor(editor, signal);
    await typeText(editor, "Visit our documentation for more details.", speed, signal);
    await pause(200, signal);

    const docLinkMatch = findLastTextPos(editor, "documentation");
    await selectText(editor, "documentation", signal);
    await tapOn("link", signal, () => {
      if (docLinkMatch) {
        runEditorChain(editor, (chain) =>
          chain.setTextSelection(docLinkMatch).setLink({ href: DEMO_LINK_URL, target: "_blank" }),
        );
      }
    });
    await settleEditor(signal);
    await pause(300, signal);

    // 链接气泡菜单
    await demoLinkBubbleMenu(editor, "documentation", signal);

    newLine(editor);
    await moveToEditor(editor, signal);
    await tapOn("picture", signal, () => {
      safeEditorRun(() =>
        editor.chain().focus().setImage({ src: DEMO_IMAGE_URL, alt: "Yaniv Editor demo" }).run(),
      );
    });
    await pause(500, signal);
    safeEditorRun(() => moveCursorToEnd(editor));
    exitBlock(editor);
  });

  await runDemoSection("word-template-gallery-video", signal, async () => {
    // ===== 3c-2. Word / 模板 / 图库 / 视频 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Document Tools & Media", speed, signal);
    await pause(300, signal);
    newLine(editor);

    // Word 导入（展示弹窗 + 模拟 mammoth 结果）
    await tapWordMenuItem(editor, "import", signal);
    await pause(450, signal);
    await dismissAllPopups(editor, signal);
    await moveToEditor(editor, signal);
    await typeText(editor, "Word import preview: ", fast, signal);
    editor.commands.insertContent(DEMO_WORD_IMPORT_HTML);
    await pause(350, signal);
    newLine(editor);

    // Word 导出（打开弹窗后确认，或回退为直接导出）
    await tapWordMenuItem(editor, "export", signal);
    await pause(350, signal);
    const exportOkBtn = document.querySelector(".ant-modal-footer .ant-btn-primary");
    if (exportOkBtn) {
      await tapElement(exportOkBtn, signal, { click: true });
      await pause(400, signal);
    } else {
      try {
        await exportToWord(editor.getHTML(), "yaniv-editor-demo");
      } catch {
        /* 演示环境导出失败时忽略 */
      }
    }
    await dismissAllPopups(editor, signal);
    await pause(300, signal);
    newLine(editor);

    // 模板插入
    await moveToEditor(editor, signal);
    await typeText(editor, "Insert from template gallery:", fast, signal);
    await pause(200, signal);
    await demoTemplateInsert(editor, signal);
    newLine(editor);

    // 图库（复用文档内已有图片）
    await moveToEditor(editor, signal);
    await typeText(editor, "Re-insert from image gallery:", fast, signal);
    await pause(200, signal);
    await demoGalleryInsert(editor, signal);
    newLine(editor);

    // 视频上传
    await moveToEditor(editor, signal);
    await typeText(editor, "Embedded video:", fast, signal);
    await pause(200, signal);
    await demoVideoInsert(editor, signal);
    await pause(300, signal);
    safeEditorRun(() => moveCursorToEnd(editor));
    exitBlock(editor);
  });

  await runDemoSection("find-replace", signal, async () => {
    // ===== 3d. 查找替换 =====
    await dismissAllPopups(editor, signal);
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Find & Replace", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await moveToEditor(editor, signal);
    await typeText(
      editor,
      "This draft needs polish. Save the draft before you publish.",
      speed,
      signal,
    );
    await pause(300, signal);

    await tapOn("findReplace", signal, undefined, { click: true });
    await pause(300, signal);
    await prepareFindReplace(editor, signal);
    await tapFindReplaceModalAction("findNext", signal);
    await tapFindReplaceModalAction("replace", signal);
    await dismissFindReplaceModal(signal);
    await dismissAllPopups(editor, signal);
    safeEditorRun(() => moveCursorToEnd(editor));
    exitBlock(editor);
  });

  await runDemoSection("scientific-notation", signal, async () => {
    // ===== 4. 上标 / 下标 (先输入，再选中格式化) =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Scientific Notation", speed, signal);
    await pause(300, signal);
    newLine(editor);

    // 输入公式文本
    await moveToEditor(editor, signal);
    await typeText(editor, "Einstein's equation: E = mc2", speed, signal);
    await pause(200, signal);

    // 选中 "mc2" 中的 "2"，应用上标
    await selectSubtext(editor, "mc2", "2", signal);
    await tapOn("superscript", signal, () => editor.chain().focus().toggleSuperscript().run());

    moveCursorToEnd(editor);
    await moveToEditor(editor, signal);
    await typeText(editor, "    Water molecule: H2O", speed, signal);
    await pause(200, signal);

    // 选中 "H2O" 中的 "2"，应用下标
    await selectSubtext(editor, "H2O", "2", signal);
    await tapOn("subscript", signal, () => editor.chain().focus().toggleSubscript().run());

    await pause(300, signal);
    newLine(editor);

    // 数学公式（LaTeX / KaTeX）
    await moveToEditor(editor, signal);
    await typeText(editor, "LaTeX inline ", speed, signal);
    await demoMathInsert(editor, "inline", "E=mc^2", signal);
    await typeText(editor, " and block formula below:", speed, signal);
    await pause(200, signal);
    newLine(editor);
    await demoMathInsert(editor, "block", "\\int_0^1 x^2\\,dx = \\frac{1}{3}", signal);

    safeEditorRun(() => moveCursorToEnd(editor));
    await pause(400, signal);
    exitBlock(editor);
  });

  await runDemoSection("table", signal, async () => {
    // ===== 5. 表格 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Data Table", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await tapOn("table", signal, () => {
      editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    });
    await pause(400, signal);

    // 填充表头
    await moveToEditor(editor, signal);
    await typeText(editor, "Feature", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "Status", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "Description", fast, signal);

    // 第 1 行
    editor.commands.goToNextCell();
    await moveToEditor(editor, signal);
    await typeText(editor, "Rich Text", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "✅ Ready", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "20+ formats", fast, signal);

    // 第 2 行
    editor.commands.goToNextCell();
    await moveToEditor(editor, signal);
    await typeText(editor, "AI Writing", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "✅ Ready", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "Streaming output", fast, signal);
    await pause(400, signal);

    // 表格悬浮工具栏：插入行
    editor.commands.focus();
    await pause(250, signal);
    const addRowBtn = findTableBubbleButton("addRowAfter");
    await tapElement(addRowBtn, signal, { click: true });
    editor.commands.addRowAfter();
    await moveToEditor(editor, signal);
    await typeText(editor, "Slash Command", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "✅ Ready", fast, signal);
    editor.commands.goToNextCell();
    await typeText(editor, "Quick insert via /", fast, signal);
    await pause(400, signal);

    // 退出表格
    try {
      moveCursorToEnd(editor);
      editor.commands.enter();
    } catch {
      /* ignore */
    }
    await pause(200, signal);
  });

  await runDemoSection("code-block", signal, async () => {
    // ===== 6. 代码块 =====
    await dismissAllPopups(editor, signal);
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Code Block", speed, signal);
    await pause(300, signal);
    newLine(editor);

    safeEditorRun(() => editor.commands.setCodeBlock({ language: "typescript" }));
    await dismissAllPopups(editor, signal);
    await moveToEditor(editor, signal);

    const codeSnippet = `import { Editor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'

const editor = new Editor({
  extensions: [StarterKit],
  content: '<p>Hello Tiptap!</p>'
})`;
    await typeText(editor, codeSnippet, fast, signal);
    await pause(500, signal);

    editor.commands.exitCode();
    editor.commands.enter();
  });

  await runDemoSection("slash-outline", signal, async () => {
    // ===== 7. 引用块（斜杠命令插入） =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Blockquote via Slash", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await moveToEditor(editor, signal);
    await typeText(editor, "/", speed, signal);
    await selectSlashCommand(editor, "blockquote", signal);
    await moveToEditor(editor, signal);
    await typeText(
      editor,
      "The best editor is one that gets out of your way and lets creativity flow.",
      speed,
      signal,
    );
    await pause(400, signal);
    exitBlock(editor);

    // ===== 7b. 文档大纲 =====
    await tapOn("outline", signal, undefined, { click: true });
    await pause(450, signal);

    const outlineItem =
      document.querySelector(".tp-outline-panel__item") ??
      document.querySelector(".tp-outline-panel__item.is-active");
    if (outlineItem) {
      await tapElement(outlineItem, signal, { click: true });
      await pause(450, signal);
    }

    await tapOn("outline", signal, undefined, { click: true });
    await pause(250, signal);
    await dismissAllPopups(editor, signal);

    // ===== 7c. 斜杠命令 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Slash Command", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await moveToEditor(editor, signal);
    await typeText(editor, "/", speed, signal);
    await selectSlashCommand(editor, "codeBlock", signal);
    await moveToEditor(editor, signal);
    await typeText(editor, "const demo = 'typed after /code';", fast, signal);
    await pause(300, signal);
    editor.commands.exitCode();
    editor.commands.enter();
    await pause(200, signal);
  });

  await runDemoSection("ai-writing", signal, async () => {
    // ===== 8. AI 写作演示 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "AI-Powered Writing", speed, signal);
    await pause(300, signal);
    newLine(editor);

    // 用户输入部分文本
    await moveToEditor(editor, signal);
    await typeText(
      editor,
      "AI can enhance your writing workflow. Here is a live demo:",
      speed,
      signal,
    );
    newLine(editor);
    await pause(200, signal);

    await moveToEditor(editor, signal);
    await typeText(editor, "The future of content editing is", speed, signal);
    await pause(400, signal);

    // 展开 AI 菜单并浏览子功能
    await openAiMenu(signal);
    for (const menuKey of ["polish", "summarize", "translate"] as const) {
      await hoverAiMenuItem(menuKey, signal);
    }
    await closeAiMenu(editor, signal);

    // 模拟续写流式输出（不触发真实 API）
    await pause(400, signal);
    await moveToEditor(editor, signal);
    const aiResponse =
      " intelligent and adaptive. With AI integration, writers can generate content on the fly, polish their prose for clarity and style, translate seamlessly between languages, and get instant summaries of lengthy documents — all without leaving the editor.";
    await simulateAiStream(editor, aiResponse, signal);
    await pause(600, signal);

    newLine(editor);
    await pause(200, signal);
    await moveToEditor(editor, signal);
    await typeText(editor, "AI features include: ", speed, signal);

    // 用粗体列出 AI 功能
    const aiFeatures = ["Continue Writing", "Polish", "Translate", "Summarize", "Custom Prompts"];
    for (let i = 0; i < aiFeatures.length; i++) {
      const feature = aiFeatures[i];
      await typeText(editor, feature, fast, signal);
      if (i < aiFeatures.length - 1) {
        await typeText(editor, " · ", fast, signal);
      }
    }
    await pause(300, signal);

    // 选中每个功能名加粗
    for (const feature of aiFeatures) {
      await selectText(editor, feature, signal);
      await tapOn("bold", signal, () => editor.commands.toggleBold());
    }

    await pause(400, signal);
    safeEditorRun(() => moveCursorToEnd(editor));
    exitBlock(editor);
  });

  await runDemoSection("bullet-list-drag-zoom", signal, async () => {
    // ===== 9. 无序列表 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Tech Stack", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await tapOn("bulletList", signal, () => editor.commands.toggleBulletList());
    await moveToEditor(editor, signal);
    await typeText(editor, "Vue 3 + Tiptap 3 + TypeScript", speed, signal);
    editor.commands.enter();
    await typeText(editor, "Light / Dark mode with 5 theme presets", speed, signal);
    editor.commands.enter();
    await typeText(editor, "i18n: English, 简体中文, 繁體中文", speed, signal);
    editor.commands.enter();
    await typeText(editor, "AI: Continue Writing, Polish, Translate, Summarize", speed, signal);
    await pause(300, signal);
    exitBlock(editor);

    // ===== 9b. 块拖拽 + 底部缩放 =====
    await tapOn("heading", signal, () => editor.commands.setHeading({ level: 2 }));
    await moveToEditor(editor, signal);
    await typeText(editor, "Drag Handle & Zoom", speed, signal);
    await pause(300, signal);
    newLine(editor);

    await moveToEditor(editor, signal);
    await typeText(
      editor,
      "Hover the left gutter to reveal the drag handle, then adjust zoom in the footer.",
      speed,
      signal,
    );
    await pause(300, signal);

    await showDragHandleAtText(editor, "Hover the left gutter", signal);
    await demoZoomFooter(signal);
    await pause(400, signal);
    exitBlock(editor);
  });

  // ===== 10. 分隔线 + 结尾 =====
  safeEditorRun(() => editor.commands.setHorizontalRule());
  await pause(300, signal);

  await moveToEditor(editor, signal);
  await typeText(editor, "All features production-ready and fully customizable! ✅", speed, signal);
  await pause(300, signal);

  // 选中 "production-ready" 加粗
  await selectText(editor, "production-ready", signal);
  await tapOn("bold", signal, () => editor.commands.toggleBold());
  await pause(600, signal);

  await closeAllOverlays(editor, signal);
  cursorVisible.value = false;
}

// ===== 控制函数 =====

async function startDemo() {
  const editor = props.getEditor();
  if (!editor) return;

  isRunning.value = true;
  isFinished.value = false;
  abortController = new AbortController();
  emit("start");

  try {
    await runDemoScript(editor, abortController.signal);
    isFinished.value = true;
    emit("finish");
  } catch (e: any) {
    if (e.name !== "AbortError") {
      console.error("[EditorAutoDemo] Script error:", e);
    }
  } finally {
    isRunning.value = false;
    cursorVisible.value = false;
    rippleActive.value = false;
  }
}

function stopDemo() {
  abortController?.abort();
  isRunning.value = false;
  cursorVisible.value = false;
  emit("stop");
}

async function replayDemo() {
  isFinished.value = false;
  await startDemo();
}

onBeforeUnmount(() => {
  abortController?.abort();
  cursorVisible.value = false;
});

defineExpose({ startDemo, stopDemo, replayDemo });
</script>

<style scoped>
.auto-demo {
  position: relative;
}

.auto-demo__controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 8px 12px;
}

.auto-demo__btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.auto-demo__btn--play {
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.auto-demo__btn--play:hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

.auto-demo__btn--stop {
  color: white;
  background: #ff4d4f;
}

.auto-demo__btn--stop:hover {
  background: #ff7875;
}

.auto-demo__btn--replay {
  color: #1a1a1a;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  box-shadow: 0 2px 8px rgba(67, 233, 123, 0.3);
}

.auto-demo__btn--replay:hover {
  box-shadow: 0 4px 12px rgba(67, 233, 123, 0.4);
  transform: translateY(-1px);
}
</style>

<style>
/* 光标样式 (Teleport 到 body，不使用 scoped) */
.demo-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  pointer-events: none;
  will-change: transform;
}

.demo-cursor__arrow {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
}

.demo-cursor__ripple {
  position: absolute;
  top: -12px;
  left: -12px;
  width: 24px;
  height: 24px;
  pointer-events: none;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.5) 0%, rgba(118, 75, 162, 0.3) 100%);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0);
}

.demo-cursor__ripple.is-active {
  animation: demo-cursor-ripple 0.35s ease-out forwards;
}

@keyframes demo-cursor-ripple {
  0% {
    opacity: 1;
    transform: scale(0);
  }
  100% {
    opacity: 0;
    transform: scale(2.5);
  }
}
</style>
