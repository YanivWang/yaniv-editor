import { createApp, h, provide, ref } from "vue";

import { editorLocaleKey } from "@/core/infra/useEditorLocale";
import { showEditorNotice } from "@/core/overlayFeedback";
import { resolveOverlayPortal } from "@/core/overlayPortal";
import { aiClient } from "@/features/ai/client";
import type { createAiClient } from "@/features/ai/client";
import { buildDocumentContextPrompt } from "@/features/ai/shared/documentContext";
import type { LocaleCode } from "@/locales/manager";
import { isValidSelection } from "@/utils/prosemirrorUtils";

import {
  addAiHighlight,
  removeAiHighlight,
  updateAiHighlight,
  getAiSuggestionData,
} from "./AiHighlightMark";
import AiSuggestionPopover from "./AiSuggestionPopover.vue";
import CustomAiPopover from "./CustomAiPopover.vue";

import type { AiSuggestionData } from "./AiHighlightMark";
import type { Editor } from "@tiptap/core";
import type { App } from "vue";

export type AiSessionMode = "replace" | "continue" | "custom";

export interface AiSuggestionState {
  visible: boolean;
  originalText: string;
  suggestedText: string;
  isStreaming: boolean;
  originalSelection: { from: number; to: number };
  mode: AiSessionMode;
}

const editorClickHandlers = new WeakMap<HTMLElement, (event: MouseEvent) => void>();
type AiClient = ReturnType<typeof createAiClient>;

class AiSuggestionManager {
  private getLocaleText: (key: string) => string = (key) => key;

  /**
   * 绑定当前 AI 会话的 locale 文案解析器。
   *
   * 必须由发起会话的扩展在 `show*()` 之前调用，**不能**在 capability 构建扩展时调用：
   * 本类是模块级单例（同一时刻只存在一个 AI 悬浮层），构建期绑定会让同页多实例中
   * 后构建的那个覆盖前者的语言，导致 zh-CN 实例弹出 en-US 文案。
   * 会话是互斥的，因此按会话绑定既正确又无需实例化多份 manager。
   */
  bindLocale(getLocaleText?: (key: string) => string): void {
    this.getLocaleText = getLocaleText ?? ((key) => key);
  }
  private editor: Editor | null = null;

  /**
   * 取当前仍存活的编辑器；已销毁时顺手断开引用并返回 null。
   *
   * 本类是模块级单例，会跨 session 存活：能力开关变化会重建 editor（`useEditorSession`
   * 的 sessionKey 机制），组件卸载也会 destroy。若此时仍持有旧实例，任何
   * `editor.view` / `editor.state` 访问都会抛 `[tiptap error]: The editor view is not available`，
   * 且发生在弹层回调里无人捕获。
   *
   * 与 `SearchReplace` / `FormatPainter` 的 `isDestroyed` 前置判断是同一类保护。
   */
  private liveEditor(): Editor | null {
    if (this.editor?.isDestroyed) {
      this.editor = null;
    }
    return this.editor;
  }
  private popoverApp: App | null = null;
  private container: HTMLElement | null = null;
  private mode: AiSessionMode = "replace";
  private positionAnchor: { from: number; to: number } = { from: 0, to: 0 };
  private userContextRange: { from: number; to: number } | null = null;
  private isTemporarilyHidden = false;
  private abortController: AbortController | null = null;
  private customClient: AiClient = aiClient;

  private state: AiSuggestionState = {
    visible: false,
    originalText: "",
    suggestedText: "",
    isStreaming: false,
    originalSelection: { from: 0, to: 0 },
    mode: "replace",
  };

  private visibleRef = ref(false);
  private originalTextRef = ref("");
  private suggestedTextRef = ref("");
  private isStreamingRef = ref(false);
  private isExecutingRef = ref(false);

  init(editor: Editor): void {
    this.editor = editor;
    this.setupClickHandler();
  }

  show(
    originalText: string,
    originalSelection: { from: number; to: number },
    editor?: Editor,
  ): void {
    if (editor) this.ensureEditor(editor);
    const live = this.liveEditor();
    if (!live) return;

    removeAiHighlight(live);
    this.mode = "replace";
    this.positionAnchor = originalSelection;
    this.userContextRange = null;
    this.beginSession(originalText, originalSelection, true);
  }

