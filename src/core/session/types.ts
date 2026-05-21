import type { EditorPhase } from "@/core/runtime/types";

import type { Editor } from "@tiptap/vue-3";

export type SessionStatus = "idle" | "loading" | "ready" | "error";

export interface PhaseChangeEvent {
  from: EditorPhase | null;
  to: EditorPhase;
  editor: Editor;
  reason: "mode-change" | "ready";
}

export type PhaseChangeHandler = (event: PhaseChangeEvent) => void;
export type PhaseChangeOff = () => void;

export interface PhaseChangeEmitter {
  emit: (event: PhaseChangeEvent) => void;
}
