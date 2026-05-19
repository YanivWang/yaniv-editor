import { toValue, type MaybeRefOrGetter } from "vue";

import { HEADING_OPTIONS } from "@/configs/editorConstants";
import type { HeadingLevel } from "@/configs/toolbarTypes";
import { createCommandRunner } from "@/utils/editorCommands";
import { createStateCheckers } from "@/utils/editorState";

import type { Editor } from "@tiptap/core";

export function useHeadingActions(editor: MaybeRefOrGetter<Editor | null>) {
  const runCommand = createCommandRunner(editor);
  const { isHeadingActive } = createStateCheckers(editor);

  function setHeadingValue(val: string): void {
    const e = toValue(editor);
    if (!e) return;

    const { from, to } = e.state.selection;

    if (val === "paragraph") {
      e.chain().setParagraph().setTextSelection({ from, to }).run();
      return;
    }

    const level = Number(val.replace(/^h/, "")) as HeadingLevel;
    if (![1, 2, 3, 4, 5, 6].includes(level)) return;

    const $from = e.state.selection.$from;
    const start = $from.start($from.depth);
    const end = $from.end($from.depth);

    e.chain()
      .setHeading({ level })
      .setTextSelection({ from: start, to: end })
      .unsetMark("textStyle")
      .setTextSelection({ from, to })
      .run();
  }

  function toggleHeadingLevel(level: HeadingLevel) {
    return runCommand((chain) => chain.toggleHeading({ level }));
  }

  return {
    headingOptions: HEADING_OPTIONS,
    isHeadingActive,
    setHeadingValue,
    toggleHeadingLevel,
  };
}