  showContinueWriting(
    editor: Editor,
    selectedText: string,
    userRange: { from: number; to: number },
    insertPosition: number,
  ): void {
    this.ensureEditor(editor);
    const live = this.liveEditor();
    if (!live) return;

    removeAiHighlight(live);
    this.mode = "continue";
    this.positionAnchor = userRange;
    this.userContextRange = userRange;

    addAiHighlight(live, userRange.from, userRange.to, {
      originalText: selectedText,
      suggestedText: "",
      isStreaming: false,
    });

    live.chain().focus().insertContentAt(insertPosition, " ").run();

    const suggestionSelection = { from: insertPosition, to: insertPosition + 1 };
    addAiHighlight(live, suggestionSelection.from, suggestionSelection.to, {
      originalText: "",
      suggestedText: "",
      isStreaming: true,
    });

    this.beginSession(selectedText, suggestionSelection, true);
  }

  showCustom(
    editor: Editor,
    selectedText: string,
    selection: { from: number; to: number },
    client: AiClient = aiClient,
  ): void {
    this.ensureEditor(editor);
    if (!this.editor) return;

    removeAiHighlight(this.editor);
    this.mode = "custom";
    this.positionAnchor = selection;
    this.userContextRange = null;
    this.isExecutingRef.value = false;
    this.customClient = client;

    addAiHighlight(this.editor, selection.from, selection.to, {
      originalText: selectedText,
      suggestedText: "",
      isStreaming: false,
    });

    this.beginSession(selectedText, selection, false);
  }

  executeCustomPrompt(prompt: string): void {
    if (!this.editor || this.mode !== "custom") return;

    const abortController = new AbortController();
    this.setAbortController(abortController);
    this.isExecutingRef.value = true;
    this.isStreamingRef.value = true;

    let accumulated = "";

    this.customClient.customCommand(
      this.state.originalText,
      prompt,
      this.editor ? buildDocumentContextPrompt(this.editor) : "",
      {
        onStart: () => {
          accumulated = "";
        },
        onToken: (token) => {
          if (!token) return;
          accumulated += token;
          this.updateSuggestion(accumulated);
        },
        onComplete: () => {
          this.stopStreaming();
          this.updateSuggestion(accumulated);
          this.isExecutingRef.value = false;
          this.clearAbortController(abortController);
        },
        onError: (error) => {
          this.clearAbortController(abortController);
          if (error.name === "AbortError") return;
          console.error("[Custom AI]", error);
          this.isExecutingRef.value = false;
          this.hide();
          if (this.editor) {
            showEditorNotice(this.editor, {
              message: this.getLocaleText("messages.customAiFailed"),
              description: error.message,
              kind: "error",
              duration: 3,
            });
          }
        },
        signal: abortController.signal,
      },
    );
  }

  setAbortController(abortController: AbortController | null): void {
    this.abortController = abortController;
  }

  updateSuggestion(text: string): void {
    this.state.suggestedText = text;
    this.suggestedTextRef.value = text;
    this.updateHighlightMeta({ suggestedText: text });
  }

  stopStreaming(): void {
    this.state.isStreaming = false;
    this.isStreamingRef.value = false;
    this.updateHighlightMeta({ isStreaming: false });
  }

  accept(): void {
    const editor = this.liveEditor();
    if (!editor || !this.state.visible) return;

    const { originalSelection, suggestedText } = this.state;
    const docSize = editor.state.doc.content.size;

    if (!suggestedText.trim()) {
      this.hide();
      return;
    }

    if (!isValidSelection(originalSelection, docSize)) {
      this.hide();
      return;
    }

    const { from, to } = originalSelection;
    removeAiHighlight(editor);

    const applied = editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .insertContent(suggestedText)
      .run();

    if (!applied) {
      console.warn("[AI Suggestion] Failed to apply suggestion", { from, to });
    }

    this.hide();
  }

  reject(): void {
    this.hide();
  }

  cancel(): void {
    this.abortActiveStream();

    if (this.mode === "custom") {
      this.hide();
      return;
    }

    this.isTemporarilyHidden = true;
    this.visibleRef.value = false;
    this.unmountPopover();
  }

  hide(): void {
    this.abortActiveStream();
    const editor = this.liveEditor();
    if (!editor) {
      // 编辑器已销毁：仍要复位自身状态，否则下一个 session 会读到脏数据
      this.visibleRef.value = false;
      this.isTemporarilyHidden = false;
      this.unmountPopover();
      return;
    }

    this.visibleRef.value = false;
    this.isTemporarilyHidden = false;
    removeAiHighlight(editor);
    this.unmountPopover();
    this.removeClickHandler();

    this.state = {
      visible: false,
      originalText: "",
      suggestedText: "",
      isStreaming: false,
      originalSelection: { from: 0, to: 0 },
      mode: "replace",
    };
    this.mode = "replace";
    this.userContextRange = null;
    this.isExecutingRef.value = false;
    this.customClient = aiClient;
  }

