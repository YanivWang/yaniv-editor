import { Editor } from "@tiptap/vue-3";
import { computed, onScopeDispose, ref, shallowRef, watch, type ComputedRef } from "vue";

import { buildExtensions } from "@/capabilities/buildExtensions";
import type { BuildExtensionsCtx } from "@/capabilities/types";
import type { EditorPhase, EditorRuntimeProfile, EditorShellHost } from "@/core/runtime/types";
import type { BlockMenuHost } from "@/core/shell/useBlockMenuHost";
import type { TiptapLocale } from "@/locales/types";

import { applyPhaseTransition } from "./applyPhaseTransition";

import type { PhaseChangeEvent, PhaseChangeHandler, PhaseChangeOff, SessionStatus } from "./types";
import type { JSONContent } from "@tiptap/core";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export interface UseEditorSessionOptions {
  host: EditorShellHost;
  profile: ComputedRef<EditorRuntimeProfile>;
  sessionKey: ComputedRef<string>;
  locale: ComputedRef<TiptapLocale>;
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

    try {
      const ctx: BuildExtensionsCtx = {
        locale: locale.value,
        gates: profile.value.gates,
        isEditable,
        blockMenuHost,
        ...buildCtx(),
      };

      const extensions = await buildExtensions(host, ctx);
      if (disposed || myGen !== generation) return;

      const initialContent = contentSnapshot ?? EMPTY_DOC;
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
      sessionError.value = error instanceof Error ? error.message : "编辑器初始化失败";
      status.value = "error";
      editor.value = null;
    }
  }

  function retrySession(): void {
    void rebuild();
  }

  watch(
    sessionKey,
    (newKey, oldKey) => {
      if (!oldKey || !newKey || newKey === oldKey) return;
      if (editor.value) {
        contentSnapshot = host === "inline" ? editor.value.getHTML() : editor.value.getJSON();
      }
      editor.value?.destroy();
      editor.value = null;
      void rebuild();
    },
    { flush: "pre" },
  );

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
