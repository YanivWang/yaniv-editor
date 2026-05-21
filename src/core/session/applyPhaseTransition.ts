import type { EditorPhase } from "@/core/runtime/types";

import type { PhaseChangeEmitter } from "./types";
import type { Editor } from "@tiptap/vue-3";

export function applyPhaseTransition(
  editor: Editor,
  prevPhase: EditorPhase | null,
  nextPhase: EditorPhase,
  emitter: PhaseChangeEmitter,
  reason: "mode-change" | "ready" = "mode-change",
): void {
  if (nextPhase === "preview") {
    emitter.emit({ from: prevPhase, to: nextPhase, editor, reason });
    editor.setEditable(false);
  } else {
    editor.setEditable(true);
    emitter.emit({ from: prevPhase, to: nextPhase, editor, reason });
  }
}