  isVisible(): boolean {
    return this.state.visible;
  }

  getState(): AiSuggestionState {
    return { ...this.state, mode: this.mode };
  }

  destroy(): void {
    this.hide();
    this.editor = null;
  }

  private ensureEditor(editor: Editor): void {
    if (!this.liveEditor()) {
      this.init(editor);
    } else {
      this.editor = editor;
    }
  }

  private clearAbortController(abortController: AbortController): void {
    if (this.abortController === abortController) {
      this.abortController = null;
    }
  }

  private abortActiveStream(): void {
    if (!this.abortController) return;
    this.abortController.abort();
    this.abortController = null;
    this.stopStreaming();
    this.isExecutingRef.value = false;
  }

  private beginSession(
    originalText: string,
    selection: { from: number; to: number },
    streaming: boolean,
  ): void {
    if (!this.editor) return;

    this.state = {
      visible: true,
      originalText,
      suggestedText: "",
      isStreaming: streaming,
      originalSelection: selection,
      mode: this.mode,
    };

    this.visibleRef.value = true;
    this.originalTextRef.value = originalText;
    this.suggestedTextRef.value = "";
    this.isStreamingRef.value = streaming;
    this.isTemporarilyHidden = false;

    if (this.mode === "replace") {
      addAiHighlight(this.editor, selection.from, selection.to, {
        originalText,
        suggestedText: "",
        isStreaming: streaming,
      });
    }

    this.mountPopover();
    this.setupClickHandler();
  }

  private updateHighlightMeta(partial: Partial<AiSuggestionData>): void {
    if (!this.editor) return;
    const { originalSelection } = this.state;
    if (!isValidSelection(originalSelection, this.editor.state.doc.content.size)) return;

    updateAiHighlight(this.editor, originalSelection.from, originalSelection.to, partial);
  }

  private setupClickHandler(): void {
    if (!this.editor) return;
    const editorDom = this.editor.view.dom;
    this.removeClickHandler();

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const highlightElement = target.classList.contains("ai-highlight")
        ? target
        : target.closest(".ai-highlight");

      if (!highlightElement || !this.editor) return;

      if (this.isTemporarilyHidden || !this.visibleRef.value) {
        event.stopPropagation();
        const pos = this.posAtDOMOrAnchor(highlightElement);

        let data = getAiSuggestionData(this.editor, pos);
        if (!data && this.userContextRange) {
          data = getAiSuggestionData(this.editor, this.userContextRange.from);
        }
        if (!data) {
          data = {
            originalText: this.originalTextRef.value,
            suggestedText: this.suggestedTextRef.value,
            isStreaming: this.isStreamingRef.value,
          };
        }

        this.originalTextRef.value = data.originalText || this.originalTextRef.value;
        this.suggestedTextRef.value = data.suggestedText || this.suggestedTextRef.value;
        this.isStreamingRef.value = data.isStreaming ?? false;
        this.isTemporarilyHidden = false;
        this.visibleRef.value = true;
        this.remountPopover();
        return;
      }

      const pos = this.posAtDOMOrAnchor(highlightElement);
      const data = getAiSuggestionData(this.editor, pos);
      if (data && !this.state.visible) {
        this.restoreSuggestion(highlightElement as HTMLElement, data);
      }
    };

