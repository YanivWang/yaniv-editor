import { notification } from "ant-design-vue";
import { createApp, h, ref } from "vue";

import { aiClient } from "@/features/ai/client";
import { buildDocumentContextPrompt } from "@/features/ai/shared/documentContext";
import { t } from "@/locales";
import {
  buildParagraphNodesFromText,
  hasNewlines,
  isValidSelection,
} from "@/utils/prosemirrorUtils";

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

class AiSuggestionManager {
  private editor: Editor | null = null;
  private popoverApp: App | null = null;
  private container: HTMLElement | null = null;
  private mode: AiSessionMode = "replace";
  private positionAnchor: { from: number; to: number } = { from: 0, to: 0 };
  private userContextRange: { from: number; to: number } | null = null;
  private isTemporarilyHidden = false;
  private abortController: AbortController | null = null;

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
    if (!this.editor) return;

    removeAiHighlight(this.editor);
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
    if (!this.editor) return;

    removeAiHighlight(this.editor);
    this.mode = "continue";
    this.positionAnchor = userRange;
    this.userContextRange = userRange;

    addAiHighlight(this.editor, userRange.from, userRange.to, {
      originalText: selectedText,
      suggestedText: "",
      isStreaming: false,
    });

    this.editor.chain().focus().insertContentAt(insertPosition, " ").run();

    const suggestionSelection = { from: insertPosition, to: insertPosition + 1 };
    addAiHighlight(this.editor, suggestionSelection.from, suggestionSelection.to, {
      originalText: "",
      suggestedText: "",
      isStreaming: true,
    });

    this.beginSession(selectedText, suggestionSelection, true);
  }

  showCustom(editor: Editor, selectedText: string, selection: { from: number; to: number }): void {
    this.ensureEditor(editor);
    if (!this.editor) return;

    removeAiHighlight(this.editor);
    this.mode = "custom";
    this.positionAnchor = selection;
    this.userContextRange = null;
    this.isExecutingRef.value = false;

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

    aiClient.customCommand(
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
          notification.error({
            message: t("editor.customAi"),
            description: error.message,
            duration: 3,
            placement: "topRight",
          });
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
    if (!this.editor || !this.state.visible) return;

    const { originalSelection, suggestedText } = this.state;
    const { state } = this.editor;
    const docSize = state.doc.content.size;

    if (!isValidSelection(originalSelection, docSize)) {
      this.hide();
      return;
    }

    if (hasNewlines(suggestedText)) {
      const nodes = buildParagraphNodesFromText(suggestedText, state.schema);
      if (nodes.length > 0) {
        const tr = state.tr;
        tr.replaceWith(originalSelection.from, originalSelection.to, nodes);
        this.editor.view.dispatch(tr);
      }
    } else {
      this.editor
        .chain()
        .focus()
        .deleteRange(originalSelection)
        .insertContentAt(originalSelection.from, suggestedText)
        .run();
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
    if (!this.editor) return;

    this.abortActiveStream();
    this.visibleRef.value = false;
    this.isTemporarilyHidden = false;
    removeAiHighlight(this.editor);
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
    if (!this.editor) {
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
        let pos: number;
        try {
          pos = this.editor.view.posAtDOM(highlightElement, 0);
        } catch {
          pos = this.positionAnchor.from;
        }

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

      const pos = this.editor.view.posAtDOM(highlightElement, 0);
      const data = getAiSuggestionData(this.editor, pos);
      if (data && !this.state.visible) {
        this.restoreSuggestion(highlightElement as HTMLElement, data);
      }
    };

    editorClickHandlers.set(editorDom, clickHandler);
    editorDom.addEventListener("click", clickHandler);
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

    const pos = this.editor.view.posAtDOM(element, 0);
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

    Object.assign(this.container.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "1000",
    });

    const editorElement = this.editor.view.dom.parentElement;
    if (editorElement) {
      editorElement.append(this.container);
    } else {
      document.body.append(this.container);
    }

    const position = this.calculatePopoverPosition();
    const isCustom = this.mode === "custom";

    this.popoverApp = createApp({
      render: () => {
        if (isCustom) {
          return h(CustomAiPopover, {
            visible: this.visibleRef.value,
            originalText: this.originalTextRef.value,
            suggestedText: this.suggestedTextRef.value,
            isStreaming: this.isStreamingRef.value,
            isExecuting: this.isExecutingRef.value,
            position,
            editorElement: editorElement || undefined,
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
          editorElement: editorElement || undefined,
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

  private calculatePopoverPosition(): { top: number; left: number } {
    if (!this.editor) {
      return { top: 0, left: 0 };
    }

    const { from, to } = this.positionAnchor;
    const { view } = this.editor;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const editorRect = view.dom.getBoundingClientRect();

    return {
      top: end.bottom - editorRect.top + 8,
      left: start.left - editorRect.left,
    };
  }
}

export const aiSuggestionManager = new AiSuggestionManager();
