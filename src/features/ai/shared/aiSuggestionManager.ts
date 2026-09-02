import { createApp, h, ref } from "vue";

import { showEditorNotice } from "@/core/overlayFeedback";
import { resolveOverlayPortal } from "@/core/overlayPortal";
import { aiClient } from "@/features/ai/client";
import type { createAiClient } from "@/features/ai/client";
import { buildDocumentContextPrompt } from "@/features/ai/shared/documentContext";
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
   * 的 sessionKey 机制），组件卸载也会 destroy。销毁后 `editor.state` 仍可读（缓存），
   * 但凡走到 `editor.view` 的都会抛 `[tiptap error]: The editor view is not available`
   * —— 派发事务（`addAiHighlight` 等）、读 `view.dom`（挂弹层、装/摘点击监听）、
   * `showEditorNotice` 全在此列，且这些调用多在流式回调里，无人捕获。
   *
   * 因此**所有**触碰 editor 的方法都必须经此取用，异步回调要在回调发生时重取：
   * 会话开始时还活着，不代表 token 到达时仍然活着。
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
  /** 当前编辑器 destroy 监听的反订阅句柄；换实例 / 收尾时必须调用，避免监听随实例累积 */
  private detachLifecycle: (() => void) | null = null;
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

  /**
   * 绑定编辑器，并订阅它自身的 `destroy`。
   *
   * 这是本单例唯一可靠的清理时机：`destroy()` 虽是公开方法，但生产代码里没有调用方
   * —— session 重建与组件卸载都只 destroy editor（见 `useEditorSession` 的三处）。
   * 也不能反过来让 session 层调本模块：AI 是门控能力，主 chunk 里出现它会打穿
   * 代码分割断言（CI 检查 `chat/completions` 等标记未回流）。
   * 因此由持有方自己订阅资源的生命周期，并持有显式反订阅句柄。
   */
  init(editor: Editor): void {
    // 换实例先摘上一个的监听，否则同页多编辑器会让监听逐个堆积
    this.detachLifecycle?.();
    this.editor = editor;

    const onDestroy = () => this.handleEditorDestroyed();
    editor.on("destroy", onDestroy);
    this.detachLifecycle = () => editor.off("destroy", onDestroy);

    this.setupClickHandler();
  }

  /**
   * 编辑器销毁时的收尾。
   *
   * Tiptap 先 emit `destroy` 再拆 view（此刻 `isDestroyed` 仍为 false、`view.dom` 仍可读），
   * 所以点击监听还能摘干净；但**不能再派发事务**，因此先断引用，让 `hide()` 走
   * 「无存活编辑器」分支，只做状态复位与弹层卸载。
   */
  private handleEditorDestroyed(): void {
    this.detachLifecycle?.();
    this.detachLifecycle = null;
    this.removeClickHandler();
    this.editor = null;
    this.hide();
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
    const live = this.liveEditor();
    if (!live) return;

    removeAiHighlight(live);
    this.mode = "custom";
    this.positionAnchor = selection;
    this.userContextRange = null;
    this.isExecutingRef.value = false;
    this.customClient = client;

    addAiHighlight(live, selection.from, selection.to, {
      originalText: selectedText,
      suggestedText: "",
      isStreaming: false,
    });

    this.beginSession(selectedText, selection, false);
  }

  executeCustomPrompt(prompt: string): void {
    const live = this.liveEditor();
    if (!live || this.mode !== "custom") return;

    const abortController = new AbortController();
    this.setAbortController(abortController);
    this.isExecutingRef.value = true;
    this.isStreamingRef.value = true;

    let accumulated = "";

    this.customClient.customCommand(
      this.state.originalText,
      prompt,
      buildDocumentContextPrompt(live),
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
          // 回调时重取：请求在途期间编辑器可能已被销毁
          const target = this.liveEditor();
          if (target) {
            showEditorNotice(target, {
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

  /**
   * 接管当前流的取消句柄；换成**另一个**流时先把上一个取消掉。
   *
   * 此前是直接覆盖：同一个编辑器上连着做两次 AI 操作时，`show()` 不会 abort
   * （`ensureEditor` 对同一实例直接返回），于是第一个流的 controller 被覆盖后
   * 再也没人能取消它——它继续消耗 API 配额，`onToken` 还在往**同一个单例**里
   * `updateSuggestion()`，两个流的文本互相覆盖、来回跳变；编辑器销毁时
   * `hide()` 也只能 abort 得到最后那个，孤儿流失败时拿的是闭包里已销毁的 editor。
   *
   * 传 `null` 是「流已结束、清空句柄」，不需要 abort。
   */
  setAbortController(abortController: AbortController | null): void {
    const previous = this.abortController;
    if (previous && abortController && previous !== abortController) {
      previous.abort();
    }
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

    // 只有这两步需要活着的编辑器（派发事务 / 读 view.dom）；
    // 编辑器已销毁时跳过它们，但**下面的复位一步都不能少**——
    // 状态是本单例自己的，会一直带到下一个 session：漏复位会让 isVisible() 恒真、
    // getState() 返回上一轮的建议文本、customClient 停在上一个实例的 client 上。
    const editor = this.liveEditor();
    if (editor) {
      removeAiHighlight(editor);
      this.removeClickHandler();
    }

    this.visibleRef.value = false;
    this.isTemporarilyHidden = false;
    this.unmountPopover();

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
    this.detachLifecycle?.();
    this.detachLifecycle = null;
    this.hide();
    this.editor = null;
  }

  /**
   * 绑定本次会话的编辑器；**切换到另一个实例前必须把上一个复位干净**。
   *
   * 本类是模块级单例，同页多编辑器共用。旧实现直接 `this.editor = editor` 就换人，
   * 于是上一个实例的 `ai-highlight` 标记再没人清得掉——`hide()` 之后只作用于新实例。
   * 这不只是视觉残留：该 mark 会被序列化进 `getHTML()` / `getJSON()`，污染宿主保存的内容。
   * 同理旧实例的 click handler 也永远摘不掉（`removeClickHandler` 读的是当前 editor 的 dom）。
   *
   * `hide()` 一次性完成：中止在途流、移除高亮、卸载弹层、摘监听、复位会话状态。
   */
  private ensureEditor(editor: Editor): void {
    const current = this.liveEditor();
    if (current === editor) return;
    if (current) this.hide();
    this.init(editor);
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
    const editor = this.liveEditor();
    if (!editor) return;

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
      addAiHighlight(editor, selection.from, selection.to, {
        originalText,
        suggestedText: "",
        isStreaming: streaming,
      });
    }

    this.mountPopover();
    this.setupClickHandler();
  }

  private updateHighlightMeta(partial: Partial<AiSuggestionData>): void {
    // 每个 token 都会走到这里，而流式期间编辑器随时可能被重建
    const editor = this.liveEditor();
    if (!editor) return;
    const { originalSelection } = this.state;
    if (!isValidSelection(originalSelection, editor.state.doc.content.size)) return;

    updateAiHighlight(editor, originalSelection.from, originalSelection.to, partial);
  }

  private setupClickHandler(): void {
    const editor = this.liveEditor();
    if (!editor) return;
    const editorDom = editor.view.dom;
    this.removeClickHandler();

    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const highlightElement = target.classList.contains("ai-highlight")
        ? target
        : target.closest(".ai-highlight");

      const live = this.liveEditor();
      if (!highlightElement || !live) return;

      if (this.isTemporarilyHidden || !this.visibleRef.value) {
        event.stopPropagation();
        const pos = this.posAtDOMOrAnchor(highlightElement);

        let data = getAiSuggestionData(live, pos);
        if (!data && this.userContextRange) {
          data = getAiSuggestionData(live, this.userContextRange.from);
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
      const data = getAiSuggestionData(live, pos);
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
    const editor = this.liveEditor();
    if (!editor) return this.positionAnchor.from;
    try {
      return editor.view.posAtDOM(element, 0);
    } catch {
      return this.positionAnchor.from;
    }
  }

  private removeClickHandler(): void {
    const editor = this.liveEditor();
    if (!editor) return;
    const editorDom = editor.view.dom;
    const handler = editorClickHandlers.get(editorDom);
    if (handler) {
      editorDom.removeEventListener("click", handler);
      editorClickHandlers.delete(editorDom);
    }
  }

  private restoreSuggestion(element: HTMLElement, data: AiSuggestionData): void {
    const editor = this.liveEditor();
    if (!editor) return;

    const pos = this.posAtDOMOrAnchor(element);
    if (pos < 0 || pos > editor.state.doc.content.size) return;

    const node = editor.state.doc.nodeAt(pos);
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
    const editor = this.liveEditor();
    if (!editor) return;
    this.unmountPopover();

    this.container = document.createElement("div");

    const editorRoot = editor.view.dom.closest(".yaniv-editor");
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
    // 晚绑定：读的是**调用时**的解析器，而不是挂载那一刻的快照
    const translate = (key: string) => this.getLocaleText(key);
    const getPopupContainer = () => overlayPortal;

    // 弹层跑在独立 app 里，继承不到 EditorShell 的 provide。
    // 依赖显式作为 prop 传入 —— 不伪造 provide(editorLocaleKey)：
    // 那样 locale / messages 只能填假值，任何读它们的组件都会拿到错的实例语言。
    this.popoverApp = createApp({
      render: () => {
        if (isCustom) {
          return h(CustomAiPopover, {
            t: translate,
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
          t: translate,
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
