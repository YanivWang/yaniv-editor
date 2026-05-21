import { describe, expect, test } from "vitest";

import { applyPhaseTransition } from "./applyPhaseTransition";

import type { PhaseChangeEmitter } from "./types";
import type { Editor } from "@tiptap/vue-3";

function createTrackingEditor() {
  const calls: string[] = [];
  const editor = {
    setEditable: (value: boolean) => {
      calls.push(`setEditable:${value}`);
    },
  } as unknown as Editor;
  const emitter: PhaseChangeEmitter = {
    emit: () => {
      calls.push("emit");
    },
  };
  return { editor, emitter, calls };
}

describe("applyPhaseTransition", () => {
  test("edit → preview：先 emit 再 setEditable(false)", () => {
    const { editor, emitter, calls } = createTrackingEditor();
    applyPhaseTransition(editor, "edit", "preview", emitter);
    expect(calls).toEqual(["emit", "setEditable:false"]);
  });

  test("preview → edit：先 setEditable(true) 再 emit", () => {
    const { editor, emitter, calls } = createTrackingEditor();
    applyPhaseTransition(editor, "preview", "edit", emitter);
    expect(calls).toEqual(["setEditable:true", "emit"]);
  });
});
