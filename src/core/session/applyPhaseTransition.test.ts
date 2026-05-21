import { describe, expect, it } from "vitest";

import { applyPhaseTransition } from "./applyPhaseTransition";

import type { PhaseChangeEmitter } from "./types";
import type { Editor } from "@tiptap/vue-3";

describe("applyPhaseTransition", () => {
  it("edit → preview：先 emit 再 setEditable(false)", () => {
    const calls: string[] = [];
    const editor = {
      setEditable: () => {
        calls.push("setEditable");
      },
    } as unknown as Editor;
    const emitter: PhaseChangeEmitter = { emit: () => calls.push("emit") };
    applyPhaseTransition(editor, "edit", "preview", emitter);
    expect(calls).toEqual(["emit", "setEditable"]);
  });

  it("preview → edit：先 setEditable(true) 再 emit", () => {
    const calls: string[] = [];
    const editor = {
      setEditable: () => {
        calls.push("setEditable");
      },
    } as unknown as Editor;
    const emitter: PhaseChangeEmitter = { emit: () => calls.push("emit") };
    applyPhaseTransition(editor, "preview", "edit", emitter);
    expect(calls).toEqual(["setEditable", "emit"]);
  });
});