    editorClickHandlers.set(editorDom, clickHandler);
    editorDom.addEventListener("click", clickHandler);
  }

  /**
   * 取元素在文档中的位置；`posAtDOM` 在节点已脱离视图时会抛错，此时回退到会话锚点。
   *
   * 两条点击分支都要走这里：早先只有「已隐藏」那条做了 try/catch，
   * 「未隐藏」那条裸调 `posAtDOM`，同样的脱链场景照样会把点击回调打断。
   */
  private posAtDOMOrAnchor(element: Element): number {
    if (!this.editor) return this.positionAnchor.from;
    try {
      return this.editor.view.posAtDOM(element, 0);
    } catch {
      return this.positionAnchor.from;
    }
  }

  private removeClickHandler(): void {
    if (!this.editor) return;
    const editorDom = this.editor.view.dom;
    const handler = editorClickHandlers.get(editorDom);
    if (handler) {
      editorDom.removeEventListener("click", handler);
      editorClickHandlers.delete(editorDom);
    }
  }

  private restoreSuggestion(element: HTMLElement, data: AiSuggestionData): void {
    if (!this.editor) return;

    const pos = this.posAtDOMOrAnchor(element);
    if (pos < 0 || pos > this.editor.state.doc.content.size) return;

    const node = this.editor.state.doc.nodeAt(pos);
    if (!node) return;

    const from = pos;
    const to = pos + node.nodeSize;

    this.state = {
      visible: true,
      originalText: data.originalText,
      suggestedText: data.suggestedText,
      isStreaming: false,
      originalSelection: { from, to },
      mode: this.mode,
    };

    this.visibleRef.value = true;
    this.originalTextRef.value = data.originalText;
    this.suggestedTextRef.value = data.suggestedText;
    this.isStreamingRef.value = false;
    this.isTemporarilyHidden = false;
    this.positionAnchor = { from, to };

    if (!this.popoverApp) {
      this.mountPopover();
    }
  }

  private remountPopover(): void {
    this.unmountPopover();
    this.mountPopover();
  }

  private mountPopover(): void {
    if (!this.editor) return;
    this.unmountPopover();

    this.container = document.createElement("div");

    const editorRoot = this.editor.view.dom.closest(".yaniv-editor");
    if (!(editorRoot instanceof HTMLElement)) {
      throw new Error("AI suggestion popover requires an editor root (.yaniv-editor)");
    }

    const overlayPortal = resolveOverlayPortal(editorRoot);

    Object.assign(this.container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "0",
      height: "0",
    });

    overlayPortal.append(this.container);

    const position = this.calculatePopoverPosition();
    const isCustom = this.mode === "custom";
    const translate = this.getLocaleText.bind(this);
    const getPopupContainer = () => overlayPortal;

    this.popoverApp = createApp({
      setup() {
        provide(editorLocaleKey, {
          locale: ref("zh-CN" as LocaleCode),
          messages: ref(null),
          t: translate,
        });
      },
      render: () => {
        if (isCustom) {
          return h(CustomAiPopover, {
            visible: this.visibleRef.value,
            originalText: this.originalTextRef.value,
            suggestedText: this.suggestedTextRef.value,
            isStreaming: this.isStreamingRef.value,
            isExecuting: this.isExecutingRef.value,
            position,
            getPopupContainer,
            "onUpdate:visible": (val: boolean) => {
              this.visibleRef.value = val;
            },
            onExecute: (prompt: string) => {
              this.executeCustomPrompt(prompt);
            },
            onAccept: () => this.accept(),
            onReject: () => this.reject(),
            onCancel: () => this.cancel(),
            onCancelGeneration: () => this.cancel(),
          });
        }

        return h(AiSuggestionPopover, {
          visible: this.visibleRef.value,
          originalText: this.originalTextRef.value,
          suggestedText: this.suggestedTextRef.value,
          isStreaming: this.isStreamingRef.value,
          position,
          getPopupContainer,
          "onUpdate:visible": (val: boolean) => {
            this.visibleRef.value = val;
          },
          onAccept: () => this.accept(),
          onReject: () => this.reject(),
          onCancel: () => this.cancel(),
        });
      },
    });

    this.popoverApp.mount(this.container);
  }

  private unmountPopover(): void {
    if (this.popoverApp) {
      this.popoverApp.unmount();
      this.popoverApp = null;
    }

    if (this.container?.parentNode) {
      this.container.remove();
      this.container = null;
    }
  }

  /**
   * 计算悬浮层位置。
   *
   * `positionAnchor` 是**会话开始时**记下的位置，而用户在流式输出期间可以继续删减文档，
   * 因此它随时可能越界。`view.coordsAtPos()` 越界会抛 `RangeError: Position N out of range`，
   * 且本方法的调用链是 `click → remountPopover → mountPopover`，全程无人捕获——
   * 与 `getAiSuggestionData` 里已经处理过的是同一类过期位置问题，这里同样要收口：
   * 先按当前文档大小夹取，再对残余异常兜底，位置不可用时退化到左上角而不是让整条回调炸掉。
   */
  private calculatePopoverPosition(): { top: number; left: number } {
    const editor = this.liveEditor();
    if (!editor) {
      return { top: 0, left: 0 };
    }

    const { view } = editor;
    const docSize = editor.state.doc.content.size;
    const clamp = (pos: number) => Math.max(0, Math.min(pos, docSize));

    try {
      const start = view.coordsAtPos(clamp(this.positionAnchor.from));
      const end = view.coordsAtPos(clamp(this.positionAnchor.to));
      return {
        top: end.bottom + 8,
        left: start.left,
      };
    } catch {
      return { top: 0, left: 0 };
    }
  }
}

export const aiSuggestionManager = new AiSuggestionManager();
