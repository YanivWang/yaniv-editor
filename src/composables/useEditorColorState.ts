import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";

import { normalizeColor } from "@/utils/color";
import { createCommandRunner } from "@/utils/editorCommands";

import type { Editor } from "@tiptap/core";

export function useEditorColorState(editor: MaybeRefOrGetter<Editor | null>) {
  const currentTextColor = ref("#000000");
  const currentBgColor = ref("#ffffff");

  const runCommand = createCommandRunner(editor);

  watch(
    () => toValue(editor)?.getAttributes("textStyle"),
    (attrs) => {
      currentTextColor.value = attrs?.color ? normalizeColor(attrs.color) : "#000000";
    },
    { deep: true, immediate: true },
  );

  watch(
    () => toValue(editor)?.getAttributes("highlight"),
    (attrs) => {
      currentBgColor.value = attrs?.color ? normalizeColor(attrs.color) : "#ffffff";
    },
    { deep: true, immediate: true },
  );

  const setTextColor = (color: string) => {
    currentTextColor.value = color;
    runCommand((chain) => chain.setColor(color))();
  };

  const setHighlight = (color: string) => {
    currentBgColor.value = color;
    runCommand((chain) => chain.setHighlight({ color }))();
  };

  return {
    currentTextColor,
    currentBgColor,
    setTextColor,
    setHighlight,
  };
}
