import { Editor } from "@tiptap/vue-3";
import {
  computed,
  nextTick,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";

import { buildExtensions } from "@/capabilities/buildExtensions";
import type { BuildExtensionsCtx } from "@/capabilities/types";
import type { EditorPhase, EditorRuntimeProfile, EditorShellHost } from "@/core/runtime/types";
import type { BlockMenuHost } from "@/core/shell/useBlockMenuHost";
import type { TiptapLocale } from "@/locales/types";

import { applyPhaseTransition } from "./applyPhaseTransition";
import { ContentAdapter } from "./contentAdapter";

import type { PhaseChangeEvent, PhaseChangeHandler, PhaseChangeOff, SessionStatus } from "./types";
import type { JSONContent } from "@tiptap/core";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export interface UseEditorSessionOptions {
  host: EditorShellHost;
  profile: ComputedRef<EditorRuntimeProfile>;
  sessionKey: ComputedRef<string>;
  /** 语言包异步加载，落地前为 null——`rebuild()` 与下方 watch 都按可空处理。 */
  locale: Ref<TiptapLocale | null>;
  blockMenuHost: BlockMenuHost;
  buildCtx: () => Omit<BuildExtensionsCtx, "locale" | "gates" | "isEditable" | "blockMenuHost">;
  editorProps?: Record<string, unknown>;
  onReady?: (editor: Editor) => void;
}

export function useEditorSession(options: UseEditorSessionOptions) {
  const { host, profile, sessionKey, locale, blockMenuHost, buildCtx, editorProps, onReady } =
    options;

  const editor = shallowRef<Editor | null>(null);
  const status = ref<SessionStatus>("idle");
  const sessionError = ref<string | null>(null);
  const isEditable = computed(() => profile.value.mode === "edit");

  let generation = 0;
  let disposed = false;
  let contentSnapshot: JSONContent | string | null = null;
  let lastAppliedPhase: EditorPhase | null = null;
  let pendingPhase: EditorPhase | null = null;

  const phaseHandlers = new Set<PhaseChangeHandler>();

  const phaseEmitter = {
    emit(event: PhaseChangeEvent) {
      for (const handler of phaseHandlers) {
        handler(event);
      }
    },
  };

  function onPhaseChange(handler: PhaseChangeHandler): PhaseChangeOff {
    phaseHandlers.add(handler);
    return () => phaseHandlers.delete(handler);
  }

  function requestPhaseTransition(nextPhase: EditorPhase): void {
    if (!editor.value || status.value !== "ready") {
      pendingPhase = nextPhase;
      return;
    }
    applyPhaseTransition(
      editor.value,
      lastAppliedPhase ?? nextPhase,
      nextPhase,
      phaseEmitter,
      "mode-change",
    );
    lastAppliedPhase = nextPhase;
  }

  async function rebuild(): Promise<void> {
    if (!locale.value) return;

    const myGen = ++generation;
    status.value = "loading";
    sessionError.value = null;

    /**
     * 快照由 `rebuild()` 自己取，不能指望调用方先设好（不变量 44）。
     * `if (previousEditor)` 而非无条件赋值：并发 rebuild 时后一次读到的已是 `null`，
     * 此时要保留前一次存下的快照而不是覆盖成空。
     */
    const previousEditor = editor.value;
    if (previousEditor) {
      // full 保留 JSON（属性更完整）；inline 用 HTML。
      // 灌入新 schema 前由 ContentAdapter.prepareEditorContent 清洗未知节点。
      contentSnapshot = host === "inline" ? previousEditor.getHTML() : previousEditor.getJSON();
    }

    editor.value = null;

    /**
     * 摘下来了就要销毁到底（不变量 44）：旧实例一旦离开 `editor.value`，
     * 除本次 rebuild 再无人持有它——被取代时直接 `return` 会永久泄漏一个完整编辑器。
     */
    let previousDestroyed = false;
    const destroyPrevious = (): void => {
      if (previousDestroyed) return;
      previousDestroyed = true;
      previousEditor?.destroy();
    };

    try {
      // `nextTick()` 交出的是当次 flush 的 promise，这一轮里任何组件更新抛错都会让它
      // reject；它曾在 try 之外，异常经 `void rebuild()` 逃逸，status 永久卡在
      // "loading"（白屏骨架）。建不出来必须落到 "error" 这个确定终态（不变量 44）。
      await nextTick();
      destroyPrevious();
      if (disposed || myGen !== generation) return;
      const ctx: BuildExtensionsCtx = {
        locale: locale.value,
        gates: profile.value.gates,
        isEditable,
        blockMenuHost,
        ...buildCtx(),
      };

      const extensions = await buildExtensions(host, ctx);
      if (disposed || myGen !== generation) return;

      const initialContent = ContentAdapter.prepareEditorContent(
        contentSnapshot ?? EMPTY_DOC,
        extensions,
      );
      contentSnapshot = null;

      editor.value = new Editor({
        editable: profile.value.mode === "edit",
        extensions,
        content: initialContent,
        editorProps: editorProps ?? {
          attributes: {
            class: host === "inline" ? "inline-prose" : "document-editor-content",
          },
        },
      });

      status.value = "ready";
      onReady?.(editor.value);

      const targetPhase = pendingPhase ?? profile.value.mode;
      pendingPhase = null;

      if (lastAppliedPhase !== targetPhase) {
        applyPhaseTransition(
          editor.value,
          lastAppliedPhase,
          targetPhase,
          phaseEmitter,
          lastAppliedPhase === null ? "ready" : "mode-change",
        );
        lastAppliedPhase = targetPhase;
      } else {
        phaseEmitter.emit({
          from: null,
          to: targetPhase,
          editor: editor.value,
          reason: "ready",
        });
        lastAppliedPhase = targetPhase;
      }
    } catch (error) {
      if (disposed || myGen !== generation) return;
      console.error("[useEditorSession] rebuild failed:", error);
      sessionError.value =
        error instanceof Error
          ? error.message
          : (locale.value?.editor.sessionInitFailed ?? "Editor initialization failed");
      status.value = "error";
      editor.value = null;
    } finally {
      // 兜住 `await nextTick()` 抛错这条路径——那时还没走到上面那次 destroy。
      destroyPrevious();
    }
  }

  function retrySession(): void {
    void rebuild();
  }

  watch(sessionKey, (newKey, oldKey) => {
    if (!oldKey || !newKey || newKey === oldKey) return;
    void rebuild();
  });

  watch(
    () => profile.value.mode,
    (mode) => requestPhaseTransition(mode),
  );

  onScopeDispose(() => {
    disposed = true;
    generation += 1;
    editor.value?.destroy();
    editor.value = null;
    status.value = "idle";
    phaseHandlers.clear();
  });

  watch(
    locale,
    (messages) => {
      if (messages) void rebuild();
    },
    { immediate: true },
  );

  return {
    editor,
    status,
    sessionError,
    isEditable,
    onPhaseChange,
    requestPhaseTransition,
    retrySession,
  };
}
